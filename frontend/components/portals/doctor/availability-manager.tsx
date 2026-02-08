'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
    getDoctorAvailability,
    setDoctorAvailability,
    setRecurringAvailability,
} from '@/lib/services/availability-service';
import { getDoctorAppointments } from '@/lib/services/appointment-service';
import { TimeSlot, SlotType } from '@/lib/types/availability';
import { Appointment } from '@/lib/types/appointment';
import {
    Calendar,
    Clock,
    Save,
    RefreshCw,
    Check,
    X,
    AlertTriangle,
    Coffee,
    Stethoscope,
    Loader2,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AvailabilityManagerProps {
    doctorId?: string;
    doctorName?: string;
}

type SlotAction = 'AVAILABLE' | 'UNAVAILABLE' | 'SURGERY' | 'BREAK';

const slotTypeConfig: Record<SlotAction, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
    AVAILABLE: {
        label: 'Available',
        color: 'text-green-600',
        bgColor: 'bg-green-100 border-green-300',
        icon: <Check className="h-4 w-4" />
    },
    UNAVAILABLE: {
        label: 'Unavailable',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100 border-gray-300',
        icon: <X className="h-4 w-4" />
    },
    SURGERY: {
        label: 'Surgery',
        color: 'text-red-600',
        bgColor: 'bg-red-100 border-red-300',
        icon: <Stethoscope className="h-4 w-4" />
    },
    BREAK: {
        label: 'Break',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100 border-yellow-300',
        icon: <Coffee className="h-4 w-4" />
    },
};

export default function AvailabilityManager({
    doctorId = '1',
    doctorName = 'Dr. Sarah Smith'
}: AvailabilityManagerProps) {
    const { toast } = useToast();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [slots, setSlots] = useState<TimeSlot[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [pendingChanges, setPendingChanges] = useState<Map<string, SlotType>>(new Map());
    const [selectedSlotType, setSelectedSlotType] = useState<SlotAction>('AVAILABLE');
    const [showRecurring, setShowRecurring] = useState(false);
    const [recurringDays, setRecurringDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri

    // Load slots and appointments for selected date
    useEffect(() => {
        loadData();
    }, [selectedDate, doctorId]);

    const loadData = async () => {
        setIsLoading(true);
        const dateStr = selectedDate.toISOString().split('T')[0];

        try {
            const [daySlots, dayAppointments] = await Promise.all([
                getDoctorAvailability(doctorId, dateStr),
                getDoctorAppointments(doctorId, dateStr)
            ]);
            setSlots(daySlots);
            setAppointments(dayAppointments);
            setPendingChanges(new Map());
        } catch (error) {
            console.error('Failed to load availability data', error);
            toast({
                title: 'Error',
                description: 'Could not load availability data.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Handle slot click
    const handleSlotClick = (slot: TimeSlot) => {
        // Can't modify slots with confirmed appointments
        const hasAppointment = appointments.some(
            apt => apt.startTime === slot.startTime && apt.status !== 'CANCELLED'
        );

        if (hasAppointment) {
            toast({
                title: 'Cannot Modify',
                description: 'This slot has a confirmed appointment.',
                variant: 'destructive',
            });
            return;
        }

        const newChanges = new Map(pendingChanges);
        newChanges.set(slot.startTime, selectedSlotType);
        setPendingChanges(newChanges);
    };

    // Save changes
    const handleSave = async () => {
        if (pendingChanges.size === 0) return;

        setIsSaving(true);

        const dateStr = selectedDate.toISOString().split('T')[0];
        const slotsToUpdate = Array.from(pendingChanges.entries()).map(([startTime, slotType]) => ({
            startTime,
            slotType,
        }));

        try {
            const result = await setDoctorAvailability(doctorId, dateStr, slotsToUpdate, doctorId);
            if (result.success) {
                toast({
                    title: 'Availability Updated',
                    description: `${slotsToUpdate.length} slot(s) updated successfully.`,
                });
                loadData();
            } else {
                toast({
                    title: 'Update Failed',
                    description: result.error || 'Please try again.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'An unexpected error occurred.',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Save recurring availability
    const handleSaveRecurring = async () => {
        if (pendingChanges.size === 0) {
            toast({
                title: 'No Changes',
                description: 'Please select slots to apply recurring pattern.',
                variant: 'destructive',
            });
            return;
        }

        setIsSaving(true);

        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30); // Next 30 days

        const slotsToUpdate = Array.from(pendingChanges.entries()).map(([startTime, slotType]) => ({
            startTime,
            slotType,
        }));

        try {
            const result = await setRecurringAvailability(
                doctorId,
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0],
                recurringDays,
                slotsToUpdate,
                doctorId
            );

            if (result.success) {
                toast({
                    title: 'Recurring Availability Set',
                    description: `Pattern applied to ${result.updatedDates.length} days.`,
                });
                loadData();
                setShowRecurring(false);
            } else {
                toast({
                    title: 'Update Failed',
                    description: result.error || 'Please try again.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'An unexpected error occurred.',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Navigate dates
    const navigateDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
    };

    // Get effective slot type (pending change or current)
    const getEffectiveSlotType = (slot: TimeSlot): SlotType => {
        return pendingChanges.get(slot.startTime) || slot.slotType;
    };

    // Check if slot has appointment
    const slotHasAppointment = (startTime: string): Appointment | undefined => {
        return appointments.find(apt => apt.startTime === startTime && apt.status !== 'CANCELLED');
    };

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="space-y-6">
            <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Manage Availability</h2>
                        <p className="text-muted-foreground">Set your available and unavailable time slots</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowRecurring(!showRecurring)}
                        >
                            {showRecurring ? 'Single Day' : 'Recurring'}
                        </Button>
                        <Button
                            onClick={loadData}
                            variant="outline"
                            disabled={isLoading}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Recurring Options */}
                {showRecurring && (
                    <Card className="p-4 mb-6 bg-muted/30">
                        <h3 className="font-semibold text-foreground mb-3">Recurring Pattern</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                            Apply selected slots to the next 30 days on:
                        </p>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {dayNames.map((day, idx) => (
                                <button
                                    key={day}
                                    onClick={() => {
                                        if (recurringDays.includes(idx)) {
                                            setRecurringDays(recurringDays.filter(d => d !== idx));
                                        } else {
                                            setRecurringDays([...recurringDays, idx]);
                                        }
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${recurringDays.includes(idx)
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                        }`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                        <Button onClick={handleSaveRecurring} disabled={isSaving}>
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            Apply Recurring
                        </Button>
                    </Card>
                )}

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Calendar */}
                    <div>
                        <CalendarComponent
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => date && setSelectedDate(date)}
                            className="rounded-lg border border-border"
                        />
                    </div>

                    {/* Slot Type Selector */}
                    <div>
                        <h3 className="font-semibold text-foreground mb-3">Slot Type</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Select a type, then click on time slots to apply
                        </p>
                        <div className="space-y-2">
                            {(Object.entries(slotTypeConfig) as [SlotAction, typeof slotTypeConfig['AVAILABLE']][]).map(([type, config]) => (
                                <button
                                    key={type}
                                    onClick={() => setSelectedSlotType(type)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${selectedSlotType === type
                                        ? `${config.bgColor} border-current`
                                        : 'border-border hover:border-muted-foreground'
                                        }`}
                                >
                                    <span className={config.color}>{config.icon}</span>
                                    <span className={`font-medium ${selectedSlotType === type ? config.color : 'text-foreground'}`}>
                                        {config.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Time Slots */}
                    <div className="lg:col-span-1">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-foreground">
                                {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </h3>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => navigateDate(-1)}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => navigateDate(1)}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                {slots.map((slot) => {
                                    const effectiveType = getEffectiveSlotType(slot);
                                    const config = slotTypeConfig[effectiveType];
                                    const appointment = slotHasAppointment(slot.startTime);
                                    const hasChange = pendingChanges.has(slot.startTime);

                                    return (
                                        <button
                                            key={slot.startTime}
                                            onClick={() => handleSlotClick(slot)}
                                            disabled={!!appointment}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all ${appointment
                                                ? 'bg-blue-50 border-blue-300 cursor-not-allowed'
                                                : hasChange
                                                    ? `${config.bgColor} border-dashed`
                                                    : `${config.bgColor} hover:opacity-80`
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Clock className={`h-4 w-4 ${appointment ? 'text-blue-600' : config.color}`} />
                                                <span className="font-medium">
                                                    {slot.startTime} - {slot.endTime}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {appointment ? (
                                                    <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                                                        {appointment.patientName}
                                                    </span>
                                                ) : (
                                                    <>
                                                        <span className={`text-xs ${config.color}`}>{config.label}</span>
                                                        {hasChange && (
                                                            <span className="text-xs bg-yellow-500 text-white px-1 rounded">
                                                                Changed
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Save Button */}
                {pendingChanges.size > 0 && !showRecurring && (
                    <div className="mt-6 flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-center gap-2 text-yellow-700">
                            <AlertTriangle className="h-5 w-5" />
                            <span>{pendingChanges.size} unsaved change(s)</span>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setPendingChanges(new Map())}>
                                Discard
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4 mr-2" />
                                )}
                                Save Changes
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Today's Appointments Summary */}
            {appointments.length > 0 && (
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                        Appointments on {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </h3>
                    <div className="space-y-2">
                        {appointments.map(apt => (
                            <div
                                key={apt.id}
                                className="flex items-center justify-between p-3 border border-border rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{apt.startTime}</span>
                                    <span className="text-foreground">{apt.patientName}</span>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded ${apt.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                                    apt.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-700'
                                    }`}>
                                    {apt.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}
