// Epic 08: Data Intelligence & Interoperability - Shared Types

// ==================== User & RBAC Types ====================
export type UserRole = 'patient' | 'doctor' | 'admin';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    patientId?: string;
    doctorId?: string;
}

// ==================== Audit Types ====================
export type AuditEventType =
    | 'FHIR_EXPORT'
    | 'AI_SUGGESTION_REQUEST'
    | 'AI_SUGGESTION_ACCEPTED'
    | 'AI_SUGGESTION_REJECTED'
    | 'INSURANCE_VERIFICATION'
    | 'INSURANCE_CLAIM_SUBMITTED'
    | 'ANALYTICS_ACCESS'
    | 'LOGIN'
    | 'LOGOUT';

export interface AuditLogEntry {
    id: string;
    timestamp: string;
    userId: string;
    userName: string;
    userRole: UserRole;
    eventType: AuditEventType;
    resourceType: string;
    resourceId?: string;
    action: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    success: boolean;
}

// ==================== Clinical Analytics Types (Story 8.1) ====================
export interface FluCaseData {
    month: string;
    count: number;
}

export interface DiagnosisDistribution {
    diagnosis: string;
    count: number;
    percentage: number;
}

export interface DepartmentStats {
    department: string;
    totalCases: number;
    activeCases: number;
    resolvedCases: number;
}

export interface ClinicalAnalyticsData {
    fluCasesTrend: FluCaseData[];
    diagnosisDistribution: DiagnosisDistribution[];
    departmentStats: DepartmentStats[];
    summary: {
        totalPatients: number;
        totalVisits: number;
        averageOccupancy: number;
        emergencyCases: number;
    };
    lastUpdated: string;
    cacheExpiresAt: string;
}

// ==================== FHIR Types (Story 8.2) ====================
export interface FHIRResource {
    resourceType: string;
    id: string;
    meta?: {
        versionId?: string;
        lastUpdated?: string;
    };
}

export interface FHIRPatient extends FHIRResource {
    resourceType: 'Patient';
    identifier?: Array<{
        system: string;
        value: string;
    }>;
    name: Array<{
        use?: string;
        family: string;
        given: string[];
    }>;
    gender?: 'male' | 'female' | 'other' | 'unknown';
    birthDate?: string;
    telecom?: Array<{
        system: 'phone' | 'email';
        value: string;
        use?: string;
    }>;
    address?: Array<{
        use?: string;
        line?: string[];
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
    }>;
}

export interface FHIREncounter extends FHIRResource {
    resourceType: 'Encounter';
    status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'finished' | 'cancelled';
    class: {
        system: string;
        code: string;
        display: string;
    };
    type?: Array<{
        coding: Array<{
            system: string;
            code: string;
            display: string;
        }>;
    }>;
    subject: {
        reference: string;
        display?: string;
    };
    participant?: Array<{
        individual: {
            reference: string;
            display?: string;
        };
    }>;
    period?: {
        start?: string;
        end?: string;
    };
    reasonCode?: Array<{
        coding: Array<{
            system: string;
            code: string;
            display: string;
        }>;
        text?: string;
    }>;
}

export interface FHIRCondition extends FHIRResource {
    resourceType: 'Condition';
    clinicalStatus: {
        coding: Array<{
            system: string;
            code: string;
        }>;
    };
    verificationStatus?: {
        coding: Array<{
            system: string;
            code: string;
        }>;
    };
    category?: Array<{
        coding: Array<{
            system: string;
            code: string;
            display: string;
        }>;
    }>;
    code: {
        coding: Array<{
            system: string;
            code: string;
            display: string;
        }>;
        text?: string;
    };
    subject: {
        reference: string;
    };
    onsetDateTime?: string;
    recordedDate?: string;
}

export interface FHIRDiagnosticReport extends FHIRResource {
    resourceType: 'DiagnosticReport';
    status: 'registered' | 'partial' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'appended' | 'cancelled' | 'entered-in-error' | 'unknown';
    category?: Array<{
        coding: Array<{
            system: string;
            code: string;
            display: string;
        }>;
    }>;
    code: {
        coding: Array<{
            system: string;
            code: string;
            display: string;
        }>;
        text?: string;
    };
    subject: {
        reference: string;
    };
    effectiveDateTime?: string;
    issued?: string;
    result?: Array<{
        reference: string;
        display?: string;
    }>;
    conclusion?: string;
}

export interface FHIRMedicationRequest extends FHIRResource {
    resourceType: 'MedicationRequest';
    status: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'entered-in-error' | 'stopped' | 'draft' | 'unknown';
    intent: 'proposal' | 'plan' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option';
    medicationCodeableConcept?: {
        coding: Array<{
            system: string;
            code: string;
            display: string;
        }>;
        text?: string;
    };
    subject: {
        reference: string;
    };
    authoredOn?: string;
    requester?: {
        reference: string;
        display?: string;
    };
    dosageInstruction?: Array<{
        text?: string;
        timing?: {
            repeat?: {
                frequency?: number;
                period?: number;
                periodUnit?: string;
            };
        };
        doseAndRate?: Array<{
            doseQuantity?: {
                value: number;
                unit: string;
            };
        }>;
    }>;
}

export interface FHIRBundle {
    resourceType: 'Bundle';
    id: string;
    type: 'document' | 'message' | 'transaction' | 'transaction-response' | 'batch' | 'batch-response' | 'history' | 'searchset' | 'collection';
    timestamp: string;
    total?: number;
    entry: Array<{
        fullUrl?: string;
        resource: FHIRResource;
    }>;
}

// ==================== AI Decision Support Types (Story 8.3) ====================
export interface Symptom {
    id: string;
    name: string;
    severity?: 'mild' | 'moderate' | 'severe';
    duration?: string;
}

export interface AIDiagnosisSuggestion {
    id: string;
    diagnosis: string;
    icdCode: string;
    confidence: number; // 0-100
    matchedSymptoms: string[];
    description: string;
    recommendedTests?: string[];
    status?: 'pending' | 'accepted' | 'rejected';
}

export interface AIDecisionSupportRequest {
    symptoms: string[];
    patientAge?: number;
    patientGender?: string;
    medicalHistory?: string[];
}

export interface AIDecisionSupportResponse {
    requestId: string;
    timestamp: string;
    suggestions: AIDiagnosisSuggestion[];
    disclaimer: string;
}

// ==================== Insurance Types (Story 8.4) ====================
export interface InsuranceProvider {
    id: string;
    name: string;
    code: string;
    apiEndpoint: string;
    publicKey: string;
}

export interface InsuranceVerificationRequest {
    patientId: string;
    providerId: string;
    policyNumber: string;
    claimCodes?: string[];
}

export interface InsuranceVerificationResponse {
    requestId: string;
    timestamp: string;
    status: 'verified' | 'denied' | 'pending' | 'error';
    policyStatus: 'active' | 'inactive' | 'expired';
    coverage: {
        inNetwork: boolean;
        deductible: number;
        deductibleMet: number;
        coPayPercent: number;
        maxBenefit: number;
        usedBenefit: number;
    };
    eligibleServices?: string[];
    message?: string;
}

export interface InsuranceClaimRequest {
    patientId: string;
    providerId: string;
    policyNumber: string;
    claimCodes: string[];
    visitDate: string;
    totalAmount: number;
    diagnosis: string[];
}

export interface InsuranceClaimResponse {
    claimId: string;
    status: 'submitted' | 'processing' | 'approved' | 'denied' | 'appealed';
    submittedAt: string;
    estimatedProcessingDays: number;
    approvedAmount?: number;
    denialReason?: string;
}

// ==================== Mock Data Types ====================
export interface PatientMedicalRecord {
    patientId: string;
    patientName: string;
    dateOfBirth: string;
    gender: string;
    visits: Array<{
        id: string;
        date: string;
        doctor: string;
        department: string;
        type: string;
        status: string;
    }>;
    diagnoses: Array<{
        id: string;
        date: string;
        condition: string;
        icdCode: string;
        status: string;
    }>;
    labResults: Array<{
        id: string;
        date: string;
        testName: string;
        result: string;
        status: string;
    }>;
    medications: Array<{
        id: string;
        name: string;
        dosage: string;
        frequency: string;
        startDate: string;
        endDate?: string;
        status: string;
    }>;
}
