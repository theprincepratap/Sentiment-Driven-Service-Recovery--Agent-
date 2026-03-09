"""
WhatsApp API routes for receiving feedback and sending alerts.
"""
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.whatsapp_service import (
    send_whatsapp_message,
    format_patient_feedback_message,
    format_manager_alert_message,
    format_ticket_resolved_message,
    parse_whatsapp_message,
    create_whatsapp_response,
)
from services.gemini_service import analyze_feedback
from services.ticket_service import create_ticket
from db.mongodb import get_db
from models.schemas import Feedback, Ticket
import json

router = APIRouter()


class WhatsAppMessage(BaseModel):
    """Incoming WhatsApp message from Twilio."""
    patient_phone: str
    message: str
    patient_name: Optional[str] = None
    patient_id: Optional[str] = None


class WhatsAppAlert(BaseModel):
    """Send WhatsApp alert to manager."""
    manager_phone: str
    ticket_id: str
    patient_name: str
    feedback: str
    severity: int
    category: str
    department: str


@router.post("/whatsapp/webhook")
async def whatsapp_webhook(request: Request):
    """
    Receive incoming WhatsApp message from Twilio.
    Twilio sends form data, not JSON.
    """
    try:
        # Parse Twilio webhook form data
        form_data = await request.form()
        form_dict = dict(form_data)
        
        # Parse WhatsApp message
        parsed = parse_whatsapp_message(form_dict)
        phone = parsed["from"]
        message_text = parsed["message"]
        
        print(f"📱 WhatsApp message received from {phone}: {message_text}")
        
        # Get database
        db = await get_db()
        
        # Analyze feedback with Gemini
        analysis = await analyze_feedback(message_text)
        
        # Create feedback record
        feedback = Feedback(
            patient_phone=phone,
            feedback_text=message_text,
            sentiment=analysis.sentiment,
            emotion=analysis.emotion,
            category=analysis.category,
            severity=analysis.severity,
            source="whatsapp"
        )
        
        feedback_dict = feedback.dict()
        result = await db.feedback.insert_one(feedback_dict)
        feedback_id = str(result.inserted_id)
        
        # Send confirmation to patient
        confirmation_msg = format_patient_feedback_message({
            "sentiment": analysis.sentiment,
            "category": analysis.category,
            "severity": analysis.severity,
            "resolution_message": analysis.resolution_message,
        })
        
        await send_whatsapp_message(phone, confirmation_msg)
        
        # If negative, create ticket and alert manager
        if analysis.sentiment == "Negative" and analysis.severity >= 3:
            # Create ticket
            ticket = Ticket(
                patient_phone=phone,
                feedback_id=feedback_id,
                category=analysis.category,
                severity=analysis.severity,
                description=message_text,
                status="open",
            )
            
            ticket_dict = ticket.dict()
            ticket_result = await db.tickets.insert_one(ticket_dict)
            ticket_id = str(ticket_result.inserted_id)
            
            print(f"🎫 Complaint ticket created: {ticket_id}")
            
            # Send manager alert via WebSocket (existing system)
            # In production, also send WhatsApp alert to on-call manager
            # await send_whatsapp_message(manager_phone, alert_msg)
        
        # Return TwiML response
        response_text = "✅ Thank you! Your feedback has been received and analyzed. Our team will review it shortly."
        return create_whatsapp_response(response_text)
    
    except Exception as e:
        print(f"❌ WhatsApp webhook error: {e}")
        return create_whatsapp_response(
            "❌ Error processing your message. Please try again."
        )


@router.post("/whatsapp/send-patient-message")
async def send_patient_message(msg: WhatsAppMessage):
    """
    Send a direct message to a patient via WhatsApp.
    Used for follow-ups, resolutions, etc.
    """
    try:
        success = await send_whatsapp_message(msg.patient_phone, msg.message)
        return {
            "success": success,
            "phone": msg.patient_phone,
            "message": msg.message
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/whatsapp/send-alert")
async def send_manager_alert(alert: WhatsAppAlert):
    """
    Send critical alert to manager via WhatsApp.
    Called when high-severity complaint is created.
    """
    try:
        alert_msg = format_manager_alert_message(
            ticket_id=alert.ticket_id,
            patient_name=alert.patient_name,
            feedback=alert.feedback,
            severity=alert.severity,
            category=alert.category,
            department=alert.department
        )
        
        success = await send_whatsapp_message(alert.manager_phone, alert_msg)
        
        return {
            "success": success,
            "manager_phone": alert.manager_phone,
            "ticket_id": alert.ticket_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/whatsapp/notify-resolution")
async def notify_ticket_resolution(
    patient_phone: str,
    ticket_id: str,
    resolution: str
):
    """
    Notify patient that their complaint has been resolved.
    """
    try:
        msg = format_ticket_resolved_message(ticket_id, resolution)
        success = await send_whatsapp_message(patient_phone, msg)
        
        return {
            "success": success,
            "patient_phone": patient_phone,
            "ticket_id": ticket_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/whatsapp/status")
async def whatsapp_status():
    """Check if WhatsApp integration is configured."""
    import os
    has_credentials = bool(
        os.getenv("TWILIO_ACCOUNT_SID") and 
        os.getenv("TWILIO_AUTH_TOKEN")
    )
    
    return {
        "whatsapp_enabled": has_credentials,
        "message": "WhatsApp integration configured" if has_credentials else "Waiting for Twilio credentials in .env"
    }
