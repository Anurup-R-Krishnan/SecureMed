import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export class ZIPService {
    static async generateAndDownloadArchive(patientName: string, files: Array<{ name: string; content: Blob; folder?: string }>) {
        const zip = new JSZip();

        files.forEach(file => {
            if (file.folder) {
                zip.folder(file.folder)?.file(file.name, file.content);
            } else {
                zip.file(file.name, file.content);
            }
        });

        const content = await zip.generateAsync({ type: 'blob' });
        const fileName = `Health_Archive_${patientName.replace(/\s+/g, '_')}_${Date.now()}.zip`;

        // Use standard browser download if file-saver is not available or just to be safe
        const url = window.URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }
}
