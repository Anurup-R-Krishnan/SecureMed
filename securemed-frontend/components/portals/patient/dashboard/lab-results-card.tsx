"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Microscope, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/unified-api-client";
import { useToast } from "@/components/ui/use-toast";
import { API_ORIGIN } from "@/lib/urls";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LabResult {
  id: number;
  test_name: string;
  result_value: string;
  reference_range: string;
  units: string;
  flag: string;
  date: string | null;
}

interface LabResultsCardProps {
  results: LabResult[];
  onNavigate: (tab: any, params?: Record<string, string>) => void;
}

export default function LabResultsCard({
  results,
  onNavigate,
}: LabResultsCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<LabResult | null>(null);
  const { toast } = useToast();
  const getFlagIcon = (flag: string) => {
    const normalizedFlag = flag.toLowerCase();
    if (normalizedFlag.includes("high"))
      return <TrendingUp className="h-3 w-3" />;
    if (normalizedFlag.includes("low"))
      return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getFlagColor = (flag: string) => {
    const normalizedFlag = flag.toLowerCase();
    if (normalizedFlag.includes("critical"))
      return "bg-red-50 text-red-700 border-red-200";
    if (normalizedFlag.includes("high"))
      return "bg-orange-50 text-orange-700 border-orange-200";
    if (normalizedFlag.includes("low"))
      return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-green-50 text-green-700 border-green-200";
  };

  const handleViewAttachment = async (id: number) => {
    try {
      const res = await apiClient.get(`/labs/results/${id}/presigned/`);
      const url = res.data?.url as string | undefined;
      if (!url) {
        toast({
          title: "No attachment found",
          description: "This lab result does not include a report file.",
          variant: "destructive",
        });
        return;
      }
      const viewUrl = url.startsWith("http") ? url : `${API_ORIGIN}${url}`;
      window.open(viewUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({
        title: "Unable to open report",
        description: "Failed to open the lab attachment.",
        variant: "destructive",
      });
    }
  };

  if (!results || results.length === 0) {
    return (
      <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Microscope className="h-5 w-5 text-purple-500" />
            Recent Lab Results
          </h3>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No lab results available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Microscope className="h-5 w-5 text-purple-500" />
          Recent Lab Results
        </h3>
        <Button
          variant="link"
          className="text-primary text-sm h-auto p-0"
          onClick={() => onNavigate("records")}
        >
          View all
        </Button>
      </div>

      <div className="space-y-3">
        {results.slice(0, 5).map((result) => (
          <div
            key={result.id}
            className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-purple-500/20 transition-all"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">
                  {result.test_name}
                </h4>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-lg font-bold text-foreground">
                    {result.result_value}
                  </span>
                  {result.units && (
                    <span className="text-xs text-muted-foreground">
                      {result.units}
                    </span>
                  )}
                </div>
                {result.reference_range && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Reference: {result.reference_range}
                  </p>
                )}
              </div>
              <Badge
                variant="outline"
                className={`gap-1 ${getFlagColor(result.flag)}`}
              >
                {getFlagIcon(result.flag)}
                {result.flag}
              </Badge>
            </div>
            <div className="flex items-center justify-between mt-3">
              {result.date && (
                <p className="text-xs text-muted-foreground">
                  {new Date(result.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-primary"
                onClick={() => {
                  setSelectedResult(result);
                  setDetailOpen(true);
                }}
              >
                View
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lab Result Detail</DialogTitle>
            <DialogDescription>
              {selectedResult?.test_name || "Result"}
            </DialogDescription>
          </DialogHeader>
          {selectedResult ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Result</span>
                <span className="font-semibold">
                  {selectedResult.result_value} {selectedResult.units}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference</span>
                <span>{selectedResult.reference_range || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Flag</span>
                <span>{selectedResult.flag}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span>{selectedResult.date || "N/A"}</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No result selected.
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
            {selectedResult && (
              <Button
                variant="secondary"
                onClick={() => handleViewAttachment(selectedResult.id)}
              >
                View Report
              </Button>
            )}
            <Button onClick={() => onNavigate("records")}>
              View All Records
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
