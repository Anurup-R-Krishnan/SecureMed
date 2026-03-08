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

export function CommandPalette() {
    const [open, setOpen] = React.useState(false);
    const router = useRouter();

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

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>

                <CommandGroup heading="Suggestions">
                    <CommandItem onSelect={() => runCommand(() => router.push('/doctor/dashboard'))}>
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push('/doctor/patients'))}>
                        <Smile className="mr-2 h-4 w-4" />
                        <span>My Patients</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push('/doctor/labs'))}>
                        <FlaskConical className="mr-2 h-4 w-4" />
                        <span>Lab Results</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Quick Access">
                    <CommandItem onSelect={() => runCommand(() => console.log('Admit Patient'))}>
                        <User className="mr-2 h-4 w-4" />
                        <span>Admit New Patient</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => console.log('Order Radiology'))}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Order Radiology Scan</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => console.log('Page On-Call'))}>
                        <AlertCircle className="mr-2 h-4 w-4" />
                        <span>Page On-Call Specialist</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Actions">
                    <CommandItem onSelect={() => runCommand(() => console.log('New Prescription'))}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>New Prescription</span>
                        <CommandShortcut>⌘N</CommandShortcut>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => console.log('New Lab Order'))}>
                        <TestTube className="mr-2 h-4 w-4" />
                        <span>New Lab Order</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Emergency">
                    <CommandItem
                        onSelect={() => runCommand(() => console.log('Emergency Mode'))}
                        className="text-red-600 aria-selected:bg-red-100 aria-selected:text-red-700"
                    >
                        <AlertCircle className="mr-2 h-4 w-4" />
                        <span>Trigger Trauma Mode</span>
                        <CommandShortcut>⌘!</CommandShortcut>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Settings">
                    <CommandItem onSelect={() => runCommand(() => router.push('/doctor/settings'))}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
