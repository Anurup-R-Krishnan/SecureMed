'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    FileText,
    Plus,
    Lock,
    Clock,
    User,
    Loader2,
    Eye,
    EyeOff,
    AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getClinicalNotes, addClinicalNote } from '@/lib/services/clinical-service';
import { ClinicalNote, CreateClinicalNoteRequest } from '@/lib/types/clinical-notes';

interface ClinicalNotesPanelProps {
    patientId: string;
    doctorId: string;
    doctorName: string;
}

const categoryConfig: Record<ClinicalNote['category'], { label: string; color: string }> = {
    OBSERVATION: { label: 'Observation', color: 'bg-blue-100 text-blue-800' },
    DIAGNOSIS: { label: 'Diagnosis', color: 'bg-purple-100 text-purple-800' },
    TREATMENT_PLAN: { label: 'Treatment Plan', color: 'bg-green-100 text-green-800' },
    FOLLOW_UP: { label: 'Follow-up', color: 'bg-amber-100 text-amber-800' },
    GENERAL: { label: 'General', color: 'bg-gray-100 text-gray-800' },
};

export default function ClinicalNotesPanel({
    patientId,
    doctorId,
    doctorName
}: ClinicalNotesPanelProps) {
    const [notes, setNotes] = useState<ClinicalNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newNoteContent, setNewNoteContent] = useState('');
    const [newNoteCategory, setNewNoteCategory] = useState<ClinicalNote['category']>('GENERAL');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    // Load notes
    const loadNotes = async () => {
        setLoading(true);
        try {
            const data = await getClinicalNotes(patientId);
            const mappedNotes = data.map((n: any) => ({
                id: n.id.toString(),
                patientId: n.patient.toString(),
                doctorId: n.doctor.toString(),
                doctorName: 'Dr. Sarah Smith', // Placeholder or fetch if needed
                content: n.content,
                category: n.category as ClinicalNote['category'],
                isPrivate: n.is_private,
                createdAt: n.created_at,
                updatedAt: n.updated_at
            }));
            setNotes(mappedNotes);
        } catch (err) {
            console.error('Error loading clinical notes:', err);
            toast({
                title: 'Error',
                description: 'Failed to load clinical notes',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (patientId && doctorId) {
            loadNotes();
        }
    }, [patientId, doctorId]);

    // Handle adding a new note
    const handleAddNote = async () => {
        if (!newNoteContent.trim()) {
            toast({
                title: 'Validation Error',
                description: 'Please enter note content',
                variant: 'destructive',
            });
            return;
        }

        setIsSaving(true);
        try {
            const newNoteData = await addClinicalNote(
                patientId,
                doctorId,
                newNoteContent.trim(),
                newNoteCategory
            );

            if (newNoteData) {
                const mappedNote: ClinicalNote = {
                    id: newNoteData.id.toString(),
                    patientId: newNoteData.patient.toString(),
                    doctorId: newNoteData.doctor.toString(),
                    doctorName: doctorName,
                    content: newNoteData.content,
                    category: newNoteData.category as ClinicalNote['category'],
                    isPrivate: newNoteData.is_private,
                    createdAt: newNoteData.created_at,
                    updatedAt: newNoteData.updated_at
                };
                setNotes(prev => [mappedNote, ...prev]);
                setNewNoteContent('');
                setNewNoteCategory('GENERAL');
                setIsDialogOpen(false);

                toast({
                    title: 'Note Added',
                    description: 'Clinical note has been saved securely',
                });
            }
        } catch (err) {
            console.error('Error adding clinical note:', err);
            toast({
                title: 'Error',
                description: 'Failed to save clinical note',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Format date for display
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <Card className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Clinical Notes</h2>
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                        <Lock className="h-3 w-3 mr-1" />
                        Doctor Only
                    </Badge>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add Note
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Add Clinical Note
                            </DialogTitle>
                            <DialogDescription className="flex items-center gap-2">
                                <EyeOff className="h-4 w-4" />
                                This note is private and will NOT be visible to the patient.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {/* Category Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Category</label>
                                <Select
                                    value={newNoteCategory}
                                    onValueChange={(value) => setNewNoteCategory(value as ClinicalNote['category'])}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(categoryConfig).map(([key, config]) => (
                                            <SelectItem key={key} value={key}>
                                                {config.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Note Content */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Note Content</label>
                                <Textarea
                                    placeholder="Enter clinical observations, diagnosis notes, treatment plans..."
                                    value={newNoteContent}
                                    onChange={(e) => setNewNoteContent(e.target.value)}
                                    rows={6}
                                    className="resize-none"
                                />
                            </div>

                            {/* Privacy Warning */}
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                                <div className="text-sm text-amber-800">
                                    <p className="font-medium">Privacy Notice</p>
                                    <p className="text-xs mt-1">
                                        Clinical notes are protected under HIPAA and are only visible to authorized healthcare providers.
                                        Patients cannot access these notes.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleAddNote} disabled={isSaving}>
                                {isSaving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Note
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Notes List */}
            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading notes...</span>
                </div>
            ) : notes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No clinical notes for this patient.</p>
                    <p className="text-sm">Click "Add Note" to create the first one.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {notes.map((note) => {
                        const config = categoryConfig[note.category];
                        const isOwnNote = note.doctorId === doctorId;

                        return (
                            <div
                                key={note.id}
                                className={`p-4 rounded-lg border ${isOwnNote ? 'bg-card' : 'bg-muted/30'
                                    }`}
                            >
                                {/* Note Header */}
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Badge className={config.color}>
                                            {config.label}
                                        </Badge>
                                        {isOwnNote && (
                                            <Badge variant="outline" className="text-xs">
                                                <Eye className="h-3 w-3 mr-1" />
                                                Your Note
                                            </Badge>
                                        )}
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                        <Lock className="h-3 w-3 mr-1" />
                                        Private
                                    </Badge>
                                </div>

                                {/* Note Content */}
                                <p className="text-sm text-foreground whitespace-pre-wrap mb-3">
                                    {note.content}
                                </p>

                                {/* Note Footer */}
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <User className="h-3 w-3" />
                                        <span>{note.doctorName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-3 w-3" />
                                        <span>{formatDate(note.createdAt)}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
    );
}
