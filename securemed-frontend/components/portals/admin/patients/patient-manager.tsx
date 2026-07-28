"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Patient, getColumns } from "./columns";
import { adminService } from "@/services/admin";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PatientManagerProps {
  patients: Patient[];
  onViewPatient?: (patientId: number) => void;
  onRefresh: () => Promise<void>;
  initialPatientId?: number | null;
}

export default function PatientManager({
  patients,
  onViewPatient,
  onRefresh,
  initialPatientId,
}: PatientManagerProps) {
  const { toast } = useToast();
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState<string | null>(null);
  const [autoOpened, setAutoOpened] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  React.useEffect(() => {
    if (autoOpened || !initialPatientId || patients.length === 0) {
      return;
    }
    const match = patients.find((p) => p.id === initialPatientId) || null;
    if (match) {
      setSelectedPatient(match);
      setDetailOpen(true);
    }
    setAutoOpened(true);
  }, [autoOpened, initialPatientId, patients]);

  const columns = getColumns({
    onViewPatient: (patientId) => {
      const match = patients.find((p) => p.id === patientId) || null;
      setSelectedPatient(match);
      setDetailOpen(true);
      if (onViewPatient) {
        onViewPatient(patientId);
      }
    },
    onResetPassword: async (patient) => {
      if (!patient.user_id) return;
      try {
        const response = await adminService.resetUserPassword(patient.user_id);
        setResetPassword(response?.temporary_password || null);
        setResetDialogOpen(true);
        toast({
          title: "Password reset",
          description: "Temporary password generated.",
        });
      } catch (e: any) {
        toast({
          title: "Reset failed",
          description: e?.response?.data?.error || "Could not reset password.",
          variant: "destructive",
        });
      } finally {
      }
    },
    onToggleActive: async (patient) => {
      if (!patient.user_id) return;
      try {
        if (patient.user_is_active === false) {
          await adminService.activateUser(patient.user_id);
          toast({
            title: "User activated",
            description: "Patient account reactivated.",
          });
        } else {
          await adminService.deactivateUser(patient.user_id);
          toast({
            title: "User deactivated",
            description: "Patient account deactivated.",
          });
        }
        await onRefresh();
      } catch (e: any) {
        toast({
          title: "Action failed",
          description:
            e?.response?.data?.error || "Could not update user status.",
          variant: "destructive",
        });
      } finally {
      }
    },
  });

  const filteredPatients = patients.filter((patient) => {
    if (!searchQuery.trim()) return true;
    const term = searchQuery.trim().toLowerCase();
    const fullName = [patient.user_first_name, patient.user_last_name]
      .filter(Boolean)
      .join(" ")
      .trim()
      .toLowerCase();
    return (
      fullName.includes(term) ||
      String(patient.patient_id || "")
        .toLowerCase()
        .includes(term) ||
      String(patient.id).toLowerCase().includes(term) ||
      String(patient.user_email || "")
        .toLowerCase()
        .includes(term) ||
      String(patient.phone || "")
        .toLowerCase()
        .includes(term)
    );
  });

  const handleExport = () => {
    if (!filteredPatients.length) {
      toast({
        title: "No data",
        description: "No patients available to export.",
        variant: "destructive",
      });
      return;
    }
    const header = ["Patient ID", "Name", "Email", "Phone", "DOB", "Active"];
    const rows = filteredPatients.map((patient) => [
      patient.patient_id || patient.id,
      [patient.user_first_name, patient.user_last_name]
        .filter(Boolean)
        .join(" ")
        .trim() || `Patient #${patient.id}`,
      patient.user_email || "",
      patient.phone || "",
      patient.date_of_birth || "",
      patient.user_is_active === false ? "No" : "Yes",
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `patient_registry_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-foreground">Patient Registry</h3>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          <Button variant="outline" onClick={handleExport}>
            Export Data
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border">
        <DataTable columns={columns} data={filteredPatients} keyExtractor={(p) => p.id} />
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Patient Details</DialogTitle>
            <DialogDescription>
              Quick snapshot for the selected patient.
            </DialogDescription>
          </DialogHeader>
          {selectedPatient ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Patient ID</span>
                <span className="font-mono">
                  {selectedPatient.patient_id || selectedPatient.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">
                  {[
                    selectedPatient.user_first_name,
                    selectedPatient.user_last_name,
                  ]
                    .filter(Boolean)
                    .join(" ")
                    .trim() || `Patient #${selectedPatient.id}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span>{selectedPatient.user_email || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{selectedPatient.phone || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">DOB</span>
                <span>{selectedPatient.date_of_birth || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active</span>
                <span>
                  {selectedPatient.user_is_active === false ? "No" : "Yes"}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No patient selected.
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Temporary Password</DialogTitle>
            <DialogDescription>
              Share this password with the patient securely.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-sm">
            {resetPassword || "Unable to generate password."}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
