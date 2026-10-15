import React, { useState, useMemo } from "react";
import { CaseLogEntry } from "../types";
import {
  FileText,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Plane,
} from "lucide-react";
import { formatPartName } from "../logic/rulesEngine";

interface CaseLogViewProps {
  caseLogs: CaseLogEntry[];
  onClearLogs: () => void;
  onOpenCitation: (docId: string) => void;
  currentEngineId?: string;
  tailNumber?: string;
  isFleetWide?: boolean;
}

export function CaseLogView({
  caseLogs,
  onClearLogs,
  onOpenCitation,
  currentEngineId,
  tailNumber,
  isFleetWide = false,
}: CaseLogViewProps) {
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [viewScope, setViewScope] = useState<"this_engine" | "all_fleet">(
    currentEngineId && !isFleetWide ? "this_engine" : "all_fleet"
  );

  const displayedLogs = useMemo(() => {
    if (viewScope === "this_engine" && currentEngineId) {
      return caseLogs.filter((c) => c.engineId === currentEngineId || (!c.engineId && tailNumber && c.aircraftType.includes(tailNumber)));
    }
    return caseLogs;
  }, [caseLogs, viewScope, currentEngineId, tailNumber]);

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(displayedLogs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `engineiq_case_logs_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-5 text-slate-200 animate-fade-in pb-12">
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-400" />
            <h2 className="text-base font-bold text-white">
              {isFleetWide ? "Fleet-Wide Maintenance Audit Log" : "Maintenance Decision Logbook"}
            </h2>
            {currentEngineId && !isFleetWide && (
              <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 text-[10px] font-mono">
                {tailNumber} • {currentEngineId}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable log of signed evaluations, engineer credentials, and governing manual citations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Scope Toggle if inside an engine workspace */}
          {currentEngineId && (
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setViewScope("this_engine")}
                className={`px-2.5 py-1 rounded transition ${
                  viewScope === "this_engine"
                    ? "bg-sky-500 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                This Engine
              </button>
              <button
                onClick={() => setViewScope("all_fleet")}
                className={`px-2.5 py-1 rounded transition ${
                  viewScope === "all_fleet"
                    ? "bg-sky-500 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                All Fleet ({caseLogs.length})
              </button>
            </div>
          )}

          {displayedLogs.length > 0 && (
            <>
              <button
                id="btn-export-json"
                onClick={handleExportJson}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>Export Audit JSON</span>
              </button>
              <button
                id="btn-clear-logs"
                onClick={() => {
                  if (confirm("Are you sure you want to clear the local case log?")) {
                    onClearLogs();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/40 border border-rose-800/60 rounded-lg transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </>
          )}
        </div>
      </div>

      {displayedLogs.length === 0 ? (
        <div className="p-12 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
          <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto" />
          <h4 className="text-sm font-semibold text-slate-300">No Signed Cases in Session</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Complete an evaluation in the Incident Mode and sign off with certifying engineer credentials to populate this logbook.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedLogs.map((item) => {
            const isExpanded = expandedCaseId === item.id;

            return (
              <div
                key={item.id}
                className="rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition overflow-hidden shadow-lg"
              >
                {/* Header Row */}
                <div
                  onClick={() => setExpandedCaseId(isExpanded ? null : item.id)}
                  className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-1 rounded font-mono font-bold text-xs ${
                        item.overallLevel === 4
                          ? "bg-rose-950 text-rose-300 border border-rose-700"
                          : item.overallLevel === 3
                          ? "bg-orange-950 text-orange-300 border border-orange-700"
                          : item.overallLevel === 2
                          ? "bg-amber-950 text-amber-300 border border-amber-700"
                          : item.overallLevel === 1
                          ? "bg-sky-950 text-sky-300 border border-sky-700"
                          : "bg-emerald-950 text-emerald-300 border border-emerald-700"
                      }`}
                    >
                      L{item.overallLevel}
                    </span>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">{item.id}</span>
                        {item.tailNumber && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800">
                            {item.tailNumber} ({item.enginePosition})
                          </span>
                        )}
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-medium text-sky-300 uppercase tracking-wide">
                          {item.eventType.replace(/_/g, " ")}
                        </span>
                        {!item.tailNumber && (
                          <span className="text-xs text-slate-500">
                            ({item.enginePosition} Eng, {item.aircraftType})
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{item.summary}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right font-mono text-[11px]">
                      <div className="text-slate-300 font-medium">
                        Signed: {item.engineerName} ({item.engineerId})
                      </div>
                      <div className="text-slate-500 text-[10px]">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        item.decision === "Approved"
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                          : item.decision === "Edited"
                          ? "bg-sky-950 text-sky-300 border border-sky-700"
                          : "bg-rose-950 text-rose-300 border border-rose-700"
                      }`}
                    >
                      {item.decision}
                    </span>

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 bg-slate-950/90 border-t border-slate-800 space-y-4 text-xs">
                    {/* Findings & Limits Table */}
                    <div>
                      <span className="font-mono text-[10px] uppercase text-slate-400 tracking-wider block mb-1.5">
                        Deterministic Limits Check Details
                      </span>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-500 font-mono text-[10px]">
                              <th className="py-1">Component</th>
                              <th className="py-1">Damage Type</th>
                              <th className="py-1">Measured</th>
                              <th className="py-1">Limit Band</th>
                              <th className="py-1">Level</th>
                              <th className="py-1">Source Doc</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40">
                            {item.limitsRows.map((r, idx) => (
                              <tr key={idx}>
                                <td className="py-1.5 text-slate-200">{r.component}</td>
                                <td className="py-1.5 text-slate-300">{r.damageType}</td>
                                <td className="py-1.5 font-mono text-sky-400">{r.measured}</td>
                                <td className="py-1.5 text-slate-400">{r.limitBandApplied}</td>
                                <td className="py-1.5 font-mono font-bold">L{r.resultLevel}</td>
                                <td className="py-1.5">
                                  <button
                                    onClick={() => onOpenCitation(r.sourceDocId)}
                                    className="text-sky-400 hover:underline font-mono"
                                  >
                                    [{r.sourceDocId}]
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Draft Tech Log */}
                    {item.draftTechLog && (
                      <div className="space-y-1">
                        <span className="font-mono text-[10px] uppercase text-slate-400 tracking-wider">
                          Recorded Tech Log Entry:
                        </span>
                        <pre className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {item.draftTechLog}
                        </pre>
                      </div>
                    )}

                    {/* Reject Reason if applicable */}
                    {item.reason && (
                      <div className="p-2.5 rounded bg-rose-950/30 border border-rose-800 text-rose-300">
                        <span className="font-bold">Engineer Override / Rejection Note: </span>
                        {item.reason}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
