'use client';

import React, { useState } from 'react';
import MfaSetup from '@/components/auth/mfa-setup';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Shield, Bell, Moon, Camera, Lock, Smartphone } from 'lucide-react';
import { Switch } from '@/components/ui/switch'; // Assuming we have this or need to make one. Standard switch is fine for now.

export default function SettingsPage() {
    const [isLoading, setIsLoading] = useState(false);

    return (
        <div className="space-y-6 pb-20">
            {/* Header with Glass Effect */}
            <div className="sticky top-0 z-20 -mx-6 px-6 py-4 bg-background/80 backdrop-blur-xl border-b border-border/40 flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-black text-foreground tracking-tight">System Configuration</h3>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">User Profile & Security</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="hidden sm:flex">Cancel</Button>
                    <Button size="sm" className="gap-2 shadow-lg shadow-primary/20">
                        Save Changes
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="profile" className="w-full space-y-6">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px] bg-muted/20 p-1 rounded-xl">
                    <TabsTrigger value="profile" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <User className="h-4 w-4" /> Profile
                    </TabsTrigger>
                    <TabsTrigger value="security" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <Shield className="h-4 w-4" /> Security
                    </TabsTrigger>
                    <TabsTrigger value="preferences" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <Bell className="h-4 w-4" /> Prefs
                    </TabsTrigger>
                </TabsList>

                {/* PROFILE TAB */}
                <TabsContent value="profile" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Avatar Card */}
                        <div className="col-span-2 md:col-span-1 bg-card border rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="h-32 w-32 rounded-full bg-muted border-4 border-background shadow-xl relative cursor-pointer overflow-hidden group/avatar">
                                {/* Placeholder Avatar */}
                                <div className="absolute inset-0 flex items-center justify-center text-4xl font-black text-muted-foreground bg-slate-100 dark:bg-slate-800">
                                    DR
                                </div>
                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                                    <Camera className="h-8 w-8 text-white" />
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-lg">Dr. Anurup Krishnan</h4>
                                <p className="text-sm text-muted-foreground">Chief of Cardiology</p>
                            </div>
                            <Button variant="outline" size="sm" className="gap-2">
                                <Camera className="h-3 w-3" /> Change Photo
                            </Button>
                        </div>

                        {/* Details Form */}
                        <div className="col-span-2 md:col-span-1 bg-card border rounded-2xl p-6 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input id="name" defaultValue="Anurup Krishnan" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input id="email" type="email" defaultValue="dr.krishnan@securemed.com" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="specialty">Specialty</Label>
                                <Input id="specialty" defaultValue="Cardiology" disabled className="bg-muted/50" />
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* SECURITY TAB */}
                <TabsContent value="security" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid gap-6">
                        {/* MFA Section */}
                        <div className="bg-card border rounded-2xl p-6 overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Shield className="h-32 w-32" />
                            </div>
                            <h4 className="font-bold text-lg mb-1 relative z-10 flex items-center gap-2">
                                <Smartphone className="h-5 w-5 text-primary" />
                                Two-Factor Authentication
                            </h4>
                            <p className="text-sm text-muted-foreground mb-6 relative z-10 max-w-lg">
                                Secure your account by enabling time-based OTP verification. This is mandatory for all clinical staff accessing patient records.
                            </p>

                            <div className="relative z-10 bg-background/50 backdrop-blur-sm rounded-xl p-4 border">
                                <MfaSetup />
                            </div>
                        </div>

                        {/* Password Change */}
                        <div className="bg-card border rounded-2xl p-6">
                            <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <Lock className="h-5 w-5 text-primary" />
                                Change Password
                            </h4>
                            <div className="grid gap-4 max-w-md">
                                <div className="space-y-2">
                                    <Label>Current Password</Label>
                                    <Input type="password" />
                                </div>
                                <div className="space-y-2">
                                    <Label>New Password</Label>
                                    <Input type="password" />
                                </div>
                                <div className="flex justify-end mt-2">
                                    <Button variant="secondary">Update Password</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* PREFERENCES TAB */}
                <TabsContent value="preferences" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-card border rounded-2xl p-6">
                        <h4 className="font-bold text-lg mb-6 flex items-center gap-2">
                            <Bell className="h-5 w-5 text-primary" />
                            Alert Preferences
                        </h4>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Critical Lab Alerts</Label>
                                    <p className="text-sm text-muted-foreground">Receive push notifications for critical lab results</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Shift Handoffs</Label>
                                    <p className="text-sm text-muted-foreground">Notify when a resident transfers a patient to your service</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">System Announcements</Label>
                                    <p className="text-sm text-muted-foreground">Receive updates about system maintenance</p>
                                </div>
                                <Switch />
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
