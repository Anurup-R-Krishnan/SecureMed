"use client";

import { useState, useEffect } from "react";
import {
  RefreshCw,
  AlertTriangle,
  Check,
  Clock,
  FlaskConical,
  AlertCircle,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface WorklistItem {
  id: number;
  sample_id: string;
  test_code: string;
  test_name: string;
  category: string;
  priority: string;
  priority_display: string;
  fasting_required: boolean;
  ordered_at: string;
  status: string;
}

interface ResultEntryForm {
  result_value: string;
  units: string;
  reference_range: string;
  flag: string;
  notes: string;
}

const priorityColors: Record<string, string> = {
  routine: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  urgent:
    "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  stat: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

const categoryColors: Record<string, string> = {
  Hematology: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Chemistry: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Endocrine:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Urinalysis:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Coagulation:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Microbiology:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Molecular:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  Other: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

export default function LabTechnicianWorklist() {
  const [worklist, setWorklist] = useState<WorklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<WorklistItem | null>(null);
  const [resultForm, setResultForm] = useState<ResultEntryForm>({
    result_value: "",
    units: "",
    reference_range: "",
    flag: "",
    notes: "",
  });
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const fetchWorklist = async () => {
    setLoading(true);
    try {
      const response = await api.get("/labs/worklist/");
      setWorklist(response.data);
    } catch (error) {
      toast.error("Unable to load lab worklist.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorklist();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchWorklist, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmitResult = async () => {
    if (!selectedItem || !resultForm.result_value) return;

    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append("test_code", selectedItem.test_code);
      payload.append("result_value", resultForm.result_value);
      payload.append("units", resultForm.units || "");
      payload.append("reference_range", resultForm.reference_range || "");
      payload.append("flag", resultForm.flag || "");
      payload.append("notes", resultForm.notes || "");
      if (attachment) {
        payload.append("file_attachment", attachment);
      }

      const response = await api.post(
        `/labs/worklist/${selectedItem.id}/enter_result/`,
        payload,
      );

      if (response.data.success) {
        // Remove from worklist if completed
        setWorklist((prev) =>
          prev.filter(
            (item) =>
              !(
                item.id === selectedItem.id &&
                item.test_code === selectedItem.test_code
              ),
          ),
        );
        setSelectedItem(null);
        setResultForm({
          result_value: "",
          units: "",
          reference_range: "",
          flag: "",
          notes: "",
        });
        setAttachment(null);

        // Show alert for critical values
        if (response.data.is_critical) {
          toast.error(
            "Critical value detected. Alert sent to ordering physician.",
          );
        } else {
          toast.success("Result submitted");
        }
      }
    } catch (error) {
      toast.error("Failed to submit result");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFlagCritical = async (resultId: number) => {
    try {
      await api.post(`/labs/worklist/${resultId}/flag_critical/`);
      toast.error(
        "Result flagged as critical. Alert sent to ordering physician.",
      );
    } catch (error) {
      toast.error("Failed to flag result as critical");
    }
  };

  // Filter worklist
  const filteredWorklist = worklist.filter((item) => {
    if (filterCategory !== "all" && item.category !== filterCategory)
      return false;
    if (filterPriority !== "all" && item.priority !== filterPriority)
      return false;
    return true;
  });

  // Get unique categories for filter
  const categories = ["all", ...new Set(worklist.map((item) => item.category))];

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <FlaskConical className="h-8 w-8 text-primary" />
            Lab Worklist
          </h1>
          <p className="text-muted-foreground">
            Blinded sample processing - Patient names hidden for privacy
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {filteredWorklist.length} pending sample
            {filteredWorklist.length !== 1 ? "s" : ""}
          </div>
          <Button variant="outline" onClick={fetchWorklist} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Privacy Notice */}
      <Card className="p-4 mb-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900 dark:text-blue-100">
              Blinded Processing Mode
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Patient identities are hidden. You can only see Sample IDs to
              ensure unbiased processing and maintain HIPAA/GDPR compliance.
            </p>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === "all" ? "All Categories" : cat}
            </option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm"
        >
          <option value="all">All Priorities</option>
          <option value="stat">STAT Only</option>
          <option value="urgent">Urgent Only</option>
          <option value="routine">Routine Only</option>
        </select>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Worklist Table */}
        <div className="lg:col-span-2">
          <div className="rounded-[24px] border border-border/60 overflow-hidden shadow-sm bg-card flex flex-col h-[600px]">
            <div className="overflow-y-auto custom-scrollbar flex-1">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border/60 sticky top-0 backdrop-blur-md z-10">
                  <tr>
                    <th className="px-6 py-4">Sample Details</th>
                    <th className="px-6 py-4">Test Info</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredWorklist.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-12 text-center text-muted-foreground"
                      >
                        <Check className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                        <p className="font-bold text-lg">
                          All samples processed!
                        </p>
                        <p className="text-sm opacity-70">
                          No pending tests in the queue.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredWorklist.map((item, index) => (
                      <tr
                        key={`${item.id}-${item.test_code}-${index}`}
                        className={`transition-all duration-200 cursor-pointer group ${
                          selectedItem?.id === item.id &&
                          selectedItem?.test_code === item.test_code
                            ? "bg-primary/5 border-l-4 border-l-primary"
                            : "hover:bg-muted/30 border-l-4 border-l-transparent"
                        }`}
                        onClick={() => setSelectedItem(item)}
                      >
                        <td className="px-6 py-4">
                          <div className="font-mono font-bold text-foreground group-hover:text-primary transition-colors">
                            {item.sample_id}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(item.ordered_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground">
                            {item.test_code}
                          </div>
                          <div
                            className="text-xs text-muted-foreground max-w-[150px] truncate"
                            title={item.test_name}
                          >
                            {item.test_name}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "rounded-md font-medium px-2",
                              categoryColors[item.category] ||
                                categoryColors.Other,
                            )}
                          >
                            {item.category}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-md border-0 uppercase text-[10px] tracking-wider",
                                priorityColors[item.priority],
                                item.priority === "stat" &&
                                  "animate-pulse ring-1 ring-red-400/50 shadow-[0_0_8px_rgba(248,113,113,0.3)]",
                              )}
                            >
                              {item.priority_display}
                            </Badge>
                            {item.fasting_required && (
                              <span
                                className="text-xs text-orange-500 animate-pulse"
                                title="Fasting Required"
                              >
                                🍽️
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            size="sm"
                            variant={
                              selectedItem?.id === item.id ? "default" : "ghost"
                            }
                            className={cn(
                              "rounded-full h-8 px-4",
                              selectedItem?.id !== item.id &&
                                "hover:bg-primary/10 hover:text-primary",
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem(item);
                            }}
                          >
                            Result
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Result Entry Form */}
        <div>
          <Card className="p-6 sticky top-4">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              Enter Result
            </h2>

            {selectedItem ? (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-mono font-bold text-lg">
                    {selectedItem.sample_id}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedItem.test_code} - {selectedItem.test_name}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Result Value *
                  </label>
                  <input
                    type="text"
                    value={resultForm.result_value}
                    onChange={(e) =>
                      setResultForm((prev) => ({
                        ...prev,
                        result_value: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    placeholder="e.g., 5.2, Positive, Normal"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Units
                    </label>
                    <input
                      type="text"
                      value={resultForm.units}
                      onChange={(e) =>
                        setResultForm((prev) => ({
                          ...prev,
                          units: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                      placeholder="mg/dL"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Reference Range
                    </label>
                    <input
                      type="text"
                      value={resultForm.reference_range}
                      onChange={(e) =>
                        setResultForm((prev) => ({
                          ...prev,
                          reference_range: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                      placeholder="4.0-10.0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Flag</label>
                  <select
                    value={resultForm.flag}
                    onChange={(e) =>
                      setResultForm((prev) => ({
                        ...prev,
                        flag: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                  >
                    <option value="">Normal</option>
                    <option value="Low">Low</option>
                    <option value="High">High</option>
                    <option value="Critical">⚠️ Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Notes
                  </label>
                  <textarea
                    value={resultForm.notes}
                    onChange={(e) =>
                      setResultForm((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background resize-none"
                    rows={2}
                    placeholder="Additional observations..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Attach Report (PDF/JPG/PNG/DCM/DOCX/XLSX)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.dcm,.docx,.xlsx"
                    className="w-full text-sm"
                    onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                  />
                  {attachment && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Selected: {attachment.name}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmitResult}
                    disabled={submitting || !resultForm.result_value}
                    className="flex-1"
                  >
                    {submitting ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Submit Result
                  </Button>
                </div>

                {resultForm.flag === "Critical" && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Critical value will trigger immediate physician alert
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a sample from the worklist to enter results</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
