import React, { useState } from "react";
import {
  PreventiveMaintenanceTask,
  PartId,
  PMSignOffRecord,
  EnginePartData,
} from "../types";
import {
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  FileText,
  Calendar,
  Gauge,
  UserCheck,
  PlusCircle,
  ExternalLink,
} from "lucide-react";

interface ComponentPreventiveTabProps {
  part: EnginePartData;
  engineCycles: number;
  engineHours?: number;
  engineId: string;
  tailNumber: string;
  tasks: PreventiveMaintenanceTask[];
  onSignOffTask: (taskId: string, record: PMSignOffRecord) => void;
  onOpenFullSchedule?: () => void;
}

export const ComponentPreventiveTab: React.FC<ComponentPreventiveTabProps> = ({
  part,
  engineCycles,
  engineHours = 14220,
  engineId,
  tailNumber,
  tasks,
  onSignOffTask,
  onOpenFullSchedule,
}) => {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [signOffModalTask, setSignOffModalTask] = useState<PreventiveMaintenanceTask | null>(null);

  // Sign-off form state
  const [engineerName, setEngineerName] = useState("");
  const [engineerLicense, setEngineerLicense] = useState("");
  const [station, setStation] = useState("DEL Line Maintenance Bay");
  const [findings, setFindings] = useState<"no_defects" | "within_limits" | "minor_monitoring_required">("no_defects");
  const [remarks, setRemarks] = useState("");
  const [formError, setFormError] = useState("");

  // Filter tasks that match this part or are global "all"
  const componentTasks = tasks.filter(
    (t) => t.partId === part.id || t.partId === "all"
  );

  const handleOpenSignOff = (task: PreventiveMaintenanceTask) => {
    setSignOffModalTask(task);
    setEngineerName("");
    setEngineerLicense("");
    setRemarks(`Completed ${task.title} per ${task.taskCode}. All criteria verified satisfactory.`);
    setFormError("");
  };

  const handleSubmitSignOff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!engineerName.trim() || !engineerLicense.trim()) {
      setFormError("Engineer name and AME license number are required.");
      return;
    }
    if (!signOffModalTask) return;

    const newRecord: PMSignOffRecord = {
      id: `SO-${Date.now().toString(36)}`,
      date: new Date().toISOString().split("T")[0],
      engineerName: engineerName.trim(),
      engineerLicense: engineerLicense.trim(),
      station,
      cyclesAtSignOff: engineCycles,
      hoursAtSignOff: engineHours,
      remarks: remarks.trim(),
      findings,
    };

    onSignOffTask(signOffModalTask.id, newRecord);
    setSignOffModalTask(null);
  };

  return (
    <div className="space-y-4 pt-1">
      {/* Header Banner */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Scheduled Preventive Maintenance
              <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {componentTasks.length} {componentTasks.length === 1 ? "Program" : "Programs"}
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Approved AMM inspection intervals, BSI cycles, and regulatory directives for {part.name}
            </p>
          </div>
        </div>

        {onOpenFullSchedule && (
          <button
            onClick={onOpenFullSchedule}
            className="flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300 hover:underline"
          >
            <span>All Fleet Tasks</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Task List */}
      {componentTasks.length === 0 ? (
        <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
          <ShieldCheck className="w-8 h-8 text-emerald-400/60 mx-auto mb-2" />
          <p className="text-xs text-slate-300 font-medium">No specialized routine intervals assigned</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            This component operates under standard A-Check zonal visual check and fleet-wide on-condition baseline.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {componentTasks.map((task) => {
            const isExpanded = expandedTaskId === task.id;
            const cyclesRemaining = task.nextDueCycles - engineCycles;
            const hoursRemaining = task.nextDueHours - engineHours;
            const isDueSoon = cyclesRemaining <= 200 || task.complianceStatus === "due_soon";
            const isOverdue = cyclesRemaining <= 0 || task.complianceStatus === "overdue";

            return (
              <div
                key={task.id}
                className={`rounded-xl border transition overflow-hidden ${
                  isOverdue
                    ? "bg-rose-950/20 border-rose-800/60"
                    : isDueSoon
                    ? "bg-amber-950/20 border-amber-800/60"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Main Card Header */}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                          {task.taskCode}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-950 text-sky-400 border border-sky-800/60">
                          {task.categoryLabel}
                        </span>
                        {task.adSbReference && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-800/60">
                            {task.adSbReference.split(" ")[0]}
                          </span>
                        )}
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isOverdue
                              ? "bg-rose-900 text-rose-200 border border-rose-700"
                              : isDueSoon
                              ? "bg-amber-900 text-amber-200 border border-amber-700"
                              : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          }`}
                        >
                          {isOverdue
                            ? "OVERDUE"
                            : isDueSoon
                            ? `DUE IN ${Math.max(0, cyclesRemaining)} CSN`
                            : "COMPLIANT"}
                        </span>
                      </div>

                      <h5 className="text-xs font-bold text-white mt-1 leading-snug">
                        {task.title}
                      </h5>
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {task.description}
                      </p>
                    </div>

                    <button
                      onClick={() => handleOpenSignOff(task)}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold shadow transition"
                      title="Log completion & sign off this preventive inspection"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Sign Off</span>
                    </button>
                  </div>

                  {/* Operational Countdown Metrics */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-800/80 text-[11px]">
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Next Due Cycle</span>
                      <span className="font-mono font-bold text-slate-200">
                        {task.nextDueCycles.toLocaleString()} CSN
                      </span>
                      <span className={`block text-[10px] ${cyclesRemaining <= 200 ? "text-amber-400 font-bold" : "text-slate-400"}`}>
                        ({cyclesRemaining > 0 ? `${cyclesRemaining} cyc left` : "0 cyc left"})
                      </span>
                    </div>

                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Interval / Target</span>
                      <span className="font-mono font-bold text-slate-200">
                        Every {task.intervalCycles?.toLocaleString()} CSN
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        {task.intervalHours?.toLocaleString()} FH
                      </span>
                    </div>

                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Target Date</span>
                      <span className="font-mono font-bold text-slate-200">
                        {task.nextDueDate}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        Est: {task.estimatedHours} hrs downtime
                      </span>
                    </div>
                  </div>

                  {/* Toggle expand procedures & history */}
                  <div className="mt-2.5 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 flex items-center gap-1 text-[10px]">
                      <UserCheck className="w-3 h-3 text-sky-400" />
                      {task.requiredCertification}
                    </span>

                    <button
                      onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                      className="text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 transition"
                    >
                      <span>{isExpanded ? "Hide AMM Procedures" : "View AMM Procedure Steps"}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Procedure & Sign-off History */}
                {isExpanded && (
                  <div className="p-3 bg-slate-950/80 border-t border-slate-800 space-y-3">
                    <div>
                      <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-sky-400" />
                        Approved Standard AMM Procedure Steps
                      </h6>
                      <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300 font-mono bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                        {task.detailedProcedureSteps.map((step, idx) => (
                          <li key={idx} className="leading-relaxed">
                            <span className="font-sans text-slate-300">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Historical Sign-offs */}
                    <div>
                      <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Latest Completed Sign-Off Records
                      </h6>
                      <div className="space-y-1.5">
                        {task.signOffHistory.map((rec) => (
                          <div
                            key={rec.id}
                            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] space-y-1"
                          >
                            <div className="flex items-center justify-between text-slate-400">
                              <span className="font-semibold text-slate-200">
                                {rec.engineerName} ({rec.engineerLicense})
                              </span>
                              <span className="font-mono text-[10px]">
                                {rec.date} • {rec.cyclesAtSignOff} CSN
                              </span>
                            </div>
                            <p className="text-slate-300 italic text-[11px]">"{rec.remarks}"</p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                              <span>Station: {rec.station}</span>
                              <span>•</span>
                              <span className="text-emerald-400 font-medium">Status: Approved</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sign Off Modal */}
      {signOffModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Sign Off Preventive Maintenance Task
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {signOffModalTask.title} ({signOffModalTask.taskCode})
                </p>
              </div>
              <button
                onClick={() => setSignOffModalTask(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitSignOff} className="space-y-3.5 text-xs">
              {formError && (
                <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Aircraft Maintenance Engineer (AME) Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={engineerName}
                    onChange={(e) => setEngineerName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    DGCA / EASA License Badge # *
                  </label>
                  <input
                    type="text"
                    required
                    value={engineerLicense}
                    onChange={(e) => setEngineerLicense(e.target.value)}
                    placeholder="e.g. AME-DEL-64920"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Inspection Line Station
                  </label>
                  <select
                    value={station}
                    onChange={(e) => setStation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="DEL Line Maintenance Bay">Delhi (DEL) Line Maintenance</option>
                    <option value="BOM Line Maintenance Bay">Mumbai (BOM) Line Maintenance</option>
                    <option value="BLR Base Hangar 1">Bengaluru (BLR) Base Hangar</option>
                    <option value="MAA Transit Ramp Bay">Chennai (MAA) Transit Bay</option>
                    <option value="HYD Base Hangar 2">Hyderabad (HYD) Base Hangar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Inspection Findings
                  </label>
                  <select
                    value={findings}
                    onChange={(e) => setFindings(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="no_defects">Nil Defects / Satisfactory</option>
                    <option value="within_limits">Within AMM Chapter Limits</option>
                    <option value="minor_monitoring_required">Minor Wear (Monitoring Required)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Engine Cycles / Hours at Sign-Off
                </label>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 flex items-center justify-between">
                  <span>Engine: {engineId} ({tailNumber})</span>
                  <span>{engineCycles.toLocaleString()} CSN • {engineHours.toLocaleString()} FH</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Technical Log Entry Remarks & Certifying Sign-Off Note
                </label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSignOffModalTask(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Sign Off & Reset Interval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
