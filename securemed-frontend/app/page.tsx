'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth-context';
import Header from '@/components/layout/header';
import LandingPage from '@/components/landing-page';
import LoginModal from '@/components/auth/login-modal';
import PatientPortal from '@/components/portals/patient-portal';
import DoctorPortal from '@/components/portals/doctor-portal';
import AdminPortal from '@/components/portals/admin-portal';
import LabTechnicianPortal from '@/components/portals/lab-technician-portal';
import RoleGuard from '@/components/auth/role-guard';

export default function Home() {
  const { user, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginRole, setLoginRole] = useState<'patient' | 'doctor' | 'admin'>('patient');
  const searchParams = useSearchParams();

  useEffect(() => {
    const message = searchParams.get('message');
    if (message) {
      toast.info(message);
    }
  }, [searchParams]);

  const handleOpenLogin = (role?: 'patient' | 'doctor' | 'admin') => {
    if (role) setLoginRole(role);
    setShowLoginModal(true);
  };

  const handleLogout = () => {
    logout();
  };

  // Determine which portal to show based on authenticated user's role
  const userRole = user?.role;

  // Show patient portal
  if (userRole === 'patient') {
    return (
      <RoleGuard allowedRoles={['patient']}>
        <PatientPortal
          onLogout={handleLogout}
          onSwitchRole={() => { }}
        />
      </RoleGuard>
    );
  }

  // Show doctor/provider portal
  if (userRole === 'doctor' || userRole === 'provider') {
    return (
      <RoleGuard allowedRoles={['doctor', 'provider']}>
        <DoctorPortal
          onLogout={handleLogout}
          onSwitchRole={() => { }}
        />
      </RoleGuard>
    );
  }

  // Show admin portal
  if (userRole === 'admin') {
    return (
      <RoleGuard allowedRoles={['admin']}>
        <AdminPortal
          onLogout={handleLogout}
          onSwitchRole={() => { }}
        />
      </RoleGuard>
    );
  }

  // Show lab technician portal
  if (userRole === 'lab_technician') {
    return (
      <RoleGuard allowedRoles={['lab_technician']}>
        <LabTechnicianPortal
          onLogout={handleLogout}
          onSwitchRole={() => { }}
        />
      </RoleGuard>
    );
  }

  // Show landing page (no user authenticated)
  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={handleOpenLogin} />
      <LandingPage onGetStarted={handleOpenLogin} />
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
}

