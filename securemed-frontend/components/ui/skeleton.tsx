import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "bg-primary/5 animate-shimmer bg-[linear-gradient(110deg,rgba(0,0,0,0)_40%,rgba(255,255,255,0.1)_50%,rgba(0,0,0,0)_60%)] bg-[length:200%_100%] rounded-md dark:bg-primary/10",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
