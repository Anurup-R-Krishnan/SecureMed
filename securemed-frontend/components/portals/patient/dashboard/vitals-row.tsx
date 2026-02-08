'use client';

import { Card } from '@/components/ui/card';
import { Activity, Heart, Scale } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip
);

interface VitalsRowProps {
    vitals: {
        heartRate: number;
        systolicBp: number;
        diastolicBp: number;
        weight: number;
    },
    history?: any[]; // Array of VitalSign objects
}

export default function VitalsRow({ vitals, history = [] }: VitalsRowProps) {

    // Helper to extract trend data from history
    // History is expected to be consistent with keys: heart_rate, systolic_bp, weight, recorded_at
    const getTrendData = (key: string) => {
        if (!history || history.length === 0) return Array(7).fill(null);
        return history.map(item => item[key]);
    };

    const hrTrend = getTrendData('heart_rate');
    const sysTrend = getTrendData('systolic_bp');
    // const diaTrend = getTrendData('diastolic_bp'); // Could overlay if needed
    const weightTrend = getTrendData('weight');

    // If no history, we just show a flat line or empty chart? 
    // For now let's handle "null" by chart.js or just pass 0s if empty
    const hasHistory = history && history.length > 0;

    const createChartOptions = (color: string, dataPoints: number[]) => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { enabled: true },
        },
        scales: {
            x: { display: false },
            y: {
                display: false,
                min: dataPoints.length > 0 ? Math.min(...dataPoints) * 0.9 : 0,
                max: dataPoints.length > 0 ? Math.max(...dataPoints) * 1.1 : 100
            },
        },
        elements: {
            line: {
                borderColor: color,
                borderWidth: 2,
                tension: 0.4,
            },
            point: {
                radius: 2, // Show small points for real data
                backgroundColor: color,
            },
        },
    });

    const createChartData = (data: number[], color: string) => ({
        labels: history.map(h => new Date(h.recorded_at).toLocaleDateString()),
        datasets: [
            {
                data: data,
                borderColor: color,
                backgroundColor: 'transparent',
            },
        ],
    });

    return (
        <div className="grid md:grid-cols-3 gap-4">
            {/* Heart Rate */}
            <Card className="p-4 bg-white/5 backdrop-blur-md border-white/10 relative overflow-hidden group hover:bg-white/10 transition-colors">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Heart Rate</p>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-2xl font-bold text-foreground">{vitals.heartRate || '--'}</span>
                            <span className="text-xs text-muted-foreground">bpm</span>
                        </div>
                    </div>
                    <div className="p-2 bg-rose-500/10 rounded-lg">
                        <Heart className="h-4 w-4 text-rose-500" />
                    </div>
                </div>
                <div className="h-12 w-full mt-2">
                    {hasHistory && <Line options={createChartOptions('#f43f5e', hrTrend)} data={createChartData(hrTrend, '#f43f5e')} />}
                    {!hasHistory && <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">No history</div>}
                </div>
            </Card>

            {/* Blood Pressure */}
            <Card className="p-4 bg-white/5 backdrop-blur-md border-white/10 relative overflow-hidden group hover:bg-white/10 transition-colors">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Blood Pressure</p>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-2xl font-bold text-foreground">
                                {vitals.systolicBp || '--'}/{vitals.diastolicBp || '--'}
                            </span>
                            <span className="text-xs text-muted-foreground">mmHg</span>
                        </div>
                    </div>
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Activity className="h-4 w-4 text-blue-500" />
                    </div>
                </div>
                <div className="h-12 w-full mt-2">
                    {hasHistory && <Line options={createChartOptions('#3b82f6', sysTrend)} data={createChartData(sysTrend, '#3b82f6')} />}
                    {!hasHistory && <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">No history</div>}
                </div>
            </Card>

            {/* Weight */}
            <Card className="p-4 bg-white/5 backdrop-blur-md border-white/10 relative overflow-hidden group hover:bg-white/10 transition-colors">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Weight</p>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-2xl font-bold text-foreground">{vitals.weight ? Math.round(vitals.weight * 10) / 10 : '--'}</span>
                            <span className="text-xs text-muted-foreground">kg</span>
                        </div>
                    </div>
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <Scale className="h-4 w-4 text-emerald-500" />
                    </div>
                </div>
                <div className="h-12 w-full mt-2">
                    {hasHistory && <Line options={createChartOptions('#10b981', weightTrend)} data={createChartData(weightTrend, '#10b981')} />}
                    {!hasHistory && <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">No history</div>}
                </div>
            </Card>
        </div>
    );
}
