"""
WhatsApp integration via Twilio for patient feedback and manager alerts.
"""
import os
import json
from typing import Optional
from twilio.rest import Client
from twilio.twiml.messaging_response import MessagingResponse
from dotenv import load_dotenv

load_dotenv()

# Twilio credentials
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155552671")

# Initialize Twilio client (only if credentials are configured)
twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)


async def send_whatsapp_message(
    to_number: str, 
    message: str, 
    media_url: Optional[str] = None
) -> bool:
    """
    Send a WhatsApp message via Twilio.
    
    Args:
        to_number: Recipient phone number (with country code, e.g., +1234567890)
        message: Message text
        media_url: Optional media URL (image/document)
    
    Returns:
        True if successful, False otherwise
    """
    if not twilio_client:
        print("⚠️ Twilio not configured - WhatsApp message not sent")
        return False
    
    try:
        msg = twilio_client.messages.create(
            from_=f"whatsapp:{TWILIO_WHATSAPP_NUMBER.replace('whatsapp:', '')}",
            to=f"whatsapp:{to_number.replace('whatsapp:', '').replace('+', '')}",
            body=message,
            media_url=media_url if media_url else None
        )
        print(f"✅ WhatsApp message sent to {to_number} (SID: {msg.sid})")
        return True
    except Exception as e:
        print(f"❌ Failed to send WhatsApp message: {e}")
        return False


def format_patient_feedback_message(feedback_data: dict) -> str:
    """Format patient feedback for WhatsApp confirmation."""
    return f"""
📝 **Feedback Received**

Thank you for your feedback! Here's what we captured:

**Sentiment:** {feedback_data.get('sentiment', 'N/A')}
**Category:** {feedback_data.get('category', 'N/A')}
**Severity:** {feedback_data.get('severity', 'N/A')}/5

**Response:** {feedback_data.get('resolution_message', 'Thank you for sharing.')}

We appreciate your input and will use it to improve our services.
""".strip()


def format_manager_alert_message(
    ticket_id: str,
    patient_name: str,
    feedback: str,
    severity: int,
    category: str,
    department: str
) -> str:
    """Format critical alert for manager on WhatsApp."""
    return f"""
🚨 **CRITICAL ALERT - Service Recovery**

**Ticket ID:** {ticket_id}
**Patient:** {patient_name}
**Department:** {department}
**Severity:** {severity}/5 ⚠️
**Category:** {category}

**Feedback:**
"{feedback[:150]}..."

⚡ Action Required: This complaint needs immediate attention.

Reply to reach the patient directly or visit the dashboard for details.
""".strip()


def format_ticket_resolved_message(ticket_id: str, resolution: str) -> str:
    """Format ticket resolution confirmation."""
    return f"""
✅ **Ticket Resolved**

**Ticket ID:** {ticket_id}

**Resolution:** {resolution}

Thank you for your patience. We hope you're satisfied with our response.
""".strip()


def parse_whatsapp_message(body: dict) -> dict:
    """
    Parse incoming WhatsApp message from Twilio webhook.
    
    Expected Twilio webhook payload includes:
    - From: Sender's WhatsApp number
    - To: Our WhatsApp number
    - Body: Message text
    - MediaContentType0: Type of media (if image/document sent)
    - MediaUrl0: URL of media
    """
    return {
        "from": body.get("From", "").replace("whatsapp:", ""),
        "to": body.get("To", "").replace("whatsapp:", ""),
        "message": body.get("Body", ""),
        "num_media": int(body.get("NumMedia", 0)),
        "media_url": body.get("MediaUrl0"),
        "media_type": body.get("MediaContentType0"),
    }


def create_whatsapp_response(message: str) -> str:
    """
    Create TwiML XML response for Twilio webhook.
    Twilio expects TwiML response to acknowledge receipt.
    """
    resp = MessagingResponse()
    resp.message(message)
    return str(resp)
