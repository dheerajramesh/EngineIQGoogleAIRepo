/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { EnginePartData, PartId, ComponentHistoryEntry } from "../types";
import { LIFE_LIMITED_PARTS, computePartLife } from "../logic/lifeTracker";
import { ENGINE_PARTS } from "../data/parts";
import {
  Clock,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Layers,
  ArrowRight,
  ClipboardList,
  Wrench,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Cpu,
  Gauge,
  Info,
} from "lucide-react";

interface ComponentLifeTrackerProps {
  part: EnginePartData;
  engineCycles: number;
  engineId?: string;
  tailNumber?: string;
  historyLogs?: ComponentHistoryEntry[];
  onSelectComponent?: (partId: PartId) => void;
  onOpenHistoryTab?: () => void;
  onOpenCitation?: (docId: string) => void;
}

export function ComponentLifeTracker({
  part,
  engineCycles,
  engineId = "VT-DEM1-ENG1",
  tailNumber = "VT-DEM1",
  historyLogs = [],
  onSelectComponent,
  onOpenHistoryTab,
  onOpenCitation,
}: ComponentLifeTrackerProps) {
  // Component specific cycle override state
  const [componentCycleOverride, setComponentCycleOverride] = useState<number | null>(null);
  const [showAllPartsTable, setShowAllPartsTable] = useState(true);

  // Is this part life-limited?
  const llpInfo = LIFE_LIMITED_PARTS.find((p) => p.id === part.id);
  const isLLP = !!llpInfo || !!part.lifeLimitCycles;

  const currentComponentCycles = componentCycleOverride !== null ? componentCycleOverride : engineCycles;

  const computedStatus = isLLP
    ? computePartLife(
        llpInfo || {
          id: part.id,
          name: part.name,
          module: part.defaultZone,
          limitCycles: part.lifeLimitCycles || 20000,
        },
        currentComponentCycles
      )
    : null;

  // Logs for this part
  const partLogs = historyLogs.filter((l) => l.partId === part.id);
  const repairCount = partLogs.filter((l) => l.logType === "repair").length;
  const replacementCount = partLogs.filter((l) => l.logType === "replacement").length;

  return (
    <div className="space-y-4 animate-fade-in text-slate-200">
      {/* 1. Regulatory Compliance / On-Condition Banner */}
      {!isLLP ? (
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 text-xs flex items-center gap-2 shadow-sm">
          <Info className="w-4 h-4 text-sky-400 shrink-0" />
          <span>On-condition. No cycle limit.</span>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold text-[11px] sm:text-xs">
              Mandatory LLP Control per FAA FAR 33.70 / EASA CS-E 515. Life is measured in operating cycles, not calendar time.
            </span>
          </div>
          <span className="text-[10px] font-mono text-amber-300 uppercase px-2 py-0.5 rounded bg-amber-900/60 border border-amber-700/50 shrink-0 hidden sm:inline">
            LLP Subsystem
          </span>
        </div>
      )}

      {/* 2. Component Life Status Hero Card */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  {part.name} — Life & Cycle Tracker
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  {tailNumber} • {engineId} • {part.defaultZone}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {componentCycleOverride !== null && (
              <button
                onClick={() => setComponentCycleOverride(null)}
                className="flex items-center gap-1 px-2 py-1 text-[11px] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition font-mono"
                title="Reset to match Global Engine Flight Cycles"
              >
                <RotateCcw className="w-3 h-3" /> Sync with Engine ({engineCycles.toLocaleString()} cyc)
              </button>
            )}
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                !isLLP
                  ? "bg-slate-800 text-slate-300 border-slate-700"
                  : computedStatus?.status === "red"
                  ? "bg-rose-950/80 text-rose-300 border-rose-700 animate-pulse"
                  : computedStatus?.status === "amber"
                  ? "bg-amber-950/80 text-amber-300 border-amber-700"
                  : "bg-emerald-950/80 text-emerald-300 border-emerald-700"
              }`}
            >
              {!isLLP ? "On-Condition Service" : computedStatus?.statusLabel}
            </span>
          </div>
        </div>

        {/* Global vs Component Cycles Interactive Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-slate-950/70 border border-slate-800 font-mono text-xs">
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Global Engine Flight Cycles:</span>
              <span className="font-bold text-sky-400">{engineCycles.toLocaleString()} CSN</span>
            </div>
            <div className="text-[10px] text-slate-500">
              Master engine airframe cycles since new (baseline for all installed modules)
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Component Operating Cycles:</span>
              <span className="font-bold text-amber-300">
                {currentComponentCycles.toLocaleString()} CSN
                {componentCycleOverride !== null && " (Overridden)"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="input-component-cycles"
                type="number"
                min="0"
                value={currentComponentCycles}
                onChange={(e) =>
                  setComponentCycleOverride(Math.max(0, parseInt(e.target.value || "0", 10)))
                }
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-sky-300 font-bold focus:outline-none focus:border-sky-500"
                placeholder={engineCycles.toString()}
              />
              <span className="text-[10px] text-slate-500 whitespace-nowrap">cyc</span>
            </div>
          </div>
        </div>

        {/* If Life-Limited Part */}
        {isLLP && computedStatus ? (
          <div className="space-y-3">
            {/* Visual Progress Bar */}
            <div className="space-y-1.5 p-3 rounded-lg bg-slate-950/90 border border-slate-800">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400 uppercase text-[10px] font-bold">
                  Fatigue Life Consumed:
                </span>
                <span
                  className={`text-sm font-bold ${
                    computedStatus.status === "red"
                      ? "text-rose-400"
                      : computedStatus.status === "amber"
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }`}
                >
                  {computedStatus.percentUsed}%
                </span>
              </div>

              <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800 relative">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    computedStatus.status === "red"
                      ? "bg-rose-500 shadow-[0_0_12px_#f43f5e]"
                      : computedStatus.status === "amber"
                      ? "bg-amber-500 shadow-[0_0_10px_#f59e0b]"
                      : "bg-emerald-500 shadow-[0_0_10px_#10b981]"
                  }`}
                  style={{ width: `${Math.min(100, computedStatus.percentUsed)}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>0 CSN (New)</span>
                <span className="text-amber-500/80">70% (Elevated)</span>
                <span className="text-rose-500/80">90% (Critical)</span>
                <span className="font-bold text-slate-400">
                  Limit: {computedStatus.limitCycles.toLocaleString()} cyc
                </span>
              </div>
            </div>

            {/* 3 Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                  Fatigue Limit
                </span>
                <span className="text-sm sm:text-base font-bold text-amber-300 block mt-0.5">
                  {computedStatus.limitCycles.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500">Cycles</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                  Remaining Margin
                </span>
                <span
                  className={`text-sm sm:text-base font-bold block mt-0.5 ${
                    computedStatus.remainingCycles <= 0
                      ? "text-rose-400"
                      : computedStatus.remainingCycles < 2000
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }`}
                >
                  {computedStatus.remainingCycles.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500">Cycles Remaining</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                  Life Expended
                </span>
                <span
                  className={`text-sm sm:text-base font-bold block mt-0.5 ${
                    computedStatus.status === "red"
                      ? "text-rose-400"
                      : computedStatus.status === "amber"
                      ? "text-amber-400"
                      : "text-sky-400"
                  }`}
                >
                  {computedStatus.percentUsed}%
                </span>
                <span className="text-[10px] text-slate-500">Of Certified Life</span>
              </div>
            </div>

            {/* Mandatory Technical Actions & Guidance */}
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-semibold text-white flex items-center gap-1.5 font-mono">
                  <Info className="w-3.5 h-3.5 text-sky-400" />
                  Mandatory Airworthiness Retirement Criterion:
                </span>
                {onOpenCitation && (
                  <button
                    onClick={() => onOpenCitation("DEMO-AMM-72-00-01")}
                    className="text-[11px] font-mono text-sky-400 hover:text-sky-300 underline"
                  >
                    PW1100G Ch. 05-10-00
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                {part.replacementGuidance ||
                  "Upon reaching the certified cyclic fatigue retirement threshold, this rotor disk must be permanently removed from aircraft service and scrapped. Discard without exception in accordance with OEM Chapter 05-10-00."}
              </p>
            </div>
          </div>
        ) : (
          /* On-Condition Component Guidance */
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono">
              <CheckCircle2 className="w-4 h-4" />
              <span>On-Condition Line Replaceable Subsystem</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
              This subsystem does not have a mandatory cyclic retirement limit. Maintenance and replacement are performed <strong>On-Condition</strong> based on transit line inspections, fluid analysis, borescope NDT, and allowable damage limits in the Pratt & Whitney AMM.
            </p>
            <div className="text-[10px] font-mono text-slate-400 pt-1">
              • Scheduled checks: Daily Transit Line Check & Weekly Detailed Visual Inspection
            </div>
          </div>
        )}

        {/* 3. Direct Link to Component Maintenance History */}
        <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-sky-400" />
            <div className="text-xs font-mono">
              <span className="text-slate-300 font-semibold">{partLogs.length} Maintenance Records Logged</span>
              <span className="text-slate-500 text-[10px] block">
                {repairCount > 0 && `${repairCount} repair(s) `}
                {replacementCount > 0 && `• ${replacementCount} replacement(s) `}
                • Daily & weekly checks
              </span>
            </div>
          </div>

          {onOpenHistoryTab && (
            <button
              onClick={onOpenHistoryTab}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-950 hover:bg-sky-900 text-sky-300 hover:text-white border border-sky-800 text-xs font-mono font-medium transition"
            >
              <span>View Component History & Logbook</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Expandable All Subsystems LLP Fleet Matrix */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg">
        <button
          onClick={() => setShowAllPartsTable(!showAllPartsTable)}
          className="w-full flex items-center justify-between p-3.5 text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-800/60 transition"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <span className="font-bold">
              All Engine Subsystems LLP Comparison Table ({LIFE_LIMITED_PARTS.length} Rotor Modules)
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>{showAllPartsTable ? "Hide Matrix" : "Expand Matrix"}</span>
            {showAllPartsTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {showAllPartsTable && (
          <div className="p-3 border-t border-slate-800 overflow-x-auto animate-fade-in">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                  <th className="py-2 px-2.5">Subsystem</th>
                  <th className="py-2 px-2">Limit</th>
                  <th className="py-2 px-2">Current</th>
                  <th className="py-2 px-2.5">Consumed</th>
                  <th className="py-2 px-2">Remaining</th>
                  <th className="py-2 px-2 text-right">Switch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {LIFE_LIMITED_PARTS.map((item) => {
                  const isCurrent = item.id === part.id;
                  const itemCycles = isCurrent ? currentComponentCycles : engineCycles;
                  const comp = computePartLife(item, itemCycles);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelectComponent && onSelectComponent(item.id)}
                      className={`hover:bg-slate-800/40 transition cursor-pointer text-xs ${
                        isCurrent ? "bg-sky-950/40 font-bold" : ""
                      }`}
                    >
                      <td className="py-2.5 px-2.5">
                        <span className="text-slate-100">{item.name}</span>
                        {isCurrent && (
                          <span className="ml-1.5 text-[9px] px-1 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-400">
                        {item.limitCycles.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-300">
                        {itemCycles.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2.5 font-mono">
                        <span
                          className={`font-bold ${
                            comp.status === "red"
                              ? "text-rose-400"
                              : comp.status === "amber"
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {comp.percentUsed}%
                        </span>
                      </td>
                      <td className="py-2.5 px-2 font-mono">
                        <span
                          className={`font-bold ${
                            comp.remainingCycles <= 0 ? "text-rose-400" : "text-slate-300"
                          }`}
                        >
                          {comp.remainingCycles.toLocaleString()} cyc
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectComponent && onSelectComponent(item.id);
                          }}
                          className="text-[10px] font-mono text-sky-400 hover:text-sky-300 underline"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
