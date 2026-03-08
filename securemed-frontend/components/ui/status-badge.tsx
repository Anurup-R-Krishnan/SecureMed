import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const statusBadgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
                secondary:
                    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
                destructive:
                    "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
                outline: "text-foreground",
                success: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25",
                warning: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25",
                info: "border-transparent bg-blue-500/15 text-blue-700 dark:text-blue-400 hover:bg-blue-500/25",
                neutral: "border-transparent bg-slate-500/15 text-slate-700 dark:text-slate-400 hover:bg-slate-500/25",
            },
            pulse: {
                true: "animate-pulse",
                false: "",
            },
            glow: {
                true: "shadow-[0_0_10px_-3px_currentColor]",
                false: ""
            }
        },
        defaultVariants: {
            variant: "default",
            pulse: false,
            glow: false,
        },
    }
)

export interface StatusBadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
    dot?: boolean
}

function StatusBadge({ className, variant, pulse, glow, dot, children, ...props }: StatusBadgeProps) {
    return (
        <div className={cn(statusBadgeVariants({ variant, pulse, glow }), "gap-1.5", className)} {...props}>
            {dot && (
                <span className={cn("relative flex h-2 w-2")}>
                    {(pulse || glow) && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>}
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                </span>
            )}
            {children}
        </div>
    )
}

export { StatusBadge, statusBadgeVariants }
