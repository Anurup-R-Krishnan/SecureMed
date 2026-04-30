"use client";

import React, { useMemo, useState } from "react";
import { WardMap, RoomData } from "@/components/features/ward/ward-map";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Filter } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function WardMapPage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<
    "all" | "occupied" | "empty" | "critical" | "warning" | "stable"
  >("all");
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [reportOpen, setReportOpen] = useState(false);

  const occupancyStats = useMemo(() => {
    const total = rooms.length || 0;
    const occupied = rooms.filter((room) => room.isOccupied).length;
    const critical = rooms.filter((room) => room.acuity === "critical").length;
    const occupancyPercent = total ? Math.round((occupied / total) * 100) : 0;
    return {
      total,
      occupied,
      critical,
      occupancyPercent,
    };
  }, [rooms]);

  const handleDownloadReport = () => {
    if (rooms.length === 0) {
      toast({
        title: "No data available",
        description: "Ward occupancy data is still loading.",
        variant: "destructive",
      });
      return;
    }
    const header = ["Room", "Occupied", "Patient", "Acuity", "Isolation"];
    const lines = rooms.map((room) => [
      room.id,
      room.isOccupied ? "Yes" : "No",
      room.patientName || "",
      room.acuity || "",
      room.isIsolation ? "Yes" : "No",
    ]);
    const csv = [header, ...lines]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ward_occupancy_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/doctor/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              Live Ward Map
            </h1>
            <p className="text-muted-foreground">ICU & Critical Care Units</p>
          </div>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" /> Filter View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilter("all")}>
                All Rooms
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("occupied")}>
                Occupied
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("empty")}>
                Empty
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("critical")}>
                Critical
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("stable")}>
                Stable
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setReportOpen(true)}>Occupancy Report</Button>
        </div>
      </div>

      <WardMap filter={filter} onRoomsChange={setRooms} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="p-4 bg-card border rounded-xl">
          <h3 className="font-bold text-lg mb-2">Unit Capacity</h3>
          <div className="text-4xl font-black text-primary">
            {occupancyStats.occupancyPercent}%
          </div>
          <div className="text-sm text-muted-foreground">
            {occupancyStats.occupied}/{occupancyStats.total || 12} Beds Occupied
          </div>
        </div>
        <div className="p-4 bg-card border rounded-xl">
          <h3 className="font-bold text-lg mb-2">Critical Cases</h3>
          <div className="text-4xl font-black text-red-500">
            {occupancyStats.critical}
          </div>
          <div className="text-sm text-muted-foreground">
            Requires immediate attention
          </div>
        </div>
        <div className="p-4 bg-card border rounded-xl">
          <h3 className="font-bold text-lg mb-2">Staffing</h3>
          <div className="text-4xl font-black text-green-500">1:3</div>
          <div className="text-sm text-muted-foreground">
            Nurse to Patient Ratio
          </div>
        </div>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ward Occupancy Report</DialogTitle>
            <DialogDescription>
              Summary of current ward utilization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Rooms</span>
              <span className="font-medium">{occupancyStats.total || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Occupied</span>
              <span className="font-medium">{occupancyStats.occupied}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Empty</span>
              <span className="font-medium">
                {Math.max(0, occupancyStats.total - occupancyStats.occupied)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Critical Cases</span>
              <span className="font-medium">{occupancyStats.critical}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Occupancy %</span>
              <span className="font-medium">
                {occupancyStats.occupancyPercent}%
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>
              Close
            </Button>
            <Button onClick={handleDownloadReport}>Download CSV</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
