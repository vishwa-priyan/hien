from typing import Annotated, Optional
from datetime import datetime
import json
import uuid
import os
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from pydantic import BaseModel
import psycopg
from ..database import get_db
from ..config import settings

router = APIRouter(prefix="/returns", tags=["Returns"])

def build_return_object(r_row: dict, cur: psycopg.Cursor) -> dict:
    ret_id = r_row["id"]
    
    # Images
    cur.execute("SELECT * FROM return_images WHERE return_id = %s ORDER BY is_primary DESC, created_at ASC", (ret_id,))
    img_rows = cur.fetchall()
    images = []
    for img in img_rows:
        dets = img.get("detections")
        if isinstance(dets, str):
            try:
                dets = json.loads(dets)
            except Exception:
                dets = []
        images.append({
            "id": img["id"],
            "url": img["url"],
            "caption": img.get("caption", ""),
            "isPrimary": img.get("is_primary", False),
            "detections": dets or []
        })

    # Assessment
    cur.execute("SELECT * FROM return_assessments WHERE return_id = %s ORDER BY created_at DESC LIMIT 1", (ret_id,))
    asm_row = cur.fetchone()
    assessment = None
    if asm_row:
        def parse_json_col(val, default):
            if isinstance(val, str):
                try:
                    return json.loads(val)
                except Exception:
                    return default
            return val or default

        assessment = {
            "id": asm_row["id"],
            "returnId": asm_row["return_id"],
            "predictedDisposition": asm_row["predicted_disposition"],
            "confidenceScore": float(asm_row["confidence_score"]),
            "classProbabilities": parse_json_col(asm_row.get("class_probabilities"), {}),
            "defectLabels": parse_json_col(asm_row.get("defect_labels"), []),
            "riskFlags": parse_json_col(asm_row.get("risk_flags"), []),
            "missingFeatures": parse_json_col(asm_row.get("missing_features"), []),
            "recommendedNextStep": asm_row.get("recommended_next_step", ""),
            "modelVersion": asm_row.get("model_version", ""),
            "timestamp": str(asm_row.get("created_at")),
            "simulatedNotice": asm_row.get("simulated_notice", "")
        }

    # Physical Inspection
    cur.execute("SELECT * FROM physical_inspections WHERE return_id = %s ORDER BY created_at DESC LIMIT 1", (ret_id,))
    insp_row = cur.fetchone()
    inspection = None
    if insp_row:
        checks = insp_row.get("checks")
        if isinstance(checks, str):
            try:
                checks = json.loads(checks)
            except Exception:
                checks = []
        inspection = {
            "id": insp_row["id"],
            "returnId": insp_row["return_id"],
            "inspectorId": insp_row["inspector_id"],
            "inspectorName": insp_row["inspector_name"],
            "completedAt": str(insp_row.get("completed_at")),
            "checks": checks or [],
            "finalDisposition": insp_row["final_disposition"],
            "inspectorNotes": insp_row.get("inspector_notes", ""),
            "evidenceImageUrl": insp_row.get("evidence_image_url")
        }

    # Timeline
    cur.execute("SELECT * FROM return_timeline WHERE return_id = %s ORDER BY id ASC", (ret_id,))
    timeline_rows = cur.fetchall()
    history = []
    for t in timeline_rows:
        history.append({
            "timestamp": str(t["timestamp"]),
            "title": t["title"],
            "description": t["description"],
            "actor": t["actor"],
            "type": t.get("event_type", "creation")
        })

    return {
        "id": r_row["id"],
        "rmaNumber": r_row["rma_number"],
        "orderReference": r_row["order_reference"],
        "sku": r_row["sku"],
        "productName": r_row["product_name"],
        "category": r_row["category"],
        "quantity": r_row.get("quantity", 1),
        "hubId": r_row["hub_id"],
        "hubName": r_row["hub_name"],
        "returnReason": r_row["return_reason"],
        "reportedCondition": r_row["reported_condition"],
        "packagingCondition": r_row["packaging_condition"],
        "accessoryCompleteness": r_row["accessory_completeness"],
        "status": r_row["status"],
        "primaryImage": r_row.get("primary_image", ""),
        "images": images,
        "assessment": assessment,
        "inspection": inspection,
        "createdAt": str(r_row["created_at"]),
        "updatedAt": str(r_row["updated_at"]),
        "historyTimeline": history
    }

@router.get("")
def list_returns(
    hubId: Optional[str] = None,
    status: Optional[str] = None,
    sku: Optional[str] = None,
    db: Annotated[psycopg.Connection, Depends(get_db)] = None
):
    query = "SELECT * FROM returns WHERE 1=1"
    params = []
    if hubId:
        query += " AND hub_id = %s"
        params.append(hubId)
    if status:
        query += " AND status = %s"
        params.append(status)
    if sku:
        query += " AND sku = %s"
        params.append(sku)
    query += " ORDER BY id DESC"

    with db.cursor() as cur:
        cur.execute(query, tuple(params))
        rows = cur.fetchall()
        return [build_return_object(r, cur) for r in rows]

@router.get("/{return_id}")
def get_return(return_id: str, db: Annotated[psycopg.Connection, Depends(get_db)]):
    with db.cursor() as cur:
        cur.execute("SELECT * FROM returns WHERE id = %s", (return_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Return not found")
        return build_return_object(row, cur)

class ReturnCreate(BaseModel):
    orderReference: str
    sku: str
    productName: str
    category: str
    quantity: int = 1
    hubId: str
    hubName: str
    returnReason: str
    reportedCondition: str
    packagingCondition: str
    accessoryCompleteness: str
    primaryImage: Optional[str] = None
    images: Optional[list[dict]] = []

@router.post("", status_code=status.HTTP_201_CREATED)
def create_return(req: ReturnCreate, db: Annotated[psycopg.Connection, Depends(get_db)]):
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    ret_id = f"ret-{uuid.uuid4().hex[:8]}"
    rma_num = f"RMA-2026-{uuid.uuid4().hex[:4].upper()}"

    with db.cursor() as cur:
        cur.execute("""
            INSERT INTO returns (
                id, rma_number, order_reference, sku, product_name, category,
                quantity, hub_id, hub_name, return_reason, reported_condition,
                packaging_condition, accessory_completeness, status, primary_image,
                created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'registered', %s, %s, %s)
            RETURNING *
        """, (
            ret_id, rma_num, req.orderReference, req.sku, req.productName, req.category,
            req.quantity, req.hubId, req.hubName, req.returnReason, req.reportedCondition,
            req.packagingCondition, req.accessoryCompleteness, req.primaryImage or "",
            now_str, now_str
        ))
        row = cur.fetchone()

        # Add initial timeline
        cur.execute("""
            INSERT INTO return_timeline (return_id, timestamp, title, description, actor, event_type)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            ret_id, now_str, "Return Registered",
            f"Customer return drop-off registered at {req.hubName}. {rma_num} issued.",
            "Inspection Officer", "creation"
        ))

        # Add any initial images
        if req.images:
            for img in req.images:
                img_id = img.get("id") or f"img-{uuid.uuid4().hex[:6]}"
                cur.execute("""
                    INSERT INTO return_images (id, return_id, url, caption, is_primary, detections)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    img_id, ret_id, img.get("url", ""), img.get("caption", ""),
                    img.get("isPrimary", False), json.dumps(img.get("detections", []))
                ))

        db.commit()
        return build_return_object(row, cur)

class StatusUpdate(BaseModel):
    status: str
    actor: str = "Officer"
    note: Optional[str] = None

@router.patch("/{return_id}/status")
def update_return_status(return_id: str, req: StatusUpdate, db: Annotated[psycopg.Connection, Depends(get_db)]):
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with db.cursor() as cur:
        cur.execute("SELECT * FROM returns WHERE id = %s", (return_id,))
        ret = cur.fetchone()
        if not ret:
            raise HTTPException(status_code=404, detail="Return not found")

        old_status = ret["status"]
        cur.execute("""
            UPDATE returns SET status = %s, updated_at = %s WHERE id = %s RETURNING *
        """, (req.status, now_str, return_id))
        updated = cur.fetchone()

        desc = req.note or f"Status changed from {old_status} to {req.status}."
        cur.execute("""
            INSERT INTO return_timeline (return_id, timestamp, title, description, actor, event_type)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (return_id, now_str, f"Status: {req.status}", desc, req.actor, "disposition"))

        db.commit()
        return build_return_object(updated, cur)

@router.post("/{return_id}/images")
async def upload_return_image(
    return_id: str,
    file: UploadFile = File(...),
    caption: str = Form("Inspection Photo"),
    isPrimary: bool = Form(False),
    db: Annotated[psycopg.Connection, Depends(get_db)] = None
):
    with db.cursor() as cur:
        cur.execute("SELECT id FROM returns WHERE id = %s", (return_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Return not found")

        img_id = f"img-{uuid.uuid4().hex[:8]}"
        file_ext = os.path.splitext(file.filename)[1] or ".jpg"
        save_filename = f"{return_id}_{img_id}{file_ext}"
        save_path = os.path.join(settings.UPLOAD_DIR, save_filename)

        contents = await file.read()
        with open(save_path, "wb") as f:
            f.write(contents)

        url = f"/api/uploads/{save_filename}"
        cur.execute("""
            INSERT INTO return_images (id, return_id, url, caption, is_primary, detections)
            VALUES (%s, %s, %s, %s, %s, '[]'::jsonb)
            RETURNING *
        """, (img_id, return_id, url, caption, isPrimary))
        img_row = cur.fetchone()

        if isPrimary:
            cur.execute("UPDATE returns SET primary_image = %s WHERE id = %s", (url, return_id))

        db.commit()
        return {
            "id": img_row["id"],
            "url": img_row["url"],
            "caption": img_row["caption"],
            "isPrimary": img_row["is_primary"],
            "detections": []
        }
