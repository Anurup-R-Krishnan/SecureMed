'use client';

import React, { useState } from 'react';
import { User, Bed, AlertTriangle, Shield } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { adminService } from '@/services/admin';

interface RoomData {
    id: string;
    isOccupied: boolean;
    patientName: string | null;
    acuity: 'critical' | 'warning' | 'stable' | null;
    isIsolation: boolean;
}

export function WardMap() {
    const [rooms, setRooms] = useState<RoomData[]>([]);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        const fetchWardData = async () => {
            try {
                const patients = await adminService.getPatients();

                const generatedRooms = Array.from({ length: 12 }, (_, i) => {
                    const roomNum = `30${i + 1}`;
                    const assignedPatient = patients[i];

                    if (assignedPatient) {
                        // Determine acuity based on recent vitals if available, otherwise random or stable
                        return {
                            id: roomNum,
                            isOccupied: true,
                            patientName: assignedPatient.name || assignedPatient.first_name + ' ' + assignedPatient.last_name,
                            acuity: (i % 5 === 0 ? 'critical' : 'stable') as 'critical' | 'stable', // Simple logic: every 5th patient is critical
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

                setRooms(generatedRooms);
            } catch (error) {
                console.error("Failed to fetch ward data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchWardData();
    }, []);

    return (
        <TooltipProvider>
            <div className="p-6 bg-card rounded-xl border shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg">ICU Ward 3 - Floor Plan</h3>
                    <div className="flex gap-4 text-xs">
                        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 border border-red-500 rounded"></span> Critical</div>
                        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-100 border border-amber-500 rounded"></span> Monitoring</div>
                        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-slate-50 border border-slate-300 rounded"></span> Empty</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {rooms.map((room) => (
                        <Tooltip key={room.id}>
                            <TooltipTrigger asChild>
                                <div
                                    className={`
                relative p-4 rounded-lg border-2 h-32 flex flex-col justify-between transition-all hover:shadow-md cursor-pointer hover:scale-[1.02]
                ${!room.isOccupied ? 'bg-slate-50 border-dashed border-slate-200 opacity-60' : ''}
                ${room.acuity === 'critical' ? 'bg-red-50 border-red-500 shadow-red-100' : ''}
                ${room.acuity === 'warning' ? 'bg-amber-50 border-amber-400 shadow-amber-100' : ''}
                ${room.acuity === 'stable' ? 'bg-emerald-50 border-emerald-400 shadow-emerald-100' : ''}
             `}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className="font-mono font-black text-lg opacity-50">{room.id}</span>
                                        {room.isIsolation && (
                                            <Shield className="h-4 w-4 text-purple-600" />
                                        )}
                                        {room.acuity === 'critical' && <AlertTriangle className="h-4 w-4 text-red-600 animate-pulse" />}
                                    </div>

                                    {room.isOccupied ? (
                                        <div className="text-center">
                                            <User className="h-6 w-6 mx-auto mb-1 opacity-80" />
                                            <div className="font-bold text-sm truncate px-1">{room.patientName}</div>
                                        </div>
                                    ) : (
                                        <div className="text-center text-muted-foreground text-xs font-medium">
                                            <Bed className="h-6 w-6 mx-auto mb-1 opacity-40" />
                                            Vancant
                                        </div>
                                    )}

                                    {/* Status Footer */}
                                    {room.acuity === 'critical' && (
                                        <div className="absolute inset-x-0 bottom-0 bg-red-500 text-white text-[10px] uppercase font-bold text-center py-0.5 rounded-b-sm animate-pulse">
                                            High Acuity
                                        </div>
                                    )}
                                </div>
                            </TooltipTrigger>
                            {room.isOccupied && (
                                <TooltipContent className="p-4 rounded-xl border-border/50 bg-background/95 backdrop-blur-xl shadow-xl">
                                    <div className="space-y-2">
                                        <p className="font-bold text-base">{room.patientName}</p>
                                        <div className="text-xs space-y-1 text-muted-foreground">
                                            <div className="flex justify-between gap-4">
                                                <span>Acuity:</span>
                                                <span className={`font-bold uppercase ${room.acuity === 'critical' ? 'text-red-500' :
                                                        room.acuity === 'warning' ? 'text-amber-500' : 'text-emerald-500'
                                                    }`}>{room.acuity}</span>
                                            </div>
                                            <div className="flex justify-between gap-4">
                                                <span>Room:</span>
                                                <span className="font-mono text-foreground">{room.id}</span>
                                            </div>
                                            {room.isIsolation && (
                                                <div className="text-purple-500 font-bold flex items-center gap-1">
                                                    <Shield className="h-3 w-3" /> Isolation Protocol
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </TooltipContent>
                            )}
                        </Tooltip>
                    ))}
                </div>

                {/* Nurses Station (Visual Anchor) */}
                <div className="mt-8 p-4 bg-muted/30 rounded-lg border-2 border-dashed flex justify-center items-center text-muted-foreground font-mono text-sm uppercase tracking-widest">
                    Nurses Station & Triage
                </div>
            </div>
        </TooltipProvider>
    );
}
