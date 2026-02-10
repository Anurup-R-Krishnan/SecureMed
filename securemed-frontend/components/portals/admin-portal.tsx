'use client';

import React, { useState, useEffect } from "react";
import ClinicalAnalytics from '@/components/portals/admin/dashboard/clinical-analytics';
import HospitalManager from '@/components/portals/admin/hospitals/hospital-manager';
import StaffManager from '@/components/portals/admin/staff/staff-manager';
import PatientManager from '@/components/portals/admin/patients/patient-manager';
import AuditLogViewer from '@/components/portals/admin/security/audit-log-viewer';
import { Button } from '@/components/ui/button';
import { adminService, Hospital, StaffMember, DashboardStats, SystemAlert } from '@/services/admin';
import InsuranceVerification from './admin/billing/insurance-verification';
import {
  BarChart3,
  Users,
  Building2,
  LogOut,
  Menu,
  X,
  TrendingUp,
  Activity,
  DollarSign,
  AlertCircle,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { NotificationCenter } from '@/components/ui/notification-center';

type AdminTab = 'dashboard' | 'analytics' | 'hospitals' | 'staff' | 'patients' | 'billing' | 'audit-logs';

interface AdminPortalProps {
  onLogout: () => void;
  onSwitchRole: (role: 'patient' | 'doctor' | 'admin' | null) => void;
  currentTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;
}

export default function AdminPortal({ onLogout, onSwitchRole, currentTab, onTabChange }: AdminPortalProps) {
  const [activeTab, setActiveTabState] = useState<AdminTab>(currentTab || 'dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Sync tab with URL when currentTab prop changes
  useEffect(() => {
    if (currentTab && currentTab !== activeTab) {
      setActiveTabState(currentTab);
    }
  }, [currentTab]);

  // Wrapper that updates both local state and notifies parent for URL update
  const setActiveTab = (tab: AdminTab) => {
    setActiveTabState(tab);
    onTabChange?.(tab);
  };
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [hospitalsData, staffData, statsData, patientsData, alertsData] = await Promise.all([
          adminService.getHospitals(),
          adminService.getStaff(),
          adminService.getDashboardStats(),
          adminService.getPatients(),
          adminService.getAlerts(),
        ]);
        setHospitals(hospitalsData);
        setStaff(staffData);
        setPatients(patientsData);
        setStats(statsData);
        setAlerts(alertsData);
      } catch (error) {
        console.error('Error fetching admin data:', error);
        setLoadError('Failed to load admin data from backend.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="h-5 w-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <Activity className="h-5 w-5" /> },
    { id: 'hospitals', label: 'Hospitals', icon: <Building2 className="h-5 w-5" /> },
    { id: 'staff', label: 'Staff', icon: <Users className="h-5 w-5" /> },
    { id: 'patients', label: 'Patients', icon: <Users className="h-5 w-5" /> },
    { id: 'billing', label: 'Billing', icon: <DollarSign className="h-5 w-5" /> },
    { id: 'audit-logs', label: 'Audit Logs', icon: <ShieldAlert className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-40 md:hidden p-2 bg-card border border-border rounded-lg"
      >
        {sidebarOpen ? (
          <X className="h-6 w-6 text-foreground" />
        ) : (
          <Menu className="h-6 w-6 text-foreground" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-2xl font-bold text-sidebar-primary">Fortis Admin</h1>
          <p className="text-sm text-sidebar-foreground/70 mt-1">Administration Panel</p>
        </div>

        {/* Admin Info */}
        <div className="px-6 py-4 border-b border-sidebar-border">
          <p className="text-sm text-sidebar-foreground/70">System Administrator</p>
          <p className="font-semibold text-sidebar-primary">Admin User</p>
          <p className="text-xs text-sidebar-foreground/60">Super Admin</p>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === tab.id
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/10'
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border space-y-2">
          <button
            onClick={() => onSwitchRole(null)}
            className="w-full px-4 py-2 rounded-lg border border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/10 text-sm font-medium transition-colors"
          >
            Back to Home
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 font-medium transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 min-h-screen">
        {/* Top Bar */}
        <div className="bg-card border-b border-border p-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {tabs.find((t) => t.id === activeTab)?.label}
              </h2>
              <p className="text-muted-foreground mt-1">Manage hospital operations and resources</p>
            </div>
            <NotificationCenter />
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {loadError && (
              <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {loadError}
              </div>
            )}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-card p-6 rounded-lg border border-border">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Total Patients</p>
                        <p className="text-3xl font-bold text-foreground mt-2">
                          {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (stats?.totalPatients?.toLocaleString() || '—')}
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-primary opacity-20" />
                    </div>
                  </div>
                  <div className="bg-card p-6 rounded-lg border border-border">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Hospital Occupancy</p>
                        <p className="text-3xl font-bold text-primary mt-2">
                          {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (stats?.hospitalOccupancy || '—')}
                        </p>
                      </div>
                      <Activity className="h-8 w-8 text-primary opacity-20" />
                    </div>
                  </div>
                  <div className="bg-card p-6 rounded-lg border border-border">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Total Revenue</p>
                        <p className="text-3xl font-bold text-primary mt-2">
                          {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (stats?.totalRevenue || '—')}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-primary opacity-20" />
                    </div>
                  </div>
                  <div className="bg-card p-6 rounded-lg border border-border">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Active Doctors</p>
                        <p className="text-3xl font-bold text-primary mt-2">
                          {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (stats?.activeDoctors || '0')}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-primary opacity-20" />
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-card p-6 rounded-lg border border-border">
                  <h3 className="text-xl font-bold text-foreground mb-6">System Alerts</h3>
                  <div className="space-y-3">
                    {alerts.length > 0 ? (
                      alerts.map((alert) => (
                        <div key={alert.id} className={`flex items-start gap-4 p-4 border rounded-lg ${alert.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                          alert.type === 'error' ? 'border-red-200 bg-red-50' :
                            alert.type === 'success' ? 'border-green-200 bg-green-50' :
                              'border-blue-200 bg-blue-50'
                          }`}>
                          {alert.type === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />}
                          {alert.type === 'error' && <ShieldAlert className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />}
                          {alert.type === 'success' && <Activity className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />}
                          {alert.type === 'info' && <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />}
                          <div>
                            <p className="font-semibold text-foreground">{alert.title}</p>
                            <p className="text-sm text-muted-foreground">{alert.message}</p>
                            <p className="text-xs text-muted-foreground mt-1 opacity-70">{new Date(alert.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No system alerts at this time.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <ClinicalAnalytics />
            )}

            {activeTab === 'hospitals' && (
              <HospitalManager hospitals={hospitals} />
            )}

            {activeTab === 'staff' && (
              <StaffManager
                staff={staff}
                onCreateUser={async (payload) => {
                  await adminService.createUser(payload);
                  const staffData = await adminService.getStaff();
                  setStaff(staffData);
                }}
              />
            )}

            {activeTab === 'patients' && (
              <PatientManager patients={patients} />
            )}

            {activeTab === 'billing' && (
              <InsuranceVerification />
            )}

            {activeTab === 'audit-logs' && (
              <AuditLogViewer />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
