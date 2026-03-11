"""
Gmail Integration Routes
- OAuth flow for Gmail connection
- Send emails (team invitations, notifications)
- Read emails (import leads, track conversations)
"""
import os
import uuid
import base64
import warnings
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build
from motor.motor_asyncio import AsyncIOMotorClient

# Environment variables
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://sms-deal-pipeline.preview.emergentagent.com")

# Initialize MongoDB
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

router = APIRouter(prefix="/gmail", tags=["Gmail"])

# Gmail scopes
GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.labels",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile"
]

# Pydantic models
class EmailSend(BaseModel):
    to: str
    subject: str
    body: str
    html: Optional[bool] = False

class EmailFilter(BaseModel):
    query: Optional[str] = None
    max_results: int = 20
    label_ids: Optional[List[str]] = None


def get_redirect_uri():
    """Get the OAuth redirect URI based on environment"""
    # Read from frontend .env if not set in backend
    backend_url = os.environ.get("BACKEND_URL")
    if not backend_url:
        # Try to read from frontend .env
        try:
            with open('/app/frontend/.env', 'r') as f:
                for line in f:
                    if line.startswith('REACT_APP_BACKEND_URL='):
                        backend_url = line.split('=', 1)[1].strip()
                        break
        except:
            backend_url = FRONTEND_URL
    return f"{backend_url}/api/gmail/callback"


def get_oauth_flow(state: str = None):
    """Create OAuth flow with client config"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google OAuth credentials not configured")
    
    client_config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token"
        }
    }
    
    flow = Flow.from_client_config(
        client_config,
        scopes=GMAIL_SCOPES,
        redirect_uri=get_redirect_uri()
    )
    
    if state:
        flow.state = state
    
    return flow


async def get_current_user_from_token(token: str):
    """Verify JWT token and return user - simplified for Gmail routes"""
    import jwt
    JWT_SECRET = os.environ.get("JWT_SECRET", "merchant-followup-secret-key-2024")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"user_id": user_id}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_gmail_credentials(user_id: str) -> Optional[Credentials]:
    """Get stored Gmail credentials for a user"""
    token_doc = await db.gmail_tokens.find_one({"user_id": user_id})
    
    if not token_doc:
        return None
    
    creds = Credentials(
        token=token_doc.get("access_token"),
        refresh_token=token_doc.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET
    )
    
    # Check if token needs refresh
    expires_at = token_doc.get("expires_at")
    if expires_at:
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        
        if datetime.now(timezone.utc) >= expires_at:
            try:
                creds.refresh(GoogleRequest())
                # Update stored token
                await db.gmail_tokens.update_one(
                    {"user_id": user_id},
                    {"$set": {
                        "access_token": creds.token,
                        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1)
                    }}
                )
            except Exception as e:
                # Token refresh failed, user needs to re-authenticate
                await db.gmail_tokens.delete_one({"user_id": user_id})
                return None
    
    return creds


# ============== OAuth Routes ==============

@router.get("/auth")
async def gmail_auth_start(token: str = Query(..., description="JWT token for user identification")):
    """Start Gmail OAuth flow"""
    user = await get_current_user_from_token(token)
    user_id = user["user_id"]
    
    flow = get_oauth_flow()
    
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        prompt='consent',
        include_granted_scopes='true'
    )
    
    # Store state with user_id and code_verifier for callback verification
    # The flow object has the code_verifier after authorization_url is called
    code_verifier = flow.code_verifier if hasattr(flow, 'code_verifier') else None
    
    await db.oauth_states.insert_one({
        "state": state,
        "user_id": user_id,
        "code_verifier": code_verifier,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10)
    })
    
    return RedirectResponse(authorization_url)


@router.get("/callback")
async def gmail_auth_callback(code: str = None, state: str = None, error: str = None):
    """Handle Gmail OAuth callback"""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"Gmail callback received - code: {code[:20] if code else None}..., state: {state}, error: {error}")
    
    if error:
        logger.error(f"Gmail OAuth error from Google: {error}")
        return RedirectResponse(f"{FRONTEND_URL}/settings?gmail_error={error}")
    
    if not code or not state:
        logger.error("Missing code or state in callback")
        return RedirectResponse(f"{FRONTEND_URL}/settings?gmail_error=missing_params")
    
    # Verify state and get user_id
    state_doc = await db.oauth_states.find_one({"state": state})
    if not state_doc:
        logger.error(f"State not found in database: {state}")
        return RedirectResponse(f"{FRONTEND_URL}/settings?gmail_error=invalid_state")
    
    user_id = state_doc["user_id"]
    code_verifier = state_doc.get("code_verifier")
    logger.info(f"Found user_id: {user_id} for state, code_verifier present: {code_verifier is not None}")
    
    # Clean up state
    await db.oauth_states.delete_one({"state": state})
    
    # Check if state expired
    expires_at = state_doc["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if datetime.now(timezone.utc) > expires_at:
        logger.error("State expired")
        return RedirectResponse(f"{FRONTEND_URL}/settings?gmail_error=state_expired")
    
    try:
        redirect_uri = get_redirect_uri()
        logger.info(f"Using redirect URI: {redirect_uri}")
        
        flow = get_oauth_flow(state)
        
        # Set the code_verifier if we have one
        if code_verifier:
            flow.code_verifier = code_verifier
        
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                flow.fetch_token(code=code)
            logger.info("Token fetch completed")
        except Exception as token_error:
            logger.error(f"Token fetch failed: {token_error}")
            import traceback
            logger.error(traceback.format_exc())
            return RedirectResponse(f"{FRONTEND_URL}/settings?gmail_error=token_fetch_failed")
        
        creds = flow.credentials
        logger.info("Token fetched successfully")
        
        # Get user's email address
        try:
            service = build('gmail', 'v1', credentials=creds)
            profile = service.users().getProfile(userId='me').execute()
            email_address = profile.get('emailAddress')
            logger.info(f"Got email address: {email_address}")
        except Exception as gmail_error:
            logger.error(f"Gmail API error: {gmail_error}")
            return RedirectResponse(f"{FRONTEND_URL}/settings?gmail_error=gmail_api_failed")
        
        # Store tokens
        await db.gmail_tokens.update_one(
            {"user_id": user_id},
            {"$set": {
                "user_id": user_id,
                "email": email_address,
                "access_token": creds.token,
                "refresh_token": creds.refresh_token,
                "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
                "connected_at": datetime.now(timezone.utc)
            }},
            upsert=True
        )
        
        return RedirectResponse(f"{FRONTEND_URL}/settings?gmail_connected=true")
        
    except Exception as e:
        import traceback
        logger.error(f"Gmail OAuth error: {e}")
        logger.error(traceback.format_exc())
        error_msg = str(e).replace(" ", "_")[:50]
        return RedirectResponse(f"{FRONTEND_URL}/settings?gmail_error={error_msg}")


@router.get("/status")
async def gmail_connection_status(token: str = Query(...)):
    """Check if user has Gmail connected"""
    user = await get_current_user_from_token(token)
    
    token_doc = await db.gmail_tokens.find_one({"user_id": user["user_id"]})
    
    if token_doc:
        return {
            "connected": True,
            "email": token_doc.get("email"),
            "connected_at": token_doc.get("connected_at")
        }
    
    return {"connected": False}


@router.post("/disconnect")
async def gmail_disconnect(token: str = Query(...)):
    """Disconnect Gmail account"""
    user = await get_current_user_from_token(token)
    
    result = await db.gmail_tokens.delete_one({"user_id": user["user_id"]})
    
    if result.deleted_count > 0:
        return {"success": True, "message": "Gmail disconnected"}
    
    return {"success": False, "message": "No Gmail connection found"}


# ============== Email Operations ==============

@router.post("/send")
async def send_email(email_data: EmailSend, token: str = Query(...)):
    """Send an email via Gmail"""
    user = await get_current_user_from_token(token)
    
    creds = await get_gmail_credentials(user["user_id"])
    if not creds:
        raise HTTPException(status_code=401, detail="Gmail not connected. Please connect your Gmail account first.")
    
    try:
        service = build('gmail', 'v1', credentials=creds)
        
        if email_data.html:
            message = MIMEMultipart('alternative')
            message['to'] = email_data.to
            message['subject'] = email_data.subject
            
            text_part = MIMEText(email_data.body.replace('<br>', '\n').replace('</p>', '\n'), 'plain')
            html_part = MIMEText(email_data.body, 'html')
            
            message.attach(text_part)
            message.attach(html_part)
        else:
            message = MIMEText(email_data.body)
            message['to'] = email_data.to
            message['subject'] = email_data.subject
        
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        
        sent_message = service.users().messages().send(
            userId='me',
            body={'raw': raw_message}
        ).execute()
        
        return {
            "success": True,
            "message_id": sent_message['id'],
            "thread_id": sent_message.get('threadId')
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


@router.get("/messages")
async def get_emails(
    token: str = Query(...),
    query: str = Query(None, description="Gmail search query"),
    max_results: int = Query(20, le=100),
    page_token: str = Query(None)
):
    """Get emails from Gmail inbox"""
    user = await get_current_user_from_token(token)
    
    creds = await get_gmail_credentials(user["user_id"])
    if not creds:
        raise HTTPException(status_code=401, detail="Gmail not connected")
    
    try:
        service = build('gmail', 'v1', credentials=creds)
        
        params = {
            'userId': 'me',
            'maxResults': max_results
        }
        
        if query:
            params['q'] = query
        if page_token:
            params['pageToken'] = page_token
        
        results = service.users().messages().list(**params).execute()
        
        messages = []
        for msg in results.get('messages', []):
            # Get full message details
            full_msg = service.users().messages().get(
                userId='me',
                id=msg['id'],
                format='metadata',
                metadataHeaders=['From', 'To', 'Subject', 'Date']
            ).execute()
            
            headers = {h['name']: h['value'] for h in full_msg.get('payload', {}).get('headers', [])}
            
            messages.append({
                'id': msg['id'],
                'thread_id': full_msg.get('threadId'),
                'snippet': full_msg.get('snippet'),
                'from': headers.get('From'),
                'to': headers.get('To'),
                'subject': headers.get('Subject'),
                'date': headers.get('Date'),
                'label_ids': full_msg.get('labelIds', []),
                'is_unread': 'UNREAD' in full_msg.get('labelIds', [])
            })
        
        return {
            "messages": messages,
            "next_page_token": results.get('nextPageToken'),
            "result_size_estimate": results.get('resultSizeEstimate')
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch emails: {str(e)}")


@router.get("/messages/{message_id}")
async def get_email_detail(message_id: str, token: str = Query(...)):
    """Get full email content"""
    user = await get_current_user_from_token(token)
    
    creds = await get_gmail_credentials(user["user_id"])
    if not creds:
        raise HTTPException(status_code=401, detail="Gmail not connected")
    
    try:
        service = build('gmail', 'v1', credentials=creds)
        
        message = service.users().messages().get(
            userId='me',
            id=message_id,
            format='full'
        ).execute()
        
        headers = {h['name']: h['value'] for h in message.get('payload', {}).get('headers', [])}
        
        # Extract body
        body = ""
        payload = message.get('payload', {})
        
        if 'body' in payload and payload['body'].get('data'):
            body = base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8')
        elif 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain' and part['body'].get('data'):
                    body = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
                    break
                elif part['mimeType'] == 'text/html' and part['body'].get('data'):
                    body = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
        
        return {
            'id': message_id,
            'thread_id': message.get('threadId'),
            'from': headers.get('From'),
            'to': headers.get('To'),
            'subject': headers.get('Subject'),
            'date': headers.get('Date'),
            'body': body,
            'snippet': message.get('snippet'),
            'label_ids': message.get('labelIds', [])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch email: {str(e)}")


@router.get("/labels")
async def get_labels(token: str = Query(...)):
    """Get Gmail labels"""
    user = await get_current_user_from_token(token)
    
    creds = await get_gmail_credentials(user["user_id"])
    if not creds:
        raise HTTPException(status_code=401, detail="Gmail not connected")
    
    try:
        service = build('gmail', 'v1', credentials=creds)
        results = service.users().labels().list(userId='me').execute()
        
        return {"labels": results.get('labels', [])}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch labels: {str(e)}")


# ============== Utility Functions for Internal Use ==============

async def send_team_invitation_email(user_id: str, to_email: str, name: str, password: str):
    """Send team invitation email with credentials"""
    creds = await get_gmail_credentials(user_id)
    if not creds:
        return {"success": False, "error": "Gmail not connected"}
    
    try:
        service = build('gmail', 'v1', credentials=creds)
        
        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ea580c;">Welcome to Merchant Followup!</h2>
            <p>Hi {name},</p>
            <p>You've been invited to join the team. Here are your login credentials:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Email:</strong> {to_email}</p>
                <p><strong>Password:</strong> {password}</p>
            </div>
            <p>Please log in and change your password as soon as possible.</p>
            <p>
                <a href="{FRONTEND_URL}/login" 
                   style="background: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Log In Now
                </a>
            </p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
                This email was sent from Merchant Followup.
            </p>
        </div>
        """
        
        message = MIMEMultipart('alternative')
        message['to'] = to_email
        message['subject'] = "You've been invited to Merchant Followup"
        
        text_part = MIMEText(f"Hi {name}, Welcome to Merchant Followup! Your login: {to_email} / {password}", 'plain')
        html_part = MIMEText(html_body, 'html')
        
        message.attach(text_part)
        message.attach(html_part)
        
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        
        sent = service.users().messages().send(userId='me', body={'raw': raw_message}).execute()
        
        return {"success": True, "message_id": sent['id']}
        
    except Exception as e:
        return {"success": False, "error": str(e)}
