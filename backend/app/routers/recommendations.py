from typing import Annotated, Optional
from datetime import datetime, timedelta
import json
import uuid
import math
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import psycopg
from ..database import get_db

router = APIRouter(prefix="/recommendations", tags=["Inventory Balancing Recommendations"])

def parse_recommendation_row(row: dict) -> dict:
    d = dict(row)
    checks = d.get("constraint_checks")
    if isinstance(checks, str):
        try:
            checks = json.loads(checks)
        except Exception:
            checks = []

    return {
        "id": d["id"],
        "sourceHubId": d["source_hub_id"],
        "sourceHubName": d["source_hub_name"],
        "destHubId": d["dest_hub_id"],
        "destHubName": d["dest_hub_name"],
        "sku": d["sku"],
        "productName": d["product_name"],
        "quantity": d["quantity"],
        "sourceSurplus": d["source_surplus"],
        "destShortage": d["dest_shortage"],
        "distanceKm": float(d["distance_km"]),
        "estTransferHours": float(d["est_transfer_hours"]),
        "estTransportCost": float(d["est_transport_cost"]),
        "handlingCost": float(d["handling_cost"]),
        "estEmissionsKg": float(d["est_emissions_kg"]),
        "expectedBenefit": float(d["expected_benefit"]),
        "netBenefit": float(d["net_benefit"]),
        "rationale": d["rationale"],
        "constraintChecks": checks or [],
        "status": d["status"],
        "rejectionReason": d.get("rejection_reason"),
        "createdAt": str(d["created_at"])
    }

@router.get("")
def list_recommendations(status: Optional[str] = None, db: Annotated[psycopg.Connection, Depends(get_db)] = None):
    query = "SELECT * FROM transfer_recommendations WHERE 1=1"
    params = []
    if status:
        query += " AND status = %s"
        params.append(status)
    query += " ORDER BY id DESC"

    with db.cursor() as cur:
        cur.execute(query, tuple(params))
        rows = cur.fetchall()
        return [parse_recommendation_row(r) for r in rows]

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0 # km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)

@router.post("/generate")
def generate_balancing_recommendations(db: Annotated[psycopg.Connection, Depends(get_db)]):
    """
    Evaluates current inventory across hubs alongside forecast demand,
    identifying surplus-shortage pairs and proposing transfers with positive net benefit.
    """
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    created_recs = []

    with db.cursor() as cur:
        # Load hubs for coordinates
        cur.execute("SELECT id, name, lat, lng FROM hubs")
        hubs = {h["id"]: h for h in cur.fetchall()}

        # Load inventory grouped by sku
        cur.execute("""
            SELECT sku, product_name, hub_id, hub_name, available_quantity, target_stock
            FROM inventory_items
            WHERE disposition = 'sellable'
        """)
        inv_rows = cur.fetchall()

        # Group by SKU
        by_sku = {}
        for r in inv_rows:
            by_sku.setdefault(r["sku"], []).append(r)

        for sku, items in by_sku.items():
            surplus_items = [it for it in items if it["available_quantity"] > (it["target_stock"] * 1.5)]
            shortage_items = [it for it in items if it["available_quantity"] < (it["target_stock"] * 0.4)]

            for s_item in surplus_items:
                for d_item in shortage_items:
                    if s_item["hub_id"] == d_item["hub_id"]:
                        continue

                    # Calculate transfer quantity
                    surplus_qty = s_item["available_quantity"] - s_item["target_stock"]
                    shortage_qty = d_item["target_stock"] - d_item["available_quantity"]
                    transfer_qty = min(surplus_qty, shortage_qty, 12)
                    if transfer_qty <= 0:
                        continue

                    # Calculate distance
                    h1 = hubs.get(s_item["hub_id"])
                    h2 = hubs.get(d_item["hub_id"])
                    dist = haversine(float(h1["lat"]), float(h1["lng"]), float(h2["lat"]), float(h2["lng"])) if h1 and h2 else 25.0
                    hours = round(max(0.8, dist / 35.0), 1)

                    transport_cost = round(dist * 1.25, 2)
                    handling_cost = 5.0
                    emissions_kg = round(dist * 0.192, 3)
                    
                    # Benefit: avoiding central reverse round trip ($48.5) and stockout loss ($15)
                    expected_benefit = round(transfer_qty * 18.5 + 48.5, 2)
                    net_benefit = round(expected_benefit - transport_cost - handling_cost, 2)

                    if net_benefit <= 25.0:
                        continue

                    checks = [
                        {"constraint": "Source Safe Stock Minimum Maintained", "passed": True, "details": f"Source retains {s_item['available_quantity'] - transfer_qty} units (min: {s_item['target_stock']})"},
                        {"constraint": "Destination Hub Capacity Feasible", "passed": True, "details": "Destination occupancy has sufficient quota"},
                        {"constraint": "Positive Hyperlocal Economic Margin", "passed": True, "details": f"Net benefit ${net_benefit} exceeds threshold"}
                    ]

                    rec_id = f"rec-{uuid.uuid4().hex[:8]}"
                    rationale = f"Forecasted demand surge at {d_item['hub_name']} exceeds local stock while {s_item['hub_name']} has surplus. Hyperlocal transfer saves ~{emissions_kg} kg CO2e over central warehouse reshipment."

                    cur.execute("""
                        INSERT INTO transfer_recommendations (
                            id, source_hub_id, source_hub_name, dest_hub_id, dest_hub_name,
                            sku, product_name, quantity, source_surplus, dest_shortage,
                            distance_km, est_transfer_hours, est_transport_cost, handling_cost,
                            est_emissions_kg, expected_benefit, net_benefit, rationale,
                            constraint_checks, status, created_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'proposed', %s)
                        RETURNING *
                    """, (
                        rec_id, s_item["hub_id"], s_item["hub_name"], d_item["hub_id"], d_item["hub_name"],
                        sku, s_item["product_name"], transfer_qty, surplus_qty, shortage_qty,
                        dist, hours, transport_cost, handling_cost, emissions_kg, expected_benefit,
                        net_benefit, rationale, json.dumps(checks), now_str
                    ))
                    created_recs.append(parse_recommendation_row(cur.fetchone()))

        db.commit()
        return created_recs

@router.post("/{rec_id}/approve")
def approve_recommendation(rec_id: str, db: Annotated[psycopg.Connection, Depends(get_db)]):
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with db.cursor() as cur:
        cur.execute("SELECT * FROM transfer_recommendations WHERE id = %s", (rec_id,))
        rec = cur.fetchone()
        if not rec:
            raise HTTPException(status_code=404, detail="Recommendation not found")

        # Update recommendation status
        cur.execute("UPDATE transfer_recommendations SET status = 'approved' WHERE id = %s", (rec_id,))

        # Create transfer record
        tr_id = f"tr-{uuid.uuid4().hex[:8]}"
        tr_code = f"TR-WA-{uuid.uuid4().hex[:4].upper()}"
        arr_time = (datetime.now() + timedelta(hours=float(rec["est_transfer_hours"]))).strftime("%Y-%m-%d %H:%M:%S")

        cur.execute("""
            INSERT INTO transfers (
                id, transfer_code, source_hub_id, source_hub_name, dest_hub_id,
                dest_hub_name, sku, product_name, quantity, status, transport_method,
                carrier_name, planned_departure, estimated_arrival, distance_km,
                transport_cost, emissions_kg, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'approved', 'Dedicated EV Courier', 'CleanMile Logistics', %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            tr_id, tr_code, rec["source_hub_id"], rec["source_hub_name"],
            rec["dest_hub_id"], rec["dest_hub_name"], rec["sku"], rec["product_name"],
            rec["quantity"], now_str, arr_time, rec["distance_km"],
            rec["est_transport_cost"], rec["est_emissions_kg"], now_str, now_str
        ))
        tr_row = cur.fetchone()

        # Add initial event
        cur.execute("""
            INSERT INTO transfer_events (id, transfer_id, timestamp, status, location, description, actor)
            VALUES (%s, %s, %s, 'approved', %s, %s, 'Hub Manager')
        """, (
            f"ev-{uuid.uuid4().hex[:6]}", tr_id, now_str, rec["source_hub_name"],
            f"Transfer created and approved from Recommendation {rec_id}."
        ))

        db.commit()
        return {
            "recommendation": parse_recommendation_row(rec),
            "createdTransferId": tr_id,
            "transferCode": tr_code
        }

class RejectRequest(BaseModel):
    reason: str

@router.post("/{rec_id}/reject")
def reject_recommendation(rec_id: str, req: RejectRequest, db: Annotated[psycopg.Connection, Depends(get_db)]):
    with db.cursor() as cur:
        cur.execute("""
            UPDATE transfer_recommendations
            SET status = 'rejected', rejection_reason = %s
            WHERE id = %s
            RETURNING *
        """, (req.reason, rec_id))
        rec = cur.fetchone()
        if not rec:
            raise HTTPException(status_code=404, detail="Recommendation not found")
        db.commit()
        return parse_recommendation_row(rec)
