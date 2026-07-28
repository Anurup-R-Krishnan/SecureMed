"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CopyButtonProps extends React.ComponentProps<typeof Button> {
  value: string;
  label?: string;
}

export function CopyButton({
  value,
  label,
  className,
  variant = "ghost",
  size = "icon",
  ...props
}: CopyButtonProps) {
  const [hasCopied, setHasCopied] = React.useState(false);

  React.useEffect(() => {
    if (hasCopied) {
      const timeout = setTimeout(() => {
        setHasCopied(false);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [hasCopied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setHasCopied(true);
      toast("Copied to clipboard", {
        duration: 2000,
      });
    } catch (err) {
      toast.error("Failed to copy", { description: "Please try again manually" });
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("h-6 w-6", className)}
      onClick={handleCopy}
      {...props}
    >
      {hasCopied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground" />
      )}
      {label && <span className="ml-2 sr-only">{label}</span>}
    </Button>
  );
}
