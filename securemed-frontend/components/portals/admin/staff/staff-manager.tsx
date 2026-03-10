'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StaffMember, adminService } from '@/services/admin';
import { Lock, UserX } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

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
    onRefresh: () => Promise<void>;
}

export default function StaffManager({ staff, onCreateUser, onRefresh }: StaffManagerProps) {
    const { toast } = useToast();
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
    const [editOpen, setEditOpen] = useState(false);
    const [editMember, setEditMember] = useState<StaffMember | null>(null);
    const [editRole, setEditRole] = useState('provider');
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [resetPassword, setResetPassword] = useState<string | null>(null);

    const handleChange = (key: string, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async () => {
        setSaving(true);
        setError(null);
        try {
            await onCreateUser(form);
            await onRefresh();
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

    const handleEdit = (member: StaffMember) => {
        const normalizeRole = (roleValue?: string) => {
            const value = (roleValue || '').toLowerCase();
            if (value.includes('doctor')) return 'doctor';
            if (value.includes('provider')) return 'provider';
            if (value.includes('pharmacist')) return 'pharmacist';
            if (value.includes('lab')) return 'lab_technician';
            if (value.includes('admin')) return 'admin';
            if (value.includes('patient')) return 'patient';
            return 'provider';
        };
        setEditMember(member);
        setEditRole(normalizeRole(member.role));
        setEditOpen(true);
    };

    const handleUpdateRole = async () => {
        if (!editMember) return;
        const userId = editMember.user_id ?? editMember.id;
        try {
            setActionLoading(userId);
            await adminService.updateUserRole(userId, editRole);
            await onRefresh();
            setEditOpen(false);
            toast({ title: 'Role updated', description: `${editMember.name} is now ${editRole}.` });
        } catch (e: any) {
            toast({ title: 'Update failed', description: e?.response?.data?.error || 'Could not update role.', variant: 'destructive' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleToggleActive = async (member: StaffMember) => {
        const userId = member.user_id ?? member.id;
        try {
            setActionLoading(userId);
            if (member.is_active === false || member.status === 'Inactive') {
                await adminService.activateUser(userId);
                toast({ title: 'User activated', description: `${member.name} is now active.` });
            } else {
                await adminService.deactivateUser(userId);
                toast({ title: 'User deactivated', description: `${member.name} has been deactivated.` });
            }
            await onRefresh();
        } catch (e: any) {
            toast({ title: 'Action failed', description: e?.response?.data?.error || 'Could not update status.', variant: 'destructive' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleResetPassword = async (member: StaffMember) => {
        const userId = member.user_id ?? member.id;
        try {
            setActionLoading(userId);
            const response = await adminService.resetUserPassword(userId);
            setResetPassword(response?.temporary_password || null);
            setResetDialogOpen(true);
            toast({ title: 'Password reset', description: `Temporary password generated for ${member.name}.` });
        } catch (e: any) {
            toast({ title: 'Reset failed', description: e?.response?.data?.error || 'Could not reset password.', variant: 'destructive' });
        } finally {
            setActionLoading(null);
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
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(member)}>Edit</Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                title="Reset Password"
                                                onClick={() => handleResetPassword(member)}
                                                disabled={actionLoading === (member.user_id ?? member.id)}
                                            >
                                                <Lock className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                title={member.is_active === false || member.status === 'Inactive' ? 'Activate User' : 'Deactivate User'}
                                                onClick={() => handleToggleActive(member)}
                                                disabled={actionLoading === (member.user_id ?? member.id)}
                                            >
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

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Staff Role</DialogTitle>
                        <DialogDescription>
                            Update the role for {editMember?.name || 'staff member'}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Role</label>
                        <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        >
                            <option value="doctor">Doctor</option>
                            <option value="provider">Provider</option>
                            <option value="pharmacist">Pharmacist</option>
                            <option value="lab_technician">Lab Technician</option>
                            <option value="admin">Admin</option>
                            <option value="patient">Patient</option>
                        </select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)} disabled={actionLoading !== null}>Cancel</Button>
                        <Button onClick={handleUpdateRole} disabled={actionLoading !== null}>Update Role</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Temporary Password</DialogTitle>
                        <DialogDescription>
                            Share this temporary password with the staff member securely.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-sm">
                        {resetPassword || 'Unable to generate password.'}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
