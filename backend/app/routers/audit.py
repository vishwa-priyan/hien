from typing import Annotated, Optional
from datetime import datetime
import uuid
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
import psycopg
from ..database import get_db

router = APIRouter(prefix="/audit", tags=["Audit Logs"])

@router.get("")
def list_audit_logs(limit: int = 100, db: Annotated[psycopg.Connection, Depends(get_db)] = None):
    with db.cursor() as cur:
        cur.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT %s", (limit,))
        rows = cur.fetchall()
        return [
            {
                "id": r["id"],
                "timestamp": str(r["timestamp"]),
                "actor": r["actor"],
                "role": r["role"],
                "action": r["action"],
                "entityType": r["entity_type"],
                "entityId": r["entity_id"],
                "previousState": r.get("previous_state"),
                "newState": r.get("newstate"),
                "result": r["result"]
            }
            for r in rows
        ]

class AuditEventCreate(BaseModel):
    actor: str
    role: str
    action: str
    entityType: str
    entityId: str
    previousState: Optional[str] = None
    newState: Optional[str] = None
    result: str = "SUCCESS"

@router.post("", status_code=status.HTTP_201_CREATED)
def record_audit_log(req: AuditEventCreate, db: Annotated[psycopg.Connection, Depends(get_db)]):
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    ev_id = f"aud-{uuid.uuid4().hex[:8]}"

    with db.cursor() as cur:
        cur.execute("""
            INSERT INTO audit_logs (
                id, timestamp, actor, role, action, entity_type, entity_id,
                previous_state, newState, result
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            ev_id, now_str, req.actor, req.role, req.action,
            req.entityType, req.entityId, req.previousState, req.newState, req.result
        ))
        row = cur.fetchone()
        db.commit()
        return {
            "id": row["id"],
            "timestamp": str(row["timestamp"]),
            "actor": row["actor"],
            "role": row["role"],
            "action": row["action"],
            "entityType": row["entity_type"],
            "entityId": row["entity_id"],
            "previousState": row.get("previous_state"),
            "newState": row.get("newstate"),
            "result": row["result"]
        }
