'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Shield,
    Search,
    CheckCircle,
    XCircle,
    Clock,
    FileText,
    AlertCircle,
    Lock,
    Building2,
    Loader2,
} from 'lucide-react';

// Backend API URL
const API_BASE_URL = 'http://localhost:8000/api';

// Mock insurance providers (for UI only, verification data comes from backend)
const insuranceProviders = [
    { id: 'ins_001', name: 'National Health Insurance', code: 'NHI' },
    { id: 'ins_002', name: 'Star Health Insurance', code: 'STAR' },
    { id: 'ins_003', name: 'ICICI Lombard', code: 'ICICI' },
    { id: 'ins_004', name: 'Max Bupa Health', code: 'MAXB' },
];

// Mock recent verifications (in production, fetch from backend)
const mockVerifications = [
    {
        id: 'ver_001',
        patientName: 'John Doe',
        policyNumber: 'POL-2025-001234',
        provider: 'National Health Insurance',
        status: 'verified',
        timestamp: '2026-02-07T10:30:00',
        coverage: { inNetwork: true, coPayPercent: 20 },
    },
    {
        id: 'ver_002',
        patientName: 'Jane Smith',
        policyNumber: 'POL-2025-005678',
        provider: 'Star Health Insurance',
        status: 'verified',
        timestamp: '2026-02-07T09:15:00',
        coverage: { inNetwork: true, coPayPercent: 15 },
    },
    {
        id: 'ver_003',
        patientName: 'Mike Johnson',
        policyNumber: 'POL-2024-009999',
        provider: 'ICICI Lombard',
        status: 'denied',
        timestamp: '2026-02-06T14:45:00',
        coverage: null,
    },
];

export default function InsuranceVerification() {
    const [selectedProvider, setSelectedProvider] = useState('');
    const [policyNumber, setPolicyNumber] = useState('');
    const [patientId, setPatientId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [verificationResult, setVerificationResult] = useState<any>(null);

    const handleVerify = async () => {
        if (!selectedProvider || !policyNumber || !patientId) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        setError(null);
        setVerificationResult(null);

        try {
            // Call Django backend for insurance verification
            const response = await fetch(`${API_BASE_URL}/insurance/verify/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    providerId: selectedProvider,
                    policyNumber: policyNumber,
                    patientId: patientId,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            setVerificationResult(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Verification failed');
            console.error('Insurance verification error:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'verified':
                return <CheckCircle className="h-5 w-5 text-green-600" />;
            case 'denied':
                return <XCircle className="h-5 w-5 text-red-600" />;
            case 'pending':
                return <Clock className="h-5 w-5 text-yellow-600" />;
            default:
                return <AlertCircle className="h-5 w-5 text-gray-600" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'verified':
                return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'denied':
                return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'pending':
                return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
        }
    };

    return (
        <div className="space-y-6">
            {/* Security Notice */}
            <Card className="p-4 bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
                <div className="flex items-start gap-3">
                    <Lock className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-green-900 dark:text-green-100">Secure Insurance Exchange</p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                            All insurance communications are processed through Django backend with OAuth2 authentication and encryption.
                            Only explicitly requested claim data is shared (data minimization).
                        </p>
                    </div>
                </div>
            </Card>

            {/* Verification Form */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Verify Insurance Coverage (Backend API)
                </h3>

                <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Insurance Provider
                        </label>
                        <select
                            value={selectedProvider}
                            onChange={(e) => setSelectedProvider(e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">Select Provider</option>
                            {insuranceProviders.map((provider) => (
                                <option key={provider.id} value={provider.id}>
                                    {provider.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Policy Number
                        </label>
                        <input
                            type="text"
                            value={policyNumber}
                            onChange={(e) => setPolicyNumber(e.target.value)}
                            placeholder="e.g., POL-2025-001234"
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Patient ID
                        </label>
                        <input
                            type="text"
                            value={patientId}
                            onChange={(e) => setPatientId(e.target.value)}
                            placeholder="e.g., P12345"
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>

                <Button onClick={handleVerify} disabled={loading} className="flex items-center gap-2">
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Verifying with backend...
                        </>
                    ) : (
                        <>
                            <Search className="h-4 w-4" />
                            Verify Coverage
                        </>
                    )}
                </Button>

                {/* Error Message */}
                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Verification Result */}
                {verificationResult && (
                    <div className={`mt-6 p-4 rounded-lg border ${verificationResult.status === 'verified'
                            ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                            : verificationResult.status === 'denied'
                                ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
                                : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800'
                        }`}>
                        <div className="flex items-start gap-3">
                            {getStatusIcon(verificationResult.status)}
                            <div className="flex-1">
                                <p className="font-semibold text-foreground capitalize">
                                    {verificationResult.status}
                                </p>
                                <p className="text-sm text-muted-foreground">{verificationResult.message}</p>

                                {verificationResult.coverage && (
                                    <div className="mt-4 grid md:grid-cols-3 gap-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Network Status</p>
                                            <p className="font-medium text-foreground">
                                                {verificationResult.coverage.inNetwork ? 'In-Network' : 'Out-of-Network'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Deductible</p>
                                            <p className="font-medium text-foreground">
                                                ₹{verificationResult.coverage.deductibleMet.toLocaleString()} / ₹{verificationResult.coverage.deductible.toLocaleString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Co-Pay</p>
                                            <p className="font-medium text-foreground">
                                                {verificationResult.coverage.coPayPercent}%
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {verificationResult.securityInfo && (
                                    <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-xs">
                                        <p className="text-blue-700 dark:text-blue-300">
                                            🔒 Secured with OAuth2 | 🔐 Payload Encrypted | 📊 Data Minimization Applied
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* Recent Verifications */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Recent Verifications (Audit Trail)
                </h3>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left py-3 px-4 font-semibold text-foreground">Patient</th>
                                <th className="text-left py-3 px-4 font-semibold text-foreground">Policy Number</th>
                                <th className="text-left py-3 px-4 font-semibold text-foreground">Provider</th>
                                <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                                <th className="text-left py-3 px-4 font-semibold text-foreground">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mockVerifications.map((verification) => (
                                <tr key={verification.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                                    <td className="py-3 px-4 font-medium text-foreground">{verification.patientName}</td>
                                    <td className="py-3 px-4 text-muted-foreground font-mono text-xs">{verification.policyNumber}</td>
                                    <td className="py-3 px-4 text-foreground flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                        {verification.provider}
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`text-xs font-medium px-2 py-1 rounded-full inline-flex items-center gap-1 ${getStatusColor(verification.status)}`}>
                                            {getStatusIcon(verification.status)}
                                            {verification.status}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-muted-foreground">
                                        {new Date(verification.timestamp).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Data Minimization Info */}
            <Card className="p-4 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-blue-900 dark:text-blue-100">Data Minimization Policy</p>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            Only explicitly requested claim codes and verification data are shared with insurance providers via Django backend.
                            All outbound payloads are encrypted using the provider's public key.
                            Every interaction is logged for compliance auditing.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
