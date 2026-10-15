import React, { useState } from "react";
import { AircraftEngine, IncidentScenario } from "../types";
import { DUMMY_SCENARIOS } from "../data/scenarios";
import {
  AlertTriangle,
  Zap,
  Plane,
  X,
  ShieldAlert,
  ArrowRight,
  Layers,
  CheckCircle2,
} from "lucide-react";

interface SimulateIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  engines: AircraftEngine[];
  onConfirm: (engineId: string, scenarioId: string) => void;
}

export function SimulateIncidentModal({
  isOpen,
  onClose,
  engines,
  onConfirm,
}: SimulateIncidentModalProps) {
  const [selectedEngineId, setSelectedEngineId] = useState<string>(
    engines.find((e) => e.status === "normal")?.id || engines[0]?.id || ""
  );
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("S1");

  if (!isOpen) return null;

  const selectedEngine = engines.find((e) => e.id === selectedEngineId) || engines[0];
  const selectedScenario =
    DUMMY_SCENARIOS.find((s) => s.id === selectedScenarioId) || DUMMY_SCENARIOS[0];

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEngineId || !selectedScenarioId) return;
    onConfirm(selectedEngineId, selectedScenarioId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-scale-up text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Zap className="w-4 h-4 animate-pulse" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                Simulate New Incident (Demo)
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Inject a real-time event to test fleet state updates & copilot escalation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSimulate} className="p-6 space-y-5">
          {/* Engine Selector */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold mb-2">
              Select Target Aircraft Engine
            </label>
            <div className="relative">
              <select
                id="select-simulate-engine"
                value={selectedEngineId}
                onChange={(e) => setSelectedEngineId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-sky-400 font-mono focus:outline-none focus:border-sky-500"
              >
                {engines.map((eng) => (
                  <option key={eng.id} value={eng.id}>
                    {eng.tailNumber} ({eng.enginePosition}) — {eng.location} • Status: {eng.status} ({eng.cyclesSinceNew.toLocaleString()} CSN)
                  </option>
                ))}
              </select>
            </div>
            {selectedEngine && (
              <div className="mt-2 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Current Status: <strong className="text-slate-200">{selectedEngine.status}</strong></span>
                <span>Base: <strong className="text-slate-200">{selectedEngine.location}</strong></span>
                <span>Open Cases: <strong className="text-slate-200">{selectedEngine.openCaseIds.length}</strong></span>
              </div>
            )}
          </div>

          {/* Scenario Selector */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold mb-2">
              Select Incident Scenario
            </label>
            <select
              id="select-simulate-scenario"
              value={selectedScenarioId}
              onChange={(e) => setSelectedScenarioId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
            >
              {DUMMY_SCENARIOS.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.title} — Expected Level L{sc.expectedLevel}
                </option>
              ))}
            </select>
          </div>

          {/* Scenario Preview Box */}
          {selectedScenario && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase text-slate-500">
                  Scenario Details
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    selectedScenario.expectedLevel >= 3
                      ? "bg-rose-950 text-rose-300 border border-rose-800"
                      : "bg-amber-950 text-amber-300 border border-amber-800"
                  }`}
                >
                  Expected Level: L{selectedScenario.expectedLevel}
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {selectedScenario.narrative}
              </p>
              <div className="pt-1 flex flex-wrap gap-1.5 text-[10px] font-mono text-sky-400">
                {selectedScenario.docRefs.map((doc) => (
                  <span key={doc} className="px-1.5 py-0.2 rounded bg-sky-950 border border-sky-800">
                    [{doc}]
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notice */}
          <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-[11px] font-mono text-amber-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              On confirm: Sets engine status to <strong>action_required</strong>, generates a new case log, and triggers live fleet alerts.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition transform active:scale-95"
            >
              <Zap className="w-4 h-4" />
              <span>Inject Incident Now</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
