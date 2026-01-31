'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Microscope, FlaskConical, FileCheck, RefreshCw } from 'lucide-react';
import ResultUploadModal from '@/components/lab/result-upload-modal';

interface TechnicianPortalProps {
    onLogout: () => void;
    onSwitchRole: (role: any) => void;
}

export default function TechnicianPortal({ onLogout, onSwitchRole }: TechnicianPortalProps) {
    const [worklist, setWorklist] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

    const fetchWorklist = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://127.0.0.1:8000/api/lab/worklist/');
            if (res.ok) {
                const data = await res.json();
                setWorklist(data);
            }
        } catch (err) {
            console.error("Failed to fetch worklist", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorklist();
    }, []);

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xl text-primary">
                        <Microscope className="h-6 w-6" />
                        <span>SecureMed Lab</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">Logged in as Technician</span>
                        <Button variant="outline" size="sm" onClick={() => onSwitchRole('patient')}>Back to Home</Button>
                        <Button variant="outline" size="sm" onClick={onLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container py-6">
                <div className="grid gap-6">
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex flex-col space-y-1.5">
                                <h3 className="text-2xl font-semibold leading-none tracking-tight">Blinded Worklist</h3>
                                <p className="text-sm text-muted-foreground">Process lab orders without patient bias. Sample IDs only.</p>
                            </div>
                            <Button variant={'outline'} onClick={fetchWorklist} disabled={loading}>
                                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>

                        {worklist.length === 0 ? (
                            <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg bg-muted/20">
                                <div className="text-center">
                                    <FlaskConical className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-muted-foreground">No pending orders found.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="py-3 px-4 text-left font-medium">Sample ID</th>
                                            <th className="py-3 px-4 text-left font-medium">Panels</th>
                                            <th className="py-3 px-4 text-left font-medium">Priority</th>
                                            <th className="py-3 px-4 text-left font-medium">Status</th>
                                            <th className="py-3 px-4 text-left font-medium">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {worklist.map((order) => (
                                            <tr key={order.id} className="border-b hover:bg-muted/50">
                                                <td className="py-3 px-4 font-mono font-medium text-primary">{order.sample_id}</td>
                                                <td className="py-3 px-4">
                                                    {/* Handle if panels_details is missing safely */}
                                                    {order.panels_details?.map((p: any) => p.name).join(', ') || 'N/A'}
                                                </td>
                                                <td className="py-3 px-4">
                                                    {order.priority === 'STAT' ? (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                            STAT
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">{order.priority || 'Routine'}</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Button size="sm" onClick={() => setSelectedOrder(order)}>
                                                        <FileCheck className="mr-2 h-3.5 w-3.5" />
                                                        Upload & Verify
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Result Upload Modal */}
            {selectedOrder && (
                <ResultUploadModal
                    isOpen={!!selectedOrder}
                    orderId={selectedOrder.id}
                    sampleId={selectedOrder.sample_id}
                    onClose={() => setSelectedOrder(null)}
                    onSuccess={() => {
                        fetchWorklist(); // Refresh list after upload
                    }}
                />
            )}
        </div>
    );
}
