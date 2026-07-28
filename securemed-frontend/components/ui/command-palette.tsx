"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
  Search,
  AlertCircle,
  FlaskConical,
  TestTube,
  FileText,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

import { useAuth } from "@/context/auth-context";
import { appointmentService, Doctor } from "@/services/appointments";
import { adminService } from "@/services/admin";
import { apiClient } from "@/lib/unified-api-client";

interface PatientResult {
  id: number;
  name: string;
  displayId?: string | null;
}

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<Doctor[]>([]);
  const [patientResults, setPatientResults] = React.useState<PatientResult[]>(
    [],
  );
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const placeholderText =
    user?.role === "patient"
      ? "Type a command or search for doctors..."
      : user?.role === "doctor" || user?.role === "admin"
        ? "Type a command or search for patients..."
        : "Type a command...";

  const settingsRoute = (() => {
    if (user?.role === "patient") return "/patient/settings";
    if (user?.role === "doctor") return "/doctor/settings";
    if (user?.role === "lab_technician") return "/lab/settings";
    if (user?.role === "pharmacist") return "/settings/security";
    if (user?.role === "admin") return "/settings/security";
    return "/settings/security";
  })();

  // Debounced search
  React.useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setPatientResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        if (user?.role === "patient") {
          const docs = await appointmentService.getDoctors(undefined, query);
          setResults(docs);
          setPatientResults([]);
        } else if (user?.role === "doctor") {
          const response = await apiClient.get("/medical-records/records/", {
            params: { search: query },
          });
          const rows = Array.isArray(response.data)
            ? response.data
            : response.data.results || [];
          const unique = new Map<number, PatientResult>();
          rows.forEach((row: any) => {
            if (row.patient && !unique.has(row.patient)) {
              unique.set(row.patient, {
                id: row.patient,
                name: row.patient_name || `Patient #${row.patient}`,
                displayId: row.patient_display_id,
              });
            }
          });
          setPatientResults(Array.from(unique.values()));
          setResults([]);
        } else if (user?.role === "admin") {
          const rows = await adminService.getPatients(query);
          const normalized = query.trim().toLowerCase();
          const matches = rows.filter((row: any) => {
            const name =
              `${row.user_first_name || ""} ${row.user_last_name || ""}`
                .trim()
                .toLowerCase();
            const patientId = (row.patient_id || "").toLowerCase();
            return name.includes(normalized) || patientId.includes(normalized);
          });
          setPatientResults(
            matches.slice(0, 15).map((row: any) => ({
              id: row.id,
              name:
                `${row.user_first_name || ""} ${row.user_last_name || ""}`.trim() ||
                `Patient #${row.id}`,
              displayId: row.patient_id,
            })),
          );
          setResults([]);
        } else {
          setResults([]);
          setPatientResults([]);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, user?.role]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  if (!user) return null;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder={placeholderText}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {loading && (
          <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">
            Searching...
          </div>
        )}
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Suggestions">
          <CommandItem
            onSelect={() =>
              runCommand(() => router.push(`/${user.role}/dashboard`))
            }
          >
            <Calendar className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>

          {user.role === "doctor" && (
            <>
              <CommandItem
                onSelect={() =>
                  runCommand(() => router.push("/doctor/patients"))
                }
              >
                <User className="mr-2 h-4 w-4" />
                <span>My Patients</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push("/doctor/labs"))}
              >
                <FlaskConical className="mr-2 h-4 w-4" />
                <span>Lab Results</span>
              </CommandItem>
            </>
          )}

          {user.role === "patient" && (
            <>
              <CommandItem
                onSelect={() =>
                  runCommand(() => router.push("/patient/appointments"))
                }
              >
                <Calendar className="mr-2 h-4 w-4" />
                <span>My Appointments</span>
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  runCommand(() => router.push("/patient/records"))
                }
              >
                <FileText className="mr-2 h-4 w-4" />
                <span>Medical Records</span>
              </CommandItem>
            </>
          )}
        </CommandGroup>

        {results.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Doctors">
              {results.map((doc: Doctor) => (
                <CommandItem
                  key={doc.id}
                  onSelect={() =>
                    runCommand(() =>
                      router.push(`/patient/appointments?doctorId=${doc.id}`),
                    )
                  }
                >
                  <User className="mr-2 h-4 w-4 text-primary" />
                  <div className="flex flex-col text-left">
                    <span className="font-medium">Dr. {doc.name}</span>
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {doc.specialization}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {patientResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Patients">
              {patientResults.map((patient) => (
                <CommandItem
                  key={patient.id}
                  onSelect={() =>
                    runCommand(() => {
                      if (user?.role === "admin") {
                        router.push(`/admin/patients?patientId=${patient.id}`);
                      } else {
                        router.push(`/doctor/patients/${patient.id}`);
                      }
                    })
                  }
                >
                  <User className="mr-2 h-4 w-4 text-primary" />
                  <div className="flex flex-col text-left">
                    <span className="font-medium">{patient.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {patient.displayId || `ID ${patient.id}`}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {user.role === "doctor" && (
          <>
            <CommandGroup heading="Quick Access">
              <CommandItem
                onSelect={() =>
                  runCommand(() => router.push("/doctor/triage-inbox"))
                }
              >
                <User className="mr-2 h-4 w-4" />
                <span>Admit New Patient</span>
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  runCommand(() =>
                    router.push("/doctor/records?new=1&type=imaging"),
                  )
                }
              >
                <FileText className="mr-2 h-4 w-4" />
                <span>Order Radiology Scan</span>
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  runCommand(() => router.push("/doctor/messaging"))
                }
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                <span>Page On-Call Specialist</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Actions">
              <CommandItem
                onSelect={() =>
                  runCommand(() => router.push("/doctor/prescriptions"))
                }
              >
                <FileText className="mr-2 h-4 w-4" />
                <span>New Prescription</span>
                <CommandShortcut>⌘N</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push("/doctor/labs"))}
              >
                <TestTube className="mr-2 h-4 w-4" />
                <span>New Lab Order</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Emergency">
              <CommandItem
                onSelect={() => runCommand(() => router.push("/emergency"))}
                className="text-red-600 aria-selected:bg-red-100 aria-selected:text-red-700"
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                <span>Trigger Trauma Mode</span>
                <CommandShortcut>⌘!</CommandShortcut>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />
          </>
        )}

        {user.role === "patient" && (
          <>
            <CommandGroup heading="Quick Actions">
              <CommandItem
                onSelect={() =>
                  runCommand(() => router.push("/patient/appointments"))
                }
              >
                <Calendar className="mr-2 h-4 w-4" />
                <span>Schedule Appointment</span>
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  runCommand(() => router.push("/patient/billing"))
                }
              >
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Pay Outstanding Bill</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Settings">
          <CommandItem
            onSelect={() => runCommand(() => router.push(settingsRoute))}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
