"""
Enhanced Models for Merchant Follow Up Platform
Includes: Drip Campaigns, Lead Capture, Analytics, Teams, Compliance, etc.
"""
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

# ============== ENUMS ==============

class ChannelType(str, Enum):
    SMS = "sms"
    EMAIL = "email"

class CampaignStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"

class ContactCampaignStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    STOPPED_REPLY = "stopped_reply"
    COMPLETED = "completed"
    UNSUBSCRIBED = "unsubscribed"

class FollowUpStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    SNOOZED = "snoozed"
    MISSED = "missed"
    RESCHEDULED = "rescheduled"

class LeadSource(str, Enum):
    MANUAL = "manual"
    FORM = "form"
    CSV = "csv"
    API = "api"
    ZAPIER = "zapier"
    FACEBOOK = "facebook"

class TeamRole(str, Enum):
    ADMIN = "admin"
    AGENT = "agent"
    VIEWER = "viewer"

class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

# ============== ENHANCED DRIP CAMPAIGN MODELS ==============

class CampaignStep(BaseModel):
    """Single step in a drip campaign"""
    id: str
    order: int
    channel: ChannelType = ChannelType.SMS
    message: str
    delay_days: int = 0
    delay_hours: int = 0
    delay_minutes: int = 0
    subject: Optional[str] = None  # For email
    template_id: Optional[str] = None

class CampaignTrigger(BaseModel):
    """Trigger condition for campaigns"""
    keywords: List[str]
    action: str = "stop"  # stop, skip_to_step, send_response
    response_message: Optional[str] = None
    skip_to_step: Optional[int] = None

class EnhancedCampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    steps: List[CampaignStep] = []
    triggers: List[CampaignTrigger] = []
    stop_on_reply: bool = True
    target_tags: List[str] = []
    status: CampaignStatus = CampaignStatus.DRAFT
    duration_days: int = 30  # Campaign duration in days
    use_funded_term: bool = False  # Auto-use funded deal term for duration

class EnhancedCampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    steps: Optional[List[CampaignStep]] = None
    triggers: Optional[List[CampaignTrigger]] = None
    stop_on_reply: Optional[bool] = None
    target_tags: Optional[List[str]] = None
    status: Optional[CampaignStatus] = None
    duration_days: Optional[int] = None
    use_funded_term: Optional[bool] = None

class EnhancedCampaignResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    steps: List[Dict[str, Any]] = []
    triggers: List[Dict[str, Any]] = []
    stop_on_reply: bool = True
    target_tags: List[str] = []
    status: str
    contacts_enrolled: int = 0
    contacts_completed: int = 0
    total_messages_sent: int = 0
    total_replies: int = 0
    created_at: str
    updated_at: str

class ContactCampaignEnrollment(BaseModel):
    """Track a contact's progress in a campaign"""
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    client_id: str
    campaign_id: str
    current_step: int = 0
    status: str = "active"
    enrolled_at: str
    next_message_at: Optional[str] = None
    completed_at: Optional[str] = None
    stopped_reason: Optional[str] = None

# ============== FOLLOW-UP REMINDER MODELS ==============

class EnhancedFollowUpCreate(BaseModel):
    client_id: str
    title: str
    description: Optional[str] = None
    scheduled_date: str
    scheduled_time: str = "09:00"
    reminder_type: str = "call"  # call, sms, email, meeting
    priority: str = "normal"  # high, normal, low
    snooze_until: Optional[str] = None

class EnhancedFollowUpUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    reminder_type: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    snooze_until: Optional[str] = None

class EnhancedFollowUpResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    client_id: str
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    title: str
    description: Optional[str] = None
    scheduled_date: str
    scheduled_time: str
    reminder_type: str
    priority: str = "normal"
    status: str
    snooze_until: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: str

# ============== CONVERSATION INBOX MODELS ==============

class ConversationFilter(BaseModel):
    channel: Optional[ChannelType] = None
    tags: Optional[List[str]] = None
    search: Optional[str] = None
    unread_only: bool = False

class MessageCreate(BaseModel):
    client_id: str
    channel: ChannelType = ChannelType.SMS
    content: str
    subject: Optional[str] = None  # For email

class ConversationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    client_id: str
    client_name: str
    client_phone: Optional[str] = None
    client_email: Optional[str] = None
    last_message: Optional[str] = None
    last_message_at: Optional[str] = None
    unread_count: int = 0
    channel: str = "sms"
    tags: List[str] = []

# ============== LEAD CAPTURE MODELS ==============

class LeadFormCreate(BaseModel):
    name: str
    fields: List[Dict[str, Any]]  # [{name, type, required, label}]
    redirect_url: Optional[str] = None
    auto_campaign_id: Optional[str] = None
    auto_tags: List[str] = []
    webhook_url: Optional[str] = None

class LeadFormResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    fields: List[Dict[str, Any]]
    redirect_url: Optional[str] = None
    auto_campaign_id: Optional[str] = None
    auto_tags: List[str] = []
    webhook_url: Optional[str] = None
    form_url: str
    submissions_count: int = 0
    created_at: str

class LeadSubmission(BaseModel):
    form_id: str
    data: Dict[str, Any]
    source: LeadSource = LeadSource.FORM

class CSVImportRequest(BaseModel):
    mapping: Dict[str, str]  # {csv_column: field_name}
    auto_tags: List[str] = []
    auto_campaign_id: Optional[str] = None

# ============== ANALYTICS MODELS ==============

class AnalyticsDateRange(BaseModel):
    start_date: str
    end_date: str

class AnalyticsResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    total_messages_sent: int = 0
    total_replies: int = 0
    response_rate: float = 0.0
    conversations_started: int = 0
    campaigns_active: int = 0
    top_templates: List[Dict[str, Any]] = []
    top_campaigns: List[Dict[str, Any]] = []
    messages_by_day: List[Dict[str, Any]] = []
    replies_by_day: List[Dict[str, Any]] = []

# ============== APPOINTMENT MODELS ==============

class AppointmentTypeCreate(BaseModel):
    name: str
    duration_minutes: int = 30
    description: Optional[str] = None
    color: str = "#F97316"
    buffer_minutes: int = 0

class AppointmentTypeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    duration_minutes: int
    description: Optional[str] = None
    color: str
    buffer_minutes: int
    booking_url: str
    created_at: str

class AppointmentCreate(BaseModel):
    client_id: str
    appointment_type_id: str
    scheduled_date: str
    scheduled_time: str
    notes: Optional[str] = None

class AppointmentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    client_id: str
    client_name: Optional[str] = None
    appointment_type_id: str
    appointment_type_name: Optional[str] = None
    scheduled_date: str
    scheduled_time: str
    duration_minutes: int
    notes: Optional[str] = None
    status: str
    reminder_sent: bool = False
    created_at: str

# ============== TEAM MODELS ==============

class TeamMemberInvite(BaseModel):
    email: EmailStr
    role: TeamRole = TeamRole.AGENT
    name: str

class TeamMemberResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    team_owner_id: str
    email: str
    name: str
    role: str
    status: str  # pending, active, inactive
    assigned_contacts: int = 0
    messages_sent: int = 0
    created_at: str

class TeamAssignment(BaseModel):
    client_ids: List[str]
    team_member_id: str

# ============== SMS COMPLIANCE MODELS ==============

class OptOutRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    phone_number: str
    opted_out_at: str
    reason: str = "STOP"
    channel: str = "sms"

class ComplianceSettings(BaseModel):
    stop_keywords: List[str] = ["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]
    opt_in_required: bool = True
    auto_reply_on_stop: str = "You have been unsubscribed. Reply START to re-subscribe."
    quiet_hours_start: Optional[str] = None  # "21:00"
    quiet_hours_end: Optional[str] = None  # "08:00"

# ============== AI SUGGESTION MODELS ==============

class AISuggestionRequest(BaseModel):
    conversation_context: List[Dict[str, str]]  # [{role, content}]
    tone: str = "professional"  # professional, friendly, urgent
    action: str = "reply"  # reply, follow_up, rewrite

class AISuggestionResponse(BaseModel):
    suggestions: List[str]
    rewritten_message: Optional[str] = None

# ============== DEAD LEAD REVIVAL MODELS ==============

class RevivalCampaignCreate(BaseModel):
    name: str
    days_inactive: int = 30
    target_tags: List[str] = []
    exclude_tags: List[str] = []
    message: str
    channel: ChannelType = ChannelType.SMS

class RevivalCampaignResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    days_inactive: int
    target_tags: List[str] = []
    exclude_tags: List[str] = []
    message: str
    channel: str
    eligible_contacts: int = 0
    messages_sent: int = 0
    replies_received: int = 0
    last_run_at: Optional[str] = None
    status: str
    created_at: str

# ============== ENHANCED CLIENT MODELS ==============

class EnhancedClientCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: str
    company: Optional[str] = None
    notes: Optional[str] = None
    balance: float = 0.0
    tags: List[str] = []
    birthday: Optional[str] = None
    source: LeadSource = LeadSource.MANUAL
    pipeline_stage: str = "new"
    assigned_to: Optional[str] = None  # Team member ID
    custom_fields: Dict[str, Any] = {}
    opted_in_sms: bool = True
    opted_in_email: bool = True

class EnhancedClientResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    email: Optional[str] = None
    phone: str
    company: Optional[str] = None
    notes: Optional[str] = None
    balance: float = 0.0
    tags: List[str] = []
    birthday: Optional[str] = None
    special_events: List[Dict[str, str]] = []
    source: str = "manual"
    pipeline_stage: str = "new"
    assigned_to: Optional[str] = None
    custom_fields: Dict[str, Any] = {}
    opted_in_sms: bool = True
    opted_in_email: bool = True
    last_contacted_at: Optional[str] = None
    last_reply_at: Optional[str] = None
    total_messages: int = 0
    active_campaigns: List[str] = []
    created_at: str
    updated_at: str

# ============== NOTIFICATION MODELS ==============

class NotificationCreate(BaseModel):
    type: str  # new_message, follow_up, appointment, campaign_response
    title: str
    body: str
    data: Dict[str, Any] = {}

class NotificationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    type: str
    title: str
    body: str
    data: Dict[str, Any] = {}
    read: bool = False
    created_at: str

# Pipeline stages for contacts
PIPELINE_STAGES = [
    "new_lead",
    "interested",
    "application_sent",
    "docs_submitted",
    "approved",
    "funded",
    "dead",
    "future"
]

# Extended tags
EXTENDED_TAGS = [
    "Hot Lead",
    "Cold Lead",
    "Warm Lead",
    "SBA",
    "Equipment Financing",
    "Real Estate Loan",
    "Working Capital",
    "High Revenue",
    "Low Credit",
    "Broker",
    "Referral",
    "VIP",
    "Do Not Contact",
    "Requires Follow Up",
    "Application Pending",
    "Documents Needed"
]
