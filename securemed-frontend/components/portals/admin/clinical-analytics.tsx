'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Activity,
    TrendingUp,
    Users,
    Building2,
    RefreshCw,
    AlertCircle,
    Clock,
} from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Line, Pie, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

// Chart colors
const COLORS = [
    'rgba(59, 130, 246, 0.8)',
    'rgba(34, 197, 94, 0.8)',
    'rgba(139, 92, 246, 0.8)',
    'rgba(249, 115, 22, 0.8)',
    'rgba(239, 68, 68, 0.8)',
    'rgba(20, 184, 166, 0.8)',
    'rgba(234, 179, 8, 0.8)',
    'rgba(236, 72, 153, 0.8)',
];

// Backend API URL
const API_BASE_URL = 'http://localhost:8000/api';

export default function ClinicalAnalytics() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    const fetchAnalytics = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/admin/analytics/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const analyticsData = await response.json();
            setData(analyticsData);
            setLastRefresh(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
            console.error('Analytics fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const handleRefresh = () => {
        fetchAnalytics();
    };

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <Card className="p-6 bg-red-50 border-red-200 dark:bg-red-950/20">
                <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-red-900 dark:text-red-100">Failed to load analytics</p>
                        <p className="text-sm text-red-700 dark:text-red-300 mb-3">{error}</p>
                        <Button onClick={handleRefresh} size="sm" variant="outline">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry
                        </Button>
                    </div>
                </div>
            </Card>
        );
    }

    if (!data) return null;

    // Flu Cases Trend - Line Chart Data
    const fluCasesChartData = {
        labels: data.fluCasesTrend.map((item: any) => item.month),
        datasets: [
            {
                label: 'Flu Cases',
                data: data.fluCasesTrend.map((item: any) => item.count),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 5,
                pointHoverRadius: 7,
            },
        ],
    };

    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top' as const,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
            },
        },
    };

    // Diagnosis Distribution - Pie Chart Data
    const diagnosisChartData = {
        labels: data.diagnosisDistribution.map((item: any) => item.diagnosis),
        datasets: [
            {
                data: data.diagnosisDistribution.map((item: any) => item.count),
                backgroundColor: COLORS,
                borderColor: COLORS.map((color: string) => color.replace('0.8', '1')),
                borderWidth: 2,
            },
        ],
    };

    const pieChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'right' as const,
                labels: {
                    boxWidth: 12,
                    font: {
                        size: 11,
                    },
                },
            },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        const percentage = data.diagnosisDistribution[context.dataIndex].percentage;
                        return `${label}: ${value} cases (${percentage.toFixed(1)}%)`;
                    }
                }
            }
        },
    };

    // Department Statistics - Bar Chart Data
    const departmentChartData = {
        labels: data.departmentStats.map((item: any) => item.department),
        datasets: [
            {
                label: 'Active Cases',
                data: data.departmentStats.map((item: any) => item.activeCases),
                backgroundColor: 'rgba(249, 115, 22, 0.8)',
                borderColor: 'rgb(249, 115, 22)',
                borderWidth: 1,
            },
            {
                label: 'Resolved Cases',
                data: data.departmentStats.map((item: any) => item.resolvedCases),
                backgroundColor: 'rgba(34, 197, 94, 0.8)',
                borderColor: 'rgb(34, 197, 94)',
                borderWidth: 1,
            },
        ],
    };

    const barChartOptions = {
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top' as const,
            },
        },
        scales: {
            x: {
                beginAtZero: true,
            },
        },
    };

    return (
        <div className="space-y-6">
            {/* Privacy Notice */}
            <Card className="p-4 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-blue-900 dark:text-blue-100">Privacy-Preserving Analytics</p>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            All data shown is aggregated using GROUP BY queries. No Personally Identifiable Information (PII) is displayed.
                            Minimum threshold of 5 cases applied to prevent re-identification.
                        </p>
                        {data.fromCache && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                                ⚡ Served from cache (expires: {new Date(data.cacheExpiresAt).toLocaleTimeString()})
                            </p>
                        )}
                    </div>
                </div>
            </Card>

            {/* Header with Refresh */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-foreground">Clinical Analytics Dashboard</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Clock className="h-4 w-4" />
                        Last updated: {lastRefresh.toLocaleTimeString()}
                    </p>
                </div>
                <Button variant="outline" onClick={handleRefresh} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4">
                <Card className="p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-muted-foreground text-sm">Total Patients</p>
                            <p className="text-3xl font-bold text-foreground mt-2">
                                {data.summary.totalPatients.toLocaleString()}
                            </p>
                        </div>
                        <Users className="h-8 w-8 text-primary opacity-20" />
                    </div>
                </Card>
                <Card className="p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-muted-foreground text-sm">Total Visits</p>
                            <p className="text-3xl font-bold text-primary mt-2">
                                {data.summary.totalVisits.toLocaleString()}
                            </p>
                        </div>
                        <Activity className="h-8 w-8 text-primary opacity-20" />
                    </div>
                </Card>
                <Card className="p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-muted-foreground text-sm">Avg Occupancy</p>
                            <p className="text-3xl font-bold text-primary mt-2">
                                {data.summary.averageOccupancy}%
                            </p>
                        </div>
                        <Building2 className="h-8 w-8 text-primary opacity-20" />
                    </div>
                </Card>
                <Card className="p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-muted-foreground text-sm">Emergency Cases</p>
                            <p className="text-3xl font-bold text-orange-500 mt-2">
                                {data.summary.emergencyCases.toLocaleString()}
                            </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-orange-500 opacity-20" />
                    </div>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Flu Cases Trend - Line Chart */}
                <Card className="p-6">
                    <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Flu Cases Trend (Monthly)
                    </h4>
                    <div className="h-72">
                        <Line data={fluCasesChartData} options={lineChartOptions} />
                    </div>
                </Card>

                {/* Diagnosis Distribution - Pie Chart */}
                <Card className="p-6">
                    <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Diagnosis Distribution
                    </h4>
                    <div className="h-72">
                        <Pie data={diagnosisChartData} options={pieChartOptions} />
                    </div>
                </Card>
            </div>

            {/* Department Statistics - Bar Chart */}
            <Card className="p-6">
                <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Department-wise Case Statistics
                </h4>
                <div className="h-80">
                    <Bar data={departmentChartData} options={barChartOptions} />
                </div>
            </Card>

            {/* Department Table */}
            <Card className="p-6">
                <h4 className="text-lg font-semibold text-foreground mb-4">Department Summary</h4>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left py-3 px-4 font-semibold text-foreground">Department</th>
                                <th className="text-right py-3 px-4 font-semibold text-foreground">Total Cases</th>
                                <th className="text-right py-3 px-4 font-semibold text-foreground">Active</th>
                                <th className="text-right py-3 px-4 font-semibold text-foreground">Resolved</th>
                                <th className="text-right py-3 px-4 font-semibold text-foreground">Resolution Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.departmentStats.map((dept: any, idx: number) => {
                                const resolutionRate = ((dept.resolvedCases / dept.totalCases) * 100).toFixed(1);
                                return (
                                    <tr key={idx} className="border-b border-border hover:bg-muted/50 transition-colors">
                                        <td className="py-3 px-4 font-medium text-foreground">{dept.department}</td>
                                        <td className="py-3 px-4 text-right text-foreground">{dept.totalCases.toLocaleString()}</td>
                                        <td className="py-3 px-4 text-right">
                                            <span className="text-orange-600 font-medium">{dept.activeCases}</span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <span className="text-green-600 font-medium">{dept.resolvedCases.toLocaleString()}</span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${parseFloat(resolutionRate) >= 90
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                }`}>
                                                {resolutionRate}%
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
