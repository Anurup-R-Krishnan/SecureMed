'use client';

import { useState } from 'react';
import { Shield, Lock, AlertTriangle, Trash2 } from 'lucide-react';

interface Department {
  id: string;
  name: string;
  description: string;
  access: boolean;
}

const initialDepartments: Department[] = [
  { id: '1', name: 'Radiology', description: 'X-rays, CT scans, and imaging', access: true },
  {
    id: '2',
    name: 'Oncology',
    description: 'Cancer treatment and monitoring',
    access: true,
  },
  {
    id: '3',
    name: 'Cardiology',
    description: 'Heart and cardiovascular health',
    access: false,
  },
  {
    id: '4',
    name: 'Neurology',
    description: 'Brain and nervous system',
    access: true,
  },
  { id: '5', name: 'Orthopedics', description: 'Bones and joints', access: false },
  { id: '6', name: 'Dermatology', description: 'Skin health', access: true },
];

export default function PrivacySettings() {
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const toggleDepartmentAccess = (id: string) => {
    setDepartments(
      departments.map((dept) =>
        dept.id === id ? { ...dept, access: !dept.access } : dept
      )
    );
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-foreground mb-2">Privacy & Consent</h1>
      <p className="text-muted-foreground mb-8">
        Control which departments and providers can access your health data
      </p>

      {/* Data Access Permissions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-accent" />
          Department Access
        </h2>

        <div className="space-y-3">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
            >
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{dept.name}</h3>
                <p className="text-sm text-muted-foreground">{dept.description}</p>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={() => toggleDepartmentAccess(dept.id)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  dept.access ? 'bg-accent' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    dept.access ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Log */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-accent" />
          Access Log
        </h2>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-4 gap-4 border-b border-border bg-muted p-4">
            <div className="font-semibold text-foreground text-sm">Date</div>
            <div className="font-semibold text-foreground text-sm">Provider</div>
            <div className="font-semibold text-foreground text-sm">Department</div>
            <div className="font-semibold text-foreground text-sm">Action</div>
          </div>

          <div className="divide-y divide-border">
            {[
              {
                date: '2025-01-25 14:30',
                provider: 'Dr. Sarah Johnson',
                department: 'Cardiology',
                action: 'Viewed Records',
              },
              {
                date: '2025-01-24 10:15',
                provider: 'Dr. Michael Chen',
                department: 'Neurology',
                action: 'Viewed Records',
              },
              {
                date: '2025-01-23 16:45',
                provider: 'Dr. Emily Rodriguez',
                department: 'Orthopedics',
                action: 'Viewed Records',
              },
            ].map((log, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-4 p-4">
                <div className="text-sm text-muted-foreground">{log.date}</div>
                <div className="text-sm font-medium text-foreground">{log.provider}</div>
                <div className="text-sm text-muted-foreground">{log.department}</div>
                <div className="text-sm text-accent">{log.action}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-lg border-2 border-destructive bg-destructive/5 p-6">
        <h2 className="text-lg font-semibold text-destructive mb-2 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Danger Zone
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          These actions cannot be undone. Please proceed with caution.
        </p>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-2 rounded-lg bg-destructive px-6 py-2.5 font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Request Account Deletion
        </button>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 z-50">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-8 shadow-xl">
            <h2 className="text-xl font-bold text-foreground mb-2">Delete Account</h2>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to request account deletion? This action cannot be undone. Your
              data will be securely deleted within 30 days.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  // Handle deletion
                }}
                className="w-full rounded-lg bg-destructive px-4 py-2 font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                Confirm Deletion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
