import { ShieldCheck } from "lucide-react";

export function FooterBadge() {
    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-0 pointer-events-none opacity-50 hidden md:flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
            <ShieldCheck className="h-3 w-3" />
            <span>Secured by SecureMed v2.4</span>
        </div>
    );
}
