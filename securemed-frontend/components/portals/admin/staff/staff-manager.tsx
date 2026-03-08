'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StaffMember } from '@/services/admin';
import { Lock, UserX } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';

interface StaffManagerProps {
    staff: StaffMember[];
    onCreateUser: (payload: {
        username: string;
        email: string;
        first_name: string;
        last_name: string;
        role: string;
        password: string;
        password_confirm: string;
    }) => Promise<void>;
}

export default function StaffManager({ staff, onCreateUser }: StaffManagerProps) {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        role: 'pharmacist',
        password: '',
        password_confirm: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (key: string, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async () => {
        setSaving(true);
        setError(null);
        try {
            await onCreateUser(form);
            setOpen(false);
            setForm({
                username: '',
                email: '',
                first_name: '',
                last_name: '',
                role: 'pharmacist',
                password: '',
                password_confirm: ''
            });
        } catch (e: any) {
            setError('Failed to create user. Please check inputs and try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-foreground">Staff Directory</h3>
                <Button onClick={() => setOpen(true)}>Add Staff Member</Button>
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

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create Staff User</DialogTitle>
                        <DialogDescription>
                            Admin-only creation. Users cannot self-register.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">First Name</label>
                            <Input value={form.first_name} onChange={(e) => handleChange('first_name', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Last Name</label>
                            <Input value={form.last_name} onChange={(e) => handleChange('last_name', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Username</label>
                            <Input value={form.username} onChange={(e) => handleChange('username', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <Input value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Role</label>
                            <select
                                value={form.role}
                                onChange={(e) => handleChange('role', e.target.value)}
                                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                            >
                                <option value="doctor">Doctor</option>
                                <option value="provider">Provider</option>
                                <option value="pharmacist">Pharmacist</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Password</label>
                            <Input type="password" value={form.password} onChange={(e) => handleChange('password', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Confirm Password</label>
                            <Input type="password" value={form.password_confirm} onChange={(e) => handleChange('password_confirm', e.target.value)} />
                        </div>
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={saving}>
                            {saving ? 'Creating...' : 'Create User'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
