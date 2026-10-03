from typing import Annotated, Optional
from datetime import datetime
import json
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import psycopg
from ..database import get_db

router = APIRouter(prefix="/transfers", tags=["Transfers & Hyperlocal Logistics"])

def build_transfer_object(tr_row: dict, cur: psycopg.Cursor) -> dict:
    tr_id = tr_row["id"]
    
    cur.execute("SELECT * FROM transfer_events WHERE transfer_id = %s ORDER BY id ASC", (tr_id,))
    events = [
        {
            "id": e["id"],
            "timestamp": str(e["timestamp"]),
            "status": e["status"],
            "location": e["location"],
            "description": e["description"],
            "actor": e["actor"]
        }
        for e in cur.fetchall()
    ]

    receipt = tr_row.get("receipt_details")
    if isinstance(receipt, str):
        try:
            receipt = json.loads(receipt)
        except Exception:
            receipt = None

    return {
        "id": tr_row["id"],
        "transferCode": tr_row["transfer_code"],
        "sourceHubId": tr_row["source_hub_id"],
        "sourceHubName": tr_row["source_hub_name"],
        "destHubId": tr_row["dest_hub_id"],
        "destHubName": tr_row["dest_hub_name"],
        "sku": tr_row["sku"],
        "productName": tr_row["product_name"],
        "quantity": tr_row["quantity"],
        "status": tr_row["status"],
        "transportMethod": tr_row.get("transport_method", "Dedicated EV Courier"),
        "carrierName": tr_row.get("carrier_name"),
        "trackingNumber": tr_row.get("tracking_number"),
        "plannedDeparture": str(tr_row["planned_departure"]),
        "actualDeparture": str(tr_row["actual_departure"]) if tr_row.get("actual_departure") else None,
        "estimatedArrival": str(tr_row["estimated_arrival"]),
        "actualArrival": str(tr_row["actual_arrival"]) if tr_row.get("actual_arrival") else None,
        "receiptDetails": receipt,
        "distanceKm": float(tr_row.get("distance_km") or 0),
        "transportCost": float(tr_row.get("transport_cost") or 0),
        "emissionsKg": float(tr_row.get("emissions_kg") or 0),
        "exceptionReason": tr_row.get("exception_reason"),
        "createdAt": str(tr_row["created_at"]),
        "events": events
    }

@router.get("")
def list_transfers(
    status: Optional[str] = None,
    hubId: Optional[str] = None,
    db: Annotated[psycopg.Connection, Depends(get_db)] = None
):
    query = "SELECT * FROM transfers WHERE 1=1"
    params = []
    if status:
        query += " AND status = %s"
        params.append(status)
    if hubId:
        query += " AND (source_hub_id = %s OR dest_hub_id = %s)"
        params.extend([hubId, hubId])
    query += " ORDER BY id DESC"

    with db.cursor() as cur:
        cur.execute(query, tuple(params))
        rows = cur.fetchall()
        return [build_transfer_object(r, cur) for r in rows]

@router.get("/{transfer_id}")
def get_transfer(transfer_id: str, db: Annotated[psycopg.Connection, Depends(get_db)]):
    with db.cursor() as cur:
        cur.execute("SELECT * FROM transfers WHERE id = %s", (transfer_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Transfer not found")
        return build_transfer_object(row, cur)

class TransferCreate(BaseModel):
    sourceHubId: str
    sourceHubName: str
    destHubId: str
    destHubName: str
    sku: str
    productName: str
    quantity: int
    transportMethod: Optional[str] = "Dedicated EV Courier"
    distanceKm: Optional[float] = 20.0

@router.post("", status_code=status.HTTP_201_CREATED)
def create_transfer(req: TransferCreate, db: Annotated[psycopg.Connection, Depends(get_db)]):
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    tr_id = f"tr-{uuid.uuid4().hex[:8]}"
    tr_code = f"TR-WA-{uuid.uuid4().hex[:4].upper()}"

    cost = round(req.distanceKm * 1.25, 2)
    emissions = round(req.distanceKm * 0.192, 3)

    with db.cursor() as cur:
        cur.execute("""
            INSERT INTO transfers (
                id, transfer_code, source_hub_id, source_hub_name, dest_hub_id,
                dest_hub_name, sku, product_name, quantity, status, transport_method,
                planned_departure, estimated_arrival, distance_km, transport_cost,
                emissions_kg, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'awaiting_approval', %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            tr_id, tr_code, req.sourceHubId, req.sourceHubName, req.destHubId,
            req.destHubName, req.sku, req.productName, req.quantity, req.transportMethod,
            now_str, now_str, req.distanceKm, cost, emissions, now_str, now_str
        ))
        tr_row = cur.fetchone()

        cur.execute("""
            INSERT INTO transfer_events (id, transfer_id, timestamp, status, location, description, actor)
            VALUES (%s, %s, %s, 'created', %s, 'Transfer requested, awaiting approval.', 'Logistics Operator')
        """, (f"ev-{uuid.uuid4().hex[:6]}", tr_id, now_str, req.sourceHubName))

        db.commit()
        return build_transfer_object(tr_row, cur)

class DispatchRequest(BaseModel):
    carrierName: str
    trackingNumber: str
    actor: str = "Logistics Officer"

@router.post("/{transfer_id}/dispatch")
def dispatch_transfer(transfer_id: str, req: DispatchRequest, db: Annotated[psycopg.Connection, Depends(get_db)]):
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with db.cursor() as cur:
        cur.execute("SELECT * FROM transfers WHERE id = %s", (transfer_id,))
        tr = cur.fetchone()
        if not tr:
            raise HTTPException(status_code=404, detail="Transfer not found")

        cur.execute("""
            UPDATE transfers
            SET status = 'dispatched',
                carrier_name = %s,
                tracking_number = %s,
                actual_departure = %s,
                updated_at = %s
            WHERE id = %s
            RETURNING *
        """, (req.carrierName, req.trackingNumber, now_str, now_str, transfer_id))
        updated = cur.fetchone()

        # Deduct from source available quantity and put into in-transit
        cur.execute("""
            UPDATE inventory_items
            SET available_quantity = GREATEST(0, available_quantity - %s),
                last_updated = %s
            WHERE hub_id = %s AND sku = %s
        """, (tr["quantity"], now_str, tr["source_hub_id"], tr["sku"]))

        # Add incoming quantity at destination
        cur.execute("""
            UPDATE inventory_items
            SET incoming_quantity = incoming_quantity + %s,
                last_updated = %s
            WHERE hub_id = %s AND sku = %s
        """, (tr["quantity"], now_str, tr["dest_hub_id"], tr["sku"]))

        cur.execute("""
            INSERT INTO transfer_events (id, transfer_id, timestamp, status, location, description, actor)
            VALUES (%s, %s, %s, 'dispatched', %s, %s, %s)
        """, (
            f"ev-{uuid.uuid4().hex[:6]}", transfer_id, now_str, tr["source_hub_name"],
            f"Loaded onto {req.carrierName} EV van (Tracking: {req.trackingNumber}). Departed source hub.",
            req.actor
        ))

        db.commit()
        return build_transfer_object(updated, cur)

class ReceiveRequest(BaseModel):
    receivedQty: int
    damagedQty: int = 0
    missingQty: int = 0
    notes: Optional[str] = ""
    inspectorName: str = "Receiving Officer"

@router.post("/{transfer_id}/receive")
def receive_transfer(transfer_id: str, req: ReceiveRequest, db: Annotated[psycopg.Connection, Depends(get_db)]):
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with db.cursor() as cur:
        cur.execute("SELECT * FROM transfers WHERE id = %s", (transfer_id,))
        tr = cur.fetchone()
        if not tr:
            raise HTTPException(status_code=404, detail="Transfer not found")

        receipt_data = {
            "receivedQty": req.receivedQty,
            "damagedQty": req.damagedQty,
            "missingQty": req.missingQty,
            "notes": req.notes or "",
            "receivedAt": now_str,
            "inspectorName": req.inspectorName
        }

        new_status = "exception" if (req.damagedQty > 0 or req.missingQty > 0) else "received"

        cur.execute("""
            UPDATE transfers
            SET status = %s,
                actual_arrival = %s,
                receipt_details = %s,
                updated_at = %s
            WHERE id = %s
            RETURNING *
        """, (new_status, now_str, json.dumps(receipt_data), now_str, transfer_id))
        updated = cur.fetchone()

        # Update destination inventory
        cur.execute("""
            UPDATE inventory_items
            SET incoming_quantity = GREATEST(0, incoming_quantity - %s),
                available_quantity = available_quantity + %s,
                total_quantity = total_quantity + %s,
                last_updated = %s
            WHERE hub_id = %s AND sku = %s
        """, (tr["quantity"], req.receivedQty, req.receivedQty, now_str, tr["dest_hub_id"], tr["sku"]))

        # Log movement
        cur.execute("""
            INSERT INTO inventory_movements (sku, hub_id, movement_type, quantity, reference_type, reference_id, actor, notes)
            VALUES (%s, %s, 'transfer_inward', %s, 'transfer', %s, %s, %s)
        """, (tr["sku"], tr["dest_hub_id"], req.receivedQty, transfer_id, req.inspectorName, req.notes or "Hyperlocal transfer receipt"))

        # Event
        cur.execute("""
            INSERT INTO transfer_events (id, transfer_id, timestamp, status, location, description, actor)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            f"ev-{uuid.uuid4().hex[:6]}", transfer_id, now_str, new_status, tr["dest_hub_name"],
            f"Transfer received by {req.inspectorName}. Verified {req.receivedQty} intact units (Damaged: {req.damagedQty}, Missing: {req.missingQty}).",
            req.inspectorName
        ))

        db.commit()
        return build_transfer_object(updated, cur)
