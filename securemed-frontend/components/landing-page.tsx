"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Calendar,
  Shield,
  Users,
  MapPin,
  Clock,
  Star,
  Activity,
  Heart,
  CheckCircle2,
  X,
  Stethoscope,
  Video,
  CalendarPlus,
  Phone,
  FileText,
  AlertTriangle,
  HeartPulse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { appointmentService, Doctor } from "@/services/appointments";
import { ROUTES } from "@/lib/routes";

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const router = useRouter();
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Widget States
  const [location, setLocation] = useState("");
  const [specialty, setSpecialty] = useState("");

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const doctors = await appointmentService.getDoctors();
        setAllDoctors(doctors);
        setFilteredDoctors(doctors.slice(0, 3)); // Initial view: Top 3
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  // Vitality indicator: reflect live system status from the readiness probe.
  const [systemOperational, setSystemOperational] = useState<boolean | null>(null);

  // Service card availability labels (high-density status chips).
  const serviceStatuses = ["Available", "Open", "Self-serve", "Online"];

  useEffect(() => {
    let cancelled = false;
    const checkHealth = async () => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const res = await fetch("/api/health/ready/", {
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(timer);
        if (!cancelled) setSystemOperational(res.ok);
      } catch {
        if (!cancelled) setSystemOperational(false);
      }
    };
    checkHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);

    let results = allDoctors;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        (doc) =>
          doc.name.toLowerCase().includes(query) ||
          doc.specialization.toLowerCase().includes(query),
      );
    }

    if (location.trim()) {
      results = results.filter((doc) =>
        doc.hospital.toLowerCase().includes(location.toLowerCase()),
      );
    }

    if (specialty.trim()) {
      results = results.filter((doc) =>
        doc.specialization.toLowerCase().includes(specialty.toLowerCase()),
      );
    }

    setFilteredDoctors(results);
    document
      .getElementById("specialists")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const clearSearch = () => {
    setSearchQuery("");
    setLocation("");
    setSpecialty("");
    setFilteredDoctors(allDoctors.slice(0, 3));
    setIsSearching(false);
  };

  const pushLoginWithNext = (nextPath: string) => {
    router.push(`/login?next=${encodeURIComponent(nextPath)}`);
  };

  return (
    <main className="bg-background min-h-screen relative">
      {/* Hero Section with Service Bar and Widget */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cool-grey-50 via-white to-cool-grey-100 dark:from-gray-900 dark:to-gray-800 -z-10" />
        <div className="mx-auto max-w-7xl relative z-10">
          {/* Main Hero Content */}
          <div className="text-center mb-12">
            {/* Vitality indicator — live readiness pulse */}
            <div className="inline-flex items-center gap-3 rounded-full border border-border/60 bg-white/70 dark:bg-gray-900/70 px-4 py-2 backdrop-blur mb-8">
              <span className="relative flex h-2 w-2">
                <span
                  className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping ${
                    systemOperational === null
                      ? "bg-muted-foreground"
                      : systemOperational
                        ? "bg-precision-blue"
                        : "bg-alert-crimson"
                  }`}
                />
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    systemOperational === null
                      ? "bg-muted-foreground"
                      : systemOperational
                        ? "bg-precision-blue"
                        : "bg-alert-crimson"
                  }`}
                />
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">
                {systemOperational === null
                  ? "Checking system status…"
                  : systemOperational
                    ? "All systems operational"
                    : "System degraded — emergency intake available"}
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl font-extrabold text-foreground mb-6 tracking-tight leading-tight">
              Healthcare <span className="text-precision-blue">Reimagined</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Book appointments, access records, and connect with specialists
              through a security-first platform engineered for clinical clarity.
            </p>

            {/* Platform facts — dense, data-first */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto mb-14">
              {[
                { value: "JWT + MFA", label: "Security-first auth" },
                { value: "HIPAA-aligned", label: "Clinical records" },
                { value: "24/7", label: "Emergency triage" },
                { value: "Live", label: "System readiness" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-border/50 bg-white/60 dark:bg-gray-900/60 px-3 py-2.5 text-left"
                >
                  <div className="font-mono text-sm font-semibold text-foreground">
                    {stat.value}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Service Icon Bar (Inspiration from reference) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto mb-16">
              {[
                {
                  icon: Users,
                  label: "Find a Doctor",
                  desc: "Search by Name, Specialty",
                  action: () => {
                    document
                      .getElementById("search-widget")
                      ?.scrollIntoView({ behavior: "smooth" });
                    setTimeout(
                      () =>
                        document
                          .querySelector<HTMLInputElement>(
                            '#search-widget input[placeholder="Search by Name"]',
                          )
                          ?.focus(),
                      400,
                    );
                  },
                },
                {
                  icon: CalendarPlus,
                  label: "Book Appointment",
                  desc: "Schedule a Visit",
                  action: () => pushLoginWithNext(ROUTES.PATIENT_APPOINTMENTS),
                },
                {
                  icon: FileText,
                  label: "Health Checkup",
                  desc: "Book Lab Tests",
                  action: () => router.push(ROUTES.LAB_TESTS),
                },
                {
                  icon: Video,
                  label: "Tele Medicine",
                  desc: "Video Consultation",
                  action: () =>
                    pushLoginWithNext(
                      "/patient/appointments?mode=telemedicine",
                    ),
                },
              ].map((service, idx) => (
                <div
                  key={idx}
                  onClick={service.action}
                  className="bg-card hover:bg-precision-blue/5 border border-border/50 hover:border-precision-blue/50 p-5 rounded-xl cursor-pointer transition-all duration-300 group shadow-sm hover:shadow-md text-left flex flex-col"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2.5 bg-precision-blue/10 rounded-lg text-precision-blue group-hover:scale-110 transition-transform">
                      <service.icon className="h-5 w-5" />
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-cool-grey-100 dark:bg-gray-800 text-muted-foreground">
                      {serviceStatuses[idx]}
                    </span>
                  </div>
                  <h3 className="font-bold text-foreground">{service.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {service.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="max-w-5xl mx-auto mb-10 rounded-3xl border border-alert-crimson/25 bg-gradient-to-r from-alert-crimson/5 via-alert-crimson/5 to-amber-50 dark:from-alert-crimson/10 dark:via-alert-crimson/10 dark:to-transparent p-6 text-left shadow-lg shadow-alert-crimson/10">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-full bg-alert-crimson/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-alert-crimson">
                    <AlertTriangle className="h-4 w-4" />
                    Emergency Intake
                  </div>
                  <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground">
                    For urgent cases, submit an emergency intake for immediate
                    triage
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Authorised clinicians can initiate a secure, time-limited
                    emergency session to access critical patient data when
                    standard consent is unavailable.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium text-foreground">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 dark:bg-gray-900/60 px-3 py-1">
                      <HeartPulse className="h-3.5 w-3.5 text-alert-crimson" />
                      Trauma
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 dark:bg-gray-900/60 px-3 py-1">
                      <HeartPulse className="h-3.5 w-3.5 text-alert-crimson" />
                      Life-Threatening
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 dark:bg-gray-900/60 px-3 py-1">
                      <HeartPulse className="h-3.5 w-3.5 text-alert-crimson" />
                      Critical Lab
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 min-w-[220px]">
                  <Button
                    size="lg"
                    className="bg-alert-crimson text-white hover:bg-alert-crimson-dark"
                    onClick={() => router.push(ROUTES.EMERGENCY)}
                  >
                    Clinician Emergency Login
                  </Button>
                </div>
              </div>
            </div>

            {/* Booking Widget Bar (Inspiration from reference) */}
            <div
              id="search-widget"
              className="bg-card shadow-2xl rounded-2xl border border-border p-4 max-w-5xl mx-auto transform translate-y-4"
            >
              <form
                onSubmit={handleSearch}
                className="flex flex-col md:flex-row gap-4 items-center"
              >
                {/* Location Select */}
                <div className="flex-1 w-full md:w-auto relative border-b md:border-b-0 md:border-r border-border pb-4 md:pb-0 md:pr-4">
                  <div className="flex items-center gap-2.5 mb-1">
                    <MapPin className="h-4 w-4 text-precision-blue" />
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Location
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Select Location"
                    className="w-full bg-transparent outline-none text-foreground font-medium placeholder:text-muted-foreground/60"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>

                {/* Specialty Select */}
                <div className="flex-1 w-full md:w-auto relative border-b md:border-b-0 md:border-r border-border pb-4 md:pb-0 md:pr-4 md:pl-4">
                  <div className="flex items-center gap-2.5 mb-1">
                    <Stethoscope className="h-4 w-4 text-precision-blue" />
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Specialty
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Select Specialty"
                    className="w-full bg-transparent outline-none text-foreground font-medium placeholder:text-muted-foreground/60"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                  />
                </div>

                {/* Doctor Select (Search Input) */}
                <div className="flex-[1.5] w-full md:w-auto relative pb-4 md:pb-0 md:pl-4">
                  <div className="flex items-center gap-2.5 mb-1">
                    <Users className="h-4 w-4 text-precision-blue" />
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Doctor
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by Name"
                    className="w-full bg-transparent outline-none text-foreground font-medium placeholder:text-muted-foreground/60"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Search Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="h-14 px-8 rounded-xl bg-precision-blue hover:bg-precision-blue-dark shadow-lg shadow-precision-blue/20 w-full md:w-auto"
                >
                  Search
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Specialists Section */}
      <section
        id="specialists"
        className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-muted/20"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex justify-between items-end mb-12">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-precision-blue">
                {isSearching
                  ? `Search Results (${filteredDoctors.length})`
                  : "Top Doctors"}
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-2">
                {isSearching ? "Matching Specialists" : "Featured Specialists"}
              </h2>
            </div>
            {!isSearching && (
              <Button
                onClick={() => {
                  setIsSearching(true);
                  setFilteredDoctors(allDoctors);
                }}
                variant="ghost"
                className="hidden sm:flex group"
              >
                View all doctors{" "}
                <span className="ml-2 group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </Button>
            )}
            {isSearching && (
              <Button
                onClick={clearSearch}
                variant="ghost"
                className="hidden sm:flex group"
              >
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
                <div
                  key={doctor.id}
                  className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-2xl hover:border-precision-blue/40 transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="p-1 min-h-[160px] bg-gradient-to-br from-cool-grey-50 to-cool-grey-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                    {/* Dynamic Avatar using Lucide */}
                    <div className="relative">
                      <div
                        className={`w-24 h-24 rounded-full flex items-center justify-center border-4 border-background shadow-xl ${
                          index % 2 === 0
                            ? "bg-precision-blue"
                            : "bg-steel-contrast"
                        }`}
                      >
                        <Users className="h-12 w-12 text-white" />
                      </div>
                      <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 border-4 border-background rounded-full"></div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-foreground group-hover:text-precision-blue transition-colors">
                          Dr. {doctor.name.replace(/^Dr\. /, "")}
                        </h3>
                        <p className="text-sm font-medium text-precision-blue bg-precision-blue/10 px-2 py-1 rounded-md inline-block mt-1">
                          {doctor.specialization}
                        </p>
                      </div>
                      <div className="flex items-center bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded text-amber-700 dark:text-amber-400 text-sm font-bold">
                        <Star className="h-3 w-3 fill-current mr-1" />
                        {doctor.rating || "4.9"}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-6 line-clamp-2">
                      {doctor.description ||
                        `Experienced ${doctor.specialization} committed to patient care.`}
                    </p>

                    <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-border">
                      <span className="flex items-center font-mono text-xs">
                        <MapPin className="h-3 w-3 mr-1" /> {doctor.hospital}
                      </span>
                      <span className="font-semibold text-foreground font-mono text-xs">
                        ₹ {doctor.consultation_fee}
                      </span>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <Button
                        onClick={() => setSelectedDoctor(doctor)}
                        variant="outline"
                        className="flex-1"
                      >
                        View Profile
                      </Button>
                      <Button
                        onClick={() =>
                          pushLoginWithNext(
                            `${ROUTES.PATIENT_APPOINTMENTS}?doctorId=${doctor.id}`,
                          )
                        }
                        className="flex-1 bg-precision-blue hover:bg-precision-blue-dark"
                      >
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
              <p className="text-muted-foreground text-lg">
                No specialists found matching your search.
              </p>
              <Button onClick={clearSearch} variant="link" className="mt-2">
                View all doctors
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Why Choose Us Section with Icons */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-card">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-precision-blue">
              Trust &amp; Compliance
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-2 mb-4">
              Why Patients Trust SecureMed
            </h2>
            <p className="text-muted-foreground text-lg">
              We combine advanced technology with compassionate care to provide
              the best healthcare experience.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Calendar,
                title: "Instant Booking",
                desc: "Book appointments instantly with real-time doctor availability.",
                color: "text-precision-blue bg-precision-blue/10",
              },
              {
                icon: Shield,
                title: "Secure Records",
                desc: "Bank-grade encryption keeps your medical history safe and private.",
                color: "text-steel-contrast bg-cool-grey-100 dark:bg-gray-800",
              },
              {
                icon: Users,
                title: "Top Specialists",
                desc: "Access a network of board-certified doctors across 30+ specialties.",
                color: "text-precision-blue-dark bg-precision-blue/10",
              },
              {
                icon: Clock,
                title: "24/7 Access",
                desc: "Manage your health anytime, anywhere from our mobile-friendly portal.",
                color: "text-steel-contrast bg-cool-grey-100 dark:bg-gray-800",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-background border border-border hover:border-precision-blue/40 transition-colors"
              >
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${feature.color}`}
                >
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section (New) */}
      <section
        id="testimonials"
        className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-t from-cool-grey-50/60 to-transparent dark:from-gray-900/40"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-precision-blue">
              Patient Stories
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-2">
              Hear from the SecureMed Community
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah J.",
                role: "Patient",
                quote:
                  "Booking with SecureMed was seamless. I found a great cardiologist within minutes.",
                rating: 5,
              },
              {
                name: "Michael R.",
                role: "Patient",
                quote:
                  "The ability to see my lab results online immediately after they are ready is a game changer.",
                rating: 5,
              },
              {
                name: "Dr. Emily Chen",
                role: "Partner Doctor",
                quote:
                  "SecureMed helps me focus on patients rather than paperwork. Highly recommended.",
                rating: 5,
              },
            ].map((story, i) => (
              <div
                key={i}
                className="bg-card p-8 rounded-2xl shadow-sm border border-border relative hover:border-precision-blue/40 transition-colors"
              >
                <div className="absolute top-6 right-8 text-6xl text-precision-blue/10 font-serif leading-none">
                  &quot;
                </div>
                <div className="flex gap-1 mb-4">
                  {[...Array(story.rating)].map((_, r) => (
                    <Star
                      key={r}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <p className="text-lg text-foreground mb-6 relative z-10 italic">
                  &quot;{story.quote}&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
                    {story.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm">
                      {story.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {story.role}
                    </p>
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
                Empowering patients and doctors with secure, efficient, and
                modern digital health solutions.
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => scrollToSection("testimonials")}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                  aria-label="Jump to patient stories"
                >
                  <Users className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("features")}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                  aria-label="Jump to care features"
                >
                  <Heart className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-4">Services</h4>
              <ul className="space-y-3 text-muted-foreground text-sm">
                <li>
                  <button
                    onClick={() => scrollToSection("search-widget")}
                    className="hover:text-primary transition-colors"
                  >
                    Find a Doctor
                  </button>
                </li>
                <li>
                  <button
                    onClick={() =>
                      pushLoginWithNext(
                        "/patient/appointments?mode=telemedicine",
                      )
                    }
                    className="hover:text-primary transition-colors"
                  >
                    Tele Medicine
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => router.push(ROUTES.LAB_TESTS)}
                    className="hover:text-primary transition-colors"
                  >
                    Lab Tests
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => pushLoginWithNext("/patient/records")}
                    className="hover:text-primary transition-colors"
                  >
                    Health Records
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-4">Company</h4>
              <ul className="space-y-3 text-muted-foreground text-sm">
                <li>
                  <button
                    onClick={() => scrollToSection("features")}
                    className="hover:text-primary transition-colors"
                  >
                    About Us
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("features")}
                    className="hover:text-primary transition-colors"
                  >
                    Careers
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("features")}
                    className="hover:text-primary transition-colors"
                  >
                    Partners
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("testimonials")}
                    className="hover:text-primary transition-colors"
                  >
                    Contact
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-4">Legal</h4>
              <ul className="space-y-3 text-muted-foreground text-sm">
                <li>
                  <button
                    onClick={() => router.push("/privacy-policy")}
                    className="hover:text-primary transition-colors"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => router.push("/terms-of-service")}
                    className="hover:text-primary transition-colors"
                  >
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => router.push("/cookie-policy")}
                    className="hover:text-primary transition-colors"
                  >
                    Cookie Policy
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("features")}
                    className="hover:text-primary transition-colors"
                  >
                    HIPAA Compliance
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© 2026 SecureMed Healthcare. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" /> Secure SSL
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" /> HIPAA Ready
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Doctor Details Modal */}
      <Dialog
        open={!!selectedDoctor}
        onOpenChange={(open) => !open && setSelectedDoctor(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <span className="bg-primary/10 p-2 rounded-full text-primary">
                <Users className="h-6 w-6" />
              </span>
              Dr. {selectedDoctor?.name.replace(/^Dr\. /, "")}
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
                  `Dr. ${selectedDoctor?.name.replace(/^Dr\. /, "")} is a highly experienced ${selectedDoctor?.specialization} dealing with complex cases. Committed to patient-centered care and utilizing the latest medical advancements.`}
              </p>

              <h4 className="font-semibold text-foreground mt-4 mb-2">
                Details
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" /> {selectedDoctor?.hospital}
                </li>
                <li className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />{" "}
                  {selectedDoctor?.experience} Experience
                </li>
                <li className="flex items-center text-foreground font-medium">
                  <Activity className="h-4 w-4 mr-2" /> ₹
                  {selectedDoctor?.consultation_fee} Consultation Fee
                </li>
              </ul>
            </div>

            <div className="bg-muted/30 p-6 rounded-xl border border-border">
              <h4 className="font-semibold text-foreground mb-4">
                Availability
              </h4>
              {/* Simplified availability visual - mostly static for landing page */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Today</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    Available
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Tomorrow</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    Available
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Weekend</span>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    Limited
                  </span>
                </div>
              </div>

              <Button
                className="w-full mt-6"
                onClick={() => {
                  const doctorPath = `${ROUTES.PATIENT_APPOINTMENTS}?doctorId=${selectedDoctor?.id ?? ""}`;
                  setSelectedDoctor(null);
                  pushLoginWithNext(doctorPath);
                }}
              >
                Login to Book Appointment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
