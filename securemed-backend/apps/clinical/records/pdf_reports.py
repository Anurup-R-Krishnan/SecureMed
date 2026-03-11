"""PDF report generation for medication interaction reports using ReportLab."""

from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from .models import MedicalRecord

PAGE_WIDTH, PAGE_HEIGHT = A4

SEVERITY_COLORS = {
    "critical": colors.HexColor("#DC2626"),
    "high": colors.HexColor("#EA580C"),
    "moderate": colors.HexColor("#CA8A04"),
    "low": colors.HexColor("#2563EB"),
}

SEVERITY_BG_COLORS = {
    "critical": colors.HexColor("#FEF2F2"),
    "high": colors.HexColor("#FFF7ED"),
    "moderate": colors.HexColor("#FEFCE8"),
    "low": colors.HexColor("#EFF6FF"),
}

SEVERITY_ORDER = ["critical", "high", "moderate", "low"]
MAX_FINDINGS_DISPLAY = 30

CLINIC_NAME = "SecureMed Hospital"
CLINIC_TAGLINE = "Advanced Clinical Decision Support • Powered by HODDI"


def _build_styles():
    base = getSampleStyleSheet()

    styles = {
        "title": ParagraphStyle(
            "title",
            parent=base["Title"],
            fontSize=20,
            textColor=colors.HexColor("#0F172A"),
            spaceAfter=4,
            alignment=TA_CENTER,
            fontName="Helvetica-Bold",
        ),
        "subtitle": ParagraphStyle(
            "subtitle",
            parent=base["Normal"],
            fontSize=10,
            textColor=colors.HexColor("#64748B"),
            spaceAfter=2,
            alignment=TA_CENTER,
        ),
        "section_header": ParagraphStyle(
            "section_header",
            parent=base["Heading2"],
            fontSize=11,
            textColor=colors.HexColor("#0F172A"),
            spaceBefore=12,
            spaceAfter=4,
            fontName="Helvetica-Bold",
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["Normal"],
            fontSize=9,
            textColor=colors.HexColor("#1E293B"),
            spaceAfter=2,
        ),
        "small": ParagraphStyle(
            "small",
            parent=base["Normal"],
            fontSize=8,
            textColor=colors.HexColor("#64748B"),
            spaceAfter=1,
        ),
        "label": ParagraphStyle(
            "label",
            parent=base["Normal"],
            fontSize=8,
            textColor=colors.HexColor("#64748B"),
            fontName="Helvetica-Bold",
        ),
        "value": ParagraphStyle(
            "value",
            parent=base["Normal"],
            fontSize=9,
            textColor=colors.HexColor("#0F172A"),
        ),
        "finding_title": ParagraphStyle(
            "finding_title",
            parent=base["Normal"],
            fontSize=9,
            textColor=colors.HexColor("#0F172A"),
            fontName="Helvetica-Bold",
        ),
        "severity_header": ParagraphStyle(
            "severity_header",
            parent=base["Normal"],
            fontSize=10,
            fontName="Helvetica-Bold",
            spaceBefore=8,
            spaceAfter=3,
        ),
        "recommendation": ParagraphStyle(
            "recommendation",
            parent=base["Normal"],
            fontSize=9,
            textColor=colors.HexColor("#1E293B"),
            leftIndent=12,
            spaceAfter=3,
        ),
        "footer": ParagraphStyle(
            "footer",
            parent=base["Normal"],
            fontSize=7,
            textColor=colors.HexColor("#94A3B8"),
            alignment=TA_CENTER,
        ),
    }
    return styles


def _add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(colors.HexColor("#94A3B8"))
    canvas.drawCentredString(
        PAGE_WIDTH / 2,
        1.2 * cm,
        f"Page {doc.page}  •  {CLINIC_TAGLINE}",
    )
    canvas.restoreState()


def _info_table(rows, styles):
    """Build a two-column label/value table for patient/report metadata."""
    data = []
    for label, value in rows:
        data.append([
            Paragraph(label, styles["label"]),
            Paragraph(str(value) if value else "—", styles["value"]),
        ])
    table = Table(data, colWidths=[4 * cm, 12 * cm])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
    ]))
    return table


def _summary_table(report, styles):
    """Severity count summary as a coloured 4-column table."""
    data = [
        [
            Paragraph("CRITICAL", ParagraphStyle("sc", parent=styles["label"], textColor=SEVERITY_COLORS["critical"])),
            Paragraph("HIGH", ParagraphStyle("sh", parent=styles["label"], textColor=SEVERITY_COLORS["high"])),
            Paragraph("MODERATE", ParagraphStyle("sm", parent=styles["label"], textColor=SEVERITY_COLORS["moderate"])),
            Paragraph("LOW", ParagraphStyle("sl", parent=styles["label"], textColor=SEVERITY_COLORS["low"])),
        ],
        [
            Paragraph(str(report.critical_count), ParagraphStyle("vc", parent=styles["body"], fontSize=14, fontName="Helvetica-Bold", textColor=SEVERITY_COLORS["critical"])),
            Paragraph(str(report.high_count), ParagraphStyle("vh", parent=styles["body"], fontSize=14, fontName="Helvetica-Bold", textColor=SEVERITY_COLORS["high"])),
            Paragraph(str(report.moderate_count), ParagraphStyle("vm", parent=styles["body"], fontSize=14, fontName="Helvetica-Bold", textColor=SEVERITY_COLORS["moderate"])),
            Paragraph(str(report.low_count), ParagraphStyle("vl", parent=styles["body"], fontSize=14, fontName="Helvetica-Bold", textColor=SEVERITY_COLORS["low"])),
        ],
    ]
    col_w = (PAGE_WIDTH - 4 * cm) / 4
    table = Table(data, colWidths=[col_w] * 4)
    table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table


def _finding_rows(items, severity, styles):
    """Build table rows for one severity tier."""
    tier_items = [i for i in items if i.severity == severity]
    if not tier_items:
        return []

    rows = []
    header_color = SEVERITY_COLORS[severity]
    header_bg = SEVERITY_BG_COLORS[severity]

    header = Table(
        [[Paragraph(severity.upper(), ParagraphStyle(
            f"sh_{severity}",
            parent=styles["severity_header"],
            textColor=header_color,
        ))]],
        colWidths=[PAGE_WIDTH - 4 * cm],
    )
    header.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), header_bg),
        ("BOX", (0, 0), (-1, -1), 0.5, header_color),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    rows.append(header)
    rows.append(Spacer(1, 0.1 * cm))

    for item in tier_items:
        meds = ", ".join(item.medications or [])
        combo_label = "Single medication" if item.combination_size <= 1 else f"{item.combination_size}-drug combination"
        source_label = item.source_reference or item.source or "HODDI"

        finding_data = [
            [
                Paragraph(item.side_effect or "—", styles["finding_title"]),
                Paragraph(combo_label, styles["small"]),
            ],
            [
                Paragraph(f"Medications: {meds}", styles["small"]),
                Paragraph(f"Source: {source_label}", styles["small"]),
            ],
        ]
        if item.description:
            finding_data.append([
                Paragraph(item.description, styles["body"]),
                Paragraph("", styles["body"]),
            ])

        finding_table = Table(
            finding_data,
            colWidths=[(PAGE_WIDTH - 4 * cm) * 0.65, (PAGE_WIDTH - 4 * cm) * 0.35],
        )
        finding_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BACKGROUND", (0, 0), (-1, -1), colors.white),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("SPAN", (0, 2), (1, 2)) if item.description else ("NOP", (0, 0), (0, 0)),
        ]))
        rows.append(finding_table)
        rows.append(Spacer(1, 0.1 * cm))

    rows.append(Spacer(1, 0.2 * cm))
    return rows


def _recommendations(report, styles):
    """Auto-generate a brief recommendations paragraph based on severity counts."""
    elements = []
    elements.append(Paragraph("Recommendations", styles["section_header"]))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E2E8F0"), spaceAfter=6))

    if report.critical_count > 0:
        elements.append(Paragraph(
            f"⚠ {report.critical_count} CRITICAL interaction(s) detected. Immediate clinical review is strongly advised "
            f"before dispensing. Consider alternative medications or specialist consultation.",
            styles["recommendation"],
        ))
    if report.high_count > 0:
        elements.append(Paragraph(
            f"• {report.high_count} HIGH severity interaction(s) identified. Careful dose adjustment and close "
            f"patient monitoring are recommended.",
            styles["recommendation"],
        ))
    if report.moderate_count > 0:
        elements.append(Paragraph(
            f"• {report.moderate_count} MODERATE interaction(s) found. Review combinations and consider timing "
            f"adjustments or additional monitoring.",
            styles["recommendation"],
        ))
    if report.total_findings == 0:
        elements.append(Paragraph(
            "✓ No significant drug interactions or side effects were detected for this medication list.",
            styles["recommendation"],
        ))
    if report.coverage_gap:
        elements.append(Paragraph(
            "ℹ Note: This patient has more than 3 active medications. The interaction engine evaluates up to "
            "3-drug combinations. For larger regimens, a clinical pharmacist review is recommended.",
            ParagraphStyle("cov", parent=styles["recommendation"], textColor=colors.HexColor("#64748B")),
        ))

    return elements


def _dedupe_report_items(items):
    deduped = []
    seen = set()
    for item in items:
        key = (
            item.finding_type,
            tuple(sorted(item.medications or [])),
            (item.side_effect or "").strip().lower(),
            item.severity,
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped


def _resolve_attending_doctor(report):
    generated_by = report.generated_by
    if generated_by and hasattr(generated_by, "doctor_profile"):
        doctor_user = generated_by
        return doctor_user.get_full_name() or doctor_user.email or doctor_user.username

    patient = report.patient
    if patient:
        record = (
            MedicalRecord.objects
            .select_related("doctor__user")
            .filter(patient=patient, doctor__isnull=False)
            .order_by("-created_at", "-id")
            .first()
        )
        if record and record.doctor and record.doctor.user:
            doctor_user = record.doctor.user
            return doctor_user.get_full_name() or doctor_user.email or doctor_user.username

    return "—"


def generate_interaction_report_pdf(report) -> BytesIO:
    """
    Generate a PDF for a MedicationInteractionReport instance.
    Returns a BytesIO buffer containing the PDF.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2.5 * cm,
        title=f"Medication Interaction Report — {report.patient.user.get_full_name()}",
        author=CLINIC_NAME,
    )

    styles = _build_styles()
    story = []

    # ── Header ───────────────────────────────────────────────────────────────
    story.append(Paragraph(CLINIC_NAME, styles["title"]))
    story.append(Paragraph("Medication Interaction Report", styles["subtitle"]))
    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0F172A"), spaceAfter=8))

    # ── Patient & Report Metadata ─────────────────────────────────────────────
    patient = report.patient
    generated_by = report.generated_by
    if generated_by:
        generated_name = generated_by.get_full_name() or generated_by.email or generated_by.username
        generated_label = generated_name
    else:
        generated_label = "—"
    doctor_name = _resolve_attending_doctor(report)
    report_date = report.created_at.strftime("%d %B %Y, %H:%M")

    story.append(Paragraph("Patient Information", styles["section_header"]))
    story.append(_info_table([
        ("Patient Name", patient.user.get_full_name()),
        ("Patient ID", patient.patient_id),
        ("Report Date", report_date),
        ("Attending Physician", doctor_name),
        ("Generated By", generated_label),
    ], styles))

    story.append(Spacer(1, 0.4 * cm))

    # ── Medications Evaluated ─────────────────────────────────────────────────
    story.append(Paragraph("Medications Evaluated", styles["section_header"]))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E2E8F0"), spaceAfter=6))
    meds = report.medications or []
    if meds:
        med_rows = [[Paragraph(f"• {m}", styles["body"])] for m in meds]
        med_table = Table(med_rows, colWidths=[PAGE_WIDTH - 4 * cm])
        med_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(med_table)
    else:
        story.append(Paragraph("No medications recorded.", styles["small"]))

    story.append(Spacer(1, 0.4 * cm))

    # ── Summary Counts ────────────────────────────────────────────────────────
    story.append(Paragraph("Findings Summary", styles["section_header"]))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E2E8F0"), spaceAfter=6))
    story.append(_summary_table(report, styles))
    summary_text = f"Total findings: {report.total_findings}."
    if report.total_findings > MAX_FINDINGS_DISPLAY:
        summary_text += f" Showing the top {MAX_FINDINGS_DISPLAY} in this report."
    story.append(Paragraph(summary_text, styles["small"]))

    story.append(Spacer(1, 0.5 * cm))

    # ── Detailed Findings ─────────────────────────────────────────────────────
    items = _dedupe_report_items(list(report.items.all()))
    if items:
        total_findings = len(items)
        limited_items = []
        for severity in SEVERITY_ORDER:
            for item in items:
                if item.severity == severity:
                    limited_items.append(item)
                    if len(limited_items) >= MAX_FINDINGS_DISPLAY:
                        break
            if len(limited_items) >= MAX_FINDINGS_DISPLAY:
                break
        items = limited_items
        story.append(Paragraph("Detailed Findings", styles["section_header"]))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E2E8F0"), spaceAfter=6))
        if total_findings > MAX_FINDINGS_DISPLAY:
            story.append(
                Paragraph(
                    f"Showing the top {MAX_FINDINGS_DISPLAY} of {total_findings} findings.",
                    styles["small"],
                )
            )
        for severity in SEVERITY_ORDER:
            story.extend(_finding_rows(items, severity, styles))
    else:
        story.append(Paragraph("No interaction findings recorded in this report.", styles["body"]))

    story.append(Spacer(1, 0.4 * cm))

    # ── Recommendations ───────────────────────────────────────────────────────
    story.extend(_recommendations(report, styles))

    doc.build(story, onFirstPage=_add_page_number, onLaterPages=_add_page_number)
    buffer.seek(0)
    return buffer
