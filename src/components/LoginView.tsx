/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { UserRole, UserSession } from "../types";
import {
  Wrench,
  ShieldCheck,
  Building2,
  GraduationCap,
  ArrowRight,
  ShieldAlert,
  Cpu,
  Plane,
  CheckCircle2,
  User,
  Activity,
  Layers,
  MapPin,
  Lock,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { AppTheme } from "../types";

interface LoginViewProps {
  onLogin: (session: UserSession) => void;
  theme?: AppTheme;
  onToggleTheme?: () => void;
}

interface DemoPersona {
  role: UserRole;
  name: string;
  badge: string;
  title: string;
  base: string;
  stationName: string;
  description: string;
}

const DEMO_PERSONAS: DemoPersona[] = [
  {
    role: "Engineer",
    name: "Vikram Malhotra",
    badge: "DGCA AME #8842",
    title: "Lead Line Maintenance Engineer",
    base: "Delhi (DEL)",
    stationName: "Indira Gandhi International T3",
    description: "Line station dispatch, transit checks, borescope inspections, and defect evaluation.",
  },
  {
    role: "Supervisor",
    name: "Dr. Aarti Sen",
    badge: "CAMO / DGCA IA #4102",
    title: "Chief Powerplant CAMO Specialist",
    base: "Bengaluru (BLR)",
    stationName: "Kempegowda MRO Base",
    description: "Fleet-wide propulsion reliability, LLP cycle limits, AD/SB tracking, and AOG escalation.",
  },
  {
    role: "Trainee",
    name: "Siddharth Roy",
    badge: "A&P Trainee #2041",
    title: "Airside Maintenance Technician",
    base: "Mumbai (BOM)",
    stationName: "Chhatrapati Shivaji Terminal 2",
    description: "Ramp turnarounds, oil replenishment, visual inspections, and supervised training logs.",
  },
];

export function LoginView({ onLogin, theme, onToggleTheme }: LoginViewProps) {
  const [selectedPersona, setSelectedPersona] = useState<DemoPersona>(DEMO_PERSONAS[0]);
  const [customName, setCustomName] = useState(DEMO_PERSONAS[0].name);

  const handleSelectPersona = (p: DemoPersona) => {
    setSelectedPersona(p);
    setCustomName(p.name);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin({
      name: `${customName.trim()} (${selectedPersona.badge})`,
      role: selectedPersona.role,
      homeBase: selectedPersona.base,
    });
  };

  return (
    <div className="min-h-screen w-full bg-[#030712] text-slate-100 flex flex-col justify-between selection:bg-sky-500/30 selection:text-white font-sans">
      {/* Permanent Required Banner */}
      <div className="w-full bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-300 select-none z-30 shrink-0 font-mono">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold tracking-wide">
            ILLUSTRATIVE DATA. NOT FOR OPERATIONAL USE. Decision support only. Certifying engineer sign-off required.
          </span>
        </div>
        <div className="flex items-center gap-3">
          {theme && onToggleTheme && (
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          )}
          <span className="hidden sm:inline text-[11px] text-amber-400/80">
            IndiGo Airline M&E Demonstration
          </span>
        </div>
      </div>

      {/* Hero Presentation & Login Section */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-10 relative overflow-hidden">
        {/* Subtle Aviation Background Vectors */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-b from-[#001b94]/20 via-sky-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a15_1px,transparent_1px),linear-gradient(to_bottom,#0f172a15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

        <div className="w-full max-w-2xl bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-sky-950/40 backdrop-blur-xl relative z-10 space-y-8 animate-fade-in">
          {/* Airline Branding Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#001b94] via-[#0284c7] to-sky-400 p-0.5 shadow-xl shadow-blue-900/40 shrink-0">
                <div className="w-full h-full bg-[#070e24] rounded-[14px] flex flex-col items-center justify-center text-white">
                  <span className="font-mono font-black text-lg leading-none tracking-tighter text-sky-400">6E</span>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-slate-300">M&E</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-white font-sans">
                    IndiGo <span className="text-sky-400">EngineIQ</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800/80 font-bold">
                    v2.4 MRO
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Fleet Propulsion Digital Twin & Maintenance Decision-Support
                </p>
              </div>
            </div>

            <div className="flex items-center sm:flex-col sm:items-end justify-between gap-2 font-mono text-xs text-slate-400">
              <div className="text-left sm:text-right">
                <span className="text-slate-500 block text-[10px] uppercase">Engine Architecture</span>
                <span className="text-slate-200 font-bold">PW1100G-JM GTF</span>
              </div>
              {theme && onToggleTheme && (
                <div className="sm:mt-1">
                  <ThemeToggle theme={theme} onToggle={onToggleTheme} />
                </div>
              )}
            </div>
          </div>

          {/* Presentation Flow Explainer for IndiGo Stakeholders */}
          <div className="p-4 rounded-2xl bg-[#071330]/80 border border-blue-900/50 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-sky-300 uppercase tracking-wide">
              <Plane className="w-4 h-4 text-sky-400" />
              <span>IndiGo Line Operations Workflow</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-sky-400 font-bold block mb-1">01. Sign In</span>
                <span className="text-slate-400 text-[11px] leading-snug block">Select your engineering station role</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-sky-400 font-bold block mb-1">02. Choose Flight</span>
                <span className="text-slate-400 text-[11px] leading-snug block">Review turnaround timetable & crew logs</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-sky-400 font-bold block mb-1">03. Inspect 3D Twin</span>
                <span className="text-slate-400 text-[11px] leading-snug block">Investigate components, LLPs & signs</span>
              </div>
            </div>
          </div>

          {/* Persona Selection */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                Select Demonstration Profile
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {DEMO_PERSONAS.map((persona) => {
                  const isSelected = selectedPersona.role === persona.role;
                  return (
                    <button
                      key={persona.role}
                      type="button"
                      onClick={() => handleSelectPersona(persona)}
                      className={`p-4 rounded-2xl text-left transition-all duration-200 border flex flex-col justify-between space-y-3 cursor-pointer ${
                        isSelected
                          ? "bg-gradient-to-b from-sky-950/60 to-slate-900 border-sky-500 shadow-lg shadow-sky-950/50 ring-1 ring-sky-500/50"
                          : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                              isSelected
                                ? "bg-sky-500 text-white"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {persona.role}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-sky-400" />
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-white font-sans pt-1">
                          {persona.name}
                        </h4>
                        <p className="text-[11px] text-sky-300 font-mono">
                          {persona.title}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[11px] font-mono text-slate-400">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{persona.base}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Engineer Details Confirmation */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Certifying Name:</span>
                <span className="text-white font-bold">{customName}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">License / Badge:</span>
                <span className="text-sky-400 font-bold">{selectedPersona.badge}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Operating Base:</span>
                <span className="text-slate-200">{selectedPersona.stationName}</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold font-mono text-sm tracking-wide transition shadow-xl shadow-sky-500/25 flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Launch IndiGo Flight Operations & Turnaround Board</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* Trust & Fleet Credibility Markers */}
          <div className="pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center font-mono">
            <div>
              <span className="text-lg font-bold text-white block">350+</span>
              <span className="text-[10px] text-slate-400 uppercase">Aircraft Fleet</span>
            </div>
            <div>
              <span className="text-lg font-bold text-sky-400 block">700+</span>
              <span className="text-[10px] text-slate-400 uppercase">PW1100G GTFs</span>
            </div>
            <div>
              <span className="text-lg font-bold text-emerald-400 block">&lt;45m</span>
              <span className="text-[10px] text-slate-400 uppercase">Turnaround Target</span>
            </div>
            <div>
              <span className="text-lg font-bold text-amber-400 block">EASA / FAA</span>
              <span className="text-[10px] text-slate-400 uppercase">Certified Rules</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="h-12 border-t border-slate-900 px-6 flex items-center justify-between text-xs font-mono text-slate-500 shrink-0">
        <span>IndiGo Airline Engineering & Maintenance • Fleet Reliability Division</span>
        <span>E00087EN Pratt & Whitney Baseline Grounded</span>
      </footer>
    </div>
  );
}
