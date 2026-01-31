'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, FileCheck, AlertTriangle, Loader2 } from 'lucide-react';

interface ResultUploadModalProps {
    isOpen: boolean;
    orderId: number;
    sampleId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ResultUploadModal({
    isOpen,
    orderId,
    sampleId,
    onClose,
    onSuccess,
}: ResultUploadModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [comments, setComments] = useState('');
    const [isAbnormal, setIsAbnormal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const calculateHash = async (file: File): Promise<string> => {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setError("Please select a file to upload.");
            return;
        }

        setUploading(true);
        setError(null);

        try {
            // 1. Calculate Hash Client-Side
            const fileHash = await calculateHash(file);
            console.log("Client-calculated hash:", fileHash);

            // 2. Prepare Form Data
            const formData = new FormData();
            formData.append('order', String(orderId));
            formData.append('test_panel', '1'); // Hardcoded for demo, normally selected
            formData.append('result_data', JSON.stringify({ summary: "Result file attached" }));
            formData.append('file_upload', file);
            formData.append('comments', comments);
            // formData.append('file_hash', fileHash); // Backend logic calculates it too, we could send to verify match

            if (isAbnormal) {
                formData.append('is_abnormal', 'true');
            }

            // 3. Upload
            const response = await fetch('http://127.0.0.1:8000/api/lab/results/', {
                method: 'POST',
                body: formData, // No Content-Type header needed for FormData
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(JSON.stringify(errData) || 'Upload failed');
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError("Failed to upload result. " + err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-xl bg-card border border-border shadow-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Upload Results</h3>
                        <p className="text-sm text-muted-foreground">Sample ID: {sampleId}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
                        <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" /> {error}
                        </div>
                    )}

                    {/* File Input */}
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/30 transition-colors">
                        <input
                            type="file"
                            id="file-upload"
                            className="hidden"
                            onChange={handleFileChange}
                            accept=".pdf,.jpg,.jpeg,.png,.dcm"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                            <Upload className="h-8 w-8 text-primary mb-2" />
                            <span className="text-sm font-medium text-foreground">
                                {file ? file.name : "Click to select result file (PDF, Image)"}
                            </span>
                            <span className="text-xs text-muted-foreground mt-1">
                                Max 10MB. Encrypted automatically on server.
                            </span>
                        </label>
                    </div>

                    {/* Comments */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Technician Comments</label>
                        <textarea
                            className="w-full p-2 rounded-md border bg-background text-sm"
                            rows={3}
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            placeholder="verified results..."
                        />
                    </div>

                    {/* Critical Value Toggle */}
                    <label className="flex items-center gap-2 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50">
                        <input
                            type="checkbox"
                            checked={isAbnormal}
                            onChange={(e) => setIsAbnormal(e.target.checked)}
                            className="w-4 h-4 text-destructive rounded"
                        />
                        <div>
                            <div className="font-medium text-destructive">Critical / Abnormal Result</div>
                            <div className="text-xs text-muted-foreground">Will trigger strict alert to doctor</div>
                        </div>
                    </label>

                    <div className="flex justify-end gap-3 mt-4">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={uploading}>
                            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck className="mr-2 h-4 w-4" />}
                            {uploading ? "Encrypting & Uploading..." : "Submit Securely"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
