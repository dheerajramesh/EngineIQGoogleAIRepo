import React from "react";
import { ActionLevel } from "../types";
import { ACTION_LEVEL_DEFINITIONS } from "../data/rules";
import { CheckCircle2, AlertTriangle, ArrowRight, ShieldAlert } from "lucide-react";

interface DecisionLadderProps {
  currentLevel: ActionLevel | null;
  onSelectLevel?: (level: ActionLevel) => void;
  interactive?: boolean;
}

export function DecisionLadder({
  currentLevel,
  onSelectLevel,
  interactive = false,
}: DecisionLadderProps) {
  const levels: ActionLevel[] = [0, 1, 2, 3, 4];

  return (
    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-sky-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
            Standard Decision Ladder
          </h4>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          Governing: {currentLevel !== null ? `Level ${currentLevel}` : "Pending Evaluation"}
        </span>
      </div>

      {/* Stepper Steps */}
      <div className="space-y-2">
        {levels.map((lvl) => {
          const def = ACTION_LEVEL_DEFINITIONS[lvl];
          const isCurrent = currentLevel === lvl;

          return (
            <div
              key={lvl}
              onClick={() => interactive && onSelectLevel && onSelectLevel(lvl)}
              className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all duration-200 ${
                interactive ? "cursor-pointer" : ""
              } ${
                isCurrent
                  ? `${def.bg} ${def.border} ring-1 ring-offset-0 ${
                      lvl === 4
                        ? "ring-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                        : lvl === 3
                        ? "ring-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.3)]"
                        : lvl === 2
                        ? "ring-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                        : lvl === 1
                        ? "ring-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.3)]"
                        : "ring-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    }`
                  : "bg-slate-950/40 border-slate-800/80 opacity-60 hover:opacity-90"
              }`}
            >
              {/* Level Badge */}
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-md font-mono text-xs font-bold shrink-0 ${
                  isCurrent
                    ? `${def.bg} ${def.color} border ${def.border}`
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                L{lvl}
              </div>

              {/* Action Description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-xs font-semibold ${
                      isCurrent ? def.color : "text-slate-300"
                    }`}
                  >
                    {def.action}
                  </span>
                </div>
              </div>

              {/* Indicator */}
              {isCurrent && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-900/90 text-white border border-slate-700 shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-sky-400" />
                  Active
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
