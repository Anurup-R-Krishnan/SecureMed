'use client';

import { useState } from 'react';
import Header from '@/components/layout/header';
import LandingPage from '@/components/landing-page';
import LoginModal from '@/components/auth/login-modal';
import PatientPortal from '@/components/portals/enhanced-patient-portal';
import DoctorPortal from '@/components/portals/enhanced-doctor-portal';
import AdminPortal from '@/components/portals/admin-portal';

type UserRole = 'patient' | 'doctor' | 'admin' | null;

export default function Home() {
  const [currentUser, setCurrentUser] = useState<UserRole>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginRole, setLoginRole] = useState<'patient' | 'doctor' | 'admin'>('patient');

  const handleOpenLogin = (role?: 'patient' | 'doctor' | 'admin') => {
    if (role) setLoginRole(role);
    setShowLoginModal(true);
  };

  const handleLoginSubmit = () => {
    setCurrentUser(loginRole);
    if (loginRole === 'doctor') {
      setCurrentUserData({ id: '1', name: 'Dr. Sarah Smith' });
    } else if (loginRole === 'patient') {
      setCurrentUserData({ id: '1', name: 'John Doe' });
    }
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentUserData(null);
  };

  const handleSwitchRole = (role: UserRole) => {
    setCurrentUser(role);
    if (role === 'doctor') {
      setCurrentUserData({ id: '1', name: 'Dr. Sarah Smith' });
    } else if (role === 'patient') {
      setCurrentUserData({ id: 'pat-1', name: 'John Doe' });
    }
  };

  // Show patient portal
  if (currentUser === 'patient') {
    return (
      <PatientPortal
        onLogout={handleLogout}
        onSwitchRole={handleSwitchRole}
        patientId={currentUserData?.id}
        patientName={currentUserData?.name}
      />
    );
  }

  // Show doctor portal
  if (currentUser === 'doctor') {
    return (
      <DoctorPortal
        onLogout={handleLogout}
        onSwitchRole={handleSwitchRole}
        doctorId={currentUserData?.id}
        doctorName={currentUserData?.name}
      />
    );
  }

  // Show admin portal
  if (currentUser === 'admin') {
    return (
      <AdminPortal
        onLogout={handleLogout}
        onSwitchRole={handleSwitchRole}
      />
    );
  }

  // Show landing page
  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={handleOpenLogin} />
      <LandingPage onGetStarted={handleOpenLogin} />
      <LoginModal
        isOpen={showLoginModal}
        role={loginRole}
        onClose={() => setShowLoginModal(false)}
        onSubmit={handleLoginSubmit}
        onChangeRole={setLoginRole}
      />
    </div>
  );
}
