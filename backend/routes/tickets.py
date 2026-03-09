from fastapi import APIRouter, HTTPException
from datetime import datetime
from db.mongodb import get_db
from models.schemas import TicketResolve, TicketStatus
from services.ws_manager import manager as ws_manager

router = APIRouter()


@router.get("/tickets")
async def get_tickets(
    status: str = None,
    department: str = None,
    severity: int = None,
    limit: int = 100
):
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    if department:
        query["department"] = department
    if severity:
        query["severity"] = severity

    cursor = db.tickets.find(query).sort("created_at", -1).limit(limit)
    tickets = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if isinstance(doc.get("created_at"), datetime):
            doc["created_at"] = doc["created_at"].isoformat()
        if isinstance(doc.get("resolved_at"), datetime):
            doc["resolved_at"] = doc["resolved_at"].isoformat()
        tickets.append(doc)
    return tickets


@router.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str):
    db = get_db()
    doc = await db.tickets.find_one({"ticket_id": ticket_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Ticket not found")
    doc["_id"] = str(doc["_id"])
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    return doc


@router.patch("/tickets/{ticket_id}/resolve")
async def resolve_ticket(ticket_id: str, body: TicketResolve):
    db = get_db()
    resolved_at = datetime.utcnow()
    result = await db.tickets.update_one(
        {"ticket_id": ticket_id},
        {"$set": {
            "status": TicketStatus.resolved.value,
            "resolved_at": resolved_at,
            "resolution_notes": body.resolution_notes
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")

    await ws_manager.broadcast("ticket_resolved", {
        "ticket_id": ticket_id,
        "resolved_at": resolved_at.isoformat(),
        "message": f"Ticket {ticket_id} has been resolved."
    })

    return {"status": "resolved", "ticket_id": ticket_id, "resolved_at": resolved_at.isoformat()}


@router.patch("/tickets/{ticket_id}/status")
async def update_ticket_status(ticket_id: str, status: str):
    db = get_db()
    valid_statuses = [s.value for s in TicketStatus]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    await db.tickets.update_one(
        {"ticket_id": ticket_id},
        {"$set": {"status": status}}
    )

    await ws_manager.broadcast("ticket_updated", {
        "ticket_id": ticket_id,
        "status": status
    })

    return {"status": "updated", "ticket_id": ticket_id, "new_status": status}
