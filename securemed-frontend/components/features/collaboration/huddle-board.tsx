"use client";

import React from "react";
import { Plus, Pin, Check, User } from "lucide-react";

interface HuddleNote {
  id: string;
  author: string;
  role: "MD" | "RN" | "SW" | "PT";
  content: string;
  type: "medical" | "logistics" | "social";
  isResolved: boolean;
}

const MOCK_NOTES: HuddleNote[] = [
  {
    id: "1",
    author: "Dr. Smith",
    role: "MD",
    content: "Hold discharge until Cardio consult complete.",
    type: "medical",
    isResolved: false,
  },
  {
    id: "2",
    author: "Sarah J.",
    role: "RN",
    content: "IV access difficult. Needs PICC line?",
    type: "medical",
    isResolved: false,
  },
  {
    id: "3",
    author: "Mike T.",
    role: "SW",
    content: "Family meeting scheduled for 2pm today.",
    type: "social",
    isResolved: false,
  },
  {
    id: "4",
    author: "Lisa R.",
    role: "PT",
    content: "Cleared for stairs. Needs walker ordered.",
    type: "logistics",
    isResolved: true,
  },
];

const COLORS = {
  medical: "bg-blue-50 border-blue-200 text-blue-900",
  logistics: "bg-emerald-50 border-emerald-200 text-emerald-900",
  social: "bg-purple-50 border-purple-200 text-purple-900",
};

export function HuddleBoard() {
  return (
    <div
      className="bg-repeat space-y-6"
      style={{
        backgroundImage: "radial-gradient(#e5e7eb 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <div className="flex justify-between items-center bg-card/80 backdrop-blur p-4 rounded-xl border shadow-sm sticky top-20 z-10">
        <div>
          <h3 className="font-black text-xl tracking-tight">
            Morning Huddle Board
          </h3>
          <p className="text-sm text-muted-foreground">
            Team collaboration & Discharge Blockers
          </p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-primary/90 transition-transform hover:-translate-y-0.5">
          <Plus className="h-4 w-4" />
          Add Note
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-2">
        {MOCK_NOTES.map((note) => (
          <div
            key={note.id}
            className={`
                relative p-6 rounded-none shadow-[2px_4px_12px_rgba(0,0,0,0.1)] transition-transform hover:-translate-y-1 hover:shadow-xl rotate-1
                min-h-[200px] flex flex-col justify-between
                ${note.isResolved ? "opacity-60 grayscale" : "opacity-100"}
                ${COLORS[note.type]}
             `}
            style={{ transform: `rotate(${Math.random() * 4 - 2}deg)` }}
          >
            {/* Pin Visual */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-500 shadow-sm z-20 border border-black/10"></div>

            <div className="font-handwriting text-lg leading-snug mb-4">
              {note.content}
            </div>

            <div className="flex justify-between items-end border-t border-black/10 pt-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center font-bold text-xs border border-white/60">
                  {note.role}
                </div>
                <div className="text-xs font-bold opacity-70">
                  {note.author}
                </div>
              </div>

              {note.isResolved ? (
                <div className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                  <Check className="h-3 w-3" /> Resolved
                </div>
              ) : (
                <button className="text-xs font-bold underline opacity-50 hover:opacity-100">
                  Resolve
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
