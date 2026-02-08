'use client';

import { useState, useEffect } from 'react';
import { patientService, TimelineEvent } from '@/services/patients';
import {
    Calendar,
    FileText,
    Pill,
    Activity,
    CheckCircle,
    Clock,
    AlertCircle,
    Filter,
    Search,
    ChevronRight,
    Stethoscope,
    Microscope,
    User
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';

interface EnhancedPatientTimelineProps {
    patientId?: string;
    className?: string;
}

const typeConfig = {
    appointment: {
        icon: Calendar,
        color: 'text-blue-500',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        label: 'Appointment'
    },
    medication: {
        icon: Pill,
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        label: 'Medication'
    },
    lab: {
        icon: Microscope,
        color: 'text-purple-500',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
        label: 'Lab Result'
    },
    diagnosis: {
        icon: Activity,
        color: 'text-amber-500',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        label: 'Diagnosis'
    },
    admin: {
        icon: FileText,
        color: 'text-slate-500',
        bg: 'bg-slate-500/10',
        border: 'border-slate-500/20',
        label: 'Administrative'
    },
};

export default function PatientTimeline({ patientId, className }: EnhancedPatientTimelineProps) {
    const { toast } = useToast();
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

    useEffect(() => {
        const fetchTimeline = async () => {
            setLoading(true);
            try {
                const data = await patientService.getPatientTimeline(patientId);
                setEvents(data);
            } catch (error) {
                toast({
                    title: 'Error',
                    description: 'Failed to load patient timeline.',
                    variant: 'destructive',
                });
            } finally {
                setLoading(false);
            }
        };

        fetchTimeline();
    }, [patientId, toast]);

    const filteredEvents = events
        .filter(event => {
            if (filterType !== 'all' && event.category !== filterType) return false;
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return (
                    event.title.toLowerCase().includes(query) ||
                    event.description.toLowerCase().includes(query) ||
                    event.doctor?.toLowerCase().includes(query)
                );
            }
            return true;
        })
        .sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case 'completed':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1"><CheckCircle className="h-3 w-3" /> Completed</Badge>;
            case 'upcoming':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1"><Clock className="h-3 w-3" /> Upcoming</Badge>;
            case 'pending':
                return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1"><AlertCircle className="h-3 w-3" /> Pending</Badge>;
            case 'cancelled':
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1"><AlertCircle className="h-3 w-3" /> Cancelled</Badge>;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className={`p-8 flex flex-col items-center justify-center space-y-4 min-h-[400px] ${className}`}>
                <div className="relative">
                    <div className="h-12 w-12 rounded-full border-4 border-muted border-t-primary animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Activity className="h-5 w-5 text-primary/50" />
                    </div>
                </div>
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading medical history...</p>
            </div>
        );
    }

    return (
        <Card className={`overflow-hidden border-none shadow-xl bg-gradient-to-br from-card to-muted/10 ${className}`}>
            <div className="p-6 border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                            <Activity className="h-6 w-6 text-primary" />
                            Patient Timeline
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">Comprehensive view of medical history and upcoming events.</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search records, doctors, or notes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-background/50 border-muted-foreground/20 focus:border-primary transition-all"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="w-[140px] bg-background/50 border-muted-foreground/20">
                                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                                <SelectValue placeholder="Filter" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Events</SelectItem>
                                <SelectItem value="appointment">Appointments</SelectItem>
                                <SelectItem value="medication">Medications</SelectItem>
                                <SelectItem value="lab">Lab Results</SelectItem>
                                <SelectItem value="diagnosis">Diagnoses</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
                            <SelectTrigger className="w-[140px] bg-background/50 border-muted-foreground/20">
                                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                <SelectValue placeholder="Sort" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="newest">Newest First</SelectItem>
                                <SelectItem value="oldest">Oldest First</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <div className="p-6 md:p-8 bg-card relative min-h-[500px]">
                {/* Timeline vertical line */}
                <div className="absolute left-6 md:left-8 top-8 bottom-8 w-0.5 bg-gradient-to-b from-border/50 via-primary/20 to-border/50" />

                <div className="space-y-8">
                    {filteredEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center pl-8">
                            <div className="h-20 w-20 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                                <Search className="h-10 w-10 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground">No events found</h3>
                            <p className="text-muted-foreground max-w-xs mt-2">Try adjusting your filters or search query to find what you're looking for.</p>
                            <Button
                                variant="link"
                                onClick={() => { setFilterType('all'); setSearchQuery(''); }}
                                className="mt-4 text-primary font-bold"
                            >
                                Clear Filters
                            </Button>
                        </div>
                    ) : (
                        filteredEvents.map((event, index) => {
                            const config = typeConfig[event.category] || typeConfig.admin;
                            const Icon = config.icon;
                            const eventDate = new Date(event.date);
                            const isNewDay = index === 0 || new Date(filteredEvents[index - 1].date).toDateString() !== eventDate.toDateString();

                            return (
                                <div key={event.id} className="relative pl-8 md:pl-10 group animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
                                    {/* Date Header for new days */}
                                    {isNewDay && (
                                        <div className="absolute -left-1 md:-left-3 -top-3 bg-card border border-border/50 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground shadow-sm z-10">
                                            {eventDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                    )}

                                    {/* Timeline Node */}
                                    <div className={`absolute -left-[5px] md:-left-[3px] top-6 h-3 w-3 rounded-full border-2 border-background ${config.bg.replace('/10', '')} shadow-[0_0_0_4px_rgba(255,255,255,0.5)] dark:shadow-[0_0_0_4px_rgba(0,0,0,0.5)] z-10 transition-transform group-hover:scale-125 duration-300`} />

                                    <Card className={`p-0 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/20 bg-background ${config.border} border-l-4`}>
                                        <div className="p-5 flex flex-col md:flex-row gap-4">
                                            {/* Icon Box */}
                                            <div className={`h-12 w-12 shrink-0 rounded-2xl ${config.bg} ${config.color} flex items-center justify-center shadow-inner`}>
                                                <Icon className="h-6 w-6" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-2 mb-2">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-muted/50 text-muted-foreground hover:bg-muted">
                                                                {config.label}
                                                            </Badge>
                                                            <span className="text-xs font-bold text-muted-foreground flex items-center">
                                                                <Clock className="h-3 w-3 mr-1" />
                                                                {eventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <h3 className="text-lg font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
                                                            {event.title}
                                                        </h3>
                                                    </div>
                                                    {getStatusBadge(event.status)}
                                                </div>

                                                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                                                    {event.description}
                                                </p>

                                                {(event.doctor || event.location) && (
                                                    <div className="flex flex-wrap gap-4 pt-4 border-t border-border/50">
                                                        {event.doctor && (
                                                            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                                                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                                    <Stethoscope className="h-3 w-3" />
                                                                </div>
                                                                {event.doctor}
                                                            </div>
                                                        )}
                                                        {event.location && (
                                                            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                                                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                                    <User className="h-3 w-3" />
                                                                </div>
                                                                {event.location}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex md:flex-col justify-end gap-2 shrink-0">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full">
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </Card>
    );
}
