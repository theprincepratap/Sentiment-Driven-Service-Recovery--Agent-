from fastapi import APIRouter
from db.mongodb import get_db
from datetime import datetime

router = APIRouter()


@router.get("/managers/notifications")
async def get_notifications(limit: int = 50, unread_only: bool = False):
    db = get_db()
    query = {}
    if unread_only:
        query["read"] = False

    cursor = db.notifications.find(query).sort("created_at", -1).limit(limit)
    notifications = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if isinstance(doc.get("created_at"), datetime):
            doc["created_at"] = doc["created_at"].isoformat()
        notifications.append(doc)
    return notifications


@router.patch("/managers/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    from bson import ObjectId
    db = get_db()
    await db.notifications.update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": {"read": True}}
    )
    return {"status": "marked_read"}


@router.get("/managers")
async def get_managers():
    db = get_db()
    cursor = db.managers.find({})
    managers = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        managers.append(doc)
    return managers
