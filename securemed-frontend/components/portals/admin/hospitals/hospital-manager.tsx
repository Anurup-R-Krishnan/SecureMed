'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Hospital } from '@/services/admin';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface HospitalManagerProps {
    hospitals: Hospital[];
    onCreateHospital: (payload: {
        name: string;
        location: string;
        beds: number;
        occupancy_percent: number;
        doctors: number;
    }) => Promise<void>;
    onUpdateHospital: (id: number, payload: Partial<{
        name: string;
        location: string;
        beds: number;
        occupancy_percent: number;
        doctors: number;
    }>) => Promise<void>;
}

export default function HospitalManager({ hospitals, onCreateHospital, onUpdateHospital }: HospitalManagerProps) {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<Hospital | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [form, setForm] = useState({
        name: '',
        location: '',
        beds: 0,
        occupancy_percent: 0,
        doctors: 0,
    });

    const resetForm = () => {
        setForm({
            name: '',
            location: '',
            beds: 0,
            occupancy_percent: 0,
            doctors: 0,
        });
        setEditing(null);
    };

    const handleOpenCreate = () => {
        resetForm();
        setOpen(true);
    };

    const handleEdit = (hospital: Hospital) => {
        setEditing(hospital);
        setForm({
            name: hospital.name,
            location: hospital.location,
            beds: hospital.beds,
            occupancy_percent: hospital.occupancy_percent,
            doctors: hospital.doctors,
        });
        setOpen(true);
    };

    const handleSubmit = async () => {
        setSaving(true);
        try {
            if (editing) {
                await onUpdateHospital(editing.id, form);
            } else {
                await onCreateHospital(form);
            }
            setOpen(false);
            resetForm();
        } finally {
            setSaving(false);
        }
    };

    const filteredHospitals = hospitals.filter((hospital) => {
        if (!searchQuery.trim()) return true;
        const term = searchQuery.trim().toLowerCase();
        return (
            hospital.name?.toLowerCase().includes(term) ||
            hospital.location?.toLowerCase().includes(term)
        );
    });

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-foreground">Hospital Management</h3>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search hospitals..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-background"
                        />
                    </div>
                    <Button onClick={handleOpenCreate}>Add Hospital</Button>
                </div>
            </div>

            <div className="bg-card rounded-lg border border-border overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-muted/30">
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Hospital Name</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Location</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Beds</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Occupancy</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Doctors</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredHospitals.length > 0 ? (
                            filteredHospitals.map((hospital) => (
                                <tr key={hospital.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                                    <td className="py-3 px-4 font-medium text-foreground">{hospital.name}</td>
                                    <td className="py-3 px-4 text-muted-foreground">{hospital.location}</td>
                                    <td className="py-3 px-4 text-foreground">{hospital.beds}</td>
                                    <td className="py-3 px-4">
                                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${hospital.occupancy_percent > 80
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {hospital.occupancy_percent}%
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-foreground">{hospital.doctors}</td>
                                    <td className="py-3 px-4">
                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(hospital)}>Edit</Button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                                    {searchQuery ? 'No hospitals match your search.' : 'No hospitals found.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Hospital' : 'Add Hospital'}</DialogTitle>
                        <DialogDescription>
                            Manage hospital details for the admin dashboard.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Name</label>
                            <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Location</label>
                            <Input value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Beds</label>
                            <Input
                                type="number"
                                min={0}
                                value={form.beds}
                                onChange={(e) => setForm((prev) => ({ ...prev, beds: Number(e.target.value) }))} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Occupancy %</label>
                            <Input
                                type="number"
                                min={0}
                                max={100}
                                value={form.occupancy_percent}
                                onChange={(e) => setForm((prev) => ({ ...prev, occupancy_percent: Number(e.target.value) }))} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Doctors</label>
                            <Input
                                type="number"
                                min={0}
                                value={form.doctors}
                                onChange={(e) => setForm((prev) => ({ ...prev, doctors: Number(e.target.value) }))} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={saving || !form.name.trim() || !form.location.trim()}>
                            {saving ? 'Saving...' : (editing ? 'Update Hospital' : 'Create Hospital')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
