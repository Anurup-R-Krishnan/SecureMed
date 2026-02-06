from django.utils import timezone
from datetime import timedelta
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import io
import hashlib


def generate_deletion_certificate(user):
    """
    Generate a PDF certificate for account deletion request.
    
    Args:
        user: User instance who requested deletion
        
    Returns:
        BytesIO buffer containing the PDF
    """
    # Create a buffer to hold the PDF
    buffer = io.BytesIO()
    
    # Create the PDF document
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    story = []
    
    # Get styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor='#1a1a1a',
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor='#333333',
        spaceAfter=12,
        alignment=TA_LEFT,
        fontName='Helvetica-Bold'
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=12,
        textColor='#555555',
        spaceAfter=12,
        alignment=TA_LEFT,
        leading=16
    )
    
    # Calculate deletion date (30 days from request)
    deletion_date = user.deletion_requested_at + timedelta(days=30)
    
    # Build the document content
    story.append(Spacer(1, 0.5 * inch))
    
    # Title
    title = Paragraph("Account Deletion Certificate", title_style)
    story.append(title)
    story.append(Spacer(1, 0.3 * inch))
    
    # Certificate body
    story.append(Paragraph("Certificate of Account Deletion Request", heading_style))
    story.append(Spacer(1, 0.2 * inch))
    
    # User information
    story.append(Paragraph(f"<b>User Email:</b> {user.email}", body_style))
    story.append(Paragraph(f"<b>User ID:</b> {user.id}", body_style))
    story.append(Spacer(1, 0.2 * inch))
    
    # Deletion details
    story.append(Paragraph("<b>Deletion Request Details:</b>", heading_style))
    story.append(Paragraph(
        f"Request Date: {user.deletion_requested_at.strftime('%B %d, %Y at %H:%M UTC')}",
        body_style
    ))
    story.append(Paragraph(
        f"Scheduled Deletion Date: {deletion_date.strftime('%B %d, %Y at %H:%M UTC')}",
        body_style
    ))
    story.append(Spacer(1, 0.3 * inch))
    
    # Notice
    story.append(Paragraph("<b>Important Notice:</b>", heading_style))
    notice_text = """
    This certificate confirms that your account deletion request has been received and processed.
    Your account has been immediately deactivated. All personally identifiable information (PII)
    will be permanently removed from our systems on the scheduled deletion date shown above.
    <br/><br/>
    You have a 30-day grace period during which you may contact support to cancel this deletion
    request and restore your account. After the scheduled deletion date, this action cannot be reversed.
    """
    story.append(Paragraph(notice_text, body_style))
    story.append(Spacer(1, 0.5 * inch))
    
    # Footer
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['BodyText'],
        fontSize=10,
        textColor='#888888',
        alignment=TA_CENTER
    )
    story.append(Paragraph(
        f"Generated on {timezone.now().strftime('%B %d, %Y at %H:%M UTC')}",
        footer_style
    ))
    story.append(Paragraph("SecureMed - Privacy & Data Protection", footer_style))
    
    # Build the PDF
    doc.build(story)
    
    # Get the PDF data
    buffer.seek(0)
    return buffer


def generate_policy_receipt(user, version):
    """
    Generate a PDF receipt for policy acceptance.
    
    Args:
        user: User instance who accepted policy
        version: Policy version accepted
        
    Returns:
        BytesIO buffer containing the PDF
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    story = []
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor='#1a1a1a',
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor='#333333',
        spaceAfter=12,
        alignment=TA_LEFT,
        fontName='Helvetica-Bold'
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=12,
        textColor='#555555',
        spaceAfter=12,
        alignment=TA_LEFT,
        leading=16
    )
    
    # Generate Consent ID
    consent_data = f"{user.id}:{user.policy_accepted_at}:{version}".encode('utf-8')
    consent_id = hashlib.sha256(consent_data).hexdigest()[:16].upper()
    
    story.append(Spacer(1, 0.5 * inch))
    story.append(Paragraph("Policy Acceptance Receipt", title_style))
    story.append(Spacer(1, 0.3 * inch))
    
    story.append(Paragraph("<b>User Information:</b>", heading_style))
    story.append(Paragraph(f"Full Name: {user.username}", body_style)) # User model might not have full name, using username
    story.append(Paragraph(f"Email: {user.email}", body_style))
    
    story.append(Paragraph("<b>Acceptance Details:</b>", heading_style))
    story.append(Paragraph(f"Policy Version: v{version}", body_style))
    timestamp = user.policy_accepted_at.strftime('%B %d, %Y at %H:%M UTC') if user.policy_accepted_at else "N/A"
    story.append(Paragraph(f"Timestamp: {timestamp}", body_style))
    story.append(Paragraph(f"Consent ID: {consent_id}", body_style))
    
    story.append(Spacer(1, 1 * inch))
    story.append(Paragraph("<b>Legal Acknowledgement:</b>", heading_style))
    story.append(Paragraph(
        "By accepting these terms, you have agreed to SecureMed's data processing agreement, "
        "privacy policy, and terms of service. This document serves as a digital proof of consent.",
        body_style
    ))
    
    doc.build(story)
    buffer.seek(0)
    return buffer
