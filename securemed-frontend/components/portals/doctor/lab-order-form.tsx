'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
    FlaskConical,
    Search,
    Plus,
    X,
    AlertTriangle,
    CheckCircle2,
    Loader2
} from 'lucide-react';

interface LabTest {
    id: string;
    name: string;
    category: string;
    code: string;
    description: string;
    turnaroundTime: string;
}

interface Patient {
    id: number;
    name: string;
    mrn: string;
}

interface LabOrderFormProps {
    patients: Patient[];
    onSubmitOrder: (order: any) => Promise<void>;
}

// Sample lab tests
const LAB_TESTS: LabTest[] = [
    { id: 'cbc', name: 'Complete Blood Count (CBC)', category: 'Hematology', code: 'CBC01', description: 'Measures red and white blood cells, hemoglobin, and platelets', turnaroundTime: '24 hours' },
    { id: 'bmp', name: 'Basic Metabolic Panel', category: 'Chemistry', code: 'BMP01', description: 'Glucose, calcium, electrolytes, kidney function', turnaroundTime: '24 hours' },
    { id: 'cmp', name: 'Comprehensive Metabolic Panel', category: 'Chemistry', code: 'CMP01', description: 'BMP plus liver function tests', turnaroundTime: '24 hours' },
    { id: 'lipid', name: 'Lipid Panel', category: 'Chemistry', code: 'LIP01', description: 'Cholesterol, triglycerides, HDL, LDL', turnaroundTime: '24 hours' },
    { id: 'hba1c', name: 'Hemoglobin A1C', category: 'Chemistry', code: 'HBA01', description: 'Average blood sugar over 2-3 months', turnaroundTime: '48 hours' },
    { id: 'tsh', name: 'Thyroid Stimulating Hormone', category: 'Endocrine', code: 'TSH01', description: 'Thyroid function screening', turnaroundTime: '24 hours' },
    { id: 'urinalysis', name: 'Urinalysis', category: 'Urinalysis', code: 'UA01', description: 'Physical, chemical, microscopic examination of urine', turnaroundTime: '4 hours' },
    { id: 'pt', name: 'Prothrombin Time (PT/INR)', category: 'Coagulation', code: 'PT01', description: 'Blood clotting function', turnaroundTime: '4 hours' },
    { id: 'culture', name: 'Blood Culture', category: 'Microbiology', code: 'BC01', description: 'Detect bacteria or fungi in blood', turnaroundTime: '48-72 hours' },
    { id: 'covid', name: 'COVID-19 PCR', category: 'Molecular', code: 'COV01', description: 'SARS-CoV-2 detection', turnaroundTime: '24-48 hours' },
];

const CATEGORIES = [...new Set(LAB_TESTS.map(t => t.category))];

const PRIORITY_OPTIONS = [
    { value: 'routine', label: 'Routine', description: 'Standard turnaround time' },
    { value: 'urgent', label: 'Urgent', description: 'Results within 4-6 hours' },
    { value: 'stat', label: 'STAT', description: 'Immediate processing required' },
];

export function LabOrderForm({ patients, onSubmitOrder }: LabOrderFormProps) {
    const [selectedPatient, setSelectedPatient] = useState<string>('');
    const [selectedTests, setSelectedTests] = useState<LabTest[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [priority, setPriority] = useState('routine');
    const [clinicalNotes, setClinicalNotes] = useState('');
    const [fasting, setFasting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const filteredTests = LAB_TESTS.filter(test => {
        const matchesSearch = test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            test.code.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || test.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const addTest = (test: LabTest) => {
        if (!selectedTests.find(t => t.id === test.id)) {
            setSelectedTests([...selectedTests, test]);
        }
    };

    const removeTest = (testId: string) => {
        setSelectedTests(selectedTests.filter(t => t.id !== testId));
    };

    const handleSubmit = async () => {
        if (!selectedPatient || selectedTests.length === 0) return;

        setIsSubmitting(true);

        try {
            await onSubmitOrder({
                patient_id: selectedPatient,
                tests: selectedTests.map(t => t.id),
                priority,
                clinical_notes: clinicalNotes,
                fasting_required: fasting,
            });

            setSubmitted(true);
        } catch (error) {
            console.error('Error submitting order:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <Card className="max-w-2xl mx-auto">
                <CardContent className="pt-12 pb-8 text-center">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Order Submitted Successfully</h2>
                    <p className="text-slate-600 mb-6">
                        Lab order for {selectedTests.length} test(s) has been submitted.
                    </p>
                    <Button onClick={() => {
                        setSubmitted(false);
                        setSelectedTests([]);
                        setSelectedPatient('');
                        setClinicalNotes('');
                    }}>
                        Create Another Order
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FlaskConical className="w-5 h-5 text-blue-600" />
                        New Lab Order
                    </CardTitle>
                    <CardDescription>
                        Order laboratory tests for your patient
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Patient Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="patient">Patient</Label>
                        <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a patient" />
                            </SelectTrigger>
                            <SelectContent>
                                {patients.map(patient => (
                                    <SelectItem key={patient.id} value={patient.id.toString()}>
                                        {patient.name} (MRN: {patient.mrn})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                        <Label>Priority</Label>
                        <div className="grid grid-cols-3 gap-3">
                            {PRIORITY_OPTIONS.map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => setPriority(option.value)}
                                    className={`
                    p-3 rounded-lg border-2 text-left transition-all
                    ${priority === option.value ?
                                            option.value === 'stat' ? 'border-red-500 bg-red-50' :
                                                option.value === 'urgent' ? 'border-amber-500 bg-amber-50' :
                                                    'border-blue-500 bg-blue-50'
                                            : 'border-slate-200 hover:border-slate-300'}
                  `}
                                >
                                    <p className={`font-medium ${option.value === 'stat' ? 'text-red-700' :
                                            option.value === 'urgent' ? 'text-amber-700' :
                                                'text-slate-700'
                                        }`}>
                                        {option.label}
                                    </p>
                                    <p className="text-xs text-slate-500">{option.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Fasting */}
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="fasting"
                            checked={fasting}
                            onCheckedChange={(checked) => setFasting(checked as boolean)}
                        />
                        <Label htmlFor="fasting" className="cursor-pointer">
                            Patient will be fasting (required for some tests)
                        </Label>
                    </div>
                </CardContent>
            </Card>

            {/* Test Selection */}
            <Card>
                <CardHeader>
                    <CardTitle>Select Tests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Search and Filter */}
                    <div className="flex gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search tests by name or code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {CATEGORIES.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Test List */}
                    <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                        {filteredTests.map(test => {
                            const isSelected = selectedTests.find(t => t.id === test.id);
                            return (
                                <div
                                    key={test.id}
                                    className={`p-3 flex items-center justify-between hover:bg-slate-50 ${isSelected ? 'bg-blue-50' : ''
                                        }`}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-slate-800">{test.name}</p>
                                            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{test.code}</span>
                                        </div>
                                        <p className="text-sm text-slate-500">{test.description}</p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {test.category} • {test.turnaroundTime}
                                        </p>
                                    </div>
                                    <Button
                                        variant={isSelected ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => isSelected ? removeTest(test.id) : addTest(test)}
                                    >
                                        {isSelected ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                    </Button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Selected Tests Summary */}
                    {selectedTests.length > 0 && (
                        <div className="bg-blue-50 rounded-lg p-4">
                            <p className="font-medium text-blue-800 mb-2">
                                Selected Tests ({selectedTests.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {selectedTests.map(test => (
                                    <span
                                        key={test.id}
                                        className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full text-sm border border-blue-200"
                                    >
                                        {test.name}
                                        <button
                                            onClick={() => removeTest(test.id)}
                                            className="text-slate-400 hover:text-red-500"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Clinical Notes */}
            <Card>
                <CardHeader>
                    <CardTitle>Clinical Notes</CardTitle>
                </CardHeader>
                <CardContent>
                    <Textarea
                        placeholder="Enter clinical indication, relevant history, or special instructions..."
                        value={clinicalNotes}
                        onChange={(e) => setClinicalNotes(e.target.value)}
                        rows={4}
                    />
                </CardContent>
            </Card>

            {/* Warnings */}
            {priority === 'stat' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div>
                        <p className="font-medium text-red-800">STAT Order</p>
                        <p className="text-sm text-red-700">
                            STAT orders require immediate processing. Please ensure this is clinically necessary.
                        </p>
                    </div>
                </div>
            )}

            {/* Submit */}
            <div className="flex justify-end gap-3">
                <Button variant="outline">Cancel</Button>
                <Button
                    onClick={handleSubmit}
                    disabled={!selectedPatient || selectedTests.length === 0 || isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        <>
                            <FlaskConical className="w-4 h-4 mr-2" />
                            Submit Lab Order
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}

export default LabOrderForm;
