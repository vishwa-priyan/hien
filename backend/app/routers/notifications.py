from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
import psycopg
from ..database import get_db

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("")
def list_notifications(db: Annotated[psycopg.Connection, Depends(get_db)]):
    with db.cursor() as cur:
        cur.execute("SELECT * FROM notifications ORDER BY id DESC")
        rows = cur.fetchall()
        return [
            {
                "id": r["id"],
                "title": r["title"],
                "message": r["message"],
                "type": r["type"],
                "timestamp": str(r["timestamp"]),
                "read": r["read"],
                "link": r.get("link"),
                "entityType": r.get("entity_type"),
                "entityId": r.get("entity_id")
            }
            for r in rows
        ]

@router.patch("/{notif_id}/read")
def mark_notification_read(notif_id: str, db: Annotated[psycopg.Connection, Depends(get_db)]):
    with db.cursor() as cur:
        cur.execute("UPDATE notifications SET read = TRUE WHERE id = %s RETURNING *", (notif_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Notification not found")
        db.commit()
        return {"id": notif_id, "read": True}
