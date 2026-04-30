"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Clock,
  Plus,
  Minus,
  Calendar as CalendarIcon,
  Save,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  appointmentService,
  DoctorAvailabilitySlot,
} from "@/services/appointments";
import { useAuth } from "@/context/auth-context";

interface TimeSlotConfig {
  id: string;
  startTime: string;
  endTime: string;
  type: "available" | "surgery" | "break";
}

export default function AvailabilityManager() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [slots, setSlots] = useState<TimeSlotConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const loadSchedule = async () => {
      if (!selectedDate || !isAuthenticated) return;
      setIsLoading(true);
      try {
        const dateStr = formatDate(selectedDate);
        const scheduleSlots =
          await appointmentService.getDoctorSchedule(dateStr);
        if (scheduleSlots.length > 0) {
          setSlots(
            scheduleSlots.map((slot) => ({
              id: slot.id?.toString() || Math.random().toString(),
              startTime: slot.startTime,
              endTime: slot.endTime,
              type: slot.type,
            })),
          );
        } else {
          setSlots([]);
        }
      } catch (error) {
        toast({
          title: "Load Failed",
          description: "Unable to load availability for this date.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSchedule();
  }, [selectedDate, isAuthenticated, toast]);

  const handleSave = async () => {
    if (!selectedDate) {
      toast({
        title: "Error",
        description: "Please select a date first",
        variant: "destructive",
      });
      return;
    }

    if (slots.length === 0) {
      toast({
        title: "Warning",
        description: "You are saving an empty schedule (day off).",
      });
    }

    setIsLoading(true);
    try {
      const dateStr = formatDate(selectedDate);
      const doctorSlots: DoctorAvailabilitySlot[] = slots.map((s) => ({
        startTime: s.startTime,
        endTime: s.endTime,
        type: s.type,
      }));

      await appointmentService.saveDoctorSchedule(dateStr, doctorSlots);

      toast({
        title: "Success",
        description: `Schedule saved for ${dateStr}`,
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not save your availability changes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addSlot = () => {
    setSlots([
      ...slots,
      {
        id: Math.random().toString(),
        startTime: "09:00",
        endTime: "10:00",
        type: "available",
      },
    ]);
  };

  const removeSlot = (id: string) => {
    setSlots(slots.filter((s) => s.id !== id));
  };

  const updateSlot = (
    id: string,
    field: keyof TimeSlotConfig,
    value: string,
  ) => {
    setSlots(slots.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="p-6 lg:col-span-1">
        <div className="mb-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Select Date
          </h3>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border bg-card"
          />
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleSave}
            className="w-full gap-2"
            disabled={isLoading || !selectedDate}
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Schedule
          </Button>

          <div className="bg-muted/30 p-4 rounded-lg text-sm text-muted-foreground space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Set recurring hours in Settings</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span>Changes apply immediately</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 lg:col-span-2">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Daily Schedule
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedDate ? selectedDate.toDateString() : "Select a date"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={addSlot}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Slot
          </Button>
        </div>

        <div className="space-y-3">
          {slots.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
              <Clock className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p>No availability slots configured for this date.</p>
              <Button variant="link" onClick={addSlot}>
                Add your first slot
              </Button>
            </div>
          ) : (
            slots.map((slot, index) => (
              <div
                key={slot.id}
                className="flex items-center gap-3 bg-muted/20 p-3 rounded-lg border"
              >
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) =>
                      updateSlot(slot.id, "startTime", e.target.value)
                    }
                    className="bg-background border rounded px-2 py-1 text-sm w-28"
                  />
                  <span className="text-muted-foreground">to</span>
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) =>
                      updateSlot(slot.id, "endTime", e.target.value)
                    }
                    className="bg-background border rounded px-2 py-1 text-sm w-28"
                  />
                </div>

                <select
                  value={slot.type}
                  onChange={(e) =>
                    updateSlot(slot.id, "type", e.target.value as any)
                  }
                  className="bg-background border rounded px-3 py-1 text-sm min-w-[120px]"
                >
                  <option value="available">Available</option>
                  <option value="surgery">Surgery</option>
                  <option value="break">Break</option>
                </select>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSlot(slot.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
