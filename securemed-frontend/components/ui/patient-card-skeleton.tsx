import { Skeleton } from "@/components/ui/skeleton"

export function PatientCardSkeleton() {
    return (
        <div className="flex flex-col space-y-3 p-4 border border-border/40 rounded-xl bg-card/50 backdrop-blur-sm">
            <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                </div>
            </div>
            <div className="space-y-2 pt-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-[80%]" />
            </div>
            <div className="flex justify-between pt-2">
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
        </div>
    )
}
