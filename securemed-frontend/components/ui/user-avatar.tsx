"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

interface UserAvatarProps extends React.ComponentProps<typeof Avatar> {
  user?: {
    name?: string | null;
    image?: string | null;
    email?: string | null;
  } | null;
  fallbackClassName?: string;
}

export function UserAvatar({
  user,
  className,
  fallbackClassName,
  ...props
}: UserAvatarProps) {
  const initials = React.useMemo(() => {
    if (!user?.name) return null;
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [user?.name]);

  const fallbackColor = React.useMemo(() => {
    if (!user?.name) return "bg-muted";
    // Generate consistent pastel color from name
    const colors = [
      "bg-red-100 text-red-700",
      "bg-orange-100 text-orange-700",
      "bg-amber-100 text-amber-700",
      "bg-green-100 text-green-700",
      "bg-emerald-100 text-emerald-700",
      "bg-teal-100 text-teal-700",
      "bg-cyan-100 text-cyan-700",
      "bg-blue-100 text-blue-700",
      "bg-indigo-100 text-indigo-700",
      "bg-violet-100 text-violet-700",
      "bg-purple-100 text-purple-700",
      "bg-fuchsia-100 text-fuchsia-700",
      "bg-pink-100 text-pink-700",
      "bg-rose-100 text-rose-700",
    ];
    let hash = 0;
    for (let i = 0; i < user.name.length; i++) {
      hash = user.name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, [user?.name]);

  return (
    <Avatar className={cn("h-8 w-8", className)} {...props}>
      <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
      <AvatarFallback
        className={cn("font-medium text-xs", fallbackColor, fallbackClassName)}
      >
        {initials || <User className="h-4 w-4 text-muted-foreground" />}
      </AvatarFallback>
    </Avatar>
  );
}
