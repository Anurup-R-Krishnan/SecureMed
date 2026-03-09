'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminService } from '@/services/admin';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WardMap, RoomData } from '@/components/features/ward/ward-map';

export default function WardMapPage() {
    const [allRooms, setAllRooms] = React.useState<RoomData[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [filterStatus, setFilterStatus] = React.useState<'all' | 'critical' | 'stable' | 'empty'>('all');

    const fetchWardData = React.useCallback(async () => {
        try {
            setLoading(true);
            const patients = await adminService.getPatients();

            const generatedRooms = Array.from({ length: 12 }, (_, i) => {
                const roomNum = (300 + i + 1).toString();
                const assignedPatient = patients[i];

                if (assignedPatient) {
                    const firstName = assignedPatient.user_first_name || '';
                    const lastName = assignedPatient.user_last_name || '';
                    const fullName = assignedPatient.name || `${firstName} ${lastName}`.trim() || 'Anonymous Patient';

                    return {
                        id: roomNum,
                        isOccupied: true,
                        patientName: fullName,
                        acuity: (i % 5 === 0 ? 'critical' : 'stable') as 'critical' | 'stable',
                        isIsolation: false
                    };
                } else {
                    return {
                        id: roomNum,
                        isOccupied: false,
                        patientName: null,
                        acuity: null,
                        isIsolation: false
                    };
                }
            });

            setAllRooms(generatedRooms);
        } catch (error) {
            console.error("Failed to fetch ward data", error);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchWardData();
    }, [fetchWardData]);

    const filteredRooms = React.useMemo(() => {
        if (filterStatus === 'all') return allRooms;
        if (filterStatus === 'empty') return allRooms.filter((r: RoomData) => !r.isOccupied);
        return allRooms.filter((r: RoomData) => r.acuity === filterStatus);
    }, [allRooms, filterStatus]);

    const downloadOccupancyReport = () => {
        const headers = ["Room ID", "Status", "Patient Name", "Acuity"];
        const rows = allRooms.map((room: RoomData) => [
            room.id,
            room.isOccupied ? "Occupied" : "Vacant",
            room.patientName || "N/A",
            room.acuity || "N/A"
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map((row: string[]) => row.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `ward_occupancy_report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <Filter className="h-4 w-4 mr-2" /> 
                                {filterStatus === 'all' ? 'Filter View' : `Filter: ${filterStatus}`}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => setFilterStatus('all')}>All Beds</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilterStatus('critical')}>Critical Only</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilterStatus('stable')}>Stable Only</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilterStatus('empty')}>Empty Only</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button onClick={downloadOccupancyReport}>Occupancy Report</Button>
                </div>
            </div>

            <WardMap rooms={filteredRooms} loading={loading} />

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
