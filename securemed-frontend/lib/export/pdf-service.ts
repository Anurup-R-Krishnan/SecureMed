import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PatientSummaryData {
    patientName: string;
    dob: string;
    conditions: Array<{
        title: string;
        recordedDate: string;
        explanation?: string;
        lifestyle?: string;
        watchOut?: string;
    }>;
    medications: Array<{
        name: string;
        dosage: string;
        frequency: string;
        duration: string;
        purpose?: string;
        instructions?: string;
    }>;
    nextSteps?: {
        date: string;
        reason: string;
    };
}

export class PDFService {
    private static COLORS = {
        primary: [37, 99, 235], // Blue 600
        secondary: [71, 85, 105], // Slate 600
        accent: [249, 115, 22], // Orange 500
        text: [31, 41, 55], // Gray 800
        lightText: [107, 114, 128], // Gray 500
        border: [229, 231, 235], // Gray 200
        bg: [248, 250, 252] // Slate 50
    };

    static generateSummaryPDF(data: PatientSummaryData): Blob {
        const doc = new jsPDF();
        const { primary, secondary, text, lightText, border, bg } = this.COLORS;

        // Header
        doc.setFillColor(primary[0], primary[1], primary[2]);
        doc.rect(0, 0, 210, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('HEALTH SUMMARY', 20, 25);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 150, 25);

        // Patient Info
        let y = 50;
        doc.setTextColor(text[0], text[1], text[2]);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Patient: ${data.patientName}`, 20, y);
        y += 7;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(lightText[0], lightText[1], lightText[2]);
        doc.text(`Date of Birth: ${data.dob}`, 20, y);
        y += 15;

        // 1. Conditions
        doc.setTextColor(primary[0], primary[1], primary[2]);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('1. YOUR CONDITIONS', 20, y);
        y += 2;
        doc.setDrawColor(border[0], border[1], border[2]);
        doc.line(20, y, 190, y);
        y += 10;

        if (data.conditions.length > 0) {
            data.conditions.forEach((condition) => {
                if (y > 240) { doc.addPage(); y = 20; }

                doc.setTextColor(text[0], text[1], text[2]);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(condition.title.toUpperCase(), 25, y);
                y += 6;

                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(lightText[0], lightText[1], lightText[2]);
                doc.text(`Recorded on: ${condition.recordedDate}`, 25, y);
                y += 8;

                if (condition.explanation) {
                    doc.setTextColor(text[0], text[1], text[2]);
                    const lines = doc.splitTextToSize(condition.explanation, 160);
                    doc.text(lines, 25, y);
                    y += (lines.length * 5) + 5;
                }

                if (condition.lifestyle) {
                    if (y > 270) { doc.addPage(); y = 20; }
                    doc.setFont('helvetica', 'bold');
                    doc.text('Lifestyle Advice:', 25, y);
                    doc.setFont('helvetica', 'normal');
                    const lifestyleLines = doc.splitTextToSize(condition.lifestyle, 140);
                    doc.text(lifestyleLines, 55, y);
                    y += (lifestyleLines.length * 5) + 5;
                }

                y += 5;
            });
        } else {
            doc.setFontSize(10);
            doc.text('No active conditions recorded.', 25, y);
            y += 10;
        }

        // 2. Next Steps
        if (data.nextSteps && data.nextSteps.date !== 'N/A') {
            y += 10;
            if (y > 240) { doc.addPage(); y = 20; }

            doc.setFillColor(bg[0], bg[1], bg[2]);
            doc.rect(20, y, 170, 30, 'F');
            doc.setDrawColor(primary[0], primary[1], primary[2]);
            doc.setLineWidth(0.5);
            doc.rect(20, y, 170, 30, 'D');

            doc.setTextColor(primary[0], primary[1], primary[2]);
            doc.setFont('helvetica', 'bold');
            doc.text('NEXT STEPS', 25, y + 10);

            doc.setTextColor(text[0], text[1], text[2]);
            doc.setFont('helvetica', 'normal');
            doc.text(`Follow up: ${data.nextSteps.date}`, 25, y + 18);
            doc.text(`Reason: ${data.nextSteps.reason}`, 25, y + 25);
        }

        // Footer
        const pageCount = doc.internal.pages.length - 1;
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(lightText[0], lightText[1], lightText[2]);
            doc.text('SecureMed After-Visit Clarity Mode - High Quality Health Archive', 105, 290, { align: 'center' });
        }

        return doc.output('blob');
    }

    static generateMedicationPDF(data: PatientSummaryData): Blob {
        const doc = new jsPDF();
        const { primary, text } = this.COLORS;

        doc.setFillColor(primary[0], primary[1], primary[2]);
        doc.rect(0, 0, 210, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('MEDICATION LIST', 20, 25);

        let y = 55;
        doc.setTextColor(text[0], text[1], text[2]);
        doc.setFontSize(12);
        doc.text(`Patient: ${data.patientName}`, 20, y);
        y += 15;

        const tableData = data.medications.map(m => [
            m.name,
            m.dosage,
            m.frequency,
            m.duration,
            m.purpose || 'Prescribed for condition'
        ]);

        autoTable(doc, {
            startY: y,
            head: [['Medication', 'Dosage', 'Frequency', 'Duration', 'Purpose']],
            body: tableData,
            headStyles: { fillColor: primary as [number, number, number], textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            margin: { left: 20, right: 20 }
        });

        return doc.output('blob');
    }
}
