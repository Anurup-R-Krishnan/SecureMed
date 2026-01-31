'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Calendar, MapPin, Search, Star, Clock, CheckCircle, User, AlertCircle, DollarSign, Check, IndianRupee } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const doctors = [
  {
    id: 1,
    name: 'Dr. Sarah Smith',
    specialty: 'Cardiology',
    hospital: 'Fortis Delhi',
    fee: 500,
    experience: '15 years',
    rating: 4.8,
    reviews: 320,
    available: ['2023-10-01', '2023-10-02', '2023-10-03'],
  },
  {
    id: 2,
    name: 'Dr. Michael Chen',
    specialty: 'Neurology',
    hospital: 'Fortis Mumbai',
    fee: 450,
    experience: '12 years',
    rating: 4.9,
    reviews: 280,
    available: ['2023-10-01', '2023-10-02', '2023-10-03'],
  },
  {
    id: 3,
    name: 'Dr. Rajesh Kumar',
    specialty: 'Orthopedics',
    hospital: 'Fortis Bangalore',
    fee: 550,
    experience: '18 years',
    rating: 4.7,
    reviews: 410,
    available: ['2023-10-01', '2023-10-02', '2023-10-03'],
  },
  {
    id: 4,
    name: 'Dr. Emma Wilson',
    specialty: 'Pediatrics',
    hospital: 'Fortis Chennai',
    fee: 400,
    experience: '10 years',
    rating: 4.9,
    reviews: 195,
    available: ['2023-10-01', '2023-10-02', '2023-10-03'],
  },
];

const timeSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'];

type BookingStep = 'doctor-selection' | 'date-selection' | 'slot-selection' | 'confirmation' | 'success';

export default function AppointmentBooking() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<BookingStep>('doctor-selection');

  // Form state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [reasonForVisit, setReasonForVisit] = useState('');

  // Generate booked slots for demo (30% randomly marked as booked)
  const bookedSlots = useMemo(() => {
    const booked: { [key: string]: string[] } = {};
    const dateKey = selectedDate?.toISOString().split('T')[0] || '';
    if (dateKey) {
      booked[dateKey] = timeSlots.filter(() => Math.random() < 0.3);
    }
    return booked;
  }, [selectedDate]);

  const specialties = [...new Set(doctors.map((d) => d.specialty))];
  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty = !selectedSpecialty || doc.specialty === selectedSpecialty;
    return matchesSearch && matchesSpecialty;
  });

  // Check if date is a weekend or in the past
  const isDateDisabled = (date: Date) => {
    const day = date.getDay();
    const isPastDate = date < new Date(new Date().setHours(0, 0, 0, 0));
    return day === 0 || day === 6 || isPastDate;
  };

  const doctor = doctors.find((d) => d.id === selectedDoctor);
  const dateKey = selectedDate?.toISOString().split('T')[0] || '';
  const availableSlots = selectedDate ? timeSlots.filter(slot => !bookedSlots[dateKey]?.includes(slot)) : [];

  const handleSelectDoctor = (doctorId: number) => {
    setSelectedDoctor(doctorId);
    setCurrentStep('date-selection');
  };

  const handleConfirmBooking = () => {
    setCurrentStep('confirmation');
  };

  const handleBookAppointment = () => {
    // Logic to book appointment
    toast({
      title: 'Appointment Confirmed!',
      description: 'Confirmation has been sent to your email.',
    });
    setCurrentStep('success');
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
              <label className="block text-sm font-medium text-foreground mb-2">Search Doctor by Name</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="E.g., Dr. Sarah Smith..."
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
            {filteredDoctors.map((doc) => (
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
                    <p className="text-primary text-sm font-medium">{doc.specialty}</p>
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

                <p className="text-sm font-semibold text-foreground flex items-center"><IndianRupee className="h-4 w-4 mr-0.5" />{doc.fee}</p>
              </Card>
            ))}
          </div>

          {filteredDoctors.length === 0 && (
            <Card className="p-12 text-center border-dashed">
              <p className="text-muted-foreground">No doctors found matching your search.</p>
            </Card>
          )}
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
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm"><Check className="h-4 w-4" /></div>
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
            Booking with <span className="font-semibold text-foreground">{doctor?.name}</span> - {doctor?.specialty}
          </p>

          <div className="flex flex-col md:flex-row gap-8 justify-between">
            <div>
              <p className="text-sm font-medium text-foreground mb-4">Choose a date (excludes weekends)</p>
              <CalendarComponent
                mode="single"
                selected={selectedDate || undefined}
                onSelect={(date) => setSelectedDate(date || null)}
                required={false}
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
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm"><Check className="h-4 w-4" /></div>
            <span className="font-medium text-foreground text-xs md:text-sm">Doctor</span>
          </div>
          <div className="h-0.5 flex-1 bg-primary mx-2 md:mx-4"></div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm"><Check className="h-4 w-4" /></div>
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

          {/* Slot Legend */}
          <div className="flex flex-wrap gap-6 mb-8 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-primary"></div>
              <span className="text-sm text-foreground">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-gray-300"></div>
              <span className="text-sm text-foreground">Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-primary border-2 border-primary"></div>
              <span className="text-sm text-foreground">Selected</span>
            </div>
          </div>

          {/* Time Slots Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {timeSlots.map((slot) => {
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
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm"><Check className="h-4 w-4" /></div>
            <span className="font-medium text-foreground text-xs md:text-sm">Doctor</span>
          </div>
          <div className="h-0.5 flex-1 bg-primary mx-2 md:mx-4"></div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm"><Check className="h-4 w-4" /></div>
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
                <p className="text-primary text-sm mt-1">{doctor?.specialty}</p>
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
                  <p className="font-bold text-foreground text-2xl">₹{doctor?.fee}</p>
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
          >
            Confirm Booking
          </Button>
        </Card>

        <div className="flex justify-between max-w-2xl mx-auto">
          <Button
            variant="outline"
            onClick={() => setCurrentStep('slot-selection')}
          >
            Back to Time Selection
          </Button>
        </div>
      </div>
    );
  }

  // Step 5: Success
  if (currentStep === 'success') {
    const confirmationNumber = `APT-${Date.now().toString().slice(-6)}`;
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 max-w-2xl w-full text-center">
          <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground mb-2">Appointment Booked Successfully!</h1>
          <p className="text-muted-foreground mb-8">
            Your appointment has been confirmed and a confirmation email has been sent.
          </p>

          <div className="bg-primary/5 rounded-lg p-8 mb-8 text-left space-y-6 border-l-4 border-l-primary">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Doctor</p>
                <p className="font-bold text-foreground text-lg">{doctor?.name}</p>
                <p className="text-primary text-sm">{doctor?.specialty}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm mb-1">Confirmation Number</p>
                <p className="font-mono font-bold text-foreground text-lg">{confirmationNumber}</p>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Date & Time</p>
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
                  <p className="text-muted-foreground text-sm mb-1">Location</p>
                  <p className="font-semibold text-foreground">{doctor?.hospital}</p>
                </div>
              </div>
            </div>

            {reasonForVisit && (
              <div className="border-t border-border pt-6">
                <p className="text-muted-foreground text-sm mb-2">Reason for Visit</p>
                <p className="text-foreground">{reasonForVisit}</p>
              </div>
            )}
          </div>

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
