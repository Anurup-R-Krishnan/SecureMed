'use client';

import React from 'react';
import { WardMap } from '@/components/features/ward/ward-map';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Filter } from 'lucide-react';
import Link from 'next/link';

export default function WardMapPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/doctor/dashboard">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">Live Ward Map</h1>
                        <p className="text-muted-foreground">ICU & Critical Care Units</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline"><Filter className="h-4 w-4 mr-2" /> Filter View</Button>
                    <Button>Occupancy Report</Button>
                </div>
            </div>

            <WardMap />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="p-4 bg-card border rounded-xl">
                    <h3 className="font-bold text-lg mb-2">Unit Capacity</h3>
                    <div className="text-4xl font-black text-primary">82%</div>
                    <div className="text-sm text-muted-foreground">10/12 Beds Occupied</div>
                </div>
                <div className="p-4 bg-card border rounded-xl">
                    <h3 className="font-bold text-lg mb-2">Critical Cases</h3>
                    <div className="text-4xl font-black text-red-500">3</div>
                    <div className="text-sm text-muted-foreground">Requires immediate attention</div>
                </div>
                <div className="p-4 bg-card border rounded-xl">
                    <h3 className="font-bold text-lg mb-2">Staffing</h3>
                    <div className="text-4xl font-black text-green-500">1:3</div>
                    <div className="text-sm text-muted-foreground">Nurse to Patient Ratio</div>
                </div>
            </div>
        </div>
    );
}
