'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { StaffMember } from '@/services/admin';
import { Lock, UserX } from 'lucide-react';

interface StaffManagerProps {
    staff: StaffMember[];
}

export default function StaffManager({ staff }: StaffManagerProps) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-foreground">Staff Directory</h3>
                <Button>Add Staff Member</Button>
            </div>

            <div className="bg-card rounded-lg border border-border overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-muted/30">
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Name</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Role</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Hospital</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {staff.length > 0 ? (
                            staff.map((member) => (
                                <tr key={member.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                                    <td className="py-3 px-4 font-medium text-foreground">{member.name}</td>
                                    <td className="py-3 px-4 text-muted-foreground">{member.role}</td>
                                    <td className="py-3 px-4 text-muted-foreground">{member.hospital}</td>
                                    <td className="py-3 px-4">
                                        <span
                                            className={`text-xs font-medium px-2 py-1 rounded-full ${member.status === 'Active'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                                }`}
                                        >
                                            {member.status}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="sm">Edit</Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50" title="Reset Password">
                                                <Lock className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" title="Deactivate User">
                                                <UserX className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                                    No staff members found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
