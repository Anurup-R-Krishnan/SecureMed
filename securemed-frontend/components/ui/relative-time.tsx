"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface RelativeTimeProps extends React.HTMLAttributes<HTMLSpanElement> {
  date: string | Date;
}

export function RelativeTime({ date, className, ...props }: RelativeTimeProps) {
  const [timeAgo, setTimeAgo] = React.useState<string>("");

  React.useEffect(() => {
    const calculateTimeAgo = () => {
      const d = new Date(date);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

      if (diffInSeconds < 60) {
        return "Just now";
      }

      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
      }

      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) {
        return `${diffInHours}h ago`;
      }

      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) {
        return `${diffInDays}d ago`;
      }

      return d.toLocaleDateString();
    };

    setTimeAgo(calculateTimeAgo());

    // Update every minute
    const interval = setInterval(() => {
      setTimeAgo(calculateTimeAgo());
    }, 60000);

    return () => clearInterval(interval);
  }, [date]);

  return (
    <span className={cn("text-xs text-muted-foreground", className)} {...props}>
      {timeAgo}
    </span>
  );
}
