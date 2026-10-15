import React from "react";
import { AppTheme } from "../types";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  theme: AppTheme;
  onToggle: () => void;
  className?: string;
}

export function ThemeToggle({ theme, onToggle, className = "" }: ThemeToggleProps) {
  const isLight = theme === "light";

  return (
    <button
      id="btn-theme-toggle"
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-semibold transition cursor-pointer select-none ${
        isLight
          ? "bg-white text-slate-800 border-slate-300 hover:bg-slate-100 shadow-sm"
          : "bg-slate-900/90 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-800 shadow"
      } ${className}`}
      title={
        isLight
          ? "Switch to Dark HUD (Night Cockpit / Low-light mode)"
          : "Switch to Whiteboard Theme (Daylight / Clean Engineering CAD mode)"
      }
      aria-label="Toggle Whiteboard / Dark HUD Theme"
    >
      {isLight ? (
        <>
          <Moon className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden sm:inline">Dark HUD</span>
        </>
      ) : (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Whiteboard</span>
        </>
      )}
    </button>
  );
}
