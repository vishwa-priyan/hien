from typing import Annotated, Optional
from datetime import datetime
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
import psycopg
from ..database import get_db

router = APIRouter(prefix="/inventory", tags=["Inventory Management"])

def parse_inventory_row(row: dict) -> dict:
    d = dict(row)
    return {
        "id": d["id"],
        "sku": d["sku"],
        "productName": d["product_name"],
        "category": d["category"],
        "variant": d.get("variant", "Standard"),
        "hubId": d["hub_id"],
        "hubName": d["hub_name"],
        "totalQuantity": d["total_quantity"],
        "availableQuantity": d["available_quantity"],
        "reservedQuantity": d["reserved_quantity"],
        "incomingQuantity": d["incoming_quantity"],
        "targetStock": d["target_stock"],
        "forecastDemand": d["forecast_demand"],
        "disposition": d["disposition"],
        "storageLocation": d.get("storage_location", "Shelf A1"),
        "unitCost": float(d["unit_cost"]),
        "sellingPrice": float(d["selling_price"]),
        "lastUpdated": str(d["last_updated"])
    }

class InventoryCreate(BaseModel):
    sku: str
    hubId: str
    quantity: int = 1
    targetStock: int = 10
    disposition: str = "sellable"
    storageLocation: str = "Shelf A1"
    actor: Optional[str] = "Hub Manager"
    notes: Optional[str] = None

@router.post("", status_code=status.HTTP_201_CREATED)
def create_inventory_item(req: InventoryCreate, db: Annotated[psycopg.Connection, Depends(get_db)]):
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with db.cursor() as cur:
        # Check product
        cur.execute("SELECT * FROM products WHERE sku = %s", (req.sku,))
        prod = cur.fetchone()
        if not prod:
            raise HTTPException(status_code=404, detail=f"Product with SKU '{req.sku}' not found. Please register the product first.")
        
        # Check hub
        cur.execute("SELECT * FROM hubs WHERE id = %s", (req.hubId,))
        hub = cur.fetchone()
        if not hub:
            raise HTTPException(status_code=404, detail=f"Hub with ID '{req.hubId}' not found.")

        # Check if already exists in this hub with this disposition
        cur.execute("""
            SELECT * FROM inventory_items 
            WHERE sku = %s AND hub_id = %s AND disposition = %s
        """, (req.sku, req.hubId, req.disposition))
        existing = cur.fetchone()

        if existing:
            new_avail = existing["available_quantity"] + req.quantity
            new_total = existing["total_quantity"] + req.quantity
            cur.execute("""
                UPDATE inventory_items
                SET available_quantity = %s,
                    total_quantity = %s,
                    target_stock = %s,
                    storage_location = %s,
                    last_updated = %s
                WHERE id = %s
                RETURNING *
            """, (new_avail, new_total, req.targetStock, req.storageLocation, now_str, existing["id"]))
            row = cur.fetchone()
            item_id = existing["id"]
        else:
            item_id = f"inv-{uuid.uuid4().hex[:8]}"
            selling_price = float(prod["selling_price"])
            unit_cost = round(selling_price * 0.65, 2)
            cur.execute("""
                INSERT INTO inventory_items (
                    id, sku, product_name, category, variant, hub_id, hub_name,
                    total_quantity, available_quantity, reserved_quantity, incoming_quantity,
                    target_stock, forecast_demand, disposition, storage_location,
                    unit_cost, selling_price, last_updated
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, 0, 0,
                    %s, 0, %s, %s,
                    %s, %s, %s
                )
                RETURNING *
            """, (
                item_id, req.sku, prod["name"], prod["category"], prod["variant"],
                req.hubId, hub["name"], req.quantity, req.quantity, req.targetStock,
                req.disposition, req.storageLocation, unit_cost, selling_price, now_str
            ))
            row = cur.fetchone()

        # Record movement
        cur.execute("""
            INSERT INTO inventory_movements (sku, hub_id, movement_type, quantity, reference_type, reference_id, actor, notes)
            VALUES (%s, %s, 'stock_intake', %s, 'manual_addition', %s, %s, %s)
        """, (req.sku, req.hubId, req.quantity, item_id, req.actor or "Hub Manager", req.notes or "Initial stock placement"))

        db.commit()
        return parse_inventory_row(row)

@router.get("")
def list_inventory(
    hubId: Optional[str] = None,
    disposition: Optional[str] = None,
    sku: Optional[str] = None,
    db: Annotated[psycopg.Connection, Depends(get_db)] = None
):
    query = "SELECT * FROM inventory_items WHERE 1=1"
    params = []
    if hubId:
        query += " AND hub_id = %s"
        params.append(hubId)
    if disposition:
        query += " AND disposition = %s"
        params.append(disposition)
    if sku:
        query += " AND sku = %s"
        params.append(sku)
    query += " ORDER BY hub_name ASC, product_name ASC"

    with db.cursor() as cur:
        cur.execute(query, tuple(params))
        rows = cur.fetchall()
        return [parse_inventory_row(r) for r in rows]

@router.get("/low-stock")
def get_low_stock_items(db: Annotated[psycopg.Connection, Depends(get_db)]):
    with db.cursor() as cur:
        cur.execute("""
            SELECT * FROM inventory_items
            WHERE available_quantity <= (target_stock * 0.4)
            ORDER BY available_quantity ASC
        """)
        rows = cur.fetchall()
        return [parse_inventory_row(r) for r in rows]

class StockUpdate(BaseModel):
    availableQuantity: Optional[int] = None
    reservedQuantity: Optional[int] = None
    incomingQuantity: Optional[int] = None
    targetStock: Optional[int] = None
    disposition: Optional[str] = None
    actor: Optional[str] = "Hub Manager"
    notes: Optional[str] = None

@router.patch("/{item_id}")
def update_inventory_stock(item_id: str, req: StockUpdate, db: Annotated[psycopg.Connection, Depends(get_db)]):
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with db.cursor() as cur:
        cur.execute("SELECT * FROM inventory_items WHERE id = %s", (item_id,))
        item = cur.fetchone()
        if not item:
            raise HTTPException(status_code=404, detail="Inventory item not found")

        avail = req.availableQuantity if req.availableQuantity is not None else item["available_quantity"]
        res = req.reservedQuantity if req.reservedQuantity is not None else item["reserved_quantity"]
        inc = req.incomingQuantity if req.incomingQuantity is not None else item["incoming_quantity"]
        target = req.targetStock if req.targetStock is not None else item["target_stock"]
        disp = req.disposition if req.disposition is not None else item["disposition"]
        total = avail + res

        cur.execute("""
            UPDATE inventory_items
            SET available_quantity = %s,
                reserved_quantity = %s,
                incoming_quantity = %s,
                total_quantity = %s,
                target_stock = %s,
                disposition = %s,
                last_updated = %s
            WHERE id = %s
            RETURNING *
        """, (avail, res, inc, total, target, disp, now_str, item_id))
        updated = cur.fetchone()

        # Record movement
        diff = avail - item["available_quantity"]
        if diff != 0:
            cur.execute("""
                INSERT INTO inventory_movements (sku, hub_id, movement_type, quantity, reference_type, reference_id, actor, notes)
                VALUES (%s, %s, 'stock_adjustment', %s, 'manual_adjustment', %s, %s, %s)
            """, (item["sku"], item["hub_id"], diff, item_id, req.actor, req.notes or "Manual inventory level adjustment"))

        db.commit()
        return parse_inventory_row(updated)

@router.get("/movements")
def list_inventory_movements(
    sku: Optional[str] = None,
    hubId: Optional[str] = None,
    db: Annotated[psycopg.Connection, Depends(get_db)] = None
):
    query = "SELECT * FROM inventory_movements WHERE 1=1"
    params = []
    if sku:
        query += " AND sku = %s"
        params.append(sku)
    if hubId:
        query += " AND hub_id = %s"
        params.append(hubId)
    query += " ORDER BY id DESC LIMIT 100"

    with db.cursor() as cur:
        cur.execute(query, tuple(params))
        rows = cur.fetchall()
        return [dict(r) for r in rows]
