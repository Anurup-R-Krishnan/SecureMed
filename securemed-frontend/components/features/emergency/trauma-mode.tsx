"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Clock,
  XOctagon,
  Droplets,
  Activity,
  Ban,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface TraumaModeProps {
  isActive: boolean;
  onDeactivate: () => void;
}

export function TraumaMode({ isActive, onDeactivate }: TraumaModeProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => setElapsedTime((prev) => prev + 1), 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          className="fixed inset-0 z-[100] bg-background text-foreground flex flex-col"
        >
          {/* Emergency Header */}
          <div className="bg-red-600 text-white p-6 flex justify-between items-center shadow-2xl">
            <div className="flex items-center gap-6">
              <div className="bg-white/20 p-3 rounded-full animate-pulse">
                <AlertTriangle className="h-10 w-10" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase">
                  Trauma / Code Blue
                </h1>
                <p className="text-red-100 font-mono text-lg tracking-widest">
                  PROTOCOL ACTIVE
                </p>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="text-right">
                <div className="text-sm font-bold opacity-80 uppercase">
                  Event Timer
                </div>
                <div className="text-5xl font-mono font-black tabular-nums">
                  {formatTime(elapsedTime)}
                </div>
              </div>
              <Button
                onClick={onDeactivate}
                variant="secondary"
                size="lg"
                className="h-20 px-8 text-xl font-bold bg-white text-red-600 hover:bg-red-50"
              >
                <XOctagon className="mr-3 h-8 w-8" />
                END CODE
              </Button>
            </div>
          </div>

          {/* Critical Info Grid - Huge Font Sizes */}
          <div className="flex-1 p-8 grid grid-cols-12 gap-8 bg-zinc-950 text-white">
            {/* Patient ID (Big) */}
            <div className="col-span-12 md:col-span-4 bg-zinc-900 border-l-8 border-blue-500 p-8 rounded-r-xl">
              <div className="text-zinc-400 text-xl font-bold uppercase mb-2">
                Patient
              </div>
              <div className="text-5xl font-black">Jane Doe</div>
              <div className="text-3xl font-mono text-zinc-400 mt-2">
                #992-831-22
              </div>
              <div className="mt-8 text-2xl font-bold text-blue-400">
                DOB: 12/05/1980 (45y)
              </div>
            </div>

            {/* Blood Type (Massive) */}
            <div className="col-span-6 md:col-span-2 bg-zinc-900 border-l-8 border-red-500 p-8 rounded-r-xl flex flex-col justify-center items-center">
              <Droplets className="h-12 w-12 text-red-500 mb-2" />
              <div className="text-zinc-400 font-bold uppercase">
                Blood Type
              </div>
              <div className="text-7xl font-black text-red-500">O+</div>
            </div>

            {/* Allergies (Critical) */}
            <div className="col-span-6 md:col-span-2 bg-zinc-900 border-l-8 border-amber-500 p-8 rounded-r-xl flex flex-col justify-center items-center">
              <Ban className="h-12 w-12 text-amber-500 mb-2" />
              <div className="text-zinc-400 font-bold uppercase">Allergies</div>
              <div className="text-4xl font-black text-amber-500 text-center leading-tight">
                PENICILLIN
                <br />
                LATEX
              </div>
            </div>

            {/* Live Vitals (The only moving parts) */}
            <div className="col-span-12 md:col-span-4 bg-zinc-900 border-l-8 border-green-500 p-8 rounded-r-xl grid grid-rows-3 gap-6">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <div className="text-2xl font-bold text-zinc-400">HR</div>
                <div className="text-6xl font-mono font-black text-green-500">
                  0 <span className="text-xl text-zinc-500">bpm</span>
                </div>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <div className="text-2xl font-bold text-zinc-400">BP</div>
                <div className="text-6xl font-mono font-black text-red-500">
                  --/--
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-2xl font-bold text-zinc-400">SpO2</div>
                <div className="text-6xl font-mono font-black text-blue-500">
                  --%
                </div>
              </div>
            </div>

            {/* Action Log Placeholder */}
            <div className="col-span-12 bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl overflow-hidden">
              <div className="text-zinc-500 font-bold uppercase tracking-widest mb-4">
                Code Log
              </div>
              <div className="font-mono text-zinc-300 space-y-2 opacity-50">
                <div>[14:02:10] Code Blue Activated</div>
                <div>[14:02:15] Crash Cart Requested</div>
                <div>[14:02:45] Epinephrine 1mg Administered</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
