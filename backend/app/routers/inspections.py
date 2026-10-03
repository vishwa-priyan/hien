from typing import Annotated, Optional
from datetime import datetime
import json
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import psycopg
from ..database import get_db

router = APIRouter(prefix="/inspections", tags=["Physical Inspections"])

class InspectionCheckItem(BaseModel):
    id: str
    label: str
    isMandatory: bool = True
    passed: Optional[bool] = None
    notes: Optional[str] = None

class PhysicalInspectionCreate(BaseModel):
    returnId: str
    inspectorId: str
    inspectorName: str
    checks: list[InspectionCheckItem]
    finalDisposition: str # 'approved_resale' | 'refurbishment_required' | 'not_suitable' | 'quarantined'
    inspectorNotes: Optional[str] = ""
    evidenceImageUrl: Optional[str] = None

@router.post("", status_code=status.HTTP_201_CREATED)
def submit_physical_inspection(req: PhysicalInspectionCreate, db: Annotated[psycopg.Connection, Depends(get_db)]):
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    insp_id = f"insp-{uuid.uuid4().hex[:8]}"

    with db.cursor() as cur:
        # 1. Fetch return
        cur.execute("SELECT * FROM returns WHERE id = %s", (req.returnId,))
        ret = cur.fetchone()
        if not ret:
            raise HTTPException(status_code=404, detail="Return not found")

        # 2. Insert inspection record
        checks_json = json.dumps([c.model_dump() for c in req.checks])
        cur.execute("""
            INSERT INTO physical_inspections (
                id, return_id, inspector_id, inspector_name, completed_at,
                checks, final_disposition, inspector_notes, evidence_image_url
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            insp_id, req.returnId, req.inspectorId, req.inspectorName,
            now_str, checks_json, req.finalDisposition, req.inspectorNotes or "",
            req.evidenceImageUrl
        ))
        insp_row = cur.fetchone()

        # 3. Update return status to match final disposition
        cur.execute("""
            UPDATE returns SET status = %s, updated_at = %s WHERE id = %s
        """, (req.finalDisposition, now_str, req.returnId))

        # 4. Add timeline entry
        disp_title = req.finalDisposition.replace("_", " ").title()
        cur.execute("""
            INSERT INTO return_timeline (return_id, timestamp, title, description, actor, event_type)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            req.returnId, now_str, f"Inspection Completed: {disp_title}",
            f"Inspector {req.inspectorName} signed off disposition: {disp_title}. Notes: {req.inspectorNotes}",
            req.inspectorName, "inspection"
        ))

        # 5. If approved for resale, reflect immediately into Hub Inventory
        if req.finalDisposition == "approved_resale":
            # Check existing inventory item
            cur.execute("""
                SELECT * FROM inventory_items WHERE hub_id = %s AND sku = %s AND disposition = 'sellable'
            """, (ret["hub_id"], ret["sku"]))
            inv = cur.fetchone()
            qty = ret.get("quantity", 1)

            if inv:
                cur.execute("""
                    UPDATE inventory_items
                    SET total_quantity = total_quantity + %s,
                        available_quantity = available_quantity + %s,
                        last_updated = %s
                    WHERE id = %s
                """, (qty, qty, now_str, inv["id"]))
            else:
                new_inv_id = f"inv-{uuid.uuid4().hex[:8]}"
                cur.execute("""
                    INSERT INTO inventory_items (
                        id, sku, product_name, category, variant, hub_id, hub_name,
                        total_quantity, available_quantity, reserved_quantity, incoming_quantity,
                        target_stock, forecast_demand, disposition, storage_location,
                        unit_cost, selling_price, last_updated
                    ) VALUES (%s, %s, %s, %s, 'Inspected Restock', %s, %s, %s, %s, 0, 0, 10, 0, 'sellable', 'Shelf Restock-A', 50.0, 80.0, %s)
                """, (new_inv_id, ret["sku"], ret["product_name"], ret["category"], ret["hub_id"], ret["hub_name"], qty, qty, now_str))

            # Record inventory movement
            cur.execute("""
                INSERT INTO inventory_movements (sku, hub_id, movement_type, quantity, reference_type, reference_id, actor, notes)
                VALUES (%s, %s, 'return_restock', %s, 'return', %s, %s, 'Restocked from QA approved return')
            """, (ret["sku"], ret["hub_id"], qty, req.returnId, req.inspectorName))

        db.commit()

        return {
            "id": insp_row["id"],
            "returnId": insp_row["return_id"],
            "inspectorId": insp_row["inspector_id"],
            "inspectorName": insp_row["inspector_name"],
            "completedAt": str(insp_row["completed_at"]),
            "checks": [c.model_dump() for c in req.checks],
            "finalDisposition": insp_row["final_disposition"],
            "inspectorNotes": insp_row["inspector_notes"],
            "evidenceImageUrl": insp_row["evidence_image_url"]
        }
