"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/context/auth-context";
import { apiClient } from "@/lib/unified-api-client";
import { useToast } from "@/hooks/use-toast";
import MfaSetup from "@/components/auth/mfa-setup";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  Shield,
  Bell,
  Moon,
  Camera,
  Lock,
  Smartphone,
} from "lucide-react";
import { Switch } from "@/components/ui/switch"; // Assuming we have this or need to make one. Standard switch is fine for now.

export default function SettingsPage() {
  const { user, refreshUserStatus } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [initialProfile, setInitialProfile] = useState({
    fullName: "",
    email: "",
    specialty: "",
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [initialAvatar, setInitialAvatar] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!user) return;
    const name =
      [user.first_name, user.last_name].filter(Boolean).join(" ") ||
      user.username ||
      "";
    const specialtyDisplay =
      user.doctor_profile?.specialization_display ||
      user.doctor_profile?.specialization ||
      "";
    setFullName(name);
    setEmail(user.email || "");
    setSpecialty(specialtyDisplay);
    setInitialProfile({
      fullName: name,
      email: user.email || "",
      specialty: specialtyDisplay,
    });

    const key = `doctor_avatar_${user.id}`;
    const storedAvatar = localStorage.getItem(key);
    setAvatarPreview(storedAvatar);
    setInitialAvatar(storedAvatar);
  }, [user]);

  const handleAvatarChange = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image under 2MB.",
        variant: "destructive",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      toast({
        title: "Missing name",
        description: "Please enter your full name.",
        variant: "destructive",
      });
      return;
    }

    const parts = trimmedName.split(/\s+/);
    const firstName = parts.shift() || "";
    const lastName = parts.join(" ");
    const emailValue = email.trim();

    setSavingProfile(true);
    try {
      await apiClient.put("/auth/user/", {
        first_name: firstName,
        last_name: lastName,
        email: emailValue,
      });

      const key = `doctor_avatar_${user.id}`;
      if (avatarPreview) {
        localStorage.setItem(key, avatarPreview);
      } else {
        localStorage.removeItem(key);
      }

      setInitialProfile({
        fullName: trimmedName,
        email: emailValue,
        specialty,
      });
      setInitialAvatar(avatarPreview);
      await refreshUserStatus();
      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description:
          error?.response?.data?.error || "Could not save profile changes.",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancel = () => {
    setFullName(initialProfile.fullName);
    setEmail(initialProfile.email);
    setSpecialty(initialProfile.specialty);
    setAvatarPreview(initialAvatar);
  };

  const handlePasswordUpdate = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    setSavingPassword(true);
    try {
      await apiClient.post("/auth/user/password/", {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Password update failed",
        description:
          error?.response?.data?.error || "Could not update password.",
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const isDirty =
    fullName !== initialProfile.fullName ||
    email !== initialProfile.email ||
    avatarPreview !== initialAvatar;

  return (
    <div className="space-y-6 pb-20">
      {/* Header with Glass Effect */}
      <div className="sticky top-0 z-20 -mx-6 px-6 py-4 bg-background/80 backdrop-blur-xl border-b border-border/40 flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-foreground tracking-tight">
            System Configuration
          </h3>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            User Profile & Security
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex"
            onClick={handleCancel}
            disabled={savingProfile}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="gap-2 shadow-lg shadow-primary/20"
            onClick={handleSaveProfile}
            disabled={savingProfile || !isDirty}
          >
            {savingProfile ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px] bg-muted/20 p-1 rounded-xl">
          <TabsTrigger
            value="profile"
            className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <User className="h-4 w-4" /> Profile
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Shield className="h-4 w-4" /> Security
          </TabsTrigger>
          <TabsTrigger
            value="preferences"
            className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Bell className="h-4 w-4" /> Prefs
          </TabsTrigger>
        </TabsList>

        {/* PROFILE TAB */}
        <TabsContent
          value="profile"
          className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <div className="grid gap-6 md:grid-cols-2">
            {/* Avatar Card */}
            <div className="col-span-2 md:col-span-1 bg-card border rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div
                className="h-32 w-32 rounded-full bg-muted border-4 border-background shadow-xl relative cursor-pointer overflow-hidden group/avatar"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Doctor avatar"
                    fill
                    sizes="128px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-4xl font-black text-muted-foreground bg-slate-100 dark:bg-slate-800">
                    DR
                  </div>
                )}
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                  <Camera className="h-8 w-8 text-white" />
                </div>
              </div>
              <div>
                <h4 className="font-bold text-lg">{fullName || "Doctor"}</h4>
                <p className="text-sm text-muted-foreground">
                  {specialty || "Specialist"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-3 w-3" /> Change Photo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarChange(file);
                  e.currentTarget.value = "";
                }}
              />
            </div>

            {/* Details Form */}
            <div className="col-span-2 md:col-span-1 bg-card border rounded-2xl p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialty">Specialty</Label>
                <Input
                  id="specialty"
                  value={specialty}
                  disabled
                  className="bg-muted/50"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* SECURITY TAB */}
        <TabsContent
          value="security"
          className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
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
                Secure your account by enabling time-based OTP verification.
                This is mandatory for all clinical staff accessing patient
                records.
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
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <div className="flex justify-end mt-2">
                  <Button
                    variant="secondary"
                    onClick={handlePasswordUpdate}
                    disabled={
                      savingPassword ||
                      !currentPassword ||
                      !newPassword ||
                      !confirmPassword
                    }
                  >
                    {savingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* PREFERENCES TAB */}
        <TabsContent
          value="preferences"
          className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <div className="bg-card border rounded-2xl p-6">
            <h4 className="font-bold text-lg mb-6 flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Alert Preferences
            </h4>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Critical Lab Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications for critical lab results
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Shift Handoffs</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when a resident transfers a patient to your service
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">System Announcements</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive updates about system maintenance
                  </p>
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
