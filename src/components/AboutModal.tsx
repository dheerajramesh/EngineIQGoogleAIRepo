import React from "react";
import { X, ShieldAlert, Cpu, CheckCircle2, UserCheck, BookOpen, Layers } from "lucide-react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-scale-up text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Cpu className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">About EngineIQ Architecture</h3>
              <p className="text-xs text-slate-400 font-mono">
                Cited Decision-Support Copilot for Aircraft Maintenance
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

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Core Non-Negotiable Triad */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase text-sky-400 font-bold tracking-wider">
              The EngineIQ Operational Triad
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400 font-mono">
                  <Cpu className="w-3.5 h-3.5" /> 1. Gemini AI
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Extracts structured technical parameters and synthesizes plain-language next-step checklists with document citations.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 2. Plain Code
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Zero AI in limits logic. Pure deterministic code compares numerical measurements against AMM limit bands.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 font-mono">
                  <UserCheck className="w-3.5 h-3.5" /> 3. Human Sign-Off
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  A certified Part-66 / FAA A&P engineer must review, confirm, and digitally sign off before tech-log release.
                </p>
              </div>
            </div>
          </div>

          {/* Strict Safety Invariants */}
          <div className="p-4 rounded-lg bg-rose-950/30 border border-rose-800/40 text-xs space-y-1.5 text-rose-200">
            <div className="flex items-center gap-2 font-bold text-rose-300">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Strict Safety Invariants Enforced in Code & Prompts:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
              <li>Gemini is strictly forbidden from declaring an engine "fit to fly" or "airworthy".</li>
              <li>Gemini can never alter or contradict a deterministic limit band classification.</li>
              <li>Every technical claim and next step must cite a document ID in square brackets (e.g. [DEMO-AMM-72-01]).</li>
              <li>All missing measurements force an automatic Level 3 escalation due to insufficient data.</li>
            </ul>
          </div>

          {/* Engine Modeling Note */}
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-2">
            <span className="font-mono text-[10px] uppercase text-slate-400 font-bold tracking-wider">
              3D Interactive Model Specification
            </span>
            <p className="text-slate-300 leading-relaxed">
              The 3D canvas renders a <strong>representative geared turbofan (GTF)</strong> modeled procedurally with 10 primary aerodynamic and structural subsystems: Fan Case, Fan Blades, Fan Drive Planetary Gearbox, LPC Booster, HPC, Combustor, HPT, LPT, Exhaust Cone, and Auxiliary Oil Circuit.
            </p>
          </div>

          {/* Regulatory Disclaimer */}
          <div className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-800/30 text-xs text-amber-300 font-mono">
            <strong>NOTICE:</strong> All data, limits, procedures, and manual documents are illustrative dummy records created for this technical demonstration. Do not use for real-world aircraft maintenance operations.
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 bg-slate-950 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
