'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Hospital } from '@/services/admin';

interface HospitalManagerProps {
    hospitals: Hospital[];
}

export default function HospitalManager({ hospitals }: HospitalManagerProps) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-foreground">Hospital Management</h3>
                <Button>Add Hospital</Button>
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
                        {hospitals.length > 0 ? (
                            hospitals.map((hospital) => (
                                <tr key={hospital.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                                    <td className="py-3 px-4 font-medium text-foreground">{hospital.name}</td>
                                    <td className="py-3 px-4 text-muted-foreground">{hospital.location}</td>
                                    <td className="py-3 px-4 text-foreground">{hospital.beds}</td>
                                    <td className="py-3 px-4">
                                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${parseInt(hospital.occupancy) > 80
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {hospital.occupancy}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-foreground">{hospital.doctors}</td>
                                    <td className="py-3 px-4">
                                        <Button variant="ghost" size="sm">Edit</Button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                                    No hospitals found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
