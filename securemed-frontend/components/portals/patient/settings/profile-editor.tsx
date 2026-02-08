'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, User } from 'lucide-react';
import api from '@/lib/api';

interface PatientProfile {
    id: number;
    user_first_name: string;
    user_last_name: string;
    user_email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    emergency_contact: string;
    allergies: string;
    current_medications: string;
}

export default function ProfileEditor() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<PatientProfile | null>(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('auth_tokens') ? JSON.parse(localStorage.getItem('auth_tokens')!).access : null;
            if (!token) return;

            const response = await api.get('/patients/profile/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProfile(response.data);
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            toast({
                title: "Error",
                description: "Failed to load profile data.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        setSaving(true);
        try {
            const token = localStorage.getItem('auth_tokens') ? JSON.parse(localStorage.getItem('auth_tokens')!).access : null;

            await api.put('/patients/profile/', profile, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast({
                title: "Success",
                description: "Profile updated successfully.",
            });
        } catch (error) {
            console.error('Failed to update profile:', error);
            toast({
                title: "Error",
                description: "Failed to update profile.",
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: keyof PatientProfile, value: string) => {
        if (profile) {
            setProfile({ ...profile, [field]: value });
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading profile...</div>;
    }

    if (!profile) {
        return <div className="p-8 text-center text-muted-foreground">Profile not found.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Profile Settings</h2>
                    <p className="text-muted-foreground">
                        Manage your personal information and contact details.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSave}>
                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Personal Information</CardTitle>
                            <CardDescription>
                                Your basic identification details. Contact support to change your name or email.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input id="firstName" value={profile.user_first_name} disabled className="bg-muted" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input id="lastName" value={profile.user_last_name} disabled className="bg-muted" />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" value={profile.user_email} disabled className="bg-muted" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Contact Details</CardTitle>
                            <CardDescription>
                                How we can reach you.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    value={profile.phone}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    placeholder="+1 (555) 000-0000"
                                />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="address">Address</Label>
                                <Textarea
                                    id="address"
                                    value={profile.address}
                                    onChange={(e) => handleChange('address', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Input
                                    id="city"
                                    value={profile.city}
                                    onChange={(e) => handleChange('city', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state">State</Label>
                                <Input
                                    id="state"
                                    value={profile.state}
                                    onChange={(e) => handleChange('state', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="zip">ZIP / Postal Code</Label>
                                <Input
                                    id="zip"
                                    value={profile.postal_code}
                                    onChange={(e) => handleChange('postal_code', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="country">Country</Label>
                                <Input
                                    id="country"
                                    value={profile.country}
                                    onChange={(e) => handleChange('country', e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Emergency Info</CardTitle>
                            <CardDescription>
                                Critical information for emergency situations.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="emergency_contact">Emergency Contact (Phone)</Label>
                                <Input
                                    id="emergency_contact"
                                    value={profile.emergency_contact}
                                    onChange={(e) => handleChange('emergency_contact', e.target.value)}
                                    placeholder="Emergency contact number"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="allergies">Allergies</Label>
                                <Textarea
                                    id="allergies"
                                    value={profile.allergies}
                                    onChange={(e) => handleChange('allergies', e.target.value)}
                                    placeholder="List any allergies..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="medications">Current Medications</Label>
                                <Textarea
                                    id="medications"
                                    value={profile.current_medications}
                                    onChange={(e) => handleChange('current_medications', e.target.value)}
                                    placeholder="List current medications..."
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
