"""
Mock data for the Sentiment-Driven Service Recovery Agent simulation.
Includes 10 discharged patients, 5 survey responses, and manager directory.
"""

from datetime import date

# 10 discharged patients with billing cleared today
DISCHARGED_PATIENTS = [
    {"patient_id": "P-1001", "name": "Arjun Sharma",    "phone": "+91-9811001001", "department": "Emergency",       "age": 45},
    {"patient_id": "P-1002", "name": "Priya Mehta",     "phone": "+91-9811001002", "department": "Cardiology",      "age": 62},
    {"patient_id": "P-1003", "name": "Ravi Patel",      "phone": "+91-9811001003", "department": "Orthopedics",     "age": 38},
    {"patient_id": "P-1004", "name": "Sunita Verma",    "phone": "+91-9811001004", "department": "Pediatrics",      "age": 29},
    {"patient_id": "P-1005", "name": "Mohammed Khan",   "phone": "+91-9811001005", "department": "General Medicine","age": 54},
    {"patient_id": "P-1006", "name": "Deepa Nair",      "phone": "+91-9811001006", "department": "Emergency",       "age": 33},
    {"patient_id": "P-1007", "name": "Vikram Singh",    "phone": "+91-9811001007", "department": "Neurology",       "age": 67},
    {"patient_id": "P-1008", "name": "Anita Joshi",     "phone": "+91-9811001008", "department": "Cardiology",      "age": 51},
    {"patient_id": "P-1009", "name": "Sanjay Gupta",    "phone": "+91-9811001009", "department": "Emergency",       "age": 40},
    {"patient_id": "P-1010", "name": "Kavitha Reddy",   "phone": "+91-9811001010", "department": "Orthopedics",     "age": 44},
]

# 5 simulated survey responses (2 negative, 1 neutral, 2 positive)
SURVEY_RESPONSES = {
    "P-1001": "The waiting time in the emergency ward was absolutely terrible. We waited over 4 hours with no updates from any staff. The nurse was rude when we asked for help. This is completely unacceptable for an emergency department.",
    "P-1002": "I am very disappointed with the billing department. They charged me for tests that were never conducted. When I raised the issue, the staff was dismissive and unhelpful. I want a full refund and a proper explanation.",
    "P-1003": "The experience was average. The doctor explained things adequately and the room was clean. Wait times were a bit long but not extreme. Food could be better.",
    "P-1004": "Dr. Priya and her entire team were absolutely wonderful. They made my child feel so comfortable and explained everything clearly. The nurses were kind and attentive. Truly exceptional care!",
    "P-1005": "I had a great experience overall. The cardiology team was professional and the facilities were modern and clean. Very impressed with the level of care I received. Will definitely recommend to others.",
}

# Note: P-1006 to P-1010 have no survey response yet (pending)

# Manager directory with notification preferences
MANAGER_DIRECTORY = {
    "Emergency": {
        "manager_id": "MGR-001",
        "name": "Dr. Sunita Sharma",
        "email": "s.sharma@hospital.com",
        "phone": "+91-9900001001",
        "notification_pref": "push+sms",
        "dept_head": "Dr. Ramesh Chandra",
        "dept_head_email": "r.chandra@hospital.com",
    },
    "Cardiology": {
        "manager_id": "MGR-002",
        "name": "Dr. Jayesh Kapoor",
        "email": "j.kapoor@hospital.com",
        "phone": "+91-9900001002",
        "notification_pref": "push",
        "dept_head": "Dr. Amita Singh",
        "dept_head_email": "a.singh@hospital.com",
    },
    "Orthopedics": {
        "manager_id": "MGR-003",
        "name": "Dr. Leela Nair",
        "email": "l.nair@hospital.com",
        "phone": "+91-9900001003",
        "notification_pref": "push+email",
        "dept_head": "Dr. Mahesh Walia",
        "dept_head_email": "m.walia@hospital.com",
    },
    "Pediatrics": {
        "manager_id": "MGR-004",
        "name": "Dr. Anil Mehta",
        "email": "a.mehta@hospital.com",
        "phone": "+91-9900001004",
        "notification_pref": "push",
        "dept_head": "Dr. Fatima Shaikh",
        "dept_head_email": "f.shaikh@hospital.com",
    },
    "General Medicine": {
        "manager_id": "MGR-006",
        "name": "Dr. Rajesh Patel",
        "email": "r.patel@hospital.com",
        "phone": "+91-9900001006",
        "notification_pref": "push+email",
        "dept_head": "Dr. Heena Malhotra",
        "dept_head_email": "h.malhotra@hospital.com",
    },
    "Neurology": {
        "manager_id": "MGR-005",
        "name": "Dr. Ekta Chaudhary",
        "email": "e.chaudhary@hospital.com",
        "phone": "+91-9900001005",
        "notification_pref": "sms",
        "dept_head": "Dr. Ishaan Prasad",
        "dept_head_email": "i.prasad@hospital.com",
    },
}

# Weekly complaint tracker (for escalation logic)
# Simulated existing complaints this week for Emergency dept / wait_time
WEEKLY_COMPLAINTS = [
    {"department": "Emergency", "category": "wait_time", "patient_id": "P-0901"},
    {"department": "Emergency", "category": "wait_time", "patient_id": "P-0923"},
    {"department": "Emergency", "category": "staff_behavior", "patient_id": "P-0934"},
]

# Google Review link per dept
REVIEW_LINKS = {
    "Emergency":       "https://g.page/r/hospital-emergency/review",
    "Cardiology":      "https://g.page/r/hospital-cardiology/review",
    "Orthopedics":     "https://g.page/r/hospital-orthopedics/review",
    "Pediatrics":      "https://g.page/r/hospital-pediatrics/review",
    "General Medicine":"https://g.page/r/hospital-general/review",
    "Neurology":       "https://g.page/r/hospital-neurology/review",
}
