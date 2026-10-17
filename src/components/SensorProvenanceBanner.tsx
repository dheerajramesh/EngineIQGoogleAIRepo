import React, { useState } from "react";
import { AircraftEngine, EngineLiveTelemetrySnapshot } from "../types";
import {
  Radio,
  ShieldCheck,
  Activity,
  Flame,
  Gauge,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  ChevronRight,
  Sliders,
  Layers,
  Sparkles,
} from "lucide-react";
import { SensorProvenanceModal } from "./SensorProvenanceModal";

interface SensorProvenanceBannerProps {
  currentEngine: AircraftEngine;
  telemetrySnapshot: EngineLiveTelemetrySnapshot;
}

export const SensorProvenanceBanner: React.FC<SensorProvenanceBannerProps> = ({
  currentEngine,
  telemetrySnapshot,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(false);

  const { vibrationN1, vibrationN2, egt, oilPressure, oilTemp, chipDetector } =
    telemetrySnapshot;

  return (
    <>
      <div className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/30 border border-sky-900/50 shadow-xl overflow-hidden">
        {/* Top Header Strip: Provenance Identity */}
        <div className="px-4 py-3 sm:px-5 border-b border-slate-800/80 bg-slate-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>LIVE AIRCRAFT SENSOR TELEMETRY STREAM</span>
            </div>

            {/* Hardware Origin Tag */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-mono">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>Tail {telemetrySnapshot.tailNumber} • {telemetrySnapshot.enginePosition} Engine</span>
            </div>

            {/* FADEC Bus Protocol */}
            <span className="hidden md:inline-flex px-2 py-0.5 rounded text-[11px] font-mono text-slate-400 bg-slate-800/60 border border-slate-700/60">
              ARINC 429 • FADEC Dual-Ch EEC
            </span>
          </div>

          {/* Audit CTA */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 hover:text-white border border-sky-500/40 text-xs font-semibold transition cursor-pointer"
              title="Inspect serial numbers, mount positions, and calibration certs"
            >
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span>Audit Sensor Architecture</span>
              <ChevronRight className="w-3.5 h-3.5 text-sky-400" />
            </button>
          </div>
        </div>

        {/* Live Metrics Grid: Vibration, EGT, Oil Pressure, Chip Detector */}
        <div className="p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Activity className="w-4 h-4 text-sky-400" />
                  Direct Physical Sensor Feeds Powering Preventive Care
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-emerald-400 border border-slate-700">
                  Hardware-Verified
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                These live physical sensor values are actively monitored to calculate remaining safe cycles and condition-based task intervals.
              </p>
            </div>
            
            <button
              onClick={() => setIsDetailsCollapsed(!isDetailsCollapsed)}
              className="text-xs text-slate-400 hover:text-sky-300 transition self-start lg:self-auto font-medium"
            >
              {isDetailsCollapsed ? "Show Sensor Details" : "Hide Details"}
            </button>
          </div>

          {/* 4 Primary Sensor Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Vibration Sensors (N1 & N2) */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-sky-400" />
                  Shaft Vibration
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    vibrationN1.status === "nominal"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-amber-500/20 text-amber-300"
                  }`}
                >
                  {vibrationN1.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">N1 Fan (Brg 1)</span>
                  <div className="text-lg font-black font-mono text-white">
                    {vibrationN1.value.toFixed(2)} <span className="text-xs font-normal text-slate-400">mils</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Limit: &lt; {vibrationN1.limit}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">N2 Core (TRF)</span>
                  <div className="text-lg font-black font-mono text-white">
                    {vibrationN2.value.toFixed(2)} <span className="text-xs font-normal text-slate-400">mils</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Limit: &lt; {vibrationN2.limit}</span>
                </div>
              </div>

              <div className="pt-1 border-t border-slate-800/80 text-[10px] text-slate-400 truncate font-mono">
                Sensor: Endevco Piezoelectric #1 & TRF
              </div>
            </div>

            {/* 2. EGT Thermocouple Rake */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" />
                  Exhaust Gas Temp (EGT)
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 uppercase">
                  Margin: +{egt.margin}°C
                </span>
              </div>

              <div className="pt-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">LPT 8-Point Rake Average</span>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-black font-mono text-amber-300">
                    {egt.value} <span className="text-xs font-normal text-slate-400">°C</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">/ 950°C Redline</span>
                </div>
                {/* Visual margin bar */}
                <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full"
                    style={{ width: `${Math.min(100, (egt.value / egt.redline) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="pt-1 border-t border-slate-800/80 text-[10px] text-slate-400 truncate font-mono">
                Sensor: Ametek T-49 Type-K Rake
              </div>
            </div>

            {/* 3. Main Engine Oil Pressure */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-sky-400" />
                  Main Oil Pressure
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 uppercase">
                  Normal Range
                </span>
              </div>

              <div className="pt-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Scavenge Delta-P Transducer</span>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-black font-mono text-white">
                    {oilPressure.value.toFixed(1)} <span className="text-xs font-normal text-slate-400">psid</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">({oilPressure.normalMin}-{oilPressure.normalMax})</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Oil Temp: <span className="font-mono text-slate-200">{oilTemp.value}°C</span>
                </div>
              </div>

              <div className="pt-1 border-t border-slate-800/80 text-[10px] text-slate-400 truncate font-mono">
                Sensor: Kulite Piezoresistive Transmitter
              </div>
            </div>

            {/* 4. Magnetic Chip Detector */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Chip Detector (FDGS)
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 uppercase">
                  Debris Nil
                </span>
              </div>

              <div className="pt-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Inductive Sump Continuity</span>
                <div className="text-xl font-black font-mono text-emerald-400">
                  {chipDetector.debrisParticlesCount === 0 ? "0 Ferrous Chips" : `${chipDetector.debrisParticlesCount} Chips Found`}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Electrically Clear (&gt;10 MΩ)</span>
                </div>
              </div>

              <div className="pt-1 border-t border-slate-800/80 text-[10px] text-slate-400 truncate font-mono">
                Sensor: Eaton TED Quantitative Sump Plug
              </div>
            </div>
          </div>

          {/* Trust Explanation Callout */}
          {!isDetailsCollapsed && (
            <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <Info className="w-4 h-4 text-sky-400 shrink-0" />
                <p className="leading-relaxed">
                  <strong className="text-white">Why this information is shown:</strong> Every preventive maintenance task below is directly linked to an attached aircraft sensor.
                  When sensor telemetry drifts near tolerance limits (e.g., EGT margin loss or vibration harmonic shift), the system dynamically advances the inspection window before scheduled cycle limits are reached.
                </p>
              </div>
              <div className="text-[11px] font-mono text-slate-400 shrink-0">
                Sync Rate: 64 Hz Realtime
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Audit Modal */}
      <SensorProvenanceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentEngine={currentEngine}
        telemetrySnapshot={telemetrySnapshot}
      />
    </>
  );
};
