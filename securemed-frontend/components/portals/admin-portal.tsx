'use client';

import React, { useState, useEffect } from "react";
import ClinicalAnalytics from '@/components/portals/admin/dashboard/clinical-analytics';
import HospitalManager from '@/components/portals/admin/hospitals/hospital-manager';
import StaffManager from '@/components/portals/admin/staff/staff-manager';
import PatientManager from '@/components/portals/admin/patients/patient-manager';
import AuditLogViewer from '@/components/portals/admin/security/audit-log-viewer';
import InfectionTrackingPortal, { type InfectionTrackingCacheData } from '@/components/portals/admin/infection-tracking/infection-tracking-portal';
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

type AdminTab = 'dashboard' | 'analytics' | 'hospitals' | 'staff' | 'patients' | 'billing' | 'infection-tracking' | 'audit-logs';

interface AdminPortalProps {
  onLogout: () => void;
  onSwitchRole: (role: 'patient' | 'doctor' | 'admin' | null) => void;
  currentTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;
}

export default function AdminPortal({ onLogout, onSwitchRole, currentTab, onTabChange }: AdminPortalProps) {
  const [activeTab, setActiveTabState] = useState<AdminTab>(currentTab || 'dashboard');

  // Sync tab with URL when currentTab prop changes
  useEffect(() => {
    if (currentTab && currentTab !== activeTab) {
      setActiveTabState(currentTab);
    }
  }, [currentTab, activeTab]);

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [infectionTrackingCache, setInfectionTrackingCache] = useState<InfectionTrackingCacheData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Lazy-load tab data only when needed to reduce network + render pressure.
  useEffect(() => {
    const fetchTabData = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        if (activeTab === 'dashboard') {
          const [statsData, alertsData] = await Promise.all([
            adminService.getDashboardStats(),
            adminService.getAlerts(),
          ]);
          setStats(statsData);
          setAlerts(alertsData);
        } else if (activeTab === 'hospitals') {
          setHospitals(await adminService.getHospitals());
        } else if (activeTab === 'staff') {
          setStaff(await adminService.getStaff());
        } else if (activeTab === 'patients') {
          setPatients(await adminService.getPatients());
        }
      } catch (error) {
        console.error('Error fetching admin data:', error);
        setLoadError('Failed to load admin data from backend.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTabData();
  }, [activeTab]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-card p-6 rounded-[24px] border border-border/60 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center gap-5">
          <div className="bg-primary/10 p-4 rounded-2xl ring-1 ring-primary/20">
            <ShieldAlert className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight capitalize text-foreground">{activeTab.replace('-', ' ')}</h2>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
              Hospital Administration Suite
            </p>
          </div>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
          <NotificationCenter />
        </div>
      </div>

      {loadError && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      {/* Tab Content */}
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

      {activeTab === 'analytics' && <ClinicalAnalytics />}
      {activeTab === 'hospitals' && (
        <HospitalManager
          hospitals={hospitals}
          onCreateHospital={async (payload) => {
            await adminService.createHospital(payload);
            const updated = await adminService.getHospitals();
            setHospitals(updated);
          }}
          onUpdateHospital={async (id, payload) => {
            await adminService.updateHospital(id, payload);
            const updated = await adminService.getHospitals();
            setHospitals(updated);
          }}
        />
      )}
      {activeTab === 'staff' && (
        <StaffManager
          staff={staff}
          onCreateUser={async (payload) => {
            await adminService.createUser(payload);
            const staffData = await adminService.getStaff();
            setStaff(staffData);
          }}
          onRefresh={async () => {
            const staffData = await adminService.getStaff();
            setStaff(staffData);
          }}
        />
      )}
      {activeTab === 'patients' && <PatientManager patients={patients} />}
      {activeTab === 'billing' && <InsuranceVerification />}
      {activeTab === 'infection-tracking' && (
        <InfectionTrackingPortal
          isActive={activeTab === 'infection-tracking'}
          initialData={infectionTrackingCache}
          onDataLoaded={setInfectionTrackingCache}
        />
      )}
      {activeTab === 'audit-logs' && <AuditLogViewer />}
    </div>
  );
}
