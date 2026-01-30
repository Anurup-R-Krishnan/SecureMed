'use client';

import { Button } from '@/components/ui/button';
import { Menu, ChevronDown, MapPin, Calendar, Heart as HeartIcon } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  onLoginClick: (role?: 'patient' | 'doctor' | 'admin') => void;
}

export default function Header({ onLoginClick }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const navigationItems = [
    { label: 'Hospitals', href: '#' },
    { label: 'Specialities', href: '#' },
    { label: 'Centre of Excellence', href: '#' },
    { label: 'Media Centre', href: '#' },
    { label: 'Medical Services', href: '#' },
    { label: 'Patient Corner', href: '#' },
    { label: 'International Section', href: '#' },
  ];

  return (
    <header className="bg-background border-b border-border">
      {/* Top Navigation Bar */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <div className="flex items-center gap-2 flex-shrink-0">

              <span className="text-2xl font-bold text-primary hidden sm:inline">Fortis</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-6">
              {navigationItems.map((item) => (
                <div key={item.label} className="relative group">
                  <button className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1 py-4">
                    {item.label}
                    {item.label !== 'International Section' && (
                      <ChevronDown className="h-4 w-4 transition-transform group-hover:rotate-180" />
                    )}
                  </button>
                </div>
              ))}
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-foreground hover:text-primary"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-background border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 items-start sm:items-center justify-between py-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
              <button
                onClick={() => onLoginClick('patient')}
                className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                <MapPin className="h-5 w-5 text-primary" />
                Request a Callback
              </button>
              <button
                onClick={() => onLoginClick('patient')}
                className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                <HeartIcon className="h-5 w-5 text-primary" />
                Get Health Checkup
              </button>
            </div>
            <Button
              onClick={() => onLoginClick('patient')}
              className="bg-orange-100 text-orange-600 hover:bg-orange-200 flex items-center gap-2 whitespace-nowrap"
            >
              <Calendar className="h-4 w-4" />
              Book Appointment
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-card">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 space-y-2">
            {navigationItems.map((item) => (
              <button
                key={item.label}
                onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                className="w-full text-left px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg flex items-center justify-between"
              >
                {item.label}
                {item.label !== 'International Section' && (
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      openDropdown === item.label ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-transparent"
              onClick={() => {
                onLoginClick('patient');
                setMobileMenuOpen(false);
              }}
            >
              Patient Login
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-transparent"
              onClick={() => {
                onLoginClick('doctor');
                setMobileMenuOpen(false);
              }}
            >
              Doctor Login
            </Button>
            <Button
              size="sm"
              className="w-full"
              onClick={() => {
                onLoginClick('admin');
                setMobileMenuOpen(false);
              }}
            >
              Admin
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
