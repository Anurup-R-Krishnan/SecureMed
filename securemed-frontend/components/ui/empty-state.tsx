import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ScanSearch } from "lucide-react"

interface EmptyStateProps {
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    secondaryActionLabel?: string;
    onSecondaryAction?: () => void;
    icon?: React.ElementType;
    className?: string;
}

export function EmptyState({
    title,
    description,
    actionLabel,
    onAction,
    secondaryActionLabel,
    onSecondaryAction,
    icon: Icon = ScanSearch,
    className
}: EmptyStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center p-8 md:p-12 border-2 border-dashed border-border/40 rounded-[24px] bg-muted/5 text-center animate-in fade-in zoom-in-95 duration-500",
            className
        )}>
            <div className="h-16 w-16 bg-muted/20 rounded-full flex items-center justify-center mb-6 ring-1 ring-border/50">
                <Icon className="h-8 w-8 text-muted-foreground/50" />
            </div>

            <h3 className="text-xl font-bold text-foreground mb-2 tracking-tight">{title}</h3>

            <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed">
                {description}
            </p>

            {(actionLabel || secondaryActionLabel) && (
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    {actionLabel && onAction && (
                        <Button onClick={onAction} className="h-10 px-6 rounded-lg font-semibold shadow-lg shadow-primary/20">
                            {actionLabel}
                        </Button>
                    )}
                    {secondaryActionLabel && onSecondaryAction && (
                        <Button variant="outline" onClick={onSecondaryAction} className="h-10 px-6 rounded-lg font-semibold bg-background">
                            {secondaryActionLabel}
                        </Button>
                    )}
                </div>
            )}
        </div>
    )
}
