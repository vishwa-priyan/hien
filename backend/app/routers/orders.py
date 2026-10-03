from typing import Annotated, Optional
from datetime import datetime
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import psycopg
from ..database import get_db

router = APIRouter(prefix="/orders", tags=["Orders & Local Fulfillment"])

def parse_order_row(row: dict) -> dict:
    d = dict(row)
    return {
        "id": d["id"],
        "orderNumber": d["order_number"],
        "customerName": d["customer_name"],
        "sku": d["sku"],
        "productName": d["product_name"],
        "quantity": d["quantity"],
        "assignedHubId": d["assigned_hub_id"],
        "hubName": d["hub_name"],
        "status": d["status"],
        "deliveryType": d["delivery_type"],
        "promisedDelivery": str(d["promised_delivery"]),
        "reservedStockId": d.get("reserved_stock_id"),
        "createdAt": str(d["created_at"]),
        "completedAt": str(d["completed_at"]) if d.get("completed_at") else None
    }

@router.get("")
def list_orders(
    hubId: Optional[str] = None,
    status: Optional[str] = None,
    db: Annotated[psycopg.Connection, Depends(get_db)] = None
):
    query = "SELECT * FROM local_orders WHERE 1=1"
    params = []
    if hubId:
        query += " AND assigned_hub_id = %s"
        params.append(hubId)
    if status:
        query += " AND status = %s"
        params.append(status)
    query += " ORDER BY id DESC"

    with db.cursor() as cur:
        cur.execute(query, tuple(params))
        rows = cur.fetchall()
        return [parse_order_row(r) for r in rows]

class OrderCreate(BaseModel):
    customerName: str
    sku: str
    productName: str
    quantity: int = 1
    assignedHubId: str
    hubName: str
    deliveryType: str = "store_pickup"
    promisedDelivery: Optional[str] = None

@router.post("", status_code=status.HTTP_201_CREATED)
def create_order(req: OrderCreate, db: Annotated[psycopg.Connection, Depends(get_db)]):
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    order_id = f"ord-{uuid.uuid4().hex[:8]}"
    order_num = f"ORD-WA-{uuid.uuid4().hex[:5].upper()}"
    promised = req.promisedDelivery or "Today by 6:00 PM"

    with db.cursor() as cur:
        # Check stock availability at hub
        cur.execute("""
            SELECT * FROM inventory_items
            WHERE hub_id = %s AND sku = %s AND disposition = 'sellable'
            FOR UPDATE
        """, (req.assignedHubId, req.sku))
        inv = cur.fetchone()

        if not inv or inv["available_quantity"] < req.quantity:
            avail = inv["available_quantity"] if inv else 0
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient inventory at {req.hubName}. Available: {avail}, Requested: {req.quantity}"
            )

        # Transactionally reserve stock
        cur.execute("""
            UPDATE inventory_items
            SET available_quantity = available_quantity - %s,
                reserved_quantity = reserved_quantity + %s,
                last_updated = %s
            WHERE id = %s
        """, (req.quantity, req.quantity, now_str, inv["id"]))

        # Create order
        cur.execute("""
            INSERT INTO local_orders (
                id, order_number, customer_name, sku, product_name, quantity,
                assigned_hub_id, hub_name, status, delivery_type, promised_delivery,
                reserved_stock_id, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'reserved', %s, %s, %s, %s)
            RETURNING *
        """, (
            order_id, order_num, req.customerName, req.sku, req.productName,
            req.quantity, req.assignedHubId, req.hubName, req.deliveryType,
            promised, inv["id"], now_str
        ))
        row = cur.fetchone()

        # Log movement
        cur.execute("""
            INSERT INTO inventory_movements (sku, hub_id, movement_type, quantity, reference_type, reference_id, actor, notes)
            VALUES (%s, %s, 'order_reserved', %s, 'order', %s, 'Fulfillment System', 'Stock reserved for customer order')
        """, (req.sku, req.assignedHubId, req.quantity, order_id))

        db.commit()
        return parse_order_row(row)

class OrderStatusUpdate(BaseModel):
    status: str # 'prepared' | 'ready_for_pickup' | 'dispatched' | 'fulfilled' | 'cancelled'

@router.patch("/{order_id}/status")
def update_order_status(order_id: str, req: OrderStatusUpdate, db: Annotated[psycopg.Connection, Depends(get_db)]):
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with db.cursor() as cur:
        cur.execute("SELECT * FROM local_orders WHERE id = %s FOR UPDATE", (order_id,))
        order = cur.fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        old_status = order["status"]
        new_status = req.status
        completed = now_str if new_status in ["fulfilled", "cancelled"] else order.get("completed_at")

        cur.execute("""
            UPDATE local_orders
            SET status = %s, completed_at = %s
            WHERE id = %s
            RETURNING *
        """, (new_status, completed, order_id))
        updated = cur.fetchone()

        # Handle stock release or fulfillment
        if old_status != "fulfilled" and new_status == "fulfilled":
            # Deduct from reserved stock and total stock
            cur.execute("""
                UPDATE inventory_items
                SET reserved_quantity = GREATEST(0, reserved_quantity - %s),
                    total_quantity = GREATEST(0, total_quantity - %s),
                    last_updated = %s
                WHERE id = %s
            """, (order["quantity"], order["quantity"], now_str, order["reserved_stock_id"]))

            cur.execute("""
                INSERT INTO inventory_movements (sku, hub_id, movement_type, quantity, reference_type, reference_id, actor, notes)
                VALUES (%s, %s, 'order_fulfilled', %s, 'order', %s, 'Fulfillment Desk', 'Order delivered/picked up')
            """, (order["sku"], order["assigned_hub_id"], order["quantity"], order_id))

        elif old_status != "cancelled" and new_status == "cancelled":
            # Release reservation back to available stock
            cur.execute("""
                UPDATE inventory_items
                SET reserved_quantity = GREATEST(0, reserved_quantity - %s),
                    available_quantity = available_quantity + %s,
                    last_updated = %s
                WHERE id = %s
            """, (order["quantity"], order["quantity"], now_str, order["reserved_stock_id"]))

            cur.execute("""
                INSERT INTO inventory_movements (sku, hub_id, movement_type, quantity, reference_type, reference_id, actor, notes)
                VALUES (%s, %s, 'reservation_released', %s, 'order', %s, 'Order Desk', 'Order cancelled, reserved stock restored')
            """, (order["sku"], order["assigned_hub_id"], order["quantity"], order_id))

        db.commit()
        return parse_order_row(updated)
