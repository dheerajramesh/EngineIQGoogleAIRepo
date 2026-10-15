/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { FlightInfo, AircraftEngine, CaseLogEntry, UserSession } from "../types";
import {
  Plane,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Cpu,
  ArrowRight,
  ArrowLeft,
  FileText,
  ShieldAlert,
  Gauge,
  Activity,
  User,
  ExternalLink,
  ChevronRight,
  Layers,
  Sparkles,
  ClipboardList,
} from "lucide-react";

interface FlightStatusViewProps {
  flight: FlightInfo;
  engine1?: AircraftEngine;
  engine2?: AircraftEngine;
  session: UserSession;
  caseLogs: CaseLogEntry[];
  onSelectEngine: (engineId: string, initialTab?: string) => void;
  onBackToFlights: () => void;
  onOpenCitation: (docId: string) => void;
}

export function FlightStatusView({
  flight,
  engine1,
  engine2,
  session,
  caseLogs,
  onSelectEngine,
  onBackToFlights,
  onOpenCitation,
}: FlightStatusViewProps) {
  const engine1Cases = caseLogs.filter((c) => c.engineId === flight.engine1Id);
  const engine2Cases = caseLogs.filter((c) => c.engineId === flight.engine2Id);

  return (
    <div className="flex-1 overflow-y-auto bg-[#050a14] text-slate-100 p-4 sm:p-6 md:p-8 font-sans select-none">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Breadcrumb & Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToFlights}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-sky-400 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-500/50 transition shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>← Back to Active Flights Schedule</span>
            </button>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-xs font-mono text-slate-400 hidden sm:inline">
              IndiGo Fleet Operations • Flight {flight.flightNumber}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Airside Station:</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-200 font-semibold">
              {flight.destination.code} ({flight.destination.city})
            </span>
          </div>
        </div>

        {/* Hero Flight Context Header */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-[#071330] border border-slate-800/80 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            {/* Left: Flight Info */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-md bg-[#001b94] text-white font-mono font-extrabold text-xs tracking-wider border border-blue-400/30">
                  {flight.airline.toUpperCase()}
                </span>
                <span className="text-2xl font-black font-mono tracking-tight text-white">
                  {flight.flightNumber}
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-sm font-mono text-sky-400 font-bold">
                  {flight.aircraftTail}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ({flight.aircraftModel})
                </span>

                {/* Status pill */}
                <span
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold uppercase flex items-center gap-1.5 ${
                    flight.overallStatus === "action_required"
                      ? "bg-rose-950/80 text-rose-300 border border-rose-700/80"
                      : flight.overallStatus === "watch"
                      ? "bg-amber-950/80 text-amber-300 border border-amber-700/80"
                      : "bg-emerald-950/80 text-emerald-300 border border-emerald-700/80"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      flight.overallStatus === "action_required"
                        ? "bg-rose-400 animate-ping"
                        : flight.overallStatus === "watch"
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                    }`}
                  />
                  {flight.statusLabel}
                </span>
              </div>

              {/* Route banner */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="text-center font-mono">
                    <span className="text-xs text-slate-400 block font-normal">Origin</span>
                    <span className="text-base font-bold text-white">{flight.origin.code}</span>
                    <span className="text-[11px] text-slate-400 block">{flight.origin.city}</span>
                  </div>
                  <div className="px-3 flex flex-col items-center">
                    <span className="text-[11px] font-mono text-sky-400">Scheduled Flight</span>
                    <div className="flex items-center gap-1 text-sky-400">
                      <div className="w-8 sm:w-16 h-px bg-sky-500/50" />
                      <Plane className="w-4 h-4 rotate-90 shrink-0" />
                      <div className="w-8 sm:w-16 h-px bg-sky-500/50" />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {flight.departureTime} → {flight.arrivalTime}
                    </span>
                  </div>
                  <div className="text-center font-mono">
                    <span className="text-xs text-slate-400 block font-normal">Destination</span>
                    <span className="text-base font-bold text-white">{flight.destination.code}</span>
                    <span className="text-[11px] text-slate-400 block">{flight.destination.city}</span>
                  </div>
                </div>

                <div className="h-8 w-px bg-slate-800 hidden md:block" />

                <div className="space-y-0.5 font-mono text-xs text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-sky-400" />
                    <span>Location: <strong className="text-white">{flight.gateBay}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Crew: {flight.pilotName}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Turnaround Countdown Timer */}
            {flight.turnaroundMinutesRemaining !== undefined && flight.turnaroundMinutesRemaining > 0 && (
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex items-center gap-4 shrink-0 shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                    Ground Turnaround Window
                  </span>
                  <div className="text-2xl font-bold font-mono tabular-nums text-sky-300">
                    {flight.turnaroundMinutesRemaining} <span className="text-sm font-normal text-slate-400">mins left</span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-300">
                    Sign-off required before block-off
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Pilot Tech Logbook Quote Strip */}
          {flight.crewReport && (
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-2 text-slate-300 leading-relaxed">
                <FileText className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-sky-300 font-mono">Flight Crew Tech Logbook Entry: </strong>
                  <span>{flight.crewReport}</span>
                </div>
              </div>

              {flight.overallStatus === "action_required" && (
                <button
                  onClick={() => onSelectEngine(flight.engine1Id, "incident")}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs shrink-0 transition flex items-center gap-1 shadow-md shadow-rose-950/50"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Evaluate Finding & Rules</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Section Heading: Dual Propulsion Status */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold font-mono text-white tracking-wide uppercase flex items-center gap-2">
              <Cpu className="w-5 h-5 text-sky-400" />
              <span>Aircraft Propulsion Configuration & Health (Twin Pods)</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              IndiGo Line Maintenance Engineering inspection stations for Pratt & Whitney GTF PW1100G-JM
            </p>
          </div>
        </div>

        {/* Twin Engine Pods: Left Wing vs Right Wing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Engine No. 1 (Left Wing) */}
          <div
            className={`p-6 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
              engine1?.status === "action_required"
                ? "bg-slate-900/95 border-rose-500/60 shadow-xl shadow-rose-950/20"
                : engine1?.status === "watch"
                ? "bg-slate-900/95 border-amber-500/50 shadow-xl shadow-amber-950/20"
                : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="space-y-4">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-sky-950 text-sky-400 border border-sky-800">
                      Left Wing • Position 1
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      SN: P770142
                    </span>
                  </div>
                  <h3 className="text-xl font-bold font-mono text-white mt-1">
                    No. 1 Engine (PW1127G-JM)
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    Geared Turbofan 1-G-3-8-2-3 Architecture
                  </p>
                </div>

                <span
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase flex items-center gap-1.5 ${
                    engine1?.status === "action_required"
                      ? "bg-rose-950 text-rose-300 border border-rose-700"
                      : engine1?.status === "watch"
                      ? "bg-amber-950 text-amber-300 border border-amber-700"
                      : "bg-emerald-950 text-emerald-300 border border-emerald-700"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      engine1?.status === "action_required"
                        ? "bg-rose-400 animate-ping"
                        : engine1?.status === "watch"
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                    }`}
                  />
                  {engine1?.status.replace("_", " ") || "NORMAL"}
                </span>
              </div>

              {/* Engine Telemetry Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 text-xs font-mono">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-normal">Flight Cycles</span>
                  <span className="text-sm font-bold text-sky-300 tabular-nums">
                    {engine1?.cyclesSinceNew.toLocaleString()} CSN
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-normal">Flight Hours</span>
                  <span className="text-sm font-bold text-slate-200 tabular-nums">
                    14,220 FH
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-normal">Open Cases</span>
                  <span
                    className={`text-sm font-bold ${
                      engine1Cases.length > 0 ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {engine1Cases.length} Active
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-normal">Last Inspection</span>
                  <span className="text-xs text-slate-300">
                    {engine1?.lastInspectionDate || "2026-10-08"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-normal">LLP Margin</span>
                  <span className="text-xs font-bold text-amber-300">
                    800 cyc to HPT
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-normal">Governing Doc</span>
                  <span className="text-xs text-sky-400">
                    AMM 72-00
                  </span>
                </div>
              </div>

              {/* Status Alert Detail */}
              {engine1?.status === "action_required" ? (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-rose-300 font-mono">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>ACTION REQUIRED: ABNORMAL VIBRATION DETECTED</span>
                  </div>
                  <p className="text-rose-200/90 leading-relaxed font-sans text-[11px]">
                    N1 vibration exceeded 2.5 threshold. Per AMM 72-00 Task 200, perform visual and tactile inspection on Stage 1 Fan Blades and Fan Drive Gearbox magnetic chip detector prior to flight clearance.
                  </p>
                </div>
              ) : engine1?.status === "watch" ? (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-300 font-mono">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>WATCH STATUS: TREND MONITORING ACTIVE</span>
                  </div>
                  <p className="text-amber-200/90 leading-relaxed font-sans text-[11px]">
                    Subsystem operating parameters elevated within safe limits. Log technician borescope check or oil consumption rate during turnaround.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-sans text-[11px]">
                    All thermal, pressure, and rotational telemetry within certified EASA/FAA type certificate envelope.
                  </span>
                </div>
              )}
            </div>

            {/* Launch CTA */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
              <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                ID: {engine1?.id}
              </span>
              <button
                onClick={() => onSelectEngine(flight.engine1Id, "explore")}
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-mono font-bold text-xs transition shadow-lg shadow-sky-500/25"
              >
                <Cpu className="w-4 h-4" />
                <span>Launch 3D Digital Twin & Inspect Engine 1</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Engine No. 2 (Right Wing) */}
          <div
            className={`p-6 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
              engine2?.status === "action_required"
                ? "bg-slate-900/95 border-rose-500/60 shadow-xl shadow-rose-950/20"
                : engine2?.status === "watch"
                ? "bg-slate-900/95 border-amber-500/50 shadow-xl shadow-amber-950/20"
                : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="space-y-4">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-sky-950 text-sky-400 border border-sky-800">
                      Right Wing • Position 2
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      SN: P770143
                    </span>
                  </div>
                  <h3 className="text-xl font-bold font-mono text-white mt-1">
                    No. 2 Engine (PW1127G-JM)
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    Geared Turbofan 1-G-3-8-2-3 Architecture
                  </p>
                </div>

                <span
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase flex items-center gap-1.5 ${
                    engine2?.status === "action_required"
                      ? "bg-rose-950 text-rose-300 border border-rose-700"
                      : engine2?.status === "watch"
                      ? "bg-amber-950 text-amber-300 border border-amber-700"
                      : "bg-emerald-950 text-emerald-300 border border-emerald-700"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      engine2?.status === "action_required"
                        ? "bg-rose-400 animate-ping"
                        : engine2?.status === "watch"
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                    }`}
                  />
                  {engine2?.status.replace("_", " ") || "NORMAL"}
                </span>
              </div>

              {/* Engine Telemetry Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 text-xs font-mono">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-normal">Flight Cycles</span>
                  <span className="text-sm font-bold text-sky-300 tabular-nums">
                    {engine2?.cyclesSinceNew.toLocaleString()} CSN
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-normal">Flight Hours</span>
                  <span className="text-sm font-bold text-slate-200 tabular-nums">
                    13,840 FH
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-normal">Open Cases</span>
                  <span
                    className={`text-sm font-bold ${
                      engine2Cases.length > 0 ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {engine2Cases.length} Active
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-normal">Last Inspection</span>
                  <span className="text-xs text-slate-300">
                    {engine2?.lastInspectionDate || "2026-09-28"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-normal">LLP Margin</span>
                  <span className="text-xs font-bold text-emerald-300">
                    1,200 cyc to HPT
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-normal">Governing Doc</span>
                  <span className="text-xs text-sky-400">
                    AMM 72-00
                  </span>
                </div>
              </div>

              {/* Status Alert Detail */}
              {engine2?.status === "action_required" ? (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-rose-300 font-mono">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>ACTION REQUIRED: INSPECTION DUE</span>
                  </div>
                  <p className="text-rose-200/90 leading-relaxed font-sans text-[11px]">
                    Mandatory line inspection required per OEM technical publication before CRS airworthiness release.
                  </p>
                </div>
              ) : engine2?.status === "watch" ? (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-300 font-mono">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>WATCH STATUS: OIL CONSUMPTION TREND</span>
                  </div>
                  <p className="text-amber-200/90 leading-relaxed font-sans text-[11px]">
                    Oil consumption trending at 0.18 qt/hr. Replenish oil tank and inspect accessory gearbox seal for leakage drops.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-sans text-[11px]">
                    All thermal, pressure, and rotational telemetry within certified EASA/FAA type certificate envelope.
                  </span>
                </div>
              )}
            </div>

            {/* Launch CTA */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
              <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                ID: {engine2?.id}
              </span>
              <button
                onClick={() => onSelectEngine(flight.engine2Id, "explore")}
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white font-mono font-bold text-xs border border-slate-700 hover:border-sky-500/50 transition shadow"
              >
                <Cpu className="w-4 h-4" />
                <span>Launch 3D Digital Twin & Inspect Engine 2</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Reference Document Bar */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <ClipboardList className="w-4 h-4 text-sky-400" />
            <span>Certified Technical References for {flight.aircraftModel}:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "DEMO-AMM-72-01", label: "AMM 72-01 Fan Blade Blending Limits" },
              { id: "DEMO-AMM-72-02", label: "AMM 72-02 Vibration Limits & N1 Spectrum" },
              { id: "DEMO-AMM-79-01", label: "AMM 79-01 Oil System Leakage Criteria" },
            ].map((doc) => (
              <button
                key={doc.id}
                onClick={() => onOpenCitation(doc.id)}
                className="px-2.5 py-1 rounded-md bg-slate-950 hover:bg-slate-800 text-sky-300 hover:text-white border border-slate-700/80 hover:border-sky-500/50 transition flex items-center gap-1.5"
              >
                <span>{doc.label}</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
