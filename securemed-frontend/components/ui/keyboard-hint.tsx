"use client";

import { useState, useEffect } from "react";
import { Command, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

export function KeyboardHint() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show mostly when idle or at specific points, simplified for now
      setIsVisible(true);
    };
    window.addEventListener("mousemove", handleScroll);
    return () => window.removeEventListener("mousemove", handleScroll);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-40 hidden md:block animate-in fade-in duration-1000 delay-1000">
      <HoverCard openDelay={0} closeDelay={200}>
        <HoverCardTrigger asChild>
          <button className="h-10 w-10 bg-background/50 backdrop-blur-md border border-border/40 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/80 hover:scale-110 transition-all shadow-lg group">
            <HelpCircle className="h-5 w-5" />
            <span className="sr-only">Keyboard Shortcuts</span>
          </button>
        </HoverCardTrigger>
        <HoverCardContent
          align="end"
          className="w-64 bg-background/90 backdrop-blur-xl border-border/50 rounded-2xl p-4 shadow-2xl"
        >
          <h4 className="font-bold text-sm mb-3 text-foreground flex items-center gap-2">
            <Command className="h-3 w-3" /> Shortcuts
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Command Palette</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono font-medium text-muted-foreground opacity-100">
                <span className="text-[10px]">⌘</span>K
              </kbd>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Save Changes</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono font-medium text-muted-foreground opacity-100">
                <span className="text-[10px]">⌘</span>S
              </kbd>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Theme Toggle</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono font-medium text-muted-foreground opacity-100">
                <span className="text-[10px]">⌘</span>\
              </kbd>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}
