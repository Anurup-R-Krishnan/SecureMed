'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { adminService } from '@/services/admin';
import { RefreshCw, FileText, Download } from 'lucide-react';

export default function AuditLogViewer() {
    const [logs, setLogs] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const data = await adminService.getAuditLogs();
            setLogs(data);
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleDownload = () => {
        const element = document.createElement("a");
        const file = new Blob([logs.join('\n')], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `privacy_audit_${new Date().toISOString().split('T')[0]}.log`;
        document.body.appendChild(element);
        element.click();
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        System Audit Logs
                    </h3>
                    <p className="text-muted-foreground text-sm">View recent system activities and security events</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchLogs} disabled={isLoading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload} disabled={logs.length === 0}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            <div className="bg-card rounded-lg border border-border">
                <div className="p-4 border-b border-border bg-muted/30">
                    <p className="text-xs font-mono text-muted-foreground">Displaying last {logs.length} entries</p>
                </div>
                <ScrollArea className="h-[600px] w-full rounded-b-lg p-4 font-mono text-sm">
                    {logs.length > 0 ? (
                        <div className="space-y-1">
                            {logs.map((log, index) => (
                                <div key={index} className="py-1 border-b border-border/50 last:border-0 hover:bg-muted/50 px-2 rounded">
                                    <span className="text-foreground/80">{log}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                            <FileText className="h-12 w-12 mb-2" />
                            <p>No audit logs found</p>
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>
    );
}
