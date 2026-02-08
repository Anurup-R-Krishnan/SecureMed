'use client';

import { useState, useEffect } from 'react';
import { Search, Calendar, Shield, Users, MapPin, Clock, Star, Activity, Heart, CheckCircle2, X, Building2, Stethoscope, Video, CalendarPlus, Phone, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { appointmentService, Doctor } from '@/services/appointments';

interface LandingPageProps {
  onGetStarted: (role?: 'patient' | 'doctor' | 'admin') => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Widget States
  const [location, setLocation] = useState('');
  const [hospital, setHospital] = useState('');
  const [specialty, setSpecialty] = useState('');

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const doctors = await appointmentService.getDoctors();
        setAllDoctors(doctors);
        setFilteredDoctors(doctors.slice(0, 3)); // Initial view: Top 3
      } catch (error) {
        console.error('Error fetching doctors:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);

    // Simple filter logic for demo - in real app would use all params
    let results = allDoctors;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(doc =>
        doc.name.toLowerCase().includes(query) ||
        doc.specialization.toLowerCase().includes(query)
      );
    }

    if (location && location !== 'all') {
      results = results.filter(doc => doc.hospital.toLowerCase().includes(location.toLowerCase()));
    }

    if (specialty && specialty !== 'all') {
      results = results.filter(doc => doc.specialization.toLowerCase().includes(specialty.toLowerCase()));
    }

    setFilteredDoctors(results);
    document.getElementById('specialists')?.scrollIntoView({ behavior: 'smooth' });
  };

  const clearSearch = () => {
    setSearchQuery('');
    setLocation('');
    setHospital('');
    setSpecialty('');
    setFilteredDoctors(allDoctors.slice(0, 3));
    setIsSearching(false);
  };

  return (
    <main className="bg-background min-h-screen relative">



      {/* Hero Section with Service Bar and Widget */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 -z-10" />
        <div className="mx-auto max-w-7xl relative z-10">

          {/* Main Hero Content */}
          <div className="text-center mb-16">
            <h1 className="text-5xl sm:text-7xl font-extrabold text-foreground mb-6 tracking-tight leading-tight">
              Healthcare <span className="text-primary">Reimagined</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
              Experience modern healthcare management. Book appointments, access records, and connect with specialists securely.
            </p>

            {/* Service Icon Bar (Inspiration from reference) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto mb-16">
              {[
                { icon: Users, label: 'Find a Doctor', desc: 'Search by Name, Specialty', action: () => document.getElementById('search-widget')?.scrollIntoView({ behavior: 'smooth' }) },
                { icon: CalendarPlus, label: 'Book Appointment', desc: 'Schedule a Visit', action: () => onGetStarted('patient') },
                { icon: FileText, label: 'Health Checkup', desc: 'Book Lab Tests', action: () => onGetStarted('patient') },
                { icon: Video, label: 'Tele Medicine', desc: 'Connect Online', action: () => onGetStarted('patient') },
              ].map((service, idx) => (
                <div key={idx} onClick={service.action} className="bg-card hover:bg-primary/5 border border-border/50 hover:border-primary/50 p-6 rounded-xl cursor-pointer transition-all duration-300 group shadow-sm hover:shadow-md text-center flex flex-col items-center">
                  <div className="p-3 bg-primary/10 rounded-full text-primary mb-3 group-hover:scale-110 transition-transform">
                    <service.icon className="h-8 w-8" />
                  </div>
                  <h3 className="font-bold text-foreground">{service.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{service.desc}</p>
                </div>
              ))}
            </div>

            {/* Booking Widget Bar (Inspiration from reference) */}
            <div id="search-widget" className="bg-card shadow-2xl rounded-2xl border border-border p-4 max-w-5xl mx-auto transform translate-y-4">
              <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-center">

                {/* Location Select */}
                <div className="flex-1 w-full md:w-auto relative border-b md:border-b-0 md:border-r border-border pb-4 md:pb-0 md:pr-4">
                  <div className="flex items-center gap-3 mb-1">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Location</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Select Location"
                    className="w-full bg-transparent outline-none text-foreground font-medium"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>

                {/* Hospital Select */}
                <div className="flex-1 w-full md:w-auto relative border-b md:border-b-0 md:border-r border-border pb-4 md:pb-0 md:pr-4 md:pl-4">
                  <div className="flex items-center gap-3 mb-1">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Hospital</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Select Hospital"
                    className="w-full bg-transparent outline-none text-foreground font-medium"
                    value={hospital}
                    onChange={(e) => setHospital(e.target.value)}
                  />
                </div>

                {/* Specialty Select */}
                <div className="flex-1 w-full md:w-auto relative border-b md:border-b-0 md:border-r border-border pb-4 md:pb-0 md:pr-4 md:pl-4">
                  <div className="flex items-center gap-3 mb-1">
                    <Stethoscope className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Specialty</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Select Specialty"
                    className="w-full bg-transparent outline-none text-foreground font-medium"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                  />
                </div>

                {/* Doctor Select (Search Input) */}
                <div className="flex-[1.5] w-full md:w-auto relative pb-4 md:pb-0 md:pl-4">
                  <div className="flex items-center gap-3 mb-1">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Doctor</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by Name"
                    className="w-full bg-transparent outline-none text-foreground font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Search Button */}
                <Button type="submit" size="lg" className="h-14 px-8 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 w-full md:w-auto">
                  Search
                </Button>

              </form>
            </div>

          </div>
        </div>
      </section>

      {/* Featured Specialists Section */}
      <section id="specialists" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-muted/20">
        <div className="mx-auto max-w-7xl">
          <div className="flex justify-between items-end mb-12">
            <div>
              <span className="text-primary font-semibold tracking-wider uppercase text-sm">
                {isSearching ? `Search Results (${filteredDoctors.length})` : 'Top Doctors'}
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-2">
                {isSearching ? 'Matching Specialists' : 'Featured Specialists'}
              </h2>
            </div>
            {!isSearching && (
              <Button onClick={() => { setIsSearching(true); setFilteredDoctors(allDoctors); }} variant="ghost" className="hidden sm:flex group">
                View all doctors <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </Button>
            )}
            {isSearching && (
              <Button onClick={clearSearch} variant="ghost" className="hidden sm:flex group">
                Clear Search <X className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-12 w-12 rounded-full border-4 border-muted border-t-primary animate-spin" />
            </div>
          ) : filteredDoctors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredDoctors.map((doctor, index) => (
                <div key={doctor.id} className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-2xl hover:border-primary/20 transition-all duration-300 transform hover:-translate-y-1">
                  <div className="p-1 min-h-[160px] bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                    {/* Dynamic Avatar using Lucide */}
                    <div className="relative">
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 border-background shadow-xl ${index % 2 === 0 ? 'bg-blue-600' : 'bg-indigo-600'
                        }`}>
                        <Users className="h-12 w-12 text-white" />
                      </div>
                      <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 border-4 border-background rounded-full"></div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">Dr. {doctor.name.replace(/^Dr\. /, '')}</h3>
                        <p className="text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded-md inline-block mt-1">
                          {doctor.specialization}
                        </p>
                      </div>
                      <div className="flex items-center bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded text-amber-700 dark:text-amber-400 text-sm font-bold">
                        <Star className="h-3 w-3 fill-current mr-1" />
                        {doctor.rating || '4.9'}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-6 line-clamp-2">{doctor.description || `Experienced ${doctor.specialization} committed to patient care.`}</p>

                    <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-border">
                      <span className="flex items-center"><MapPin className="h-3 w-3 mr-1" /> {doctor.hospital}</span>
                      <span className="font-semibold text-foreground">₹ {doctor.consultation_fee}</span>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <Button onClick={() => setSelectedDoctor(doctor)} variant="outline" className="flex-1">
                        View Profile
                      </Button>
                      <Button onClick={() => onGetStarted('patient')} className="flex-1">
                        Book
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-card rounded-2xl border border-border">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground text-lg">No specialists found matching your search.</p>
              <Button onClick={clearSearch} variant="link" className="mt-2">View all doctors</Button>
            </div>
          )}
        </div>
      </section>

      {/* Why Choose Us Section with Icons */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-card">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Why Patients Trust SecureMed</h2>
            <p className="text-muted-foreground text-lg">We combine advanced technology with compassionate care to provide the best healthcare experience.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Calendar, title: 'Instant Booking', desc: 'Book appointments instantly with real-time doctor availability.', color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
              { icon: Shield, title: 'Secure Records', desc: 'Bank-grade encryption keeps your medical history safe and private.', color: 'text-green-500 bg-green-50 dark:bg-green-900/20' },
              { icon: Users, title: 'Top Specialists', desc: 'Access a network of board-certified doctors across 30+ specialties.', color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' },
              { icon: Clock, title: '24/7 Access', desc: 'Manage your health anytime, anywhere from our mobile-friendly portal.', color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' }
            ].map((feature, i) => (
              <div key={i} className="p-6 rounded-2xl bg-background border border-border hover:border-primary/50 transition-colors">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${feature.color}`}>
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section (New) */}
      <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-t from-blue-50/50 to-transparent dark:from-blue-950/20">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-foreground mb-16">Patient Stories</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "Sarah J.", role: "Patient", quote: "Booking with SecureMed was seamless. I found a great cardiologist within minutes.", rating: 5 },
              { name: "Michael R.", role: "Patient", quote: "The ability to see my lab results online immediately after they are ready is a game changer.", rating: 5 },
              { name: "Dr. Emily Chen", role: "Partner Doctor", quote: "SecureMed helps me focus on patients rather than paperwork. Highly recommended.", rating: 5 }
            ].map((story, i) => (
              <div key={i} className="bg-card p-8 rounded-2xl shadow-sm border border-border relative">
                <div className="absolute top-6 right-8 text-6xl text-primary/10 font-serif leading-none">"</div>
                <div className="flex gap-1 mb-4">
                  {[...Array(story.rating)].map((_, r) => (
                    <Star key={r} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-lg text-foreground mb-6 relative z-10 italic">"{story.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
                    {story.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm">{story.name}</p>
                    <p className="text-xs text-muted-foreground">{story.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <Activity className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">SecureMed</span>
              </div>
              <p className="text-muted-foreground text-sm mb-6 max-w-xs">
                Empowering patients and doctors with secure, efficient, and modern digital health solutions.
              </p>
              <div className="flex gap-4">
                {/* Social placeholders */}
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer"><Users className="h-4 w-4" /></div>
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer"><Heart className="h-4 w-4" /></div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-4">Services</h4>
              <ul className="space-y-3 text-muted-foreground text-sm">
                <li><button onClick={() => onGetStarted('patient')} className="hover:text-primary transition-colors">Find a Doctor</button></li>
                <li><button onClick={() => onGetStarted('patient')} className="hover:text-primary transition-colors">Online Consultation</button></li>
                <li><button onClick={() => onGetStarted('patient')} className="hover:text-primary transition-colors">Lab Tests</button></li>
                <li><button onClick={() => onGetStarted('patient')} className="hover:text-primary transition-colors">Health Records</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-4">Company</h4>
              <ul className="space-y-3 text-muted-foreground text-sm">
                <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Partners</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-4">Legal</h4>
              <ul className="space-y-3 text-muted-foreground text-sm">
                <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Cookie Policy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">HIPAA Compliance</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© 2026 SecureMed Healthcare. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> Secure SSL</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> HIPAA Ready</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Doctor Details Modal */}
      <Dialog open={!!selectedDoctor} onOpenChange={(open) => !open && setSelectedDoctor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <span className="bg-primary/10 p-2 rounded-full text-primary">
                <Users className="h-6 w-6" />
              </span>
              Dr. {selectedDoctor?.name.replace(/^Dr\. /, '')}
            </DialogTitle>
            <DialogDescription className="text-lg font-medium text-primary">
              {selectedDoctor?.specialization}
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <div>
              <h4 className="font-semibold text-foreground mb-2">About</h4>
              <p className="text-muted-foreground leading-relaxed">
                {selectedDoctor?.description ||
                  `Dr. ${selectedDoctor?.name.replace(/^Dr\. /, '')} is a highly experienced ${selectedDoctor?.specialization} dealing with complex cases. Committed to patient-centered care and utilizing the latest medical advancements.`}
              </p>

              <h4 className="font-semibold text-foreground mt-4 mb-2">Details</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center"><MapPin className="h-4 w-4 mr-2" /> {selectedDoctor?.hospital}</li>
                <li className="flex items-center"><Clock className="h-4 w-4 mr-2" /> {selectedDoctor?.experience} Experience</li>
                <li className="flex items-center text-foreground font-medium"><Activity className="h-4 w-4 mr-2" /> ₹{selectedDoctor?.consultation_fee} Consultation Fee</li>
              </ul>
            </div>

            <div className="bg-muted/30 p-6 rounded-xl border border-border">
              <h4 className="font-semibold text-foreground mb-4">Availability</h4>
              {/* Simplified availability visual - mostly static for landing page */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Today</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Available</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Tomorrow</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Available</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Weekend</span>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Limited</span>
                </div>
              </div>

              <Button className="w-full mt-6" onClick={() => { setSelectedDoctor(null); onGetStarted('patient'); }}>
                Login to Book Appointment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
