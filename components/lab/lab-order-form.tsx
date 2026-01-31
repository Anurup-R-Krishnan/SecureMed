'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Microscope, Loader2, AlertCircle } from 'lucide-react';

export default function LabOrderForm() {
    const [patients, setPatients] = useState<any[]>([]);
    const [panels, setPanels] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [selectedPatient, setSelectedPatient] = useState('');
    const [selectedPanels, setSelectedPanels] = useState<string[]>([]);
    const [priority, setPriority] = useState('ROUTINE');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Patients
                const patientsRes = await fetch('http://127.0.0.1:8000/api/lab/patients/');
                if (patientsRes.ok) {
                    const patientsData = await patientsRes.json();
                    setPatients(patientsData);
                } else {
                    console.error("Failed to fetch patients");
                }

                // Fetch Panels
                const panelsRes = await fetch('http://127.0.0.1:8000/api/lab/panels/');
                if (panelsRes.ok) {
                    const panelsData = await panelsRes.json();
                    setPanels(panelsData);
                } else {
                    console.error("Failed to fetch panels");
                }
            } catch (err) {
                console.error("Error fetching data:", err);
                setError("Failed to load initial data. Is the backend running?");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('http://127.0.0.1:8000/api/lab/orders/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 'Authorization': 'Bearer ...' // In a real app
                },
                body: JSON.stringify({
                    patient: selectedPatient,
                    panels: selectedPanels,
                    priority: priority,
                    clinical_notes: notes,
                    ordering_doctor: 1 // hardcoded for demo, normally from token
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create order');
            }

            const data = await response.json();
            setSuccess(`Order created successfully! Sample ID: ${data.sample_id}`);
            // Reset form
            setSelectedPanels([]);
            setNotes('');
            setPriority('ROUTINE');
        } catch (err: any) {
            console.error(err);
            setError("Failed to create order. Ensure backend is running.");
        } finally {
            setSubmitting(false);
        }
    };

    const togglePanel = (id: string) => {
        setSelectedPanels(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    return (
        <div className="bg-card p-6 rounded-lg border border-border">
            <div className="flex items-center gap-3 mb-6">
                <Microscope className="h-6 w-6 text-primary" />
                <h3 className="text-xl font-bold text-foreground">Create New Lab Order</h3>
            </div>

            {success && (
                <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4 text-sm font-medium">
                    {success}
                </div>
            )}

            {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-lg mb-4 text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Patient Selection */}
                <div>
                    <label className="block text-sm font-medium mb-2">Select Patient</label>
                    <select
                        className="w-full p-2 rounded-md border bg-background"
                        value={selectedPatient}
                        onChange={(e) => setSelectedPatient(e.target.value)}
                        required
                    >
                        <option value="">-- Select Patient --</option>
                        {patients.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.mrn})</option>
                        ))}
                    </select>
                </div>

                {/* Priority */}
                <div>
                    <label className="block text-sm font-medium mb-2">Priority</label>
                    <div className="flex gap-4">
                        {['ROUTINE', 'URGENT', 'STAT'].map(p => (
                            <label key={p} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="priority"
                                    value={p}
                                    checked={priority === p}
                                    onChange={(e) => setPriority(e.target.value)}
                                />
                                <span className={p === 'STAT' ? 'text-destructive font-bold' : ''}>{p}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Test Panels */}
                <div>
                    <label className="block text-sm font-medium mb-2">Test Panels</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {panels.map(panel => (
                            <label key={panel.id} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${selectedPanels.includes(String(panel.id)) ? 'bg-primary/10 border-primary' : 'hover:bg-muted'}`}>
                                <input
                                    type="checkbox"
                                    className="mr-3"
                                    checked={selectedPanels.includes(String(panel.id))}
                                    onChange={() => togglePanel(String(panel.id))}
                                />
                                <div>
                                    <div className="font-medium">{panel.name}</div>
                                    <div className="text-xs text-muted-foreground">${panel.cost || '0.00'}</div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Clinical Notes */}
                <div>
                    <label className="block text-sm font-medium mb-2">Clinical Notes</label>
                    <textarea
                        className="w-full p-3 rounded-md border bg-background text-sm"
                        rows={3}
                        placeholder="Reason for order, symptoms, etc..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Order...</> : 'Submit Lab Order'}
                </Button>
            </form>
        </div>
    );
}
