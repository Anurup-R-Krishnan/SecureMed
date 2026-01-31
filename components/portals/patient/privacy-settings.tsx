'use client';

import { useState, useEffect } from 'react';
import { Shield, Lock, AlertTriangle, Trash2, Calendar, Clock } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import MfaSetup from '@/components/auth/mfa-setup';
import { useAuth } from '@/context/auth-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Consent {
  id: number;
  patient_username: string;
  department: string;
  description: string;
  is_granted: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  history: Array<{
    id: number;
    action: string;
    timestamp: string;
    actor_username: string;
  }>;
}

const API_BASE_URL = 'http://localhost:8000/api/consents';

const DURATION_OPTIONS = [
  { label: '24 Hours', value: '24h', hours: 24 },
  { label: '7 Days', value: '7d', hours: 24 * 7 },
  { label: '30 Days', value: '30d', hours: 24 * 30 },
];

export default function PrivacySettings() {
  const { tokens } = useAuth();
  const [departments, setDepartments] = useState<Consent[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Duration dialog state
  const [showDurationDialog, setShowDurationDialog] = useState(false);
  const [selectedConsent, setSelectedConsent] = useState<Consent | null>(null);
  const [accessType, setAccessType] = useState<'permanent' | 'temporary'>('permanent');
  const [selectedDuration, setSelectedDuration] = useState<string>('24h');

  useEffect(() => {
    fetchConsents();
  }, []);

  const getAuthHeaders = () => {
    if (tokens?.access) {
      return {
        'Authorization': `Bearer ${tokens.access}`,
        'Content-Type': 'application/json',
      };
    }
    return {};
  };

  const fetchConsents = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get<Consent[]>(API_BASE_URL, {
        headers: getAuthHeaders(),
      });
      
      // Ensure we have an array
      if (Array.isArray(response.data)) {
        setDepartments(response.data);
      } else if (response.data && typeof response.data === 'object') {
        // Backend might return empty object for no data
        console.log('No consent records found, API returned:', response.data);
        setDepartments([]);
      } else {
        console.error('API returned unexpected data format:', response.data);
        setDepartments([]);
      }
    } catch (error: any) {
      console.error('Error fetching consents:', error);
      
      // Ensure departments stays as an array even on error
      setDepartments([]);
      
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
      } else if (error.response?.status === 404) {
        // No consents found - this is OK
        console.log('No consent records found (404)');
      } else {
        toast.error('Failed to load consent settings');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const calculateExpiryDate = (duration: string): string => {
    const option = DURATION_OPTIONS.find((opt) => opt.value === duration);
    if (!option) return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    const futureDate = new Date(Date.now() + option.hours * 60 * 60 * 1000);
    return futureDate.toISOString();
  };

  const formatExpiryDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) return 'Expired';
    if (diffHours < 24) return `${diffHours}h left`;
    if (diffDays < 30) return `${diffDays}d left`;
    
    return date.toLocaleDateString();
  };

  const toggleDepartmentAccess = (id: number) => {
    const consent = departments.find((dept) => dept.id === id);
    if (!consent) return;

    // If turning OFF, revoke immediately
    if (consent.is_granted) {
      revokeAccess(id);
    } else {
      // If turning ON, show duration dialog
      setSelectedConsent(consent);
      setAccessType('permanent');
      setSelectedDuration('24h');
      setShowDurationDialog(true);
    }
  };

  const revokeAccess = async (id: number) => {
    const consent = departments.find((dept) => dept.id === id);
    if (!consent) return;

    // Optimistic UI update
    setDepartments(
      departments.map((dept) =>
        dept.id === id ? { ...dept, is_granted: false, expires_at: null } : dept
      )
    );

    try {
      await axios.patch(
        `${API_BASE_URL}/${id}/`,
        { is_granted: false },
        { headers: getAuthHeaders() }
      );

      toast.success(`Access for ${consent.department} revoked`);
    } catch (error) {
      console.error('Error revoking consent:', error);
      
      // Revert on error
      setDepartments(
        departments.map((dept) =>
          dept.id === id ? consent : dept
        )
      );

      toast.error(`Failed to revoke access for ${consent.department}`);
    }
  };

  const grantAccess = async () => {
    if (!selectedConsent) return;

    const expiresAt = accessType === 'temporary' 
      ? calculateExpiryDate(selectedDuration) 
      : null;

    // Optimistic UI update
    setDepartments(
      departments.map((dept) =>
        dept.id === selectedConsent.id 
          ? { ...dept, is_granted: true, expires_at: expiresAt } 
          : dept
      )
    );

    // Close dialog
    setShowDurationDialog(false);

    try {
      await axios.patch(
        `${API_BASE_URL}/${selectedConsent.id}/`,
        { 
          is_granted: true,
          expires_at: expiresAt
        },
        { headers: getAuthHeaders() }
      );

      toast.success(
        `Access for ${selectedConsent.department} granted${
          accessType === 'temporary' ? ' temporarily' : ''
        }`
      );
    } catch (error) {
      console.error('Error granting consent:', error);
      
      // Revert on error
      setDepartments(
        departments.map((dept) =>
          dept.id === selectedConsent.id ? selectedConsent : dept
        )
      );

      toast.error(`Failed to grant access for ${selectedConsent.department}`);
    }
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
          {isLoading ? (
            // Loading skeleton
            <>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-full max-w-xs" />
                  </div>
                  <Skeleton className="h-8 w-14 rounded-full" />
                </div>
              ))}
            </>
          ) : departments.length === 0 ? (
            // Empty state
            <div className="text-center py-8 text-muted-foreground">
              No consent records found. Please contact support.
            </div>
          ) : (
            // Consent list
            departments.map((dept) => (
              <div
                key={dept.id}
                className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{dept.department}</h3>
                    {dept.is_granted && dept.expires_at && (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Expires: {formatExpiryDate(dept.expires_at)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{dept.description}</p>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={() => toggleDepartmentAccess(dept.id)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    dept.is_granted ? 'bg-accent' : 'bg-muted'
                  }`}
                  aria-label={`Toggle access for ${dept.department}`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      dept.is_granted ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-accent" />
          Security Settings
        </h2>
        <MfaSetup />
      </div>

      {/* Duration Dialog */}
      <Dialog open={showDurationDialog} onOpenChange={setShowDurationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-accent" />
              Grant Access Duration
            </DialogTitle>
            <DialogDescription>
              Choose how long {selectedConsent?.department} can access your medical records.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <RadioGroup value={accessType} onValueChange={(val) => setAccessType(val as 'permanent' | 'temporary')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="permanent" id="permanent" />
                <Label htmlFor="permanent" className="flex-1 cursor-pointer">
                  <div className="font-medium">Permanent Access</div>
                  <div className="text-sm text-muted-foreground">
                    Access remains until you revoke it manually
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="temporary" id="temporary" />
                <Label htmlFor="temporary" className="flex-1 cursor-pointer">
                  <div className="font-medium">Temporary Access</div>
                  <div className="text-sm text-muted-foreground">
                    Access expires automatically after selected duration
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {accessType === 'temporary' && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="duration">Duration</Label>
                <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                  <SelectTrigger id="duration">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDurationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={grantAccess}>
              Grant Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
