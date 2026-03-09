from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class Patient(BaseModel):
    patientId: str
    name: str
    phone: str
    email: Optional[str] = None
    ward: Optional[str] = None
    department: str
    admittedAt: Optional[datetime] = None
    dischargedAt: Optional[datetime] = None
    billingStatus: str = "Admitted"       # Admitted | Paid | Discharged
    surveyStatus: str = "not_sent"        # not_sent | sent | responded
    surveyUrl: Optional[str] = None
    surveySentAt: Optional[datetime] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)