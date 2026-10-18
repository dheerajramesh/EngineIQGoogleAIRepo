/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { MROEngineerProfile, UserRole, UserSession } from "../types";
import { signInWithGoogleAndSyncProfile } from "../services/firebase";
import { INDIGO_FLIGHTS } from "../data/flights";
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
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { AppTheme } from "../types";

interface LoginViewProps {
  onLogin: (session: UserSession) => void;
  theme?: AppTheme;
  onToggleTheme?: () => void;
  roster?: MROEngineerProfile[];
}

interface DemoPersona {
  uid: string;
  role: UserRole;
  name: string;
  badge: string;
  title: string;
  base: string;
  stationName: string;
  accessScopeLabel: string;
  description: string;
}

const DEMO_PERSONAS: DemoPersona[] = [
  {
    uid: "sup-ananya-sharma",
    role: "Supervisor",
    name: "Ananya Sharma",
    badge: "DGCA MCC #1104",
    title: "MCC Fleet Supervisor & CAMO Lead",
    base: "Delhi (DEL)",
    stationName: "Indira Gandhi International T3",
    accessScopeLabel: "Full Fleet (8 Flights • 16 Engines) + RBAC Admin",
    description: "Unrestricted fleet visibility, engineer tail assignment authority, and CRS audit control.",
  },
  {
    uid: "eng-vikram-malhotra",
    role: "Engineer",
    name: "Vikram Malhotra",
    badge: "DGCA AME #8842",
    title: "Lead Line Maintenance Engineer",
    base: "Bengaluru (BLR)",
    stationName: "Kempegowda International",
    accessScopeLabel: "Assigned Tails Only (VT-IZB, VT-ITG, VT-IMR, VT-IFA)",
    description: "Line station dispatch, micrometer measurements, and AMM rectification on assigned aircraft.",
  },
  {
    uid: "trn-arjun-reddy",
    role: "Trainee",
    name: "Arjun Reddy",
    badge: "TRN-HYD-2026",
    title: "Under-Instruction Line Technician",
    base: "Hyderabad (HYD)",
    stationName: "GMR Aero Technic MRO",
    accessScopeLabel: "Isolated Personal Sandbox (Private to You)",
    description: "Practice simulations and test sign-offs isolated from live fleet operations and other users.",
  },
];

export function LoginView({ onLogin, theme, onToggleTheme, roster = [] }: LoginViewProps) {
  const [selectedPersona, setSelectedPersona] = useState<DemoPersona>(DEMO_PERSONAS[0]);
  const [customName, setCustomName] = useState(DEMO_PERSONAS[0].name);
  const [customBadge, setCustomBadge] = useState(DEMO_PERSONAS[0].badge);
  const [customBase, setCustomBase] = useState(DEMO_PERSONAS[0].base);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSelectPersona = (p: DemoPersona) => {
    setSelectedPersona(p);
    setCustomName(p.name);
    setCustomBadge(p.badge);
    setCustomBase(p.base);
    setAuthError(null);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleSigningIn(true);
    setAuthError(null);
    try {
      const fbSession = await signInWithGoogleAndSyncProfile(
        selectedPersona.role,
        customBadge.trim() || selectedPersona.badge,
        customBase.trim() || selectedPersona.base
      );
      onLogin({
        ...fbSession,
        name: `${fbSession.name} (${fbSession.badge || customBadge})`,
      });
    } catch (err: any) {
      const msg = String(err?.message || "Google sign-in popup was closed or blocked.");
      setAuthError(
        msg.includes("popup-closed-by-user")
          ? "Google sign-in popup was closed before completion. You can retry or use the MRO Role Session button below."
          : "Google authentication could not complete in this browser frame. Use the MRO Role Session launch button below."
      );
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = customName.trim() || selectedPersona.name;
    const finalBadge = customBadge.trim() || selectedPersona.badge;
    const rosterMatch = roster.find(
      (r) =>
        r.uid === selectedPersona.uid ||
        r.displayName.toLowerCase() === finalName.toLowerCase() ||
        r.role === selectedPersona.role
    );

    const defaultFlights =
      selectedPersona.role === "Supervisor"
        ? INDIGO_FLIGHTS.map((f) => f.flightNumber)
        : rosterMatch?.assignedFlightNumbers || ["6E 204", "6E 502", "6E 714", "6E 112"];

    const defaultTails =
      selectedPersona.role === "Supervisor"
        ? INDIGO_FLIGHTS.map((f) => f.aircraftTail)
        : rosterMatch?.assignedTailNumbers || ["VT-IZB", "VT-ITG", "VT-IMR", "VT-IFA"];

    onLogin({
      uid: rosterMatch?.uid || selectedPersona.uid,
      name: `${finalName} (${finalBadge})`,
      role: selectedPersona.role,
      homeBase: customBase.trim() || selectedPersona.base,
      badge: finalBadge,
      authProvider: "demo",
      assignedFlightNumbers: defaultFlights,
      assignedTailNumbers: defaultTails,
    });
  };

  return (
    <div className="min-h-screen w-full bg-[#030712] text-slate-100 flex flex-col justify-between selection:bg-sky-500/30 selection:text-white font-sans">


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
                <span className="text-slate-400 text-[11px] leading-snug block">Enter your AME license & station role</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-sky-400 font-bold block mb-1">02. Inspect & Measure</span>
                <span className="text-slate-400 text-[11px] leading-snug block">Enter gauge values & evaluate AMM limits</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-sky-400 font-bold block mb-1">03. Rectify & Dispatch</span>
                <span className="text-slate-400 text-[11px] leading-snug block">Record repair values & sign Flight CRS</span>
              </div>
            </div>
          </div>

          {/* Persona Selection */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                1. Select CAR-145 / Part-145 RBAC Role Tier (or customize credentials below)
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

                      <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-[10px] font-mono">
                        <div className="text-emerald-300 font-semibold leading-snug">
                          {persona.accessScopeLabel}
                        </div>
                        <div className="flex items-center gap-1 text-slate-400">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{persona.base}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive Engineer Credentials Input Fields */}
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                2. Certifying Engineer Credentials (Used for Work Orders & CRS Sign-Off)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div>
                  <label htmlFor="login-engineer-name" className="block text-[10px] uppercase text-slate-400 mb-1">
                    Engineer Full Name *
                  </label>
                  <input
                    id="login-engineer-name"
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Vikram Malhotra"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-lg px-3 py-2 text-xs text-white focus:outline-none transition"
                  />
                </div>
                <div>
                  <label htmlFor="login-engineer-badge" className="block text-[10px] uppercase text-slate-400 mb-1">
                    DGCA / Part-66 License ID *
                  </label>
                  <input
                    id="login-engineer-badge"
                    type="text"
                    required
                    value={customBadge}
                    onChange={(e) => setCustomBadge(e.target.value)}
                    placeholder="e.g. DGCA AME #8842"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-lg px-3 py-2 text-xs text-sky-300 font-bold focus:outline-none transition"
                  />
                </div>
                <div>
                  <label htmlFor="login-engineer-base" className="block text-[10px] uppercase text-slate-400 mb-1">
                    Line Station Base
                  </label>
                  <select
                    id="login-engineer-base"
                    value={customBase}
                    onChange={(e) => setCustomBase(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none transition"
                  >
                    <option value="Delhi (DEL)">Delhi (DEL) — IGI T3</option>
                    <option value="Mumbai (BOM)">Mumbai (BOM) — CSIA T2</option>
                    <option value="Bengaluru (BLR)">Bengaluru (BLR) — MRO Hub</option>
                    <option value="Hyderabad (HYD)">Hyderabad (HYD) — RGIA</option>
                    <option value="Chennai (MAA)">Chennai (MAA) — Line Base</option>
                  </select>
                </div>
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/60 text-xs font-mono text-amber-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* Dual Authentication Buttons: Google Firebase Auth + MRO Role Session */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                id="btn-google-signin"
                disabled={isGoogleSigningIn}
                onClick={handleGoogleSignIn}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-bold font-mono text-xs tracking-wide border border-sky-500/50 hover:border-sky-400 transition shadow-lg flex items-center justify-center gap-2.5 cursor-pointer"
              >
                {isGoogleSigningIn ? (
                  <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                )}
                <span>Sign in with Google (Firebase Auth)</span>
              </button>

              <button
                type="submit"
                id="btn-role-login"
                className="w-full py-3.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold font-mono text-xs tracking-wide transition shadow-xl shadow-sky-500/25 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Launch as {selectedPersona.role} ({customName.split(" ")[0]})</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
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

      <div className="py-2 text-center text-[10px] text-slate-500 font-mono border-t border-slate-900/80 bg-slate-950/40 select-none shrink-0">
        ILLUSTRATIVE DATA. NOT FOR OPERATIONAL USE. Decision support only. Certifying engineer sign-off required.
      </div>

      {/* Footer */}
      <footer className="h-12 border-t border-slate-900 px-6 flex items-center justify-between text-xs font-mono text-slate-500 shrink-0">
        <span>IndiGo Airline Engineering & Maintenance • Fleet Reliability Division</span>
        <span>E00087EN Pratt & Whitney Baseline Grounded</span>
      </footer>
    </div>
  );
}
