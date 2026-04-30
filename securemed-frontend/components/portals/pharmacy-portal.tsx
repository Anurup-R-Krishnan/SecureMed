"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  LogOut,
  CheckCircle,
  ShieldCheck,
  Search,
  QrCode,
  CameraOff,
  Pill,
  List,
} from "lucide-react";
import { pharmacyService, PharmacyOrder } from "@/services/pharmacy";
import PharmacyInventory from "./pharmacy/inventory-management";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface PharmacyPortalProps {
  onLogout: () => void;
  onSwitchRole: (role: "patient" | "doctor" | "admin" | null) => void;
  currentTab?: "dashboard" | "orders" | "inventory";
  onTabChange?: (tab: "dashboard" | "orders" | "inventory") => void;
}

export default function PharmacyPortal({
  onLogout,
  currentTab: currentTabProp,
  onTabChange,
}: PharmacyPortalProps) {
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [verifyNotes, setVerifyNotes] = useState<Record<number, string>>({});
  const [pickupCode, setPickupCode] = useState<Record<number, string>>({});
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [scanOrderId, setScanOrderId] = useState<number | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  const [activeTab, setActiveTabState] = useState<
    "dashboard" | "orders" | "inventory"
  >(currentTabProp || "dashboard");

  // Sync tab with URL when currentTab prop changes
  useEffect(() => {
    if (currentTabProp && currentTabProp !== activeTab) {
      setActiveTabState(currentTabProp);
    }
  }, [currentTabProp, activeTab]);

  // Wrapper that updates both local state and notifies parent for URL update
  const setActiveTab = (tab: "dashboard" | "orders" | "inventory") => {
    setActiveTabState(tab);
    onTabChange?.(tab);
  };

  const stats = useMemo(() => {
    const pending = orders.filter((o) => o.status === "pending").length;
    const verified = orders.filter((o) => o.status === "verified").length;
    const fulfilled = orders.filter((o) => o.status === "fulfilled").length;
    return { pending, verified, fulfilled, total: orders.length };
  }, [orders]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await pharmacyService.getOrders();
      setOrders(data);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error || "Unable to load pharmacy orders.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter(
      (o) =>
        o.pickup_code.toLowerCase().includes(term) ||
        o.patient_details.name.toLowerCase().includes(term) ||
        o.patient_details.patient_id.toLowerCase().includes(term) ||
        o.prescription_details.medication_name.toLowerCase().includes(term),
    );
  }, [orders, search]);

  const handleVerify = async (orderId: number) => {
    setWorkingId(orderId);
    try {
      await pharmacyService.verifyOrder(orderId, verifyNotes[orderId] || "");
      await fetchOrders();
      toast.success("Order verified.");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to verify order.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleFulfill = async (orderId: number) => {
    setWorkingId(orderId);
    try {
      await pharmacyService.fulfillOrder(orderId, pickupCode[orderId] || "");
      await fetchOrders();
      toast.success("Order fulfilled.");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to fulfill order.");
    } finally {
      setWorkingId(null);
    }
  };

  const closeScanner = useCallback(() => {
    setScanOrderId(null);
    setScanError(null);
    setScanning(false);
    if (videoStream) {
      videoStream.getTracks().forEach((t) => t.stop());
      setVideoStream(null);
    }
  }, [videoStream]);

  const startScan = async (orderId: number) => {
    setScanOrderId(orderId);
    setScanError(null);

    if (!("BarcodeDetector" in window)) {
      setScanError("QR scanning not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setVideoStream(stream);
      setScanning(true);
    } catch (error) {
      setScanError("Unable to access camera.");
    }
  };

  useEffect(() => {
    if (!scanning || !videoStream || scanOrderId === null) return;

    let raf = 0;
    const detector = new (window as any).BarcodeDetector({
      formats: ["qr_code"],
    });
    const videoEl = document.getElementById(
      "qr-video",
    ) as HTMLVideoElement | null;

    if (videoEl) {
      videoEl.srcObject = videoStream;
      videoEl.play().catch(() => setScanError("Failed to start camera."));
    }

    const tick = async () => {
      if (!videoEl) return;
      try {
        const codes = await detector.detect(videoEl);
        if (codes.length > 0) {
          const raw = codes[0].rawValue || "";
          const code = raw.replace("SECUREMED:RX:", "").trim();
          setPickupCode((prev) => ({ ...prev, [scanOrderId]: code }));
          closeScanner();
          return;
        }
      } catch (e) {
        setScanError("QR scan failed. Try again.");
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [scanning, videoStream, scanOrderId, closeScanner]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight capitalize">
            {activeTab}
          </h2>
          <p className="text-muted-foreground">
            Verify and fulfill prescriptions
          </p>
        </div>
      </div>

      {activeTab === "inventory" ? (
        <main className="max-w-7xl mx-auto px-6 py-8">
          <PharmacyInventory />
        </main>
      ) : activeTab === "dashboard" ? (
        <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Pharmacy Dashboard</h2>
            <p className="text-muted-foreground">
              Overview of pharmacy operations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-3xl font-bold mt-1">{stats.total}</p>
                </div>
                <List className="h-10 w-10 text-blue-500" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-3xl font-bold text-amber-500 mt-1">
                    {stats.pending}
                  </p>
                </div>
                <Pill className="h-10 w-10 text-amber-500" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Verified</p>
                  <p className="text-3xl font-bold text-blue-500 mt-1">
                    {stats.verified}
                  </p>
                </div>
                <ShieldCheck className="h-10 w-10 text-blue-500" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Fulfilled</p>
                  <p className="text-3xl font-bold text-green-500 mt-1">
                    {stats.fulfilled}
                  </p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Recent Orders</h3>
              <div className="space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {order.prescription_details.medication_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.patient_details.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        Code: {order.pickup_code}
                      </p>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          order.status === "pending"
                            ? "bg-amber-100 text-amber-700"
                            : order.status === "verified"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No orders yet
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => setActiveTab("orders")}
              >
                View All Orders
              </Button>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => setActiveTab("orders")}
                >
                  <Pill className="h-4 w-4 mr-2" />
                  Process Orders
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => setActiveTab("inventory")}
                >
                  <List className="h-4 w-4 mr-2" />
                  Manage Inventory
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={fetchOrders}
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Refresh Data
                </Button>
              </div>
            </Card>
          </div>
        </main>
      ) : (
        <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <List className="h-8 w-8 text-blue-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-amber-500">
                    {stats.pending}
                  </p>
                </div>
                <Pill className="h-8 w-8 text-amber-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Verified</p>
                  <p className="text-2xl font-bold text-blue-500">
                    {stats.verified}
                  </p>
                </div>
                <ShieldCheck className="h-8 w-8 text-blue-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Fulfilled</p>
                  <p className="text-2xl font-bold text-green-500">
                    {stats.fulfilled}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </Card>
          </div>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by pickup code, patient, or medication..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={fetchOrders}>
                Refresh
              </Button>
            </div>
          </Card>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading pharmacy orders...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No pharmacy orders found.
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((order) => (
                <Card key={order.id} className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Pickup Code
                      </p>
                      <p className="text-xl font-black tracking-widest">
                        {order.pickup_code}
                      </p>
                      <p className="text-sm text-muted-foreground">Patient</p>
                      <p className="font-medium">
                        {order.patient_details.name} (
                        {order.patient_details.patient_id})
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Medication
                      </p>
                      <p className="font-semibold">
                        {order.prescription_details.medication_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.prescription_details.dosage} ·{" "}
                        {order.prescription_details.frequency} ·{" "}
                        {order.prescription_details.duration}
                      </p>
                    </div>

                    <div className="min-w-[260px] space-y-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                          Status
                        </p>
                        <p className="font-semibold">{order.status}</p>
                      </div>
                      <div>
                        <Input
                          placeholder="Verification notes (optional)"
                          value={verifyNotes[order.id] || ""}
                          onChange={(e) =>
                            setVerifyNotes({
                              ...verifyNotes,
                              [order.id]: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleVerify(order.id)}
                          disabled={
                            workingId === order.id || order.status !== "pending"
                          }
                        >
                          <ShieldCheck className="h-4 w-4 mr-2" />
                          Verify
                        </Button>
                        <Button
                          onClick={() => handleFulfill(order.id)}
                          disabled={
                            workingId === order.id ||
                            order.status !== "verified"
                          }
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Fulfill
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Scan/enter pickup code"
                          value={pickupCode[order.id] || ""}
                          onChange={(e) =>
                            setPickupCode({
                              ...pickupCode,
                              [order.id]: e.target.value,
                            })
                          }
                        />
                        <Button
                          variant="outline"
                          onClick={() => startScan(order.id)}
                        >
                          <QrCode className="h-4 w-4 mr-2" />
                          Scan
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </main>
      )}

      <Dialog open={scanOrderId !== null} onOpenChange={closeScanner}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Scan Pickup QR Code</DialogTitle>
            <DialogDescription>
              Point the camera at the QR code on the patient’s pickup slip.
            </DialogDescription>
          </DialogHeader>
          <div className="aspect-video w-full rounded-lg border border-border bg-black/90 flex items-center justify-center">
            {scanError ? (
              <div className="text-center text-sm text-destructive flex flex-col items-center gap-2">
                <CameraOff className="h-6 w-6" />
                {scanError}
              </div>
            ) : (
              <video
                id="qr-video"
                className="h-full w-full object-cover rounded-lg"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeScanner}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
