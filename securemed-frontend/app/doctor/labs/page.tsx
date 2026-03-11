'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import api from '@/lib/api';
import LabOrderForm from '@/components/portals/doctor/labs/lab-order-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { API_ORIGIN } from '@/lib/urls';

interface DoctorPatient {
    id: number;
    displayId: string;
    name: string;
    mrn: string;
}

interface LabResultItem {
    id: number;
    test_name?: string;
    sample_id?: string;
    result_value?: string;
    units?: string;
    flag?: string;
    released_to_patient?: boolean;
    file_attachment_name?: string;
}

export default function LabsPage() {
    const { isAuthenticated } = useAuth();
    const searchParams = useSearchParams();
    const preselectPatientId = searchParams?.get('patient_id') || '';
    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState<DoctorPatient[]>([]);
    const [results, setResults] = useState<LabResultItem[]>([]);
    const [resultsLoading, setResultsLoading] = useState(true);
    const [releaseId, setReleaseId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!isAuthenticated) return;
        const fetchPatients = async () => {
            try {
                const res = await api.get('/patients/');
                const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
                setPatients(data.map((p: any) => ({
                    id: p.id,
                    displayId: p.patient_id || `P-${p.id}`,
                    mrn: p.patient_id || `P-${p.id}`,
                    name: `${p.user_first_name} ${p.user_last_name}`.trim(),
                })));
            } catch (error) {
                console.error('Error fetching patients for Labs:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPatients();
    }, [isAuthenticated]);

    const fetchResults = async () => {
        setResultsLoading(true);
        try {
            const res = await api.get('/labs/results/');
            const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setResults(data);
        } catch (error) {
            console.error('Error fetching lab results:', error);
        } finally {
            setResultsLoading(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) return;
        fetchResults();
    }, [isAuthenticated]);

    const handleRelease = async (id: number) => {
        setReleaseId(id);
        try {
            await api.post(`/labs/results/${id}/release/`);
            toast.success('Result released to patient');
            await fetchResults();
        } catch (error) {
            toast.error('Failed to release result');
        } finally {
            setReleaseId(null);
        }
    };

    const handleViewAttachment = async (id: number) => {
        try {
            const res = await api.get(`/labs/results/${id}/presigned/`);
            const url = res.data?.url as string | undefined;
            if (!url) {
                toast.error('No view link available');
                return;
            }
            const viewUrl = url.startsWith('http') ? url : `${API_ORIGIN}${url}`;
            window.open(viewUrl, '_blank', 'noopener,noreferrer');
        } catch (error) {
            toast.error('Failed to open attachment');
        }
    };

    const handleDownloadAttachment = async (id: number, filename?: string) => {
        try {
            const res = await api.get(`/labs/results/${id}/download/`, { responseType: 'blob' });
            const blob = new Blob([res.data]);
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = filename || `lab_result_${id}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (error) {
            toast.error('Failed to download attachment');
        }
    };

    const filteredResults = results.filter((result) => {
        if (!searchQuery.trim()) return true;
        const term = searchQuery.trim().toLowerCase();
        return (
            String(result.sample_id || '').toLowerCase().includes(term) ||
            String(result.test_name || '').toLowerCase().includes(term) ||
            String(result.result_value || '').toLowerCase().includes(term) ||
            String(result.flag || '').toLowerCase().includes(term)
        );
    });

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-black text-foreground tracking-tight">Lab Orders</h2>
            <div className="space-y-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <h3 className="text-xl font-bold text-foreground">Pending Results</h3>
                    <div className="relative w-full md:max-w-xs">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search results..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-background"
                        />
                    </div>
                </div>
                {resultsLoading ? (
                    <div className="text-muted-foreground">Loading lab results...</div>
                ) : filteredResults.length === 0 ? (
                    <div className="text-muted-foreground">
                        {searchQuery ? 'No lab results match your search.' : 'No lab results found.'}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-border/60 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 text-left">Sample</th>
                                    <th className="px-4 py-3 text-left">Test</th>
                                    <th className="px-4 py-3 text-left">Result</th>
                                    <th className="px-4 py-3 text-left">Flag</th>
                                    <th className="px-4 py-3 text-left">Attachment</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredResults.map((result) => (
                                    <tr key={result.id} className="border-t border-border/40">
                                        <td className="px-4 py-3 font-mono text-xs">{result.sample_id || '—'}</td>
                                        <td className="px-4 py-3">{result.test_name || '—'}</td>
                                        <td className="px-4 py-3">{result.result_value || '—'} {result.units || ''}</td>
                                        <td className="px-4 py-3">{result.flag || 'Normal'}</td>
                                        <td className="px-4 py-3">
                                            {result.file_attachment_name ? (
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleViewAttachment(result.id)}
                                                    >
                                                        View
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleDownloadAttachment(result.id, result.file_attachment_name)}
                                                    >
                                                        Download
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">None</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {result.released_to_patient ? (
                                                <span className="text-xs text-green-600 font-semibold">Released</span>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleRelease(result.id)}
                                                    disabled={releaseId === result.id}
                                                >
                                                    {releaseId === result.id ? 'Releasing...' : 'Release'}
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <LabOrderForm
                patients={patients}
                initialPatientId={preselectPatientId}
                onSubmitOrder={async (order) => {
                    try {
                        const res = await api.post('/labs/orders/', order);
                        const sampleId = res?.data?.sample_id as string | undefined;
                        toast.success(sampleId ? `Lab order submitted (Sample ${sampleId})` : 'Lab order submitted successfully');
                    } catch (error) {
                        toast.error('Failed to submit lab order');
                        throw error;
                    }
                }}
            />
        </div>
    );
}
