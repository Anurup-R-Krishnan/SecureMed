'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    ChevronLeft,
    ChevronRight,
    Clock,
    User,
    Calendar as CalendarIcon,
    Check,
    X
} from 'lucide-react';

interface Doctor {
    id: number;
    name: string;
    specialty: string;
    avatar?: string;
}

interface TimeSlot {
    time: string;
    available: boolean;
}

interface AppointmentCalendarProps {
    doctors: Doctor[];
    onBookAppointment: (date: Date, time: string, doctorId: number) => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// Generate time slots from 9 AM to 5 PM
const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    for (let hour = 9; hour < 17; hour++) {
        slots.push({
            time: `${hour.toString().padStart(2, '0')}:00`,
            available: Math.random() > 0.3, // Simulate availability
        });
        slots.push({
            time: `${hour.toString().padStart(2, '0')}:30`,
            available: Math.random() > 0.3,
        });
    }
    return slots;
};

export function AppointmentCalendar({ doctors, onBookAppointment }: AppointmentCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [step, setStep] = useState<'doctor' | 'date' | 'time' | 'confirm'>('doctor');

    // Fetch available slots from API
    useEffect(() => {
        async function fetchSlots() {
            if (selectedDate && selectedDoctor) {
                try {
                    // Format date as YYYY-MM-DD (local time)
                    const offset = selectedDate.getTimezoneOffset();
                    const localDate = new Date(selectedDate.getTime() - (offset * 60 * 1000));
                    const dateStr = localDate.toISOString().split('T')[0];

                    const response = await api.get(`/appointments/doctors/${selectedDoctor.id}/available_slots/`, {
                        params: { date: dateStr }
                    });
                    setTimeSlots(response.data);
                } catch (error) {
                    console.error("Failed to fetch slots", error);
                    setTimeSlots([]);
                }
            }
        }
        fetchSlots();
    }, [selectedDate, selectedDoctor]);

    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
            return newDate;
        });
    };

    const isToday = (day: number) => {
        const today = new Date();
        return (
            day === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear()
        );
    };

    const isPastDate = (day: number) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        return checkDate < today;
    };

    const handleDateClick = (day: number) => {
        if (!isPastDate(day)) {
            setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
            setStep('time');
        }
    };

    const handleConfirmBooking = () => {
        if (selectedDate && selectedTime && selectedDoctor) {
            onBookAppointment(selectedDate, selectedTime, selectedDoctor.id);
        }
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentDate);
        const firstDay = getFirstDayOfMonth(currentDate);
        const days = [];

        // Empty cells for days before the first day
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-10" />);
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const isSelected = selectedDate &&
                day === selectedDate.getDate() &&
                currentDate.getMonth() === selectedDate.getMonth();
            const past = isPastDate(day);

            days.push(
                <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    disabled={past}
                    className={`
            h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium
            transition-all duration-200
            ${isToday(day) ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
            ${isSelected ? 'bg-blue-600 text-white' : ''}
            ${past ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-blue-100 cursor-pointer'}
            ${!isSelected && !past ? 'text-slate-700' : ''}
          `}
                >
                    {day}
                </button>
            );
        }

        return days;
    };

    return (
        <div className="max-w-4xl mx-auto p-4">
            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-8">
                {['doctor', 'date', 'time', 'confirm'].map((s, i) => (
                    <React.Fragment key={s}>
                        <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
              ${step === s ? 'bg-blue-600 text-white' :
                                ['doctor', 'date', 'time', 'confirm'].indexOf(step) > i ?
                                    'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}
            `}>
                            {['doctor', 'date', 'time', 'confirm'].indexOf(step) > i ?
                                <Check className="w-4 h-4" /> : i + 1}
                        </div>
                        {i < 3 && (
                            <div className={`w-16 h-1 ${['doctor', 'date', 'time', 'confirm'].indexOf(step) > i ?
                                'bg-green-500' : 'bg-slate-200'
                                }`} />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Step 1: Select Doctor */}
            {step === 'doctor' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5" />
                            Select a Doctor
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {doctors.map(doctor => (
                                <button
                                    key={doctor.id}
                                    onClick={() => {
                                        setSelectedDoctor(doctor);
                                        setStep('date');
                                    }}
                                    className={`
                    p-4 rounded-lg border-2 text-left transition-all
                    hover:border-blue-500 hover:bg-blue-50
                    ${selectedDoctor?.id === doctor.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}
                  `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                                            {doctor.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800">{doctor.name}</p>
                                            <p className="text-sm text-slate-500">{doctor.specialty}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 2: Select Date */}
            {step === 'date' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5" />
                            Select a Date
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Calendar Header */}
                        <div className="flex items-center justify-between mb-4">
                            <Button variant="ghost" size="icon" onClick={() => navigateMonth('prev')}>
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <h3 className="font-semibold text-lg">
                                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                            </h3>
                            <Button variant="ghost" size="icon" onClick={() => navigateMonth('next')}>
                                <ChevronRight className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Day Headers */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {DAYS.map(day => (
                                <div key={day} className="h-8 flex items-center justify-center text-sm font-medium text-slate-500">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1">
                            {renderCalendar()}
                        </div>

                        <div className="mt-4 flex justify-between">
                            <Button variant="outline" onClick={() => setStep('doctor')}>
                                Back
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 3: Select Time */}
            {step === 'time' && selectedDate && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Select a Time Slot
                        </CardTitle>
                        <p className="text-sm text-slate-500">
                            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-4 gap-2">
                            {timeSlots.map(slot => (
                                <button
                                    key={slot.time}
                                    onClick={() => {
                                        if (slot.available) {
                                            setSelectedTime(slot.time);
                                            setStep('confirm');
                                        }
                                    }}
                                    disabled={!slot.available}
                                    className={`
                    py-3 px-4 rounded-lg text-sm font-medium transition-all
                    ${selectedTime === slot.time ? 'bg-blue-600 text-white' : ''}
                    ${slot.available && selectedTime !== slot.time ? 'bg-slate-100 hover:bg-blue-100 text-slate-700' : ''}
                    ${!slot.available ? 'bg-slate-50 text-slate-300 cursor-not-allowed line-through' : ''}
                  `}
                                >
                                    {slot.time}
                                </button>
                            ))}
                        </div>

                        <div className="mt-4 flex justify-between">
                            <Button variant="outline" onClick={() => setStep('date')}>
                                Back
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 4: Confirm */}
            {step === 'confirm' && selectedDate && selectedTime && selectedDoctor && (
                <Card>
                    <CardHeader>
                        <CardTitle>Confirm Your Appointment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-slate-50 rounded-lg p-6 mb-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-slate-500">Doctor</p>
                                    <p className="font-semibold">{selectedDoctor.name}</p>
                                    <p className="text-sm text-slate-500">{selectedDoctor.specialty}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Date & Time</p>
                                    <p className="font-semibold">
                                        {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </p>
                                    <p className="text-sm text-slate-500">{selectedTime}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setStep('time')} className="flex-1">
                                <X className="w-4 h-4 mr-2" />
                                Back
                            </Button>
                            <Button onClick={handleConfirmBooking} className="flex-1 bg-green-600 hover:bg-green-700">
                                <Check className="w-4 h-4 mr-2" />
                                Confirm Booking
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default AppointmentCalendar;
