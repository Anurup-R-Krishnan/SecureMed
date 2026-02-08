'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Upload, FileText, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
// We'll need to extend the service to support uploads, assumed to be in medicalRecordService
import { medicalRecordService } from '@/services/appointments';

interface UploadRecordDialogProps {
    onRecordUploaded?: () => void;
}

export function UploadRecordDialog({ onRecordUploaded }: UploadRecordDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    const [formData, setFormData] = useState({
        record_type: '',
        record_date: new Date().toISOString().split('T')[0],
        diagnosis: '', // Using as "Title" or "Description" equivalent
        doctor_name: '', // Optional
        notes: '',
    });
    const [file, setFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.record_type || !formData.record_date || !file) {
            toast({
                title: "Missing Information",
                description: "Please fill in all required fields and select a file.",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);

        try {
            const uploadData = new FormData();
            uploadData.append('record_type', formData.record_type);
            uploadData.append('record_date', formData.record_date);
            uploadData.append('diagnosis', formData.diagnosis || 'Patient Uploaded Record');
            uploadData.append('notes', formData.notes);
            uploadData.append('file', file);

            // We don't manually set patient/doctor here as backend handles it based on auth

            await medicalRecordService.uploadRecord(uploadData);

            toast({
                title: "Success",
                description: "Medical record uploaded successfully.",
            });

            setOpen(false);
            // Reset form
            setFormData({
                record_type: '',
                record_date: new Date().toISOString().split('T')[0],
                diagnosis: '',
                doctor_name: '',
                notes: '',
            });
            setFile(null);

            if (onRecordUploaded) {
                onRecordUploaded();
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Upload Failed",
                description: "There was an error uploading your record. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Record
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Upload Medical Record</DialogTitle>
                    <DialogDescription>
                        Add an external medical report, lab result, or prescription to your history.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="record-type">Record Type *</Label>
                            <Select
                                value={formData.record_type}
                                onValueChange={(val) => setFormData({ ...formData, record_type: val })}
                            >
                                <SelectTrigger id="record-type">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="lab_report">Lab Report</SelectItem>
                                    <SelectItem value="imaging">Imaging (X-Ray/MRI)</SelectItem>
                                    <SelectItem value="prescription">Prescription</SelectItem>
                                    <SelectItem value="discharge">Discharge Summary</SelectItem>
                                    <SelectItem value="consultation">Other Consultation</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date">Date *</Label>
                            <Input
                                id="date"
                                type="date"
                                required
                                value={formData.record_date}
                                onChange={(e) => setFormData({ ...formData, record_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Title / Diagnosis *</Label>
                        <Input
                            id="title"
                            placeholder="e.g. Annual Blood Test Results"
                            required
                            value={formData.diagnosis}
                            onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="file">File Attachment *</Label>
                        <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                            <Input
                                id="file"
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={handleFileChange}
                                accept=".pdf,.jpg,.jpeg,.png"
                            />
                            {file ? (
                                <div className="flex items-center gap-2 text-primary">
                                    <FileText className="h-6 w-6" />
                                    <span className="font-medium text-sm truncate max-w-[200px]">{file.name}</span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setFile(null);
                                        }}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                    <p className="text-sm font-medium text-muted-foreground">Click to upload or drag and drop</p>
                                    <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (Max 10MB)</p>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                            id="notes"
                            placeholder="Any additional details..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Upload Record
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
