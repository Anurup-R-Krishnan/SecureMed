'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import api from '@/lib/api';
import LabOrderForm from '@/components/portals/doctor/labs/lab-order-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

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
}

export default function LabsPage() {
    const { isAuthenticated } = useAuth();
    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState<DoctorPatient[]>([]);
    const [results, setResults] = useState<LabResultItem[]>([]);
    const [resultsLoading, setResultsLoading] = useState(true);
    const [releaseId, setReleaseId] = useState<number | null>(null);

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

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-black text-foreground tracking-tight">Lab Orders</h2>
            <div className="space-y-3">
                <h3 className="text-xl font-bold text-foreground">Pending Results</h3>
                {resultsLoading ? (
                    <div className="text-muted-foreground">Loading lab results...</div>
                ) : results.length === 0 ? (
                    <div className="text-muted-foreground">No lab results found.</div>
                ) : (
                    <div className="rounded-2xl border border-border/60 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 text-left">Sample</th>
                                    <th className="px-4 py-3 text-left">Test</th>
                                    <th className="px-4 py-3 text-left">Result</th>
                                    <th className="px-4 py-3 text-left">Flag</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((result) => (
                                    <tr key={result.id} className="border-t border-border/40">
                                        <td className="px-4 py-3 font-mono text-xs">{result.sample_id || '—'}</td>
                                        <td className="px-4 py-3">{result.test_name || '—'}</td>
                                        <td className="px-4 py-3">{result.result_value || '—'} {result.units || ''}</td>
                                        <td className="px-4 py-3">{result.flag || 'Normal'}</td>
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
                onSubmitOrder={async (order) => {
                    console.log("Order submitted:", order);
                    toast.success("Lab order submitted successfully");
                    return Promise.resolve();
                }}
            />
        </div>
    );
}
