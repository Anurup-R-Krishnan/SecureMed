import { cn } from "@/lib/utils";

export const Spinner = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("animate-spin", className)}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
};

export const PulseSpinner = ({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <div
        className={cn(
          "absolute border-4 border-muted/30 rounded-full",
          sizeClasses[size],
        )}
      ></div>
      <div
        className={cn(
          "absolute border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin",
          sizeClasses[size],
        )}
      ></div>
      {/* Inner pulse */}
      <div
        className={cn(
          "rounded-full bg-primary/20 animate-pulse",
          size === "xl"
            ? "h-8 w-8"
            : size === "lg"
              ? "h-6 w-6"
              : size === "md"
                ? "h-4 w-4"
                : "h-1 w-1",
        )}
      ></div>
    </div>
  );
};
