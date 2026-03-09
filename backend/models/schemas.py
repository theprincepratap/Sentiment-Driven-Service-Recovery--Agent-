from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class SentimentEnum(str, Enum):
    positive = "Positive"
    negative = "Negative"
    neutral = "Neutral"


class SeverityEnum(int, Enum):
    low = 1
    moderate = 2
    high = 3
    critical = 4
    extreme = 5


class TicketStatus(str, Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"
    escalated = "escalated"


# --- Patient ---
class Patient(BaseModel):
    patient_id: str
    name: str
    age: Optional[int] = None
    department: str
    discharge_date: Optional[datetime] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class PatientDischarge(BaseModel):
    patient_id: str
    name: str
    department: str
    phone: Optional[str] = None
    email: Optional[str] = None


# --- Feedback ---
class FeedbackSubmit(BaseModel):
    patient_id: str
    department: str
    text: str
    name: Optional[str] = "Anonymous"


class GeminiAnalysis(BaseModel):
    sentiment: str
    emotion: str
    category: str
    severity: int
    resolution_message: str


class Feedback(BaseModel):
    patient_id: str
    department: str
    text: str
    name: Optional[str] = "Anonymous"
    analysis: Optional[GeminiAnalysis] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# --- Ticket ---
class Ticket(BaseModel):
    ticket_id: Optional[str] = None
    patient_id: str
    patient_name: Optional[str] = "Anonymous"
    department: str
    category: str
    severity: int
    sentiment: str
    emotion: str
    original_feedback: str
    resolution_message: str
    status: TicketStatus = TicketStatus.open
    assigned_manager: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None
    escalated: bool = False


class TicketResolve(BaseModel):
    resolution_notes: Optional[str] = None


# --- Manager ---
class Manager(BaseModel):
    manager_id: str
    name: str
    department: str
    email: str
    phone: Optional[str] = None
    role: str = "Duty Manager"


# --- Notification / Alert ---
class ManagerNotification(BaseModel):
    alert_type: str
    department: str
    patient_id: str
    severity: int
    message: str
    ticket_id: Optional[str] = None
    manager_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    read: bool = False


# --- Department ---
class Department(BaseModel):
    name: str
    head_name: str
    head_email: str
    complaint_count: int = 0


# --- Report ---
class Report(BaseModel):
    week_start: datetime
    week_end: datetime
    total_feedback: int
    negative_count: int
    positive_count: int
    neutral_count: int
    avg_severity: float
    top_categories: List[dict]
    department_breakdown: List[dict]
    created_at: datetime = Field(default_factory=datetime.utcnow)


# --- WebSocket Events ---
class WSEvent(BaseModel):
    event_type: str  # new_feedback | new_ticket | ticket_resolved | manager_alert | escalation
    data: dict
    timestamp: datetime = Field(default_factory=datetime.utcnow)
