"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  adminService,
  AuditLogEntry,
  AuditLogFilters,
  AuditLogResponse,
} from "@/services/admin";
import {
  RefreshCw,
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Shield,
  LogIn,
  LogOut,
  UserPlus,
  KeyRound,
  HeartPulse,
  FileCheck,
  UserCog,
} from "lucide-react";

/* ──────────────── constants ──────────────── */

const ACTION_OPTIONS = [
  { value: "__all__", label: "All Actions" },
  { value: "login", label: "Login" },
  { value: "login_failed", label: "Login Failed" },
  { value: "logout", label: "Logout" },
  { value: "register", label: "Register" },
  { value: "password_reset", label: "Password Reset" },
  { value: "mfa_enabled", label: "MFA Enabled" },
  { value: "mfa_disabled", label: "MFA Disabled" },
  { value: "user_created", label: "User Created" },
  { value: "user_role_changed", label: "Role Changed" },
  { value: "user_deleted", label: "User Deleted" },
  { value: "consent_granted", label: "Consent Granted" },
  { value: "consent_revoked", label: "Consent Revoked" },
  { value: "medical_record_viewed", label: "Record Viewed" },
  { value: "medical_record_created", label: "Record Created" },
  { value: "medical_record_updated", label: "Record Updated" },
  { value: "emergency_access", label: "Emergency Access" },
];

const CATEGORY_OPTIONS = [
  { value: "__all__", label: "All Categories" },
  { value: "auth", label: "Authentication" },
  { value: "admin", label: "Admin" },
  { value: "consent", label: "Consent" },
  { value: "clinical", label: "Clinical" },
];

const CATEGORY_COLORS: Record<string, string> = {
  auth: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  admin:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  consent:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  clinical:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  login: <LogIn className="h-3.5 w-3.5" />,
  login_failed: <Shield className="h-3.5 w-3.5 text-red-500" />,
  logout: <LogOut className="h-3.5 w-3.5" />,
  register: <UserPlus className="h-3.5 w-3.5" />,
  password_reset: <KeyRound className="h-3.5 w-3.5" />,
  mfa_enabled: <Shield className="h-3.5 w-3.5 text-green-600" />,
  mfa_disabled: <Shield className="h-3.5 w-3.5 text-orange-500" />,
  user_created: <UserPlus className="h-3.5 w-3.5" />,
  user_role_changed: <UserCog className="h-3.5 w-3.5" />,
  user_deleted: <X className="h-3.5 w-3.5 text-red-500" />,
  consent_granted: <FileCheck className="h-3.5 w-3.5 text-green-600" />,
  consent_revoked: <FileCheck className="h-3.5 w-3.5 text-orange-500" />,
  medical_record_viewed: <FileText className="h-3.5 w-3.5" />,
  medical_record_created: <FileText className="h-3.5 w-3.5 text-green-600" />,
  medical_record_updated: <FileText className="h-3.5 w-3.5 text-blue-500" />,
  emergency_access: <HeartPulse className="h-3.5 w-3.5 text-red-500" />,
};

/* ──────────────── helpers ──────────────── */

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function exportCsv(logs: AuditLogEntry[]) {
  const header =
    "Timestamp,Actor,Email,Action,Category,Resource Type,Resource ID,Description,IP Address";
  const rows = logs.map((l) =>
    [
      l.timestamp,
      `"${l.actor_name}"`,
      l.actor_email,
      l.action_display,
      l.category,
      l.resource_type,
      l.resource_id,
      `"${l.description.replace(/"/g, '""')}"`,
      l.ip_address,
    ].join(","),
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit_logs_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ──────────────── component ──────────────── */

export default function AuditLogViewer() {
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    page_size: 50,
  });
  const [searchInput, setSearchInput] = useState("");

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminService.getAuditLogs(filters);
      setData(res);
    } catch (err) {
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const updateFilter = (key: keyof AuditLogFilters, value: string | number) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "__all__" ? undefined : value,
      page: key === "page" ? (value as number) : 1,
    }));
  };

  const clearFilters = () => {
    setFilters({ page: 1, page_size: 50 });
    setSearchInput("");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter("search", searchInput);
  };

  const logs = data?.logs ?? [];
  const page = data?.page ?? 1;
  const totalPages = data?.total_pages ?? 1;
  const total = data?.total ?? 0;
  const hasActiveFilters = !!(
    filters.action ||
    filters.category ||
    filters.date_from ||
    filters.date_to ||
    filters.search
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            System Audit Logs
          </h3>
          <p className="text-muted-foreground text-sm mt-0.5">
            {total.toLocaleString()} total events
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv(logs)}
            disabled={logs.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <form
            onSubmit={handleSearch}
            className="flex gap-2 flex-1 min-w-[220px]"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search descriptions..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Button type="submit" size="sm" variant="secondary" className="h-9">
              Search
            </Button>
          </form>

          {/* Action filter */}
          <Select
            value={filters.action || "__all__"}
            onValueChange={(v) => updateFilter("action", v)}
          >
            <SelectTrigger className="w-[170px] h-9">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category filter */}
          <Select
            value={filters.category || "__all__"}
            onValueChange={(v) => updateFilter("category", v)}
          >
            <SelectTrigger className="w-[170px] h-9">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date from */}
          <Input
            type="date"
            value={filters.date_from || ""}
            onChange={(e) => updateFilter("date_from", e.target.value)}
            className="w-[150px] h-9"
            placeholder="From"
          />
          {/* Date to */}
          <Input
            type="date"
            value={filters.date_to || ""}
            onChange={(e) => updateFilter("date_to", e.target.value)}
            className="w-[150px] h-9"
            placeholder="To"
          />

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={clearFilters}
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="space-y-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-4 py-3 border-b border-border/50"
              >
                <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
                <div className="h-4 flex-1 rounded bg-muted animate-pulse" />
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : logs.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Timestamp</TableHead>
                <TableHead className="w-[160px]">Actor</TableHead>
                <TableHead className="w-[150px]">Action</TableHead>
                <TableHead className="w-[100px]">Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[120px]">IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                    {formatTimestamp(log.timestamp)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium truncate max-w-[150px]">
                        {log.actor_name || "System"}
                      </span>
                      {log.actor_email && (
                        <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {log.actor_email}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                      {ACTION_ICONS[log.action] ?? (
                        <FileText className="h-3.5 w-3.5" />
                      )}
                      {log.action_display}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                        CATEGORY_COLORS[log.category] || CATEGORY_COLORS.other
                      }`}
                    >
                      {log.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm max-w-[320px]">
                    <span className="line-clamp-2">{log.description}</span>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {log.ip_address || "\u2014"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Shield className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">No audit logs found</p>
            <p className="text-xs mt-1 opacity-70">
              {hasActiveFilters
                ? "Try adjusting your filters."
                : "Events will appear as users interact with the system."}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} ({total.toLocaleString()} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateFilter("page", page - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => updateFilter("page", page + 1)}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
