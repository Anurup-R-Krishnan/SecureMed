'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { MapPin, Search, Star, Clock, CheckCircle, User, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { appointmentService, Doctor } from '@/services/appointments';

const timeSlots = ['09:00:00', '10:00:00', '11:00:00', '12:00:00', '14:00:00', '15:00:00', '16:00:00', '17:00:00'];
const displayTimeSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'];

type BookingStep = 'doctor-selection' | 'date-selection' | 'slot-selection' | 'confirmation' | 'success';

export default function AppointmentBooking() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<BookingStep>('doctor-selection');

  // Data state
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Form state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    const fetchDoctors = async () => {
      setLoadingDoctors(true);
      try {
        const data = await appointmentService.getDoctors(selectedSpecialty, searchQuery);
        setDoctors(data);
      } catch (error) {
        toast({
          title: "Error fetching doctors",
          description: "Could not load doctors list. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoadingDoctors(false);
      }
    };

    const timer = setTimeout(() => {
      fetchDoctors();
    }, 500); // Debounce

    return () => clearTimeout(timer);
  }, [searchQuery, selectedSpecialty, toast]);


  // Placeholder for booked slots - in a real app, you'd fetch this from backend
  const bookedSlots = useMemo(() => {
    const booked: { [key: string]: string[] } = {};
    const dateKey = selectedDate?.toISOString().split('T')[0] || '';
    if (dateKey) {
      // Just a placeholder, ideally fetch from backend
      booked[dateKey] = [];
    }
    return booked;
  }, [selectedDate]);

  const specialties = [...new Set(doctors.map((d) => d.specialization))];

  // Check if date is a weekend or in the past
  const isDateDisabled = (date: Date) => {
    const day = date.getDay();
    const isPastDate = date < new Date(new Date().setHours(0, 0, 0, 0));
    return day === 0 || day === 6 || isPastDate;
  };

  const doctor = doctors.find((d) => d.id === selectedDoctor);
  const dateKey = selectedDate?.toISOString().split('T')[0] || '';

  // Mapping display time to backend time format
  const formatTimeForBackend = (displayTime: string) => {
    const index = displayTimeSlots.indexOf(displayTime);
    return index !== -1 ? timeSlots[index] : null;
  }

  const handleSelectDoctor = (doctorId: number) => {
    setSelectedDoctor(doctorId);
    setCurrentStep('date-selection');
  };

  const handleBookAppointment = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) return;

    const backendTime = formatTimeForBackend(selectedTime);
    if (!backendTime) return;

    setIsBooking(true);
    try {
      await appointmentService.createAppointment({
        doctor: selectedDoctor,
        appointment_date: selectedDate.toISOString().split('T')[0],
        appointment_time: backendTime,
        reason: reasonForVisit
      });

      toast({
        title: 'Appointment Confirmed!',
        description: 'Your appointment has been successfully booked.',
      });
      setCurrentStep('success');
    } catch (error) {
      toast({
        title: 'Booking Failed',
        description: 'There was an error booking your appointment. Please try again.',
        variant: "destructive"
      });
    } finally {
      setIsBooking(false);
    }
  };

  // Step 1: Doctor Selection
  if (currentStep === 'doctor-selection') {
    return (
      <div className="space-y-6">
        {/* Progress Indicator */}
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">1</div>
            <span className="font-medium text-foreground">Doctor</span>
          </div>
          <div className="h-0.5 flex-1 bg-muted mx-4"></div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground font-bold text-sm">2</div>
            <span className="font-medium text-muted-foreground">Date</span>
          </div>
          <div className="h-0.5 flex-1 bg-muted mx-4"></div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground font-bold text-sm">3</div>
            <span className="font-medium text-muted-foreground">Time</span>
          </div>
          <div className="h-0.5 flex-1 bg-muted mx-4"></div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground font-bold text-sm">4</div>
            <span className="font-medium text-muted-foreground">Confirm</span>
          </div>
        </div>

        <Card className="p-6">
          <h2 className="text-2xl font-bold text-foreground mb-6">Find and Book a Doctor</h2>

          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Search Doctor</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Filter by Specialty</label>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All Specialties</option>
                {specialties.map((specialty) => (
                  <option key={specialty} value={specialty}>
                    {specialty}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingDoctors ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">Loading doctors...</div>
            ) : doctors.length > 0 ? (
              doctors.map((doc) => (
                <Card
                  key={doc.id}
                  className={`p-6 cursor-pointer transition-all border-2 ${selectedDoctor === doc.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:shadow-md'
                    }`}
                  onClick={() => setSelectedDoctor(doc.id)}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground">{doc.name}</h3>
                      <p className="text-primary text-sm font-medium">{doc.specialization}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {doc.hospital}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {doc.experience}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
                    <Star className="h-4 w-4 text-accent fill-accent" />
                    <span className="font-semibold text-foreground text-sm">{doc.rating}</span>
                    <span className="text-muted-foreground text-xs">({doc.reviews})</span>
                  </div>

                  <p className="text-sm font-semibold text-foreground">Consultation Fee: ₹{doc.consultation_fee}</p>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">No doctors found matching your criteria.</div>
            )}
          </div>
        </Card>

        <div className="flex justify-end max-w-7xl mx-auto">
          <Button
            className="px-8"
            disabled={!selectedDoctor}
            onClick={() => setCurrentStep('date-selection')}
          >
            Continue to Date Selection
          </Button>
        </div>
      </div>
    );
  }

  // Step 2: Date Selection
  if (currentStep === 'date-selection') {
    return (
      <div className="space-y-6">
        {/* Progress Indicator */}
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">✓</div>
            <span className="font-medium text-foreground">Doctor</span>
          </div>
          <div className="h-0.5 flex-1 bg-primary mx-4"></div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">2</div>
            <span className="font-medium text-foreground">Date</span>
          </div>
          <div className="h-0.5 flex-1 bg-muted mx-4"></div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground font-bold text-sm">3</div>
            <span className="font-medium text-muted-foreground">Time</span>
          </div>
          <div className="h-0.5 flex-1 bg-muted mx-4"></div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground font-bold text-sm">4</div>
            <span className="font-medium text-muted-foreground">Confirm</span>
          </div>
        </div>

        <Card className="p-6 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-2">Select an Appointment Date</h2>
          <p className="text-muted-foreground mb-6">
            Booking with <span className="font-semibold text-foreground">{doctor?.name}</span> - {doctor?.specialization}
          </p>

          <div className="flex flex-col md:flex-row gap-8 justify-between">
            <div>
              <p className="text-sm font-medium text-foreground mb-4">Choose a date (excludes weekends)</p>
              <CalendarComponent
                mode="single"
                selected={selectedDate || undefined}
                onSelect={setSelectedDate}
                disabled={isDateDisabled}
                className="rounded-lg border border-border"
              />
            </div>

            {selectedDate && (
              <div className="md:flex-1">
                <Card className="bg-primary/5 p-6">
                  <h3 className="font-semibold text-foreground mb-4">Selected Date</h3>
                  <p className="text-2xl font-bold text-primary mb-6">
                    {selectedDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => setCurrentStep('slot-selection')}
                  >
                    Continue to Time Slots
                  </Button>
                </Card>
              </div>
            )}
          </div>
        </Card>

        <div className="flex justify-between max-w-2xl mx-auto">
          <Button
            variant="outline"
            onClick={() => setCurrentStep('doctor-selection')}
          >
            Back to Doctor Selection
          </Button>
        </div>
      </div>
    );
  }

  // Step 3: Slot Selection (Concurrency Check)
  if (currentStep === 'slot-selection') {
    return (
      <div className="space-y-6">
        {/* Progress Indicator */}
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">✓</div>
            <span className="font-medium text-foreground text-xs md:text-sm">Doctor</span>
          </div>
          <div className="h-0.5 flex-1 bg-primary mx-2 md:mx-4"></div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">✓</div>
            <span className="font-medium text-foreground text-xs md:text-sm">Date</span>
          </div>
          <div className="h-0.5 flex-1 bg-primary mx-2 md:mx-4"></div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">3</div>
            <span className="font-medium text-foreground text-xs md:text-sm">Time</span>
          </div>
          <div className="h-0.5 flex-1 bg-muted mx-2 md:mx-4"></div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground font-bold text-sm">4</div>
            <span className="font-medium text-muted-foreground text-xs md:text-sm">Confirm</span>
          </div>
        </div>

        <Card className="p-6 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-2">Select an Appointment Time</h2>
          <p className="text-muted-foreground mb-6">
            {selectedDate?.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {displayTimeSlots.map((slot) => {
              const isBooked = bookedSlots[dateKey]?.includes(slot);
              const isSelected = selectedTime === slot;

              return (
                <button
                  key={slot}
                  onClick={() => !isBooked && setSelectedTime(slot)}
                  disabled={isBooked}
                  className={`py-3 px-4 rounded-lg font-medium transition-all border-2 ${isBooked
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                    : isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-white text-foreground border-border hover:border-primary hover:shadow-md'
                    }`}
                >
                  {isBooked ? (
                    <div className="flex flex-col items-center">
                      <span className="text-xs line-through">{slot}</span>
                      <span className="text-xs font-semibold">Booked</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1">
                      {isSelected && <CheckCircle className="h-4 w-4" />}
                      <span>{slot}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div>
              <Card className="bg-primary/5 p-6">
                <h3 className="font-semibold text-foreground mb-4">Summary</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Doctor</p>
                    <p className="font-semibold text-foreground">{doctor?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-semibold text-foreground">
                      {selectedDate?.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Time</p>
                    <p className="font-semibold text-foreground">
                      {selectedTime || 'Not selected'}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div>
              <Button
                className="w-full"
                disabled={!selectedTime}
                onClick={() => setCurrentStep('confirmation')}
              >
                Continue to Confirmation
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex justify-between max-w-4xl mx-auto">
          <Button
            variant="outline"
            onClick={() => setCurrentStep('date-selection')}
          >
            Back to Date Selection
          </Button>
        </div>
      </div>
    );
  }

  // Step 4: Confirmation
  if (currentStep === 'confirmation') {
    return (
      <div className="space-y-6">
        {/* Progress Indicator */}
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">✓</div>
            <span className="font-medium text-foreground text-xs md:text-sm">Doctor</span>
          </div>
          <div className="h-0.5 flex-1 bg-primary mx-2 md:mx-4"></div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">✓</div>
            <span className="font-medium text-foreground text-xs md:text-sm">Date</span>
          </div>
          <div className="h-0.5 flex-1 bg-primary mx-2 md:mx-4"></div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">✓</div>
            <span className="font-medium text-foreground text-xs md:text-sm">Time</span>
          </div>
          <div className="h-0.5 flex-1 bg-primary mx-2 md:mx-4"></div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">4</div>
            <span className="font-medium text-foreground text-xs md:text-sm">Confirm</span>
          </div>
        </div>

        <Card className="p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6">Confirm Your Appointment</h2>

          <div className="bg-primary/5 rounded-lg p-6 mb-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <p className="text-muted-foreground text-sm mb-2">Doctor</p>
                <p className="font-bold text-foreground text-lg">{doctor?.name}</p>
                <p className="text-primary text-sm mt-1">{doctor?.specialization}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm mb-2">Hospital</p>
                <p className="font-semibold text-foreground">{doctor?.hospital}</p>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <p className="text-muted-foreground text-sm mb-2">Date & Time</p>
                  <p className="font-bold text-foreground text-lg">
                    {selectedDate?.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="font-semibold text-primary text-lg">{selectedTime}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm mb-2">Consultation Fee</p>
                  <p className="font-bold text-foreground text-2xl">₹{doctor?.consultation_fee}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-foreground mb-2">
              Reason for Visit <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <textarea
              value={reasonForVisit}
              onChange={(e) => setReasonForVisit(e.target.value)}
              placeholder="Describe your symptoms or reason for the visit..."
              className="w-full px-4 py-3 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              rows={4}
            />
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleBookAppointment}
            disabled={isBooking}
          >
            {isBooking ? 'Boooking...' : 'Confirm Booking'}
          </Button>
        </Card>

        <div className="flex justify-between max-w-2xl mx-auto">
          <Button
            variant="outline"
            onClick={() => setCurrentStep('slot-selection')}
            disabled={isBooking}
          >
            Back to Time Selection
          </Button>
        </div>
      </div>
    );
  }

  // Step 5: Success
  if (currentStep === 'success') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 max-w-2xl w-full text-center">
          <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground mb-2">Appointment Booked Successfully!</h1>
          <p className="text-muted-foreground mb-8">
            Your appointment has been confirmed.
          </p>

          <Button
            className="w-full"
            onClick={() => {
              setCurrentStep('doctor-selection');
              setSelectedDoctor(null);
              setSelectedDate(null);
              setSelectedTime(null);
              setReasonForVisit('');
              setSearchQuery('');
              setSelectedSpecialty('');
            }}
          >
            Book Another Appointment
          </Button>
        </Card>
      </div>
    );
  }
}
