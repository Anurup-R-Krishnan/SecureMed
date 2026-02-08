'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  appointmentService,
  Doctor,
  TimeSlot
} from '@/services/appointments';
import {
  Calendar,
  Clock,
  User,
  MapPin,
  Star,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Mail,
  Phone,
  Loader2,
  Stethoscope,
  Activity,
  ShieldCheck,
  CreditCard,
  Coffee
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';

type BookingStep = 'doctor' | 'date' | 'time' | 'confirm' | 'success';

interface EnhancedAppointmentBookingProps {
  patientId?: string; // Kept for API compatibility, though pulled from auth usually
  patientName?: string;
}

export default function AppointmentBooking({
  patientId = '',
  patientName = 'Guest' // Fallback
}: EnhancedAppointmentBookingProps) {
  const { toast } = useToast();
  const { user } = useAuth(); // Auth Hook

  // Use authenticated user details if available
  const effectivePatientName = user?.username || user?.email || patientName; //Ideally user object has name fields, falling back
  // Note: user object in AuthContext interface has: id, username, email, role. 
  // It might differ in actual runtime if the backend returns first_name/last_name. 
  // We'll stick to what we know or fallback.
  // Actually, let's try to use a better display name if possible, or just username.

  const [currentStep, setCurrentStep] = useState<BookingStep>('doctor');
  const [isLoading, setIsLoading] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  // Selection state
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [reasonForVisit, setReasonForVisit] = useState('');

  // Booking result
  const [bookingResult, setBookingResult] = useState<any | null>(null);

  // Filter state
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Load doctors on mount
  useEffect(() => {
    const fetchDoctors = async () => {
      setIsLoading(true);
      try {
        const data = await appointmentService.getDoctors();
        setDoctors(data);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Could not load doctors.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchDoctors();
  }, [toast]);

  // Load available slots when doctor and date are selected
  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      setIsLoading(true);
      const dateStr = selectedDate.toISOString().split('T')[0];

      const fetchAvailability = async () => {
        try {
          const slots = await appointmentService.getDoctorAvailability(selectedDoctor.id, dateStr);
          setAvailableSlots(slots);
        } catch (error) {
          toast({
            title: 'Error',
            description: 'Could not load availability.',
            variant: 'destructive',
          });
        } finally {
          setIsLoading(false);
        }
      };
      fetchAvailability();
    }
  }, [selectedDoctor, selectedDate, toast]);

  // Internal debounced search effect
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery || specialtyFilter) {
        try {
          const data = await appointmentService.getDoctors(specialtyFilter, searchQuery);
          setDoctors(data);
        } catch (e) {
          console.error(e);
        }
      } else if (doctors.length === 0 && !isLoading) {
        // Reload initial if cleared
        try {
          const data = await appointmentService.getDoctors();
          setDoctors(data);
        } catch (e) { }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, specialtyFilter]);


  // Dynamic specialties extraction
  const specialties = Array.from(new Set(doctors.map(doc => doc.specialty || doc.specialization))).filter(Boolean);

  // Check if date is disabled (weekends or past)
  const isDateDisabled = (date: Date) => {
    const day = date.getDay();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return day === 0 || day === 6 || date < today;
  };

  // Handle booking
  const handleBookAppointment = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot) return;

    setIsBooking(true);

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];

      // Prepare payload
      // If user is logged in, we let the backend handle the patient association via token,
      // OR we send the patient ID if the service supports/requires it.
      // Based on previous files, using the token is standard, but some endpoints might want 'patient' explicit.
      // We'll pass what we have.

      const payload: any = {
        doctor: selectedDoctor.id,
        appointment_date: dateStr,
        appointment_time: selectedSlot.startTime.substring(0, 5), // Send HH:MM only
        reason: reasonForVisit || 'General Consultation',
      };

      if (user?.id) {
        payload.patient = user.id; // Explicitly send if we have it, mostly for safety
      }

      const result = await appointmentService.createAppointment(payload);

      if (result.success) {
        setBookingResult(result);
        setCurrentStep('success');
        toast({
          title: 'Appointment Booked!',
          description: `Confirmation #${result.confirmationNumber}`,
        });
      } else {
        throw new Error(result.detail || 'Booking failed');
      }
    } catch (error: any) {
      toast({
        title: 'Booking Failed',
        description: error.message || 'Please try another slot.',
        variant: 'destructive',
      });
    } finally {
      setIsBooking(false);
    }
  };

  // Reset booking flow
  const resetBooking = () => {
    setCurrentStep('doctor');
    setSelectedDoctor(null);
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setAvailableSlots([]);
    setReasonForVisit('');
    setBookingResult(null);
    // Refresh doctors
    appointmentService.getDoctors().then(setDoctors);
  };

  // Render step indicator
  const renderStepIndicator = () => {
    const steps = [
      { id: 'doctor', label: 'Doctor' },
      { id: 'date', label: 'Date' },
      { id: 'time', label: 'Time' },
      { id: 'confirm', label: 'Confirm' },
    ];

    const currentIndex = steps.findIndex(s => s.id === currentStep);

    return (
      <div className="flex items-center justify-center gap-2 mb-12">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center">
            <div className={`flex flex-col items-center gap-2 ${idx <= currentIndex ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm transition-all duration-300 ${idx < currentIndex
                ? 'bg-primary text-primary-foreground'
                : idx === currentIndex
                  ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110'
                  : 'bg-muted text-muted-foreground'
                }`}>
                {idx < currentIndex ? '✓' : idx + 1}
              </div>
              <span className="hidden md:inline font-bold text-[10px] uppercase tracking-tighter">{step.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`h-0.5 w-8 md:w-20 mx-4 -mt-4 transition-all duration-500 ${idx < currentIndex ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  // Step 1: Doctor Selection
  if (currentStep === 'doctor') {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {renderStepIndicator()}

        <Card className="p-8 border-none shadow-2xl bg-gradient-to-br from-card to-muted/20">
          <div className="mb-8">
            <h2 className="text-3xl font-black text-foreground tracking-tight">Choose Your Specialist</h2>
            <p className="text-muted-foreground mt-2">Browse our network of qualified healthcare professionals.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="relative group">
              <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-2 ml-1">Search Doctor</label>
              <div className="relative">
                <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, expertise..."
                  className="w-full pl-12 pr-4 py-4 border-2 border-border/50 rounded-2xl bg-card text-foreground focus:border-primary focus:ring-0 transition-all outline-none shadow-sm"
                />
              </div>
            </div>
            <div className="group">
              <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-2 ml-1">Specialty</label>
              <select
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="w-full px-4 py-4 border-2 border-border/50 rounded-2xl bg-card text-foreground focus:border-primary focus:ring-0 transition-all outline-none shadow-sm h-[60px]"
              >
                <option value="">All Specialties</option>
                {specialties.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {isLoading && doctors.length === 0 ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map(doc => (
                <Card
                  key={doc.id}
                  className={`p-6 cursor-pointer transition-all duration-300 border-2 relative overflow-hidden group ${selectedDoctor?.id === doc.id
                    ? 'border-primary bg-primary/5 shadow-xl scale-[1.03]'
                    : 'border-border/50 hover:border-primary/50 hover:shadow-lg hover:scale-[1.01]'
                    }`}
                  onClick={() => setSelectedDoctor(doc)}
                >
                  {/* Decorative circle */}
                  <div className={`absolute -right-4 -bottom-4 w-16 h-16 rounded-full transition-all duration-300 ${selectedDoctor?.id === doc.id ? 'bg-primary/10' : 'bg-muted/30 group-hover:bg-primary/5'}`} />

                  <div className="flex items-start gap-4 h-full relative z-10">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner transition-transform group-hover:rotate-12">
                      <User className="h-7 w-7" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between h-full">
                      <div>
                        <h3 className="font-black text-foreground text-lg leading-tight">{doc.name}</h3>
                        <p className="text-xs font-bold text-primary uppercase tracking-tighter mt-0.5">{doc.specialty}</p>
                        <p className="text-[10px] text-muted-foreground mt-2 line-clamp-2 italic">{doc.description}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-3 font-medium">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{doc.hospital}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Starting at</span>
                          <span className="text-xl font-black text-foreground">₹{doc.consultation_fee}</span>
                        </div>
                        <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          <span className="text-[10px] font-black text-amber-600">{doc.rating || 4.8}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>

        <div className="flex justify-end pt-4">
          <Button
            size="lg"
            disabled={!selectedDoctor}
            onClick={() => setCurrentStep('date')}
            className="px-12 h-16 rounded-2xl text-lg font-black shadow-2xl shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all"
          >
            Pick Appointment Date
          </Button>
        </div>
      </div>
    );
  }

  // Step 2: Date Selection
  if (currentStep === 'date') {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
        {renderStepIndicator()}

        <Card className="p-10 max-w-4xl mx-auto border-none shadow-2xl bg-card">
          <div className="flex flex-col md:flex-row gap-12 items-start">
            <div className="w-full md:w-auto">
              <h2 className="text-3xl font-black text-foreground mb-4">Select Date</h2>
              <p className="text-muted-foreground mb-8">Scheduling with <span className="text-primary font-bold underline underline-offset-4 decoration-primary/30">{selectedDoctor?.name}</span></p>

              <div className="p-4 border-2 border-border/50 rounded-[32px] bg-card shadow-inner">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={isDateDisabled}
                  className="rounded-md"
                />
              </div>
            </div>

            <div className="flex-1 space-y-8 w-full">
              <div>
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">You've Selected</h3>
                {selectedDate ? (
                  <div className="p-8 rounded-[32px] bg-gradient-to-br from-primary to-primary-foreground text-white shadow-2xl relative overflow-hidden group">
                    <Calendar className="absolute -right-8 -bottom-8 h-40 w-40 opacity-10 rotate-12 transition-transform group-hover:rotate-0 duration-700" />
                    <p className="text-[10px] uppercase font-black tracking-[0.2em] opacity-80 mb-2">Confirmed Date</p>
                    <p className="text-4xl font-black leading-tight">
                      {selectedDate.toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-lg font-bold opacity-90 mt-1">
                      {selectedDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                ) : (
                  <div className="p-8 rounded-[32px] border-2 border-dashed border-border flex flex-col items-center justify-center text-center">
                    <Calendar className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
                    <p className="text-muted-foreground italic font-medium">Pick a date from the calendar to see availability.</p>
                  </div>
                )}
              </div>

              <div className="p-6 rounded-2xl bg-muted/30 border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <h4 className="text-[10px] font-black text-foreground uppercase tracking-widest">Hospital Policy</h4>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-xs text-muted-foreground">
                    <div className="h-4 w-4 shrink-0 rounded bg-primary/20 text-primary flex items-center justify-center text-[8px] font-black">1</div>
                    <span>Confirm your booking at least 24 hours before your slot.</span>
                  </li>
                  <li className="flex items-start gap-3 text-xs text-muted-foreground">
                    <div className="h-4 w-4 shrink-0 rounded bg-primary/20 text-primary flex items-center justify-center text-[8px] font-black">2</div>
                    <span>Bring your ID and insurance card.</span>
                  </li>
                </ul>
              </div>

              <Button
                className="w-full h-16 rounded-2xl text-lg font-black shadow-xl"
                size="lg"
                disabled={!selectedDate}
                onClick={() => setCurrentStep('time')}
              >
                Find Available Slots
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex justify-between max-w-4xl mx-auto px-4">
          <Button variant="ghost" className="font-bold text-muted-foreground hover:text-foreground" onClick={() => setCurrentStep('doctor')}>
            ← Back to Doctors
          </Button>
        </div>
      </div>
    );
  }

  // Step 3: Time Slot Selection
  if (currentStep === 'time') {
    const availableCount = availableSlots.filter(s => s.isAvailable && !s.isBooked && s.slotType === 'AVAILABLE').length;
    const bookedCount = availableSlots.filter(s => s.isBooked).length;
    const surgeryCount = availableSlots.filter(s => s.slotType === 'SURGERY').length;
    const breakCount = availableSlots.filter(s => s.slotType === 'BREAK').length;

    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
        {renderStepIndicator()}

        <Card className="p-10 max-w-5xl mx-auto border-none shadow-2xl bg-card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h2 className="text-3xl font-black text-foreground tracking-tight">Select Time</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
                  {selectedDate?.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </span>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                <span className="text-sm font-bold text-muted-foreground">
                  {selectedDate?.toLocaleDateString('en-US', { weekday: 'long' })}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                setIsLoading(true);
                const dateStr = selectedDate!.toISOString().split('T')[0];
                try {
                  const slots = await appointmentService.getDoctorAvailability(selectedDoctor!.id, dateStr);
                  setAvailableSlots(slots);
                } catch (error) {
                  console.error('Failed to update availability', error);
                } finally {
                  setIsLoading(false);
                }
              }}
              className="h-12 px-6 rounded-xl border-2 font-bold hover:bg-primary/5 hover:border-primary/50 transition-all"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Update Live Status
            </Button>
          </div>

          {/* Slot Legend */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { color: 'bg-green-500', label: 'Available', count: availableCount, sub: 'Ready to book' },
              { color: 'bg-gray-400', label: 'Booked', count: bookedCount, sub: 'By other patient' },
              { color: 'bg-amber-500', label: 'Surgery', count: surgeryCount, sub: 'Doctor busy' },
              { color: 'bg-blue-500', label: 'Break', count: breakCount, sub: 'System blocked' }
            ].map(item => (
              <div key={item.label} className="flex items-center gap-4 p-4 rounded-2xl bg-muted/20 border border-border/50">
                <div className={`h-8 w-8 rounded-xl ${item.color} shadow-lg shrink-0 flex items-center justify-center text-white font-black text-xs`}>
                  {item.count}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest leading-none">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 opacity-50">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="font-bold text-muted-foreground tracking-widest uppercase text-xs">Syncing with hospital servers...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-12">
              {availableSlots.map((slot, index) => {
                const isAvailable = slot.isAvailable && !slot.isBooked && slot.slotType === 'AVAILABLE';
                const isSelected = selectedSlot?.startTime === slot.startTime;
                const isBooked = slot.isBooked;
                const isSurgery = slot.slotType === 'SURGERY';
                const isBreak = slot.slotType === 'BREAK';

                return (
                  <button
                    key={`${slot.startTime}-${index}`}
                    onClick={() => isAvailable && setSelectedSlot(slot)}
                    disabled={!isAvailable}
                    className={`group relative flex flex-col items-center justify-center p-6 rounded-[24px] border-2 transition-all duration-300 ${isSelected
                      ? 'bg-primary border-primary text-primary-foreground shadow-2xl scale-110 z-20 ring-8 ring-primary/10'
                      : isAvailable
                        ? 'bg-card border-green-500/20 text-foreground hover:border-green-500 hover:bg-green-50 shadow-sm hover:shadow-md'
                        : isBooked
                          ? 'bg-muted border-transparent text-muted-foreground opacity-40 cursor-not-allowed scale-95'
                          : isSurgery
                            ? 'bg-amber-100/30 border-amber-500/10 text-amber-700/50 cursor-not-allowed opacity-60'
                            : 'bg-blue-100/30 border-blue-500/10 text-blue-700/50 cursor-not-allowed opacity-60'
                      }`}
                  >
                    <Clock className={`h-5 w-5 mb-3 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                    <span className={`text-lg font-black tracking-tight ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
                      {// Trim seconds from time string HH:MM:SS -> HH:MM
                        slot.startTime.substring(0, 5)}
                    </span>

                    <div className="mt-2 min-h-[16px]">
                      {isBooked && <span className="text-[10px] font-black uppercase opacity-60">Taken</span>}
                      {isSurgery && <Activity className="h-4 w-4 opacity-40" />}
                      {isBreak && <Coffee className="h-4 w-4 opacity-40" />}
                      {isSelected && <CheckCircle className="h-4 w-4 text-primary-foreground animate-in zoom-in" />}
                    </div>

                    {/* Status Detail Tooltip */}
                    {(isSurgery || isBreak) && (
                      <div className="absolute -top-4 opacity-0 group-hover:opacity-100 transition-opacity translate-y-[-100%] bg-gray-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap z-30 shadow-xl pointer-events-none">
                        {isSurgery ? 'Scheduled Surgery' : 'Mandatory Break'}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className={`transition-all duration-500 ease-out ${selectedSlot ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12 pointer-events-none'}`}>
            <Card className="bg-primary border-none text-primary-foreground p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
              {/* Decorative background circle */}
              <div className="absolute -right-12 -top-12 w-64 h-64 bg-white/10 rounded-full blur-[100px]" />
              <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-black/10 rounded-full blur-[100px]" />

              <div className="flex flex-col lg:flex-row items-center justify-between gap-10 relative z-10">
                <div className="flex items-center gap-8">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[28px] bg-white/20 backdrop-blur-md shadow-inner">
                    <Stethoscope className="h-10 w-10 text-primary-foreground" />
                  </div>
                  <div className="text-center lg:text-left">
                    <p className="text-primary-foreground/70 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Selected Time Slot</p>
                    <p className="text-5xl font-black tracking-tighter">{selectedSlot?.startTime.substring(0, 5)}</p>
                    <p className="text-sm font-bold opacity-80 mt-1">Confirmed for {selectedDate?.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}</p>
                  </div>
                </div>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => setCurrentStep('confirm')}
                  className="font-black px-16 h-20 rounded-[28px] text-xl shadow-2xl hover:shadow-white/20 hover:scale-105 active:scale-95 transition-all w-full lg:w-auto"
                >
                  Proceed to Confirm
                </Button>
              </div>
            </Card>
          </div>
        </Card>

        <div className="flex justify-center max-w-5xl mx-auto py-4">
          <Button variant="ghost" className="font-bold text-muted-foreground" onClick={() => setCurrentStep('date')}>
            Change Date Selection
          </Button>
        </div>
      </div>
    );
  }

  // Step 4: Confirmation
  if (currentStep === 'confirm') {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
        {renderStepIndicator()}

        <Card className="p-10 max-w-3xl mx-auto border-none shadow-2xl bg-card rounded-[40px]">
          <div className="text-center mb-10">
            <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h2 className="text-3xl font-black text-foreground tracking-tight">Review Details</h2>
            <p className="text-muted-foreground mt-2">Please double check your appointment information.</p>
          </div>

          <div className="space-y-8">
            <section className="bg-muted/30 p-8 rounded-[32px] border border-border/50">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-6">Medical Provider</h3>
              <div className="flex justify-between items-center pb-6 border-b border-border/50">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <User className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-black leading-tight">{selectedDoctor?.name}</p>
                    <p className="text-xs font-bold text-primary uppercase tracking-tighter mt-1">{selectedDoctor?.specialty}</p>
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-lg font-black leading-tight">{effectivePatientName}</p>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter mt-1">Patient</p>
                </div>
              </div>
              <div className="pt-6 flex justify-between items-center text-sm font-bold">
                <span className="text-muted-foreground">Healthcare Facility</span>
                <span className="text-foreground">{selectedDoctor?.hospital}</span>
              </div>
            </section>

            <section className="bg-primary/5 p-8 rounded-[32px] border border-primary/10 relative overflow-hidden">
              <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-6">Appointment Schedule</h3>
              <div className="flex items-center gap-8">
                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-[24px] shadow-xl min-w-[100px] border-b-4 border-primary">
                  <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">{selectedDate?.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <span className="text-3xl font-black text-primary my-1">{selectedDate?.getDate()}</span>
                  <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">{selectedDate?.toLocaleDateString('en-US', { month: 'short' })}</span>
                </div>
                <div className="flex-1">
                  <p className="text-4xl font-black tracking-tighter text-foreground">{selectedSlot?.startTime.substring(0, 5)}</p>
                  <p className="text-sm font-bold text-muted-foreground mt-1 underline decoration-primary/30 decoration-2">Standard Clinical Session</p>
                </div>
              </div>
            </section>

            <div className="space-y-6">
              <div className="group">
                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-3 ml-2">Reason for Visit (Optional)</label>
                <textarea
                  value={reasonForVisit}
                  onChange={(e) => setReasonForVisit(e.target.value)}
                  placeholder="Briefly describe your health concerns..."
                  className="w-full px-6 py-5 border-2 border-border/50 rounded-[28px] bg-card text-foreground text-sm focus:border-primary focus:ring-0 transition-all outline-none min-h-[120px]"
                />
              </div>

              <div className="p-6 rounded-[28px] bg-amber-500/5 border-2 border-amber-500/10 flex gap-4">
                <div className="h-10 w-10 shrink-0 bg-amber-500/10 text-amber-600 rounded-xl flex items-center justify-center">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-amber-700 uppercase tracking-widest mb-1">Financial Notice</p>
                  <p className="text-[11px] text-amber-800/80 leading-relaxed font-medium">
                    An estimated amount of <b>₹{selectedDoctor?.consultation_fee}</b> will be collected at the reception upon arrival. We accept all major health insurance.
                  </p>
                </div>
              </div>
            </div>

            <Button
              className="w-full h-20 rounded-[28px] text-xl font-black shadow-[0_20px_40px_-15px_rgba(var(--primary),0.3)] hover:shadow-[0_25px_50px_-12px_rgba(var(--primary),0.4)] active:scale-[0.98] transition-all"
              onClick={handleBookAppointment}
              disabled={isBooking}
            >
              {isBooking ? (
                <div className="flex items-center gap-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Syncing with EHR Systems...</span>
                </div>
              ) : (
                'Finalize Booking'
              )}
            </Button>
          </div>
        </Card>

        <div className="flex justify-center max-w-3xl mx-auto py-4">
          <Button variant="ghost" className="font-bold text-muted-foreground" onClick={() => setCurrentStep('time')}>
            ← Modify Selection
          </Button>
        </div>
      </div>
    );
  }

  // Step 5: Success
  if (currentStep === 'success' && bookingResult?.success) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] p-4 text-foreground animate-in zoom-in duration-500">
        <Card className="p-12 max-w-2xl w-full text-center relative overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] rounded-[48px] border-none bg-card">
          {/* Abstract background blobs */}
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-green-500/10 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-primary/10 rounded-full blur-[100px] animate-pulse" />

          <div className="relative z-10">
            <div className="bg-green-500 h-28 w-28 rounded-[36px] flex items-center justify-center mx-auto mb-10 shadow-2xl rotate-6 hover:rotate-0 transition-transform duration-500">
              <CheckCircle className="h-14 w-14 text-white" />
            </div>

            <h1 className="text-5xl font-black text-foreground mb-6 tracking-tighter">Confirmed!</h1>
            <p className="text-muted-foreground text-lg mb-12 max-w-md mx-auto leading-relaxed font-medium">
              Your health is our priority. A secure confirmation has been sent via <b>SMS</b> and <b>HIPAA Email</b>.
            </p>

            <div className="bg-muted/30 border-2 border-border/30 rounded-[40px] p-10 mb-12 text-left relative overflow-hidden group">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-2">Registry ID</h4>
                  <p className="text-3xl font-mono font-black text-primary tracking-tighter">{bookingResult.confirmationNumber}</p>
                </div>
                <div className="text-right">
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-2">Provider</h4>
                  <p className="text-xl font-black text-foreground">{selectedDoctor?.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-10 py-8 border-y border-border/50">
                <div>
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-2">Arrival Date</h4>
                  <p className="font-black text-foreground text-lg italic">
                    {selectedDate?.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-2">Check-in Time</h4>
                  <p className="font-black text-primary text-2xl">{selectedSlot?.startTime.substring(0, 5)}</p>
                </div>
              </div>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-8">
                  {bookingResult.notifications?.emailSent && (
                    <div className="flex items-center gap-3 text-green-600 font-black text-[10px] uppercase tracking-widest">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-[ping_1.5s_infinite]" />
                      <Mail className="h-4 w-4" />
                      <span>Email Sent</span>
                    </div>
                  )}
                  {bookingResult.notifications?.smsSent && (
                    <div className="flex items-center gap-3 text-green-600 font-black text-[10px] uppercase tracking-widest">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-[ping_2s_infinite]" />
                      <Phone className="h-4 w-4" />
                      <span>SMS Sent</span>
                    </div>
                  )}
                  {!bookingResult.notifications?.emailSent && !bookingResult.notifications?.smsSent && (
                    <div className="flex items-center gap-3 text-amber-600 font-black text-[10px] uppercase tracking-widest">
                      <AlertCircle className="h-4 w-4" />
                      <span>Notifications Pending</span>
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="font-black text-[10px] uppercase tracking-[0.2em] text-primary hover:bg-primary/5 rounded-full px-6">
                  Download Summary
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6">
              <Button className="flex-1 h-20 rounded-[28px] font-black text-lg shadow-2xl active:scale-95 transition-all" onClick={resetBooking}>
                New Booking
              </Button>
              <Button variant="outline" className="flex-1 h-20 rounded-[28px] font-black text-lg border-2 hover:bg-muted/50 active:scale-95 transition-all" onClick={() => window.location.reload()}>
                Patient Home
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}
