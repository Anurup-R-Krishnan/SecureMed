'use client';

import React from "react"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
  Pill,
  IndianRupee,
} from 'lucide-react';

type AdminTab = 'dashboard' | 'hospitals' | 'staff' | 'patients' | 'billing';

interface AdminPortalProps {
  onLogout: () => void;
  onSwitchRole: (role: 'patient' | 'doctor' | 'admin' | null) => void;
}

const hospitalData = [
  { id: 1, name: 'Fortis Delhi', location: 'Aravali, Delhi', beds: 350, occupancy: '78%', doctors: 45 },
  { id: 2, name: 'Fortis Mumbai', location: 'Mulund, Mumbai', beds: 400, occupancy: '82%', doctors: 52 },
  { id: 3, name: 'Fortis Bangalore', location: 'Whitefield, Bangalore', beds: 300, occupancy: '71%', doctors: 38 },
  { id: 4, name: 'Fortis Chennai', location: 'Nungambakkam, Chennai', beds: 250, occupancy: '65%', doctors: 32 },
];

const staffData = [
  { id: 1, name: 'Dr. Amit Patel', role: 'Cardiologist', hospital: 'Fortis Delhi', status: 'Active' },
  { id: 2, name: 'Dr. Sarah Johnson', role: 'Neurologist', hospital: 'Fortis Mumbai', status: 'Active' },
  { id: 3, name: 'Dr. Rajesh Kumar', role: 'Orthopedist', hospital: 'Fortis Bangalore', status: 'Active' },
  { id: 4, name: 'Nurse Priya Singh', role: 'Senior Nurse', hospital: 'Fortis Delhi', status: 'On Leave' },
];

export default function AdminPortal({ onLogout, onSwitchRole }: AdminPortalProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="h-5 w-5" /> },
    { id: 'hospitals', label: 'Hospitals', icon: <Building2 className="h-5 w-5" /> },
    { id: 'staff', label: 'Staff', icon: <Users className="h-5 w-5" /> },
    { id: 'patients', label: 'Patients', icon: <Users className="h-5 w-5" /> },
    { id: 'billing', label: 'Billing', icon: <DollarSign className="h-5 w-5" /> },
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
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground">
              {tabs.find((t) => t.id === activeTab)?.label}
            </h2>
            <p className="text-muted-foreground mt-1">Manage hospital operations and resources</p>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-card p-6 rounded-lg border border-border">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Total Patients</p>
                        <p className="text-3xl font-bold text-foreground mt-2">12,450</p>
                      </div>
                      <Users className="h-8 w-8 text-primary opacity-20" />
                    </div>
                  </div>
                  <div className="bg-card p-6 rounded-lg border border-border">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Hospital Occupancy</p>
                        <p className="text-3xl font-bold text-primary mt-2">74%</p>
                      </div>
                      <Activity className="h-8 w-8 text-primary opacity-20" />
                    </div>
                  </div>
                  <div className="bg-card p-6 rounded-lg border border-border">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Total Revenue</p>
                        <p className="text-3xl font-bold text-primary mt-2 flex items-center"><IndianRupee className="h-8 w-8 mr-1 p-1" />28.5L</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-primary opacity-20" />
                    </div>
                  </div>
                  <div className="bg-card p-6 rounded-lg border border-border">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Active Doctors</p>
                        <p className="text-3xl font-bold text-primary mt-2">167</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-primary opacity-20" />
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-card p-6 rounded-lg border border-border">
                  <h3 className="text-xl font-bold text-foreground mb-6">System Alerts</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-4 p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-foreground">High Occupancy - Fortis Mumbai</p>
                        <p className="text-sm text-muted-foreground">Occupancy at 82%, consider adding capacity</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 border border-blue-200 bg-blue-50 rounded-lg">
                      <Activity className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-foreground">Staff Performance Report Available</p>
                        <p className="text-sm text-muted-foreground">Monthly staff performance review ready for review</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'hospitals' && (
              <div className="space-y-4">
                <Button className="mb-4">Add Hospital</Button>
                <div className="bg-card rounded-lg border border-border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Hospital Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Location</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Beds</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Occupancy</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Doctors</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hospitalData.map((hospital) => (
                        <tr key={hospital.id} className="border-b border-border hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium text-foreground">{hospital.name}</td>
                          <td className="py-3 px-4 text-muted-foreground">{hospital.location}</td>
                          <td className="py-3 px-4 text-foreground">{hospital.beds}</td>
                          <td className="py-3 px-4">
                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                              {hospital.occupancy}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-foreground">{hospital.doctors}</td>
                          <td className="py-3 px-4">
                            <Button variant="ghost" size="sm">Edit</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'staff' && (
              <div className="space-y-4">
                <Button className="mb-4">Add Staff Member</Button>
                <div className="bg-card rounded-lg border border-border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Role</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Hospital</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffData.map((staff) => (
                        <tr key={staff.id} className="border-b border-border hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium text-foreground">{staff.name}</td>
                          <td className="py-3 px-4 text-muted-foreground">{staff.role}</td>
                          <td className="py-3 px-4 text-muted-foreground">{staff.hospital}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded-full ${staff.status === 'Active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                                }`}
                            >
                              {staff.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Button variant="ghost" size="sm">Edit</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'patients' && (
              <div className="bg-card p-6 rounded-lg border border-border text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-foreground font-semibold mb-2">Patient Management</p>
                <p className="text-muted-foreground mb-6">View and manage all patient records</p>
                <Button>View All Patients</Button>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="bg-card p-6 rounded-lg border border-border text-center">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-foreground font-semibold mb-2">Billing Management</p>
                <p className="text-muted-foreground mb-6">Manage invoices and payments</p>
                <Button>View Billing Reports</Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
