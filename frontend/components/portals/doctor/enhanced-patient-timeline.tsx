'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Beaker,
    FileText,
    Pill,
    Activity,
    Stethoscope,
    Image as ImageIcon,
    ArrowRight,
    ChevronDown,
    ChevronUp,
    Filter,
    Loader2,
    Calendar,
    User,
    Building,
    Eye,
    EyeOff
} from 'lucide-react';
import { getPatientTimeline } from '@/lib/services/clinical-service';
import { TimelineEvent, TimelineEventType, PatientTimelineFilters } from '@/lib/types/patient-summary';

interface EnhancedPatientTimelineProps {
    patientId: string;
    doctorId: string;
}

// Event type configuration with icons and colors
const eventTypeConfig: Record<TimelineEventType, {
    icon: React.ElementType;
    color: string;
    bgColor: string;
    label: string
}> = {
    VISIT: {
        icon: Stethoscope,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100 border-blue-300',
        label: 'Visits'
    },
    LAB_RESULT: {
        icon: Beaker,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100 border-purple-300',
        label: 'Lab Results'
    },
    MEDICATION: {
        icon: Pill,
        color: 'text-green-600',
        bgColor: 'bg-green-100 border-green-300',
        label: 'Medications'
    },
    PROCEDURE: {
        icon: Activity,
        color: 'text-amber-600',
        bgColor: 'bg-amber-100 border-amber-300',
        label: 'Procedures'
    },
    IMAGING: {
        icon: ImageIcon,
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-100 border-cyan-300',
        label: 'Imaging'
    },
    REFERRAL: {
        icon: ArrowRight,
        color: 'text-pink-600',
        bgColor: 'bg-pink-100 border-pink-300',
        label: 'Referrals'
    },
};

export default function EnhancedPatientTimeline({
    patientId,
    doctorId
}: EnhancedPatientTimelineProps) {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedTypes, setSelectedTypes] = useState<TimelineEventType[]>([]);
    const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
    const [visibleCount, setVisibleCount] = useState(10);

    // Load timeline events
    const loadEvents = async () => {
        setLoading(true);
        try {
            const data = await getPatientTimeline(patientId);
            // Map Django fields to frontend interface if necessary
            const mappedEvents = data.map((e: any) => ({
                id: e.id.toString(),
                patientId: e.patient.toString(),
                date: e.date,
                type: e.type as TimelineEventType,
                title: e.title,
                description: e.description,
                provider: e.provider,
                facility: e.facility,
                details: e.details || {},
                isAuthorizedView: e.is_authorized_view
            }));
            setEvents(mappedEvents);
        } catch (err) {
            console.error('Error loading timeline:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (patientId && doctorId) {
            loadEvents();
        }
    }, [patientId, doctorId]);

    // Toggle event type filter
    const toggleTypeFilter = (type: TimelineEventType) => {
        setSelectedTypes(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    // Toggle event expansion
    const toggleEventExpand = (eventId: string) => {
        setExpandedEvents(prev => {
            const next = new Set(prev);
            if (next.has(eventId)) {
                next.delete(eventId);
            } else {
                next.add(eventId);
            }
            return next;
        });
    };

    // Format date for display
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Render event details
    const renderEventDetails = (event: TimelineEvent) => {
        const details = event.details;
        if (!details || Object.keys(details).length === 0) return null;

        return (
            <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2">
                {Object.entries(details).map(([key, value]) => {
                    // Format key for display
                    const formattedKey = key
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, str => str.toUpperCase());

                    return (
                        <div key={key} className="text-xs">
                            <span className="text-muted-foreground">{formattedKey}:</span>
                            <span className="ml-1 font-medium text-foreground">
                                {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    };

    const visibleEvents = events.slice(0, visibleCount);
    const hasMore = events.length > visibleCount;

    return (
        <Card className="p-6">
            {/* Header with Filter Toggle */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Patient Timeline</h2>
                    <Badge variant="outline" className="ml-2">
                        {events.length} events
                    </Badge>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="gap-2"
                >
                    <Filter className="h-4 w-4" />
                    Filter
                    {selectedTypes.length > 0 && (
                        <Badge variant="secondary" className="ml-1">
                            {selectedTypes.length}
                        </Badge>
                    )}
                </Button>
            </div>

            {/* Filter Panel */}
            <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                <CollapsibleContent>
                    <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-border">
                        <p className="text-sm font-medium mb-3">Filter by Event Type</p>
                        <div className="flex flex-wrap gap-3">
                            {(Object.entries(eventTypeConfig) as [TimelineEventType, typeof eventTypeConfig[TimelineEventType]][]).map(
                                ([type, config]) => {
                                    const Icon = config.icon;
                                    const isSelected = selectedTypes.includes(type);

                                    return (
                                        <label
                                            key={type}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${isSelected
                                                ? config.bgColor
                                                : 'bg-background hover:bg-muted'
                                                }`}
                                        >
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleTypeFilter(type)}
                                            />
                                            <Icon className={`h-4 w-4 ${config.color}`} />
                                            <span className="text-sm">{config.label}</span>
                                        </label>
                                    );
                                }
                            )}
                        </div>
                        {selectedTypes.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="mt-3"
                                onClick={() => setSelectedTypes([])}
                            >
                                Clear Filters
                            </Button>
                        )}
                    </div>
                </CollapsibleContent>
            </Collapsible>

            {/* Timeline */}
            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading timeline...</span>
                </div>
            ) : events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No timeline events found.</p>
                    {selectedTypes.length > 0 && (
                        <p className="text-sm mt-2">Try clearing the filters.</p>
                    )}
                </div>
            ) : (
                <div className="relative space-y-4">
                    {/* Timeline Line */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

                    {/* Timeline Events */}
                    {visibleEvents.map((event) => {
                        const config = eventTypeConfig[event.type] || {
                            icon: Activity,
                            color: 'text-gray-600',
                            bgColor: 'bg-gray-100 border-gray-300',
                            label: event.type
                        };
                        const Icon = config.icon;
                        const isExpanded = expandedEvents.has(event.id);

                        return (
                            <div key={event.id} className="relative pl-16">
                                {/* Timeline Dot */}
                                <div className={`absolute left-0 top-2 flex h-12 w-12 items-center justify-center rounded-full border-4 border-background ${config.bgColor}`}>
                                    <Icon className={`h-5 w-5 ${config.color}`} />
                                </div>

                                {/* Event Card */}
                                <div
                                    className={`rounded-lg border bg-card p-4 cursor-pointer transition-shadow hover:shadow-md ${!event.isAuthorizedView ? 'opacity-60' : ''
                                        }`}
                                    onClick={() => toggleEventExpand(event.id)}
                                >
                                    {/* Event Header */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge className={config.bgColor + ' ' + config.color}>
                                                    {config.label.slice(0, -1)}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDate(event.date)}
                                                </span>
                                            </div>
                                            <h3 className="font-semibold text-foreground">{event.title}</h3>
                                            <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {!event.isAuthorizedView && (
                                                <Badge variant="outline" className="text-xs">
                                                    <EyeOff className="h-3 w-3 mr-1" />
                                                    Limited
                                                </Badge>
                                            )}
                                            {isExpanded ? (
                                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Provider & Facility Info */}
                                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            {event.provider}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Building className="h-3 w-3" />
                                            {event.facility}
                                        </span>
                                    </div>

                                    {/* Expandable Details */}
                                    {isExpanded && event.isAuthorizedView && renderEventDetails(event)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Load More */}
            {hasMore && (
                <Button
                    variant="outline"
                    className="mt-6 w-full"
                    onClick={() => setVisibleCount(prev => prev + 10)}
                >
                    Load More Events ({events.length - visibleCount} remaining)
                </Button>
            )}
        </Card>
    );
}
