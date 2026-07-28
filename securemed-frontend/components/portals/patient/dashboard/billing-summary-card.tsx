"use client";

import { Card } from "@/components/ui/card";
import { CreditCard, AlertCircle, Calendar, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BillingSummary {
  outstanding_balance: number;
  recent_invoices_count: number;
  last_payment_date: string | null;
}

interface BillingSummaryCardProps {
  summary: BillingSummary | null;
  onNavigate: (tab: any, params?: Record<string, string>) => void;
}

export default function BillingSummaryCard({
  summary,
  onNavigate,
}: BillingSummaryCardProps) {
  if (!summary) {
    return (
      <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-amber-500" />
            Billing Summary
          </h3>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No billing information available</p>
        </div>
      </Card>
    );
  }

  const hasOutstanding = summary.outstanding_balance > 0;

  return (
    <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-amber-500" />
          Billing Summary
        </h3>
        <Button
          variant="link"
          className="text-primary text-sm h-auto p-0"
          onClick={() => onNavigate("billing")}
        >
          View all
        </Button>
      </div>

      <div className="space-y-4">
        {/* Outstanding Balance */}
        <div
          className={`p-4 rounded-xl border ${hasOutstanding ? "bg-amber-500/5 border-amber-500/20" : "bg-green-500/5 border-green-500/20"}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Outstanding Balance
              </p>
              <p
                className={`text-2xl font-bold ${hasOutstanding ? "text-amber-400" : "text-green-400"}`}
              >
                ₹
                {summary.outstanding_balance.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            {hasOutstanding ? (
              <AlertCircle className="h-8 w-8 text-amber-500" />
            ) : (
              <TrendingUp className="h-8 w-8 text-green-500" />
            )}
          </div>
          {hasOutstanding && (
            <Button
              size="sm"
              className="mt-3 w-full bg-amber-600 hover:bg-amber-500"
              onClick={() => onNavigate("billing")}
            >
              Pay Now
            </Button>
          )}
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Total Invoices</p>
            <p className="text-lg font-bold text-foreground">
              {summary.recent_invoices_count}
            </p>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Last Payment
            </p>
            <p className="text-sm font-semibold text-foreground">
              {summary.last_payment_date
                ? new Date(summary.last_payment_date).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                    },
                  )
                : "N/A"}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
