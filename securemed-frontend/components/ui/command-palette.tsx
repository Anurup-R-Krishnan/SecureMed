'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
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
    FileText
} from 'lucide-react';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from '@/components/ui/command';

import { useAuth } from '@/context/auth-context';
import { appointmentService, Doctor } from '@/services/appointments';

export function CommandPalette() {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const [results, setResults] = React.useState<Doctor[]>([]);
    const [loading, setLoading] = React.useState(false);
    const router = useRouter();
    const { user } = useAuth();

    // Debounced search for doctors
    React.useEffect(() => {
        if (!query || query.length < 2 || user?.role !== 'patient') {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const docs = await appointmentService.getDoctors(undefined, query);
                setResults(docs);
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, user?.role]);

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false);
        command();
    }, []);

    if (!user) return null;

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput 
                placeholder="Type a command or search for doctors..." 
                value={query}
                onValueChange={setQuery}
            />
            <CommandList>
                {loading && <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">Searching...</div>}
                <CommandEmpty>No results found.</CommandEmpty>

                <CommandGroup heading="Suggestions">
                    <CommandItem onSelect={() => runCommand(() => router.push(`/${user.role}/dashboard`))}>
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                    </CommandItem>
                    
                    {user.role === 'doctor' && (
                        <>
                            <CommandItem onSelect={() => runCommand(() => router.push('/doctor/patients'))}>
                                <User className="mr-2 h-4 w-4" />
                                <span>My Patients</span>
                            </CommandItem>
                            <CommandItem onSelect={() => runCommand(() => router.push('/doctor/labs'))}>
                                <FlaskConical className="mr-2 h-4 w-4" />
                                <span>Lab Results</span>
                            </CommandItem>
                        </>
                    )}

                    {user.role === 'patient' && (
                        <>
                            <CommandItem onSelect={() => runCommand(() => router.push('/patient/appointments'))}>
                                <Calendar className="mr-2 h-4 w-4" />
                                <span>My Appointments</span>
                            </CommandItem>
                            <CommandItem onSelect={() => runCommand(() => router.push('/patient/records'))}>
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
                                    onSelect={() => runCommand(() => router.push(`/patient/appointments?doctorId=${doc.id}`))}
                                >
                                    <User className="mr-2 h-4 w-4 text-primary" />
                                    <div className="flex flex-col text-left">
                                        <span className="font-medium">Dr. {doc.name}</span>
                                        <span className="text-[10px] text-muted-foreground capitalize">{doc.specialization}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </>
                )}

                {user.role === 'doctor' && (
                    <>
                        <CommandGroup heading="Quick Access">
                            <CommandItem onSelect={() => runCommand(() => router.push('/doctor/triage-inbox'))}>
                                <User className="mr-2 h-4 w-4" />
                                <span>Admit New Patient</span>
                            </CommandItem>
                            <CommandItem onSelect={() => runCommand(() => router.push('/doctor/records?new=1&type=imaging'))}>
                                <FileText className="mr-2 h-4 w-4" />
                                <span>Order Radiology Scan</span>
                            </CommandItem>
                            <CommandItem onSelect={() => runCommand(() => router.push('/doctor/messaging'))}>
                                <AlertCircle className="mr-2 h-4 w-4" />
                                <span>Page On-Call Specialist</span>
                            </CommandItem>
                        </CommandGroup>

                        <CommandSeparator />

                        <CommandGroup heading="Actions">
                            <CommandItem onSelect={() => runCommand(() => router.push('/doctor/prescriptions'))}>
                                <FileText className="mr-2 h-4 w-4" />
                                <span>New Prescription</span>
                                <CommandShortcut>⌘N</CommandShortcut>
                            </CommandItem>
                            <CommandItem onSelect={() => runCommand(() => router.push('/doctor/labs'))}>
                                <TestTube className="mr-2 h-4 w-4" />
                                <span>New Lab Order</span>
                            </CommandItem>
                        </CommandGroup>

                        <CommandSeparator />

                        <CommandGroup heading="Emergency">
                            <CommandItem
                                onSelect={() => runCommand(() => router.push('/emergency'))}
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
                
                {user.role === 'patient' && (
                    <>
                        <CommandGroup heading="Quick Actions">
                            <CommandItem onSelect={() => runCommand(() => router.push('/patient/appointments'))}>
                                <Calendar className="mr-2 h-4 w-4" />
                                <span>Schedule Appointment</span>
                            </CommandItem>
                            <CommandItem onSelect={() => runCommand(() => router.push('/patient/billing'))}>
                                <CreditCard className="mr-2 h-4 w-4" />
                                <span>Pay Outstanding Bill</span>
                            </CommandItem>
                        </CommandGroup>

                        <CommandSeparator />
                    </>
                )}

                <CommandGroup heading="Settings">
                    <CommandItem onSelect={() => runCommand(() => router.push(`/${user.role}/settings`))}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
