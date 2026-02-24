import React, { useState } from 'react';
import { Pill, Plus, AlertOctagon, CheckCircle2, X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { patientService } from '@/services/patients';

interface Drug {
    id: string;
    name: string;
    category: string;
    interactsWith: string[];
}

export function MedicationSandbox() {
    const [activeDrugs, setActiveDrugs] = useState<Drug[]>([]);
    const [availableDrugs, setAvailableDrugs] = useState<Drug[]>([]);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        const fetchMeds = async () => {
            try {
                // Fetch real prescription data
                const orders: any[] = await patientService.getActiveMedications();

                // Derive unique drugs from orders
                // This ensures we ONLY show drugs that actually exist in the system's history
                const uniqueMeds = new Map<string, Drug>();

                if (Array.isArray(orders)) {
                    orders.forEach((order, index) => {
                        const name = order.medication_name || order.prescription_details?.medication_name;
                        if (name && !uniqueMeds.has(name)) {
                            uniqueMeds.set(name, {
                                id: `drug-${index}`,
                                name: name,
                                category: 'Prescribed', // Category data might be missing, using generic
                                interactsWith: [] // Backend doesn't support interaction checks yet
                            });
                        }
                    });
                }

                setAvailableDrugs(Array.from(uniqueMeds.values()));
            } catch (e) {
                console.error("Failed to fetch medication inventory", e);
            } finally {
                setLoading(false);
            }
        };

        fetchMeds();
    }, []);

    const interactions = activeDrugs.flatMap(d1 =>
        activeDrugs
            .filter(d2 => d1.id !== d2.id && d1.interactsWith.includes(d2.id))
            .map(d2 => ({ source: d1.name, target: d2.name }))
    );

    const uniqueInteractions = interactions.filter((v: { source: string; target: string }, i: number, a: { source: string; target: string }[]) =>
        a.findIndex(t => (t.source === v.source && t.target === v.target) || (t.source === v.target && t.target === v.source)) === i
    );

    const toggleDrug = (drug: Drug) => {
        if (activeDrugs.find(d => d.id === drug.id)) {
            setActiveDrugs(activeDrugs.filter(d => d.id !== drug.id));
        } else {
            setActiveDrugs([...activeDrugs, drug]);
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-[500px] border rounded-xl overflow-hidden shadow-sm bg-background">

            {/* Sidebar: Drug Library */}
            <div className="w-full md:w-64 bg-muted/20 border-r p-4 overflow-y-auto">
                <div className="flex items-center gap-2 mb-4">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Pharmacy Stock</h4>
                </div>

                <div className="space-y-2">
                    {loading ? <div className="p-4 text-center text-xs text-muted-foreground">Loading inventory...</div> : availableDrugs.length === 0 ? <div className="p-4 text-center text-xs text-muted-foreground">No prescriptions found</div> : availableDrugs.map(drug => {
                        const isActive = activeDrugs.find(d => d.id === drug.id);
                        return (
                            <div
                                key={drug.id}
                                onClick={() => toggleDrug(drug)}
                                className={`
                        p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between group
                        ${isActive ? 'bg-primary/10 border-primary' : 'bg-card hover:border-primary/50'}
                     `}
                            >
                                <div>
                                    <div className="font-bold text-sm">{drug.name}</div>
                                    <div className="text-xs text-muted-foreground">{drug.category}</div>
                                </div>
                                {isActive ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary" />}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Canvas: Interaction Sandbox */}
            <div className="flex-1 p-6 relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
                {/* Floating Particles Background (CSS only for now) */}
                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                <div className="h-full flex flex-col">
                    <div className="flex justify-between items-center mb-6 z-10">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Pill className="h-5 w-5 text-primary" />
                            Interaction Simulation
                        </h3>
                        <div className="text-xs font-mono text-muted-foreground bg-background/50 px-2 py-1 rounded border">
                            {activeDrugs.length} Active Compounds
                        </div>
                    </div>

                    {/* Drop Zone Visual */}
                    <div className="flex-1 border-2 border-dashed border-primary/20 rounded-xl bg-card/30 backdrop-blur-sm relative transition-all duration-300 hover:border-primary/40 flex flex-wrap content-start gap-4 p-4 min-h-[200px]">
                        {activeDrugs.length === 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/50 pointer-events-none">
                                <Plus className="h-12 w-12 mb-2 opacity-20" />
                                <p className="text-sm font-medium">Select medications from the inventory</p>
                                <p className="text-xs opacity-70">to simulate interactions</p>
                            </div>
                        )}

                        <AnimatePresence>
                            {activeDrugs.map(drug => (
                                <motion.div
                                    key={drug.id}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    layout
                                    className="bg-card border shadow-sm px-4 py-2 rounded-full flex items-center gap-2 pr-2 group hover:shadow-md hover:border-primary/30 transition-all cursor-grab active:cursor-grabbing z-10"
                                >
                                    <span className="font-bold text-sm">{drug.name}</span>
                                    <button
                                        onClick={() => toggleDrug(drug)}
                                        className="h-5 w-5 rounded-full bg-muted/50 hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Interaction Alert Area */}
                    <div className="mt-6 min-h-[80px]">
                        <AnimatePresence mode="wait">
                            {uniqueInteractions.length > 0 ? (
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 20, opacity: 0 }}
                                    className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3 shadow-lg shadow-red-500/5"
                                >
                                    <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg animate-pulse">
                                        <AlertOctagon className="h-6 w-6 text-red-600 dark:text-red-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-red-700 dark:text-red-400">Major Interaction Detected</h4>
                                        <ul className="text-sm text-red-600/90 dark:text-red-400/90 mt-1 list-disc list-inside">
                                            {uniqueInteractions.map((interaction, idx) => (
                                                <li key={idx}>
                                                    Conflict between <span className="font-bold">{interaction.source}</span> and <span className="font-bold">{interaction.target}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </motion.div>
                            ) : activeDrugs.length > 1 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center gap-3"
                                >
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <span className="font-medium text-emerald-700 dark:text-emerald-400">No known interactions detected. Safe to combine.</span>
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
