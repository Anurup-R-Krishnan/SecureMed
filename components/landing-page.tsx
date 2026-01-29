'use client';

import { Search, Calendar, Shield, Users, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LandingPageProps {
  onGetStarted: (role?: 'patient' | 'doctor' | 'admin') => void;
}

// Mock doctor data
const featuredDoctors = [
  {
    id: 1,
    name: 'Dr. Anoop Misra',
    title: 'EXECUTIVE CHAIRMAN FORTIS C DOC | Fortis C-Doc',
    specialty: 'Diabetes/Endocrinology',
    secondarySpecialties: 'Diabetes/Endocrinology | Endocrinology',
    experience: '40 years',
    fee: '2800',
    hospital: 'Fortis Delhi',
    imageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%2310B981"/%3E%3Ctext x="50" y="50" textAnchor="middle" dy=".3em" fill="white" fontSize="48"%3E👨‍⚕️%3C/text%3E%3C/svg%3E',
  },
  {
    id: 2,
    name: 'Dr. (Col) Manjinder Sandhu',
    title: 'PRINCIPAL DIRECTOR CARDIOLOGY | Fortis Gurgaon',
    specialty: 'Cardiac Sciences',
    secondarySpecialties: 'Interventional Cardiology',
    experience: '35 years',
    fee: '2000',
    hospital: 'Fortis Manesar',
    location: '1 different location',
    imageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%2310B981"/%3E%3Ctext x="50" y="50" textAnchor="middle" dy=".3em" fill="white" fontSize="48"%3E👨‍⚕️%3C/text%3E%3C/svg%3E',
  },
  {
    id: 3,
    name: 'Dr. (Prof.) Amit Javed',
    title: 'PRINCIPAL DIRECTOR & HOD LAP GI, GI ONCO, BARIATRIC & MIS SURGERY | Fortis Gurgaon',
    specialty: 'General Surgery',
    secondarySpecialties: 'General Surgery | General and Laparoscopic Surgery | General and Minimal Access Surgery | Robotic Surgery',
    tertiarySpecialties: 'Gastroenterology and Hepatobiliary Sciences | Gastrointestinal Surgery | GI, Minimal Access and Bariatric Surgery | Metabolic & Bariatric Surgery | Robotic Surgery',
    quaternarySpecialties: 'Oncology | Oncology | Robotic Surgery | Surgical Oncology',
    experience: '25 years',
    fee: '1500',
    hospital: 'Fortis Gurgaon',
    imageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%2310B981"/%3E%3Ctext x="50" y="50" textAnchor="middle" dy=".3em" fill="white" fontSize="48"%3E👨‍⚕️%3C/text%3E%3C/svg%3E',
  },
];

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <main className="bg-background">
      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h1 className="text-5xl sm:text-6xl font-bold text-foreground mb-6">
              Your Health is Our Priority
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Find the best doctors, book appointments, and manage your health with confidence
            </p>

            {/* Search Bar */}
            <div className="max-w-3xl mx-auto mb-8">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3">
                  <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search doctors or specialties..."
                    className="flex-1 bg-transparent outline-none text-foreground placeholder-muted-foreground"
                  />
                </div>
                <Button onClick={() => onGetStarted('patient')} size="lg" className="px-8">
                  Search
                </Button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-4 justify-center">
              <Button
                onClick={() => onGetStarted('patient')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Book Appointment
              </Button>
              <Button
                onClick={() => onGetStarted('patient')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <MapPin className="h-4 w-4" />
                Find Hospitals
              </Button>
              <Button
                onClick={() => onGetStarted('patient')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Check-up Packages
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Specialists Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Featured Specialists
            </h2>
            <p className="text-muted-foreground text-lg">
              Consult with top-rated doctors across various specialties
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredDoctors.map((doctor) => (
              <div
                key={doctor.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                {/* Card Content */}
                <div className="p-8">
                  {/* Doctor Image - Circular */}
                  <div className="mb-6">
                    <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center overflow-hidden border-4 border-primary/10">
                      <span className="text-4xl">👨‍⚕️</span>
                    </div>
                  </div>

                  {/* Doctor Name */}
                  <h3 className="text-xl font-bold text-foreground mb-2">{doctor.name}</h3>

                  {/* Title/Position */}
                  <p className="text-sm text-muted-foreground font-medium mb-4">{doctor.title}</p>

                  {/* Specialties */}
                  <div className="space-y-2 mb-6">
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">{doctor.specialty}</span>
                      {doctor.secondarySpecialties && (
                        <span className="text-muted-foreground"> | {doctor.secondarySpecialties}</span>
                      )}
                    </p>
                    {doctor.tertiarySpecialties && (
                      <p className="text-sm text-muted-foreground">
                        {doctor.tertiarySpecialties}
                      </p>
                    )}
                    {doctor.quaternarySpecialties && (
                      <p className="text-sm text-muted-foreground">
                        {doctor.quaternarySpecialties}
                      </p>
                    )}
                  </div>

                  {/* Experience and Fee - Side by Side */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-foreground" />
                      <div>
                        <p className="text-sm font-bold text-foreground">{doctor.experience}</p>
                        <p className="text-xs text-muted-foreground">Experience</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">₹ {doctor.fee}</p>
                      <p className="text-xs text-muted-foreground">Fees</p>
                    </div>
                  </div>

                  {/* Location */}
                  {doctor.location && (
                    <div className="flex items-center gap-2 mb-6 text-muted-foreground text-sm">
                      <MapPin className="h-4 w-4" />
                      <span>Available at {doctor.location}</span>
                    </div>
                  )}

                  {/* Hospital Name */}
                  <p className="text-sm font-medium text-muted-foreground mb-6">{doctor.hospital}</p>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => onGetStarted('patient')}
                      className="flex-1 px-4 py-3 border border-foreground text-foreground font-semibold rounded-lg hover:bg-foreground/5 transition-colors"
                    >
                      View Full Profile
                    </button>
                    <button
                      onClick={() => onGetStarted('patient')}
                      className="flex-1 px-4 py-3 bg-orange-100 text-orange-600 font-semibold rounded-lg hover:bg-orange-200 transition-colors"
                    >
                      Book An Appointment
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button
              onClick={() => onGetStarted('patient')}
              variant="outline"
              size="lg"
            >
              View All Doctors
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-foreground mb-12">
            Why Choose Fortis Healthcare
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Calendar className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Easy Booking</h3>
              <p className="text-muted-foreground">
                Book appointments in seconds with real-time availability
              </p>
            </div>

            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Shield className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Secure & Private</h3>
              <p className="text-muted-foreground">
                Your medical data is encrypted and fully protected
              </p>
            </div>

            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Expert Doctors</h3>
              <p className="text-muted-foreground">
                Connect with board-certified specialists nationwide
              </p>
            </div>

            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Clock className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">24/7 Support</h3>
              <p className="text-muted-foreground">
                Round-the-clock customer support for your peace of mind
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Book Your Appointment?
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Join thousands of patients who trust Fortis Healthcare for their medical needs
          </p>
          <Button
            onClick={() => onGetStarted('patient')}
            size="lg"
            variant="secondary"
          >
            Get Started Today
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-foreground mb-4">Hospitals</h4>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li><a href="#" className="hover:text-primary">Delhi</a></li>
                <li><a href="#" className="hover:text-primary">Mumbai</a></li>
                <li><a href="#" className="hover:text-primary">Bangalore</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Specialities</h4>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li><a href="#" className="hover:text-primary">Cardiology</a></li>
                <li><a href="#" className="hover:text-primary">Neurology</a></li>
                <li><a href="#" className="hover:text-primary">Oncology</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li><a href="#" className="hover:text-primary">About Us</a></li>
                <li><a href="#" className="hover:text-primary">Careers</a></li>
                <li><a href="#" className="hover:text-primary">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li><a href="#" className="hover:text-primary">Privacy</a></li>
                <li><a href="#" className="hover:text-primary">Terms</a></li>
                <li><a href="#" className="hover:text-primary">Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-muted-foreground">
            <p>© 2025 Fortis Healthcare. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
