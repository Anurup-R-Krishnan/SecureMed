'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LogOut, CheckCircle, ShieldCheck, Search, QrCode, CameraOff } from 'lucide-react';
import { pharmacyService, PharmacyOrder } from '@/services/pharmacy';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface PharmacyPortalProps {
  onLogout: () => void;
  onSwitchRole: (role: 'patient' | 'doctor' | 'admin' | null) => void;
}

export default function PharmacyPortal({ onLogout }: PharmacyPortalProps) {
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [verifyNotes, setVerifyNotes] = useState<Record<number, string>>({});
  const [pickupCode, setPickupCode] = useState<Record<number, string>>({});
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [scanOrderId, setScanOrderId] = useState<number | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await pharmacyService.getOrders();
      setOrders(data);
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
    return orders.filter((o) =>
      o.pickup_code.toLowerCase().includes(term) ||
      o.patient_details.name.toLowerCase().includes(term) ||
      o.patient_details.patient_id.toLowerCase().includes(term) ||
      o.prescription_details.medication_name.toLowerCase().includes(term)
    );
  }, [orders, search]);

  const handleVerify = async (orderId: number) => {
    setWorkingId(orderId);
    try {
      await pharmacyService.verifyOrder(orderId, verifyNotes[orderId] || '');
      await fetchOrders();
    } finally {
      setWorkingId(null);
    }
  };

  const handleFulfill = async (orderId: number) => {
    setWorkingId(orderId);
    try {
      await pharmacyService.fulfillOrder(orderId, pickupCode[orderId] || '');
      await fetchOrders();
    } finally {
      setWorkingId(null);
    }
  };

  const closeScanner = () => {
    setScanOrderId(null);
    setScanError(null);
    setScanning(false);
    if (videoStream) {
      videoStream.getTracks().forEach((t) => t.stop());
      setVideoStream(null);
    }
  };

  const startScan = async (orderId: number) => {
    setScanOrderId(orderId);
    setScanError(null);

    if (!('BarcodeDetector' in window)) {
      setScanError('QR scanning not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setVideoStream(stream);
      setScanning(true);
    } catch (error) {
      setScanError('Unable to access camera.');
    }
  };

  useEffect(() => {
    if (!scanning || !videoStream || scanOrderId === null) return;

    let raf = 0;
    const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
    const videoEl = document.getElementById('qr-video') as HTMLVideoElement | null;

    if (videoEl) {
      videoEl.srcObject = videoStream;
      videoEl.play().catch(() => setScanError('Failed to start camera.'));
    }

    const tick = async () => {
      if (!videoEl) return;
      try {
        const codes = await detector.detect(videoEl);
        if (codes.length > 0) {
          const raw = codes[0].rawValue || '';
          const code = raw.replace('SECUREMED:RX:', '').trim();
          setPickupCode((prev) => ({ ...prev, [scanOrderId]: code }));
          closeScanner();
          return;
        }
      } catch (e) {
        setScanError('QR scan failed. Try again.');
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [scanning, videoStream, scanOrderId]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">Pharmacy Console</h1>
            <p className="text-sm text-muted-foreground">Verify and fulfill prescriptions</p>
          </div>
          <Button variant="outline" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
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
            <Button variant="outline" onClick={fetchOrders}>Refresh</Button>
          </div>
        </Card>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading pharmacy orders...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No pharmacy orders found.</div>
        ) : (
          <div className="space-y-4">
            {filtered.map((order) => (
              <Card key={order.id} className="p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Pickup Code</p>
                    <p className="text-xl font-black tracking-widest">{order.pickup_code}</p>
                    <p className="text-sm text-muted-foreground">Patient</p>
                    <p className="font-medium">{order.patient_details.name} ({order.patient_details.patient_id})</p>
                    <p className="text-sm text-muted-foreground mt-2">Medication</p>
                    <p className="font-semibold">{order.prescription_details.medication_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.prescription_details.dosage} · {order.prescription_details.frequency} · {order.prescription_details.duration}
                    </p>
                  </div>

                  <div className="min-w-[260px] space-y-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Status</p>
                      <p className="font-semibold">{order.status}</p>
                    </div>
                    <div>
                      <Input
                        placeholder="Verification notes (optional)"
                        value={verifyNotes[order.id] || ''}
                        onChange={(e) => setVerifyNotes({ ...verifyNotes, [order.id]: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleVerify(order.id)}
                        disabled={workingId === order.id || order.status !== 'pending'}
                      >
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        Verify
                      </Button>
                      <Button
                        onClick={() => handleFulfill(order.id)}
                        disabled={workingId === order.id || order.status === 'fulfilled'}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Fulfill
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Scan/enter pickup code"
                        value={pickupCode[order.id] || ''}
                        onChange={(e) => setPickupCode({ ...pickupCode, [order.id]: e.target.value })}
                      />
                      <Button variant="outline" onClick={() => startScan(order.id)}>
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

      <Dialog open={scanOrderId !== null} onOpenChange={closeScanner}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Scan Pickup QR Code</DialogTitle>
            <DialogDescription>Point the camera at the QR code on the patient’s pickup slip.</DialogDescription>
          </DialogHeader>
          <div className="aspect-video w-full rounded-lg border border-border bg-black/90 flex items-center justify-center">
            {scanError ? (
              <div className="text-center text-sm text-destructive flex flex-col items-center gap-2">
                <CameraOff className="h-6 w-6" />
                {scanError}
              </div>
            ) : (
              <video id="qr-video" className="h-full w-full object-cover rounded-lg" />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeScanner}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
