'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import {
    Clock,
    Plus,
    Minus,
    Calendar as CalendarIcon,
    Save,
    Trash2,
    RefreshCw,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TimeSlotConfig {
    id: string;
    startTime: string;
    endTime: string;
    type: 'available' | 'surgery' | 'break';
}

export default function AvailabilityManager() {
    const { toast } = useToast();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [slots, setSlots] = useState<TimeSlotConfig[]>([
        { id: '1', startTime: '09:00', endTime: '10:00', type: 'available' },
        { id: '2', startTime: '10:00', endTime: '11:00', type: 'available' },
        { id: '3', startTime: '13:00', endTime: '14:00', type: 'break' },
    ]);
    const [isLoading, setIsLoading] = useState(false);

    // TODO: Integrate with backend API for availability management
    const handleSave = async () => {
        setIsLoading(true);
        // Placeholder for API call - integrate with backend when endpoint is ready
        setTimeout(() => {
            setIsLoading(false);
            toast({
                title: 'Schedule Updated',
                description: `Availability for ${selectedDate?.toLocaleDateString()} has been saved.`,
            });
        }, 1000);
    };

    const addSlot = () => {
        const newSlot: TimeSlotConfig = {
            id: Math.random().toString(),
            startTime: '12:00',
            endTime: '13:00',
            type: 'available'
        };
        setSlots([...slots, newSlot]);
    };

    const removeSlot = (id: string) => {
        setSlots(slots.filter(s => s.id !== id));
    };

    const updateSlot = (id: string, field: keyof TimeSlotConfig, value: string) => {
        setSlots(slots.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    return (
        <div className="grid lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 p-6 border-none shadow-xl bg-card">
                <div className="mb-6">
                    <h2 className="text-xl font-black text-foreground mb-2">Select Date</h2>
                    <p className="text-sm text-muted-foreground">Manage your schedule for specific days.</p>
                </div>
                <div className="p-4 border border-border/50 rounded-[24px] bg-background/50">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        className="rounded-md"
                    />
                </div>

                <div className="mt-6 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                    <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-3">Quick Actions</h3>
                    <div className="space-y-2">
                        <Button variant="outline" className="w-full justify-start text-xs font-bold h-10" onClick={() => setSlots([])}>
                            <Trash2 className="h-3 w-3 mr-2" />
                            Clear All Slots
                        </Button>
                        <Button variant="outline" className="w-full justify-start text-xs font-bold h-10" onClick={() => {
                            setSlots([
                                { id: '1', startTime: '09:00', endTime: '17:00', type: 'available' }
                            ]);
                        }}>
                            <RefreshCw className="h-3 w-3 mr-2" />
                            Reset to Default (9-5)
                        </Button>
                    </div>
                </div>
            </Card>

            <Card className="lg:col-span-2 p-8 border-none shadow-xl bg-card">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
                            <Clock className="h-6 w-6 text-primary" />
                            Availability Manager
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Configure slots for <span className="font-bold text-foreground">{selectedDate?.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                        </p>
                    </div>
                    <Button onClick={handleSave} disabled={isLoading} className="font-bold shadow-lg shadow-primary/20">
                        {isLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Changes
                    </Button>
                </div>

                <div className="space-y-4">
                    {slots.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-border rounded-[32px] bg-muted/20">
                            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                <CalendarIcon className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                            <p className="font-bold text-muted-foreground">No slots configured for this day</p>
                            <Button variant="link" onClick={addSlot} className="text-primary font-bold mt-2">
                                + Add First Slot
                            </Button>
                        </div>
                    ) : (
                        slots.map((slot, index) => (
                            <div key={slot.id} className="group flex flex-col md:flex-row items-center gap-4 p-4 rounded-2xl bg-background border border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all animate-in slide-in-from-bottom-2 duration-300">
                                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center font-bold text-muted-foreground text-xs">
                                    {index + 1}
                                </div>

                                <div className="flex items-center gap-2 flex-1 w-full md:w-auto">
                                    <div className="relative flex-1">
                                        <label className="absolute -top-2 left-2 px-1 bg-background text-[10px] font-bold text-muted-foreground">Start</label>
                                        <input
                                            type="time"
                                            value={slot.startTime}
                                            onChange={(e) => updateSlot(slot.id, 'startTime', e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border border-border bg-muted/20 text-sm font-medium focus:border-primary focus:ring-0 outline-none"
                                        />
                                    </div>
                                    <span className="text-muted-foreground">-</span>
                                    <div className="relative flex-1">
                                        <label className="absolute -top-2 left-2 px-1 bg-background text-[10px] font-bold text-muted-foreground">End</label>
                                        <input
                                            type="time"
                                            value={slot.endTime}
                                            onChange={(e) => updateSlot(slot.id, 'endTime', e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border border-border bg-muted/20 text-sm font-medium focus:border-primary focus:ring-0 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="w-full md:w-48">
                                    <select
                                        value={slot.type}
                                        onChange={(e) => updateSlot(slot.id, 'type', e.target.value as any)}
                                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-sm font-medium focus:border-primary focus:ring-0 outline-none cursor-pointer"
                                    >
                                        <option value="available">✓ Available</option>
                                        <option value="surgery">⚡ Surgery</option>
                                        <option value="break">☕ Break</option>
                                    </select>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeSlot(slot.id)}
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-6">
                    <Button variant="outline" onClick={addSlot} className="w-full border-dashed border-2 h-14 rounded-2xl text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 font-bold transition-all">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Time Slot
                    </Button>
                </div>
            </Card>
        </div>
    );
}
