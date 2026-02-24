'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, FastForward, Rewind, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { TimelineEvent } from '@/services/patients';

interface TimeTravelScrubberProps {
    onTimeChange?: (timestamp: number) => void;
    events?: TimelineEvent[];
}

export function TimeTravelScrubber({ onTimeChange, events = [] }: TimeTravelScrubberProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentValue, setCurrentValue] = useState(100); // 100 = Now, 0 = 24h ago

    // Calculate time based on slider
    const hoursAgo = (24 * (100 - currentValue)) / 100;

    // Format display time based on slider value
    const getDisplayTime = () => {
        if (currentValue === 100) return 'NOW (LIVE)';

        const now = new Date();
        const past = new Date(now.getTime() - (hoursAgo * 60 * 60 * 1000));
        return past.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + (hoursAgo > 24 ? ' (Yesterday)' : '');
    };

    return (
        <div className="w-full bg-card border-t border-border p-4 fixed bottom-0 left-0 right-0 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <div className="max-w-7xl mx-auto flex flex-col gap-4">

                {/* Header / Info */}
                <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-2 font-mono font-bold text-lg ${currentValue === 100 ? 'text-red-500 animate-pulse' : 'text-primary'}`}>
                        <Clock className="h-5 w-5" />
                        {getDisplayTime()}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setCurrentValue(Math.max(0, currentValue - 10))}><Rewind className="h-4 w-4" /></Button>
                        <Button
                            variant={isPlaying ? "destructive" : "default"}
                            size="sm"
                            onClick={() => setIsPlaying(!isPlaying)}
                        >
                            {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                            {isPlaying ? "Pause Playback" : "Play History"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setCurrentValue(Math.min(100, currentValue + 10))}><FastForward className="h-4 w-4" /></Button>

                        {currentValue !== 100 && (
                            <Button variant="secondary" size="sm" onClick={() => setCurrentValue(100)} className="ml-4 font-bold">
                                Return to Live
                            </Button>
                        )}
                    </div>
                </div>

                {/* The Timeline Track */}
                <div className="relative pt-6 pb-2">

                    {/* Markers on the track */}
                    <div className="absolute top-0 left-0 right-0 flex justify-between text-xs text-muted-foreground font-mono select-none pointer-events-none px-2">
                        <span>-24h</span>
                        <span>-12h</span>
                        <span>-6h</span>
                        <span>-1h</span>
                        <span>NOW</span>
                    </div>

                    {/* Slider */}
                    <Slider
                        value={[currentValue]}
                        max={100}
                        step={1}
                        onValueChange={(val) => {
                            setCurrentValue(val[0]);
                            if (onTimeChange && val[0] !== 100) {
                                onTimeChange(val[0]);
                            }
                        }}
                        className="cursor-grab active:cursor-grabbing"
                    />

                    {/* Event Markers on timeline */}
                    {events.map((event) => {
                        // Calculate position: (EventDate - (Now - 24h)) / 24h * 100%
                        // Simplified: If event is recent, show it.
                        const eventTime = new Date(event.date).getTime();
                        const nowTime = new Date().getTime();
                        const twentyFourHoursAgo = nowTime - (24 * 60 * 60 * 1000);

                        // Skip if older than 24h or in future
                        if (eventTime < twentyFourHoursAgo || eventTime > nowTime) return null;

                        const positionPercent = ((eventTime - twentyFourHoursAgo) / (nowTime - twentyFourHoursAgo)) * 100;

                        let color = 'bg-blue-500';
                        if (event.category === 'medication') color = 'bg-green-500';
                        if (event.category === 'lab' && event.status === 'completed') color = 'bg-red-500';

                        return (
                            <div
                                key={event.id}
                                className={`absolute top-3 w-3 h-3 rounded-full ${color} border border-white hover:scale-[2] hover:shadow-xl hover:ring-2 hover:ring-white transition-all duration-300 cursor-pointer z-10`}
                                style={{ left: `${positionPercent}%` }}
                                title={`${event.title} (${new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}
                            />
                        );
                    })}

                </div>
            </div>
        </div>
    );
}
