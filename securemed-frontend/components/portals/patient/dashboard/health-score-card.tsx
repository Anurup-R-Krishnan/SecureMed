'use client';

import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';

interface HealthScoreCardProps {
    score: number;
    trend?: 'up' | 'down' | 'stable';
}

export default function HealthScoreCard({ score = 0, trend = 'stable' }: HealthScoreCardProps) {
    // Calculate circumference for SVG circle
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    const getColor = (s: number) => {
        if (s >= 80) return '#10b981'; // Green
        if (s >= 60) return '#f59e0b'; // Amber
        return '#ef4444'; // Red
    };

    const color = getColor(score);

    return (
        <Card className="relative overflow-hidden p-6 bg-white/5 backdrop-blur-xl border-white/10 h-full flex flex-col items-center justify-center group hover:bg-white/10 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-50" />

            <div className="relative z-10 flex flex-col items-center">
                <h3 className="text-lg font-medium text-muted-foreground mb-4">Health Score</h3>

                <div className="relative w-40 h-40 flex items-center justify-center">
                    {/* Background Circle */}
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="80"
                            cy="80"
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="transparent"
                            className="text-muted/20"
                        />
                        {/* Progress Circle */}
                        <motion.circle
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            cx="80"
                            cy="80"
                            r={radius}
                            stroke={color}
                            strokeWidth="12"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeLinecap="round"
                        />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold text-foreground">{Math.round(score)}</span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">/ 100</span>
                    </div>
                </div>

                <div className="mt-4 text-center">
                    <p className="text-sm font-medium" style={{ color }}>
                        {score >= 80 ? 'Excellent Status' : score >= 60 ? 'Needs Attention' : 'Critical Status'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Based on latest vitals</p>
                </div>
            </div>
        </Card>
    );
}
