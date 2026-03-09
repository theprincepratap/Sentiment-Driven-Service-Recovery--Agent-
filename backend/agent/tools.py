"""
Simulated tools for the Service Recovery Agent.
Each tool mimics a real integration (WhatsApp, CRM, etc.) but uses mock data.
All tool calls are logged for the agent execution trace.
"""

import uuid
from datetime import datetime, date
from typing import Optional
from agent.mock_data import (
    DISCHARGED_PATIENTS, SURVEY_RESPONSES, MANAGER_DIRECTORY,
    WEEKLY_COMPLAINTS, REVIEW_LINKS
)

# In-memory log of all tool calls during an agent run
_tool_log: list[dict] = []
_crm_tickets: list[dict] = []
_sent_surveys: list[dict] = []
_sent_messages: list[dict] = []
_manager_alerts: list[dict] = []
_escalations: list[dict] = []


def reset_state():
    """Reset all in-memory state for a fresh agent run."""
    global _tool_log, _crm_tickets, _sent_surveys, _sent_messages, _manager_alerts, _escalations
    _tool_log = []
    _crm_tickets = []
    _sent_surveys = []
    _sent_messages = []
    _manager_alerts = []
    _escalations = []


def _log(tool_name: str, input_args: dict, output: dict):
    _tool_log.append({
        "tool": tool_name,
        "input": input_args,
        "output": output,
        "timestamp": datetime.utcnow().isoformat()
    })
    return output


def get_state():
    return {
        "tool_log": _tool_log,
        "crm_tickets": _crm_tickets,
        "sent_surveys": _sent_surveys,
        "sent_messages": _sent_messages,
        "manager_alerts": _manager_alerts,
        "escalations": _escalations
    }


# ─────────────────────────────────────────────────────────────────────────────
# TOOL 1: get_discharged_patients
# ─────────────────────────────────────────────────────────────────────────────
def get_discharged_patients(query_date: str = None) -> dict:
    """Returns patients whose billing was cleared on the given date (or today)."""
    result = {
        "date": query_date or str(date.today()),
        "count": len(DISCHARGED_PATIENTS),
        "patients": DISCHARGED_PATIENTS
    }
    return _log("get_discharged_patients", {"date": query_date}, result)


# ─────────────────────────────────────────────────────────────────────────────
# TOOL 2: send_survey
# ─────────────────────────────────────────────────────────────────────────────
def send_survey(patient_id: str, channel: str = "WhatsApp") -> dict:
    patient = next((p for p in DISCHARGED_PATIENTS if p["patient_id"] == patient_id), None)
    if not patient:
        return _log("send_survey", {"patient_id": patient_id}, {"error": "Patient not found"})

    survey_url = f"https://survey.hospital.com/feedback/{patient_id}"
    record = {
        "patient_id": patient_id,
        "name": patient["name"],
        "phone": patient["phone"],
        "channel": channel,
        "survey_url": survey_url,
        "sent_at": datetime.utcnow().isoformat(),
        "status": "delivered"
    }
    _sent_surveys.append(record)
    return _log("send_survey", {"patient_id": patient_id, "channel": channel}, record)


# ─────────────────────────────────────────────────────────────────────────────
# TOOL 3: get_survey_response
# ─────────────────────────────────────────────────────────────────────────────
def get_survey_response(patient_id: str) -> dict:
    response_text = SURVEY_RESPONSES.get(patient_id)
    if not response_text:
        result = {"patient_id": patient_id, "status": "pending", "response": None}
    else:
        result = {
            "patient_id": patient_id,
            "status": "received",
            "response": response_text,
            "received_at": datetime.utcnow().isoformat()
        }
    return _log("get_survey_response", {"patient_id": patient_id}, result)


# ─────────────────────────────────────────────────────────────────────────────
# TOOL 4: analyze_sentiment
# ─────────────────────────────────────────────────────────────────────────────
def analyze_sentiment(response_text: str, patient_id: str = None) -> dict:
    """
    Rule-based fallback analyzer. In production this calls Gemini.
    Returns sentiment + complaint entities.
    """
    text_lower = response_text.lower()

    # Keyword maps
    neg_words = ["rude", "terrible", "unacceptable", "disappointed", "worst",
                 "charged", "wrong bill", "waited", "hours", "no update", "dismissive",
                 "unhelpful", "refund", "error"]
    pos_words = ["wonderful", "exceptional", "great", "impressed", "recommend",
                 "professional", "kind", "attentive", "excellent", "comfortable"]

    neg_score = sum(1 for w in neg_words if w in text_lower)
    pos_score = sum(1 for w in pos_words if w in text_lower)

    if neg_score >= 3:
        sentiment = "Negative"
        emotion = "Angry" if any(w in text_lower for w in ["rude", "unacceptable", "worst"]) else "Frustrated"
    elif pos_score >= 3:
        sentiment = "Positive"
        emotion = "Satisfied"
    else:
        sentiment = "Neutral"
        emotion = "Neutral"

    # Entity extraction
    entities = []
    if any(w in text_lower for w in ["wait", "hours", "long", "delay"]):
        entities.append({"entity": "wait_time", "severity": 4})
    if any(w in text_lower for w in ["rude", "staff", "nurse", "dismissive", "unhelpful"]):
        entities.append({"entity": "staff_behavior", "severity": 4})
    if any(w in text_lower for w in ["bill", "charged", "refund", "payment", "wrong"]):
        entities.append({"entity": "billing_error", "severity": 5})
    if any(w in text_lower for w in ["clean", "dirty", "hygiene"]):
        entities.append({"entity": "cleanliness", "severity": 3})
    if any(w in text_lower for w in ["food", "meal"]):
        entities.append({"entity": "food_quality", "severity": 2})

    overall_severity = max((e["severity"] for e in entities), default=1) if sentiment == "Negative" else 1

    result = {
        "patient_id": patient_id,
        "sentiment": sentiment,
        "emotion": emotion,
        "complaint_entities": entities,
        "overall_severity": overall_severity,
        "primary_category": entities[0]["entity"] if entities else "general",
        "requires_ticket": sentiment == "Negative",
        "reviewed_at": datetime.utcnow().isoformat()
    }
    return _log("analyze_sentiment", {"patient_id": patient_id, "text_snippet": response_text[:80]}, result)


# ─────────────────────────────────────────────────────────────────────────────
# TOOL 5: create_crm_ticket
# ─────────────────────────────────────────────────────────────────────────────
def create_crm_ticket(patient_id: str, category: str, severity: int, description: str) -> dict:
    patient = next((p for p in DISCHARGED_PATIENTS if p["patient_id"] == patient_id), None)
    ticket_id = f"TKT-{str(uuid.uuid4())[:8].upper()}"
    department = patient["department"] if patient else "Unknown"

    ticket = {
        "ticket_id": ticket_id,
        "patient_id": patient_id,
        "patient_name": patient["name"] if patient else "Unknown",
        "department": department,
        "category": category,
        "severity": severity,
        "description": description,
        "status": "open",
        "sla_deadline": "15 minutes",
        "created_at": datetime.utcnow().isoformat()
    }
    _crm_tickets.append(ticket)

    # Check for escalation: 3+ same category complaints this week from same dept
    same_week = [c for c in WEEKLY_COMPLAINTS if c["department"] == department and c["category"] == category]
    if len(same_week) >= 2:  # 2 existing + this one = 3 total → escalate
        mgr_info = MANAGER_DIRECTORY.get(department, {})
        escalation = {
            "trigger": "auto_escalation",
            "department": department,
            "category": category,
            "total_complaints": len(same_week) + 1,
            "dept_head": mgr_info.get("dept_head", "Department Head"),
            "dept_head_email": mgr_info.get("dept_head_email", ""),
            "message": (
                f"⚠️ ESCALATION ALERT: {len(same_week) + 1} '{category}' complaints "
                f"in {department} department this week. Immediate review required by "
                f"{mgr_info.get('dept_head', 'Department Head')}."
            ),
            "escalated_at": datetime.utcnow().isoformat()
        }
        _escalations.append(escalation)
        ticket["auto_escalated"] = True
        ticket["escalation"] = escalation

    return _log("create_crm_ticket", {
        "patient_id": patient_id, "category": category, "severity": severity
    }, ticket)


# ─────────────────────────────────────────────────────────────────────────────
# TOOL 6: notify_duty_manager
# ─────────────────────────────────────────────────────────────────────────────
def notify_duty_manager(manager_id: str, ticket_id: str, urgency: str, department: str = None) -> dict:
    # Find manager by ID or dept
    mgr_info = None
    if department:
        mgr_info = MANAGER_DIRECTORY.get(department)
    if not mgr_info:
        for dept, mgr in MANAGER_DIRECTORY.items():
            if mgr["manager_id"] == manager_id:
                mgr_info = mgr
                mgr_info = {**mgr, "department": dept}
                break

    if not mgr_info:
        return _log("notify_duty_manager", {"manager_id": manager_id}, {"error": "Manager not found"})

    alert = {
        "manager_id": manager_id,
        "manager_name": mgr_info["name"],
        "ticket_id": ticket_id,
        "urgency": urgency,
        "channel": mgr_info.get("notification_pref", "push"),
        "message": (
            f"🚨 [{urgency.upper()}] New complaint ticket {ticket_id} requires your "
            f"attention within 15 minutes. Please log in to the CRM to respond."
        ),
        "sla": "15 minutes",
        "notified_at": datetime.utcnow().isoformat(),
        "delivery_status": "sent"
    }
    _manager_alerts.append(alert)
    return _log("notify_duty_manager", {
        "manager_id": manager_id, "ticket_id": ticket_id, "urgency": urgency
    }, alert)


# ─────────────────────────────────────────────────────────────────────────────
# TOOL 7: send_resolution_message
# ─────────────────────────────────────────────────────────────────────────────
def send_resolution_message(patient_id: str, contact_name: str, personalized_message: str) -> dict:
    patient = next((p for p in DISCHARGED_PATIENTS if p["patient_id"] == patient_id), None)
    mgr_info = None
    if patient:
        mgr_info = MANAGER_DIRECTORY.get(patient.get("department", ""))

    record = {
        "patient_id": patient_id,
        "patient_name": patient["name"] if patient else "Unknown",
        "phone": patient["phone"] if patient else "Unknown",
        "contact_name": contact_name,
        "message": personalized_message,
        "channel": "WhatsApp",
        "sent_at": datetime.utcnow().isoformat(),
        "delivery_status": "delivered",
        "estimated_delivery": "< 5 minutes"
    }
    _sent_messages.append(record)
    return _log("send_resolution_message", {
        "patient_id": patient_id,
        "contact_name": contact_name,
        "message_snippet": personalized_message[:100]
    }, record)


# ─────────────────────────────────────────────────────────────────────────────
# BONUS: send_google_review_nudge
# ─────────────────────────────────────────────────────────────────────────────
def send_review_nudge(patient_id: str) -> dict:
    patient = next((p for p in DISCHARGED_PATIENTS if p["patient_id"] == patient_id), None)
    if not patient:
        return _log("send_review_nudge", {"patient_id": patient_id}, {"error": "Patient not found"})

    dept = patient.get("department", "General Medicine")
    review_link = REVIEW_LINKS.get(dept, "https://g.page/r/hospital/review")

    message = (
        f"Dear {patient['name']}, thank you for choosing our hospital! "
        f"We're so glad your experience was positive. "
        f"Would you mind sharing your experience on Google? It helps others find great care. "
        f"👉 {review_link}"
    )
    record = {
        "patient_id": patient_id,
        "patient_name": patient["name"],
        "phone": patient["phone"],
        "message": message,
        "review_link": review_link,
        "channel": "WhatsApp",
        "sent_at": datetime.utcnow().isoformat(),
        "delivery_status": "delivered"
    }
    _sent_messages.append(record)
    return _log("send_review_nudge", {"patient_id": patient_id}, record)


# Tool registry (for Gemini function declarations)
TOOL_FUNCTIONS = {
    "get_discharged_patients": get_discharged_patients,
    "send_survey": send_survey,
    "get_survey_response": get_survey_response,
    "analyze_sentiment": analyze_sentiment,
    "create_crm_ticket": create_crm_ticket,
    "notify_duty_manager": notify_duty_manager,
    "send_resolution_message": send_resolution_message,
    "send_review_nudge": send_review_nudge,
}
