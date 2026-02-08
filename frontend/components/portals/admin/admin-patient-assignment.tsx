'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Shield,
    User,
    Search,
    X,
    CheckCircle,
    XCircle,
    Loader2,
    UserPlus,
    UserMinus
} from 'lucide-react';

interface PatientAssignment {
    patientId: string;
    patientName: string;
    assignedDoctor: string;
    assignedDate: string;
    isActive: boolean;
    bloodGroup?: string;
}

interface AdminPatientAssignmentProps {
    onClose: () => void;
}

export default function AdminPatientAssignment({ onClose }: AdminPatientAssignmentProps) {
    const [assignments, setAssignments] = useState<PatientAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
    const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);

    useEffect(() => {
        fetchAssignments();
    }, []);

    const fetchAssignments = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://127.0.0.1:8000/api/patients/all-assignments/', {
                headers: { 'X-User-Role': 'admin' }
            });
            const data = await response.json();
            setAssignments(data);
        } catch (error) {
            console.error('Error fetching assignments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeAccess = async (patientId: string, doctorId: string) => {
        try {
            await fetch('http://127.0.0.1:8000/api/patients/admin-revoke/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Role': 'admin'
                },
                body: JSON.stringify({
                    patientId,
                    doctorId,
                    adminId: 'admin-1',
                    reason: 'Manual override by administrator'
                })
            });

            // Refresh assignments
            fetchAssignments();
        } catch (error) {
            console.error('Error revoking access:', error);
        }
    };

    const handleGrantAccess = async (patientId: string, doctorId: string) => {
        try {
            await fetch('http://127.0.0.1:8000/api/patients/admin-grant/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Role': 'admin'
                },
                body: JSON.stringify({
                    patientId,
                    doctorId,
                    adminId: 'admin-1',
                    reason: 'Manual grant by administrator'
                })
            });

            // Refresh assignments
            fetchAssignments();
        } catch (error) {
            console.error('Error granting access:', error);
        }
    };

    const filteredAssignments = assignments.filter(a =>
        a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.assignedDoctor.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                                <Shield className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-foreground">Patient Assignment Management</h2>
                                <p className="text-sm text-muted-foreground">Admin override for manual access control</p>
                            </div>
                        </div>
                        <Button
                            onClick={onClose}
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Search */}
                <div className="p-6 border-b border-border">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search patients or doctors..."
                            className="w-full pl-10 pr-4 py-3 border border-border rounded-xl bg-card text-foreground text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                        />
                    </div>
                </div>

                {/* Assignments List */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-muted-foreground">Loading assignments...</span>
                        </div>
                    ) : filteredAssignments.length === 0 ? (
                        <div className="text-center py-12">
                            <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                            <p className="text-muted-foreground">No assignments found</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredAssignments.map((assignment) => (
                                <div
                                    key={`${assignment.patientId}-${assignment.assignedDoctor}`}
                                    className="p-4 rounded-xl border-2 border-border hover:border-primary/30 transition-all bg-card"
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${assignment.isActive ? 'bg-green-100 dark:bg-green-950' : 'bg-gray-100 dark:bg-gray-900'
                                                }`}>
                                                <User className={`h-6 w-6 ${assignment.isActive ? 'text-green-600' : 'text-gray-400'
                                                    }`} />
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-foreground">{assignment.patientName}</h3>
                                                    {assignment.isActive ? (
                                                        <Badge className="bg-green-100 text-green-800 border-green-300">
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Active
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-gray-100 text-gray-600">
                                                            <XCircle className="h-3 w-3 mr-1" />
                                                            Revoked
                                                        </Badge>
                                                    )}
                                                    {assignment.bloodGroup && (
                                                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                            {assignment.bloodGroup}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Assigned to: <span className="font-semibold">{assignment.assignedDoctor}</span>
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Date: {new Date(assignment.assignedDate).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            {assignment.isActive ? (
                                                <Button
                                                    onClick={() => handleRevokeAccess(assignment.patientId, assignment.assignedDoctor)}
                                                    variant="destructive"
                                                    size="sm"
                                                    className="gap-2"
                                                >
                                                    <UserMinus className="h-4 w-4" />
                                                    Revoke
                                                </Button>
                                            ) : (
                                                <Button
                                                    onClick={() => handleGrantAccess(assignment.patientId, assignment.assignedDoctor)}
                                                    size="sm"
                                                    className="gap-2"
                                                >
                                                    <UserPlus className="h-4 w-4" />
                                                    Grant
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border bg-muted/30">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Total assignments: <span className="font-bold text-foreground">{assignments.length}</span>
                        </p>
                        <Button onClick={onClose} variant="outline">
                            Close
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
