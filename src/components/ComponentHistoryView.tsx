/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  ComponentHistoryEntry,
  ComponentLogType,
  ComponentLogStatus,
  EnginePartData,
  PartId,
  UserSession,
} from "../types";
import { DEFAULT_CHECKLISTS_BY_PART } from "../data/componentHistory";
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  RefreshCw,
  Plus,
  Search,
  Filter,
  FileCheck2,
  UserCheck,
  ShieldCheck,
  Tag,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  Activity,
  Award,
  Layers,
  Sparkles,
  ArrowRight,
  ClipboardList,
} from "lucide-react";

interface ComponentHistoryViewProps {
  part: EnginePartData;
  historyLogs: ComponentHistoryEntry[];
  onAddLog: (entry: ComponentHistoryEntry) => void;
  userSession: UserSession;
  engineId?: string;
  tailNumber?: string;
  engineCycles?: number;
}

export function ComponentHistoryView({
  part,
  historyLogs,
  onAddLog,
  userSession,
  engineId = "VT-DEM1-ENG1",
  tailNumber = "VT-DEM1",
  engineCycles = 5120,
}: ComponentHistoryViewProps) {
  // Filter & Search states
  const [filterType, setFilterType] = useState<"all" | ComponentLogType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Form state for adding new maintenance log
  const [logType, setLogType] = useState<ComponentLogType>("daily_check");
  const [status, setStatus] = useState<ComponentLogStatus>("passed");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [flightHours, setFlightHours] = useState(() => 14220);
  const [flightCycles, setFlightCycles] = useState(() => engineCycles);
  const [workOrderNumber, setWorkOrderNumber] = useState(() => `WO-2026-${Math.floor(1000 + Math.random() * 9000)}-D1`);
  const [ammTaskRef, setAmmTaskRef] = useState(() => `AMM 72-20-00-200-801`);
  const [technicianName, setTechnicianName] = useState(() => userSession.name);
  const [technicianBadge, setTechnicianBadge] = useState(() =>
    userSession.role === "Supervisor"
      ? "EASA Part-66 / FAA IA #4102981"
      : userSession.role === "Engineer"
      ? "FAA A&P #381920"
      : "Junior Line Maintenance Trainee"
  );
  const [selectedChecks, setSelectedChecks] = useState<string[]>(() => {
    return DEFAULT_CHECKLISTS_BY_PART[part.id] || [];
  });
  const [customCheckItem, setCustomCheckItem] = useState("");
  const [findingsSummary, setFindingsSummary] = useState(
    `Visual line inspection of ${part.name} completed. Zero abnormal wear or foreign object damage noted.`
  );
  const [technicianNotes, setTechnicianNotes] = useState(
    `Pre-departure service check carried out in accordance with OEM AMM. All safety lockwires and torque witnesses verified intact. Released for scheduled flight.`
  );

  // Repair specific form inputs
  const [repairAction, setRepairAction] = useState(`Leading edge cold blend repair per AMM repair limit table.`);
  const [repairDepth, setRepairDepth] = useState<number>(0.5);
  const [repairNdtMethod, setRepairNdtMethod] = useState(`Fluorescent Penetrant Inspection (FPI ASTM E1417 Level 3)`);
  const [repairNdtResult, setRepairNdtResult] = useState(`Passed - Zero linear defect propagation`);

  // Replacement specific form inputs
  const [removedSn, setRemovedSn] = useState(`PWA-${part.id.toUpperCase().slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [installedSn, setInstalledSn] = useState(`PWA-${part.id.toUpperCase().slice(0, 4)}-${Math.floor(5000 + Math.random() * 4000)}`);
  const [batchLot, setBatchLot] = useState(`LOT-PW-2026-04B`);
  const [airworthinessCert, setAirworthinessCert] = useState(`FAA Form 8130-3 / EASA Form 1 Release #PWA.145.${Math.floor(1000 + Math.random() * 9000)}`);
  const [removalReason, setRemovalReason] = useState(`Scheduled service interval / time-limited rotation`);

  // Update preset defaults when logType changes
  const handleLogTypeChange = (newType: ComponentLogType) => {
    setLogType(newType);
    if (newType === "daily_check") {
      setStatus("passed");
      setWorkOrderNumber(`WO-2026-${Math.floor(1000 + Math.random() * 9000)}-D1`);
      setAmmTaskRef("AMM 72-20-00-200-801");
      setFindingsSummary(`Daily transit inspection of ${part.name} completed. Normal operating condition.`);
      setTechnicianNotes(`Transit line check completed. Component clean, latches/witness marks secure. Ready for departure.`);
    } else if (newType === "weekly_check") {
      setStatus("passed");
      setWorkOrderNumber(`WO-2026-${Math.floor(1000 + Math.random() * 9000)}-W1`);
      setAmmTaskRef("AMM 72-20-00-210-802");
      setFindingsSummary(`Weekly Line Check completed. Measured dimensional clearances within baseline limits.`);
      setTechnicianNotes(`Detailed weekly visual and tactile inspection per AMM task. No fluid leaks or mechanical anomalies.`);
    } else if (newType === "borescope_inspection") {
      setStatus("passed");
      setWorkOrderNumber(`WO-2026-${Math.floor(1000 + Math.random() * 9000)}-BOR`);
      setAmmTaskRef("AMM 72-00-00-210-801");
      setFindingsSummary(`High-definition 3D video borescope inspection completed across internal passages.`);
      setTechnicianNotes(`360-degree borescope probe scan. Zero thermal distress, spallation, or foreign object impingement.`);
    } else if (newType === "repair") {
      setStatus("repaired");
      setWorkOrderNumber(`WO-2026-${Math.floor(1000 + Math.random() * 9000)}-REP`);
      setAmmTaskRef("AMM 72-00-00-300-801");
      setFindingsSummary(`Unscheduled repair completed following inspection finding. Blended to smooth aerodynamic contour.`);
      setTechnicianNotes(`Executed cold blend and polish within OEM allowable limits. NDT penetrant inspection certified zero crack indications.`);
    } else if (newType === "replacement") {
      setStatus("replaced");
      setWorkOrderNumber(`WO-2026-${Math.floor(1000 + Math.random() * 9000)}-RPL`);
      setAmmTaskRef("AMM 72-00-00-400-801");
      setFindingsSummary(`Component removed and replaced with factory authorized serviceable unit.`);
      setTechnicianNotes(`Removed life-expired or damaged component. Installed zero-hour overhauled assembly with certified airworthiness tag.`);
    }
  };

  // Toggle checklist items
  const handleToggleCheck = (item: string) => {
    if (selectedChecks.includes(item)) {
      setSelectedChecks(selectedChecks.filter((c) => c !== item));
    } else {
      setSelectedChecks([...selectedChecks, item]);
    }
  };

  const handleAddCustomCheck = () => {
    if (!customCheckItem.trim()) return;
    setSelectedChecks([...selectedChecks, customCheckItem.trim()]);
    setCustomCheckItem("");
  };

  // Handle Form Submission
  const handleSubmitLog = (e: React.FormEvent) => {
    e.preventDefault();

    const newLog: ComponentHistoryEntry = {
      id: `LOG-${part.id.toUpperCase().slice(0, 3)}-${Date.now()}`,
      partId: part.id,
      engineId,
      tailNumber,
      date,
      flightHours: Number(flightHours),
      flightCycles: Number(flightCycles),
      logType,
      status,
      workOrderNumber: workOrderNumber.trim(),
      ammTaskRef: ammTaskRef.trim(),
      technicianName: technicianName.trim(),
      technicianBadge: technicianBadge.trim(),
      itemsChecked: selectedChecks,
      findingsSummary: findingsSummary.trim(),
      technicianNotes: technicianNotes.trim(),
      repairDetails:
        logType === "repair"
          ? {
              actionTaken: repairAction,
              blendedDepthMm: repairDepth,
              ndtMethod: repairNdtMethod,
              ndtResult: repairNdtResult,
            }
          : undefined,
      replacementDetails:
        logType === "replacement"
          ? {
              removedPartSerialNumber: removedSn,
              installedPartSerialNumber: installedSn,
              batchLotNumber: batchLot,
              airworthinessReleaseCert: airworthinessCert,
              reasonForRemoval: removalReason,
            }
          : undefined,
    };

    onAddLog(newLog);
    setShowAddForm(false);
  };

  // Filter logs for this specific component
  const componentLogs = useMemo(() => {
    return historyLogs.filter((log) => log.partId === part.id);
  }, [historyLogs, part.id]);

  // Filter and search
  const filteredLogs = useMemo(() => {
    return componentLogs.filter((log) => {
      // Filter by type
      if (filterType !== "all" && log.logType !== filterType) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesText =
          log.workOrderNumber.toLowerCase().includes(query) ||
          log.ammTaskRef.toLowerCase().includes(query) ||
          log.technicianName.toLowerCase().includes(query) ||
          log.technicianBadge.toLowerCase().includes(query) ||
          log.findingsSummary.toLowerCase().includes(query) ||
          log.technicianNotes.toLowerCase().includes(query) ||
          log.itemsChecked.some((it) => it.toLowerCase().includes(query)) ||
          (log.repairDetails?.actionTaken.toLowerCase().includes(query) ?? false) ||
          (log.replacementDetails?.installedPartSerialNumber.toLowerCase().includes(query) ?? false);
        if (!matchesText) return false;
      }
      return true;
    });
  }, [componentLogs, filterType, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = componentLogs.length;
    const dailyWeekly = componentLogs.filter((l) => l.logType === "daily_check" || l.logType === "weekly_check").length;
    const borescope = componentLogs.filter((l) => l.logType === "borescope_inspection").length;
    const repairs = componentLogs.filter((l) => l.logType === "repair").length;
    const replacements = componentLogs.filter((l) => l.logType === "replacement").length;
    const latest = componentLogs[0];
    return { total, dailyWeekly, borescope, repairs, replacements, latest };
  }, [componentLogs]);

  const getLogTypeBadge = (type: ComponentLogType) => {
    switch (type) {
      case "daily_check":
        return {
          label: "Daily Transit Check",
          bg: "bg-sky-500/10 text-sky-400 border-sky-500/30",
          icon: Calendar,
        };
      case "weekly_check":
        return {
          label: "Weekly Line Check",
          bg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
          icon: Clock,
        };
      case "borescope_inspection":
        return {
          label: "Borescope NDT",
          bg: "bg-purple-500/10 text-purple-400 border-purple-500/30",
          icon: Activity,
        };
      case "repair":
        return {
          label: "Aviation Repair / Blend",
          bg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
          icon: Wrench,
        };
      case "replacement":
        return {
          label: "Component Replacement",
          bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          icon: RefreshCw,
        };
      case "preventive_check":
      default:
        return {
          label: "Preventive AMM Check",
          bg: "bg-sky-500/10 text-sky-400 border-sky-500/30",
          icon: Wrench,
        };
    }
  };

  const getStatusBadge = (status: ComponentLogStatus) => {
    switch (status) {
      case "passed":
        return {
          label: "PASSED / SAT",
          color: "text-emerald-400 bg-emerald-950/60 border-emerald-700/50",
          icon: CheckCircle2,
        };
      case "discrepancy":
        return {
          label: "MONITORED DISCREPANCY",
          color: "text-amber-400 bg-amber-950/60 border-amber-700/50",
          icon: AlertTriangle,
        };
      case "repaired":
        return {
          label: "REPAIRED & RELEASED",
          color: "text-cyan-400 bg-cyan-950/60 border-cyan-700/50",
          icon: Wrench,
        };
      case "replaced":
        return {
          label: "REPLACED & TAGGED",
          color: "text-purple-400 bg-purple-950/60 border-purple-700/50",
          icon: Award,
        };
      default:
        return {
          label: "PASSED / SAT",
          color: "text-emerald-400 bg-emerald-950/60 border-emerald-700/50",
          icon: CheckCircle2,
        };
    }
  };

  return (
    <div className="space-y-4 animate-fade-in text-slate-200">
      {/* 1. MRO Fleet Tracking Summary Card */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center shrink-0">
              <ClipboardList className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Component Maintenance Logbook
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 border border-slate-700">
                  {tailNumber} • {engineId}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Historical line checks, detailed inspections, repairs & component replacements
              </p>
            </div>
          </div>

          <button
            id="btn-open-add-component-log"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-950/50 transition"
          >
            {showAddForm ? (
              <>
                <X className="w-3.5 h-3.5" />
                <span>Close Form</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add Maintenance Log</span>
              </>
            )}
          </button>
        </div>

        {/* 4 Telemetry Stat Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
          <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Total Logs</span>
            <span className="text-base font-bold text-white">{stats.total} Records</span>
          </div>

          <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Latest Check</span>
            <span className="text-xs font-bold text-emerald-400 block truncate">
              {stats.latest ? `${stats.latest.date}` : "—"}
            </span>
            <span className="text-[10px] text-slate-400 truncate block">
              {stats.latest ? getLogTypeBadge(stats.latest.logType).label : "No logs"}
            </span>
          </div>

          <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Repairs / Blends</span>
            <span className="text-base font-bold text-amber-400">{stats.repairs}</span>
          </div>

          <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Replacements</span>
            <span className="text-base font-bold text-purple-400">{stats.replacements}</span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Add Maintenance Log Form */}
      {showAddForm && (
        <form
          onSubmit={handleSubmitLog}
          className="p-4 rounded-xl bg-slate-900 border-2 border-sky-500/50 shadow-2xl space-y-4 animate-scale-in"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <Plus className="w-3.5 h-3.5" />
              </span>
              <h4 className="text-sm font-bold text-white">Record New Maintenance Action for {part.name}</h4>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              Tech Log Entry
            </span>
          </div>

          {/* Preset Buttons for Quick Action Selection */}
          <div>
            <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1.5">
              Select Maintenance Event Type:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {(
                [
                  { type: "daily_check", label: "Daily Check", icon: Calendar },
                  { type: "weekly_check", label: "Weekly Check", icon: Clock },
                  { type: "borescope_inspection", label: "Borescope NDT", icon: Activity },
                  { type: "repair", label: "Repair / Blend", icon: Wrench },
                  { type: "replacement", label: "Replacement", icon: RefreshCw },
                ] as const
              ).map(({ type, label, icon: Icon }) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => handleLogTypeChange(type)}
                  className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition border ${
                    logType === type
                      ? "bg-sky-500 text-white border-sky-400 shadow"
                      : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Check Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Work Order #</label>
              <input
                type="text"
                value={workOrderNumber}
                onChange={(e) => setWorkOrderNumber(e.target.value)}
                required
                placeholder="e.g. WO-2026-1012-D1"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">AMM Task Reference</label>
              <input
                type="text"
                value={ammTaskRef}
                onChange={(e) => setAmmTaskRef(e.target.value)}
                required
                placeholder="e.g. AMM 72-20-00-200-801"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Status / Result</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ComponentLogStatus)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="passed">Passed / SAT</option>
                <option value="discrepancy">Monitored Discrepancy</option>
                <option value="repaired">Repaired & Released</option>
                <option value="replaced">Replaced & Tagged</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Flight Hours (TSN)</label>
              <input
                type="number"
                value={flightHours}
                onChange={(e) => setFlightHours(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Flight Cycles (CSN)</label>
              <input
                type="number"
                value={flightCycles}
                onChange={(e) => setFlightCycles(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Technician Name</label>
              <input
                type="text"
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                Technician License / Certifying Badge
              </label>
              <input
                type="text"
                value={technicianBadge}
                onChange={(e) => setTechnicianBadge(e.target.value)}
                required
                placeholder="e.g. FAA A&P #4102981 / EASA Part-66 B1"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          </div>

          {/* Interactive Checklist Section */}
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-slate-300 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Items Checked & Verified During Inspection:
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {selectedChecks.length} item(s) selected
              </span>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {(DEFAULT_CHECKLISTS_BY_PART[part.id] || []).map((item, idx) => {
                const checked = selectedChecks.includes(item);
                return (
                  <label
                    key={idx}
                    className={`flex items-start gap-2 p-1.5 rounded cursor-pointer transition text-xs ${
                      checked
                        ? "bg-slate-900 text-slate-200 border border-slate-700/80"
                        : "hover:bg-slate-900/50 text-slate-400"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleCheck(item)}
                      className="mt-0.5 rounded border-slate-700 text-sky-500 focus:ring-0 focus:outline-none"
                    />
                    <span className="leading-snug">{item}</span>
                  </label>
                );
              })}
            </div>

            {/* Add Custom Checklist Item */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
              <input
                type="text"
                value={customCheckItem}
                onChange={(e) => setCustomCheckItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomCheck();
                  }
                }}
                placeholder="Add custom inspection check..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={handleAddCustomCheck}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs rounded transition"
              >
                + Add Check
              </button>
            </div>
          </div>

          {/* Conditional Repair Details Section */}
          {logType === "repair" && (
            <div className="bg-amber-950/20 border border-amber-500/40 p-3 rounded-lg space-y-2.5">
              <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                Aeronautical Repair & NDT Certification Details
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Repair Action Performed</label>
                  <input
                    type="text"
                    value={repairAction}
                    onChange={(e) => setRepairAction(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Blended Depth (mm)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={repairDepth}
                    onChange={(e) => setRepairDepth(Number(e.target.value))}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-0.5">NDT Inspection Method</label>
                  <input
                    type="text"
                    value={repairNdtMethod}
                    onChange={(e) => setRepairNdtMethod(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-0.5">NDT Inspection Result</label>
                  <input
                    type="text"
                    value={repairNdtResult}
                    onChange={(e) => setRepairNdtResult(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Conditional Replacement Details Section */}
          {logType === "replacement" && (
            <div className="bg-purple-950/20 border border-purple-500/40 p-3 rounded-lg space-y-2.5">
              <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                Component Serial Number & Airworthiness Release Details
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Removed Component S/N</label>
                  <input
                    type="text"
                    value={removedSn}
                    onChange={(e) => setRemovedSn(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Installed Component S/N</label>
                  <input
                    type="text"
                    value={installedSn}
                    onChange={(e) => setInstalledSn(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Airworthiness Certificate #</label>
                  <input
                    type="text"
                    value={airworthinessCert}
                    onChange={(e) => setAirworthinessCert(e.target.value)}
                    required
                    placeholder="FAA 8130-3 / EASA Form 1"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Reason for Removal</label>
                  <input
                    type="text"
                    value={removalReason}
                    onChange={(e) => setRemovalReason(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Findings & Detailed Notes */}
          <div>
            <label className="text-[11px] font-mono text-slate-400 block mb-1">Findings Summary</label>
            <input
              type="text"
              value={findingsSummary}
              onChange={(e) => setFindingsSummary(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-slate-400 block mb-1">Detailed Technician Notes</label>
            <textarea
              rows={2}
              value={technicianNotes}
              onChange={(e) => setTechnicianNotes(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 leading-relaxed"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 transition"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Commit & Sign Log</span>
            </button>
          </div>
        </form>
      )}

      {/* 3. Filter Bar & Search */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              { key: "all", label: `All (${componentLogs.length})` },
              { key: "daily_check", label: "Daily Checks" },
              { key: "weekly_check", label: "Weekly Checks" },
              { key: "borescope_inspection", label: "Borescope NDT" },
              { key: "repair", label: `Repairs (${stats.repairs})` },
              { key: "replacement", label: `Replacements (${stats.replacements})` },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterType(key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition ${
                filterType === key
                  ? "bg-sky-500 text-white font-semibold shadow"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[180px] w-full sm:w-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logs, work orders, notes..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
          <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
        </div>
      </div>

      {/* 4. Timeline Logbook List */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
            <ClipboardList className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">No maintenance records match your filter query.</p>
            <button
              onClick={() => {
                setFilterType("all");
                setSearchQuery("");
              }}
              className="text-xs text-sky-400 hover:underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const typeBadge = getLogTypeBadge(log.logType);
            const statusBadge = getStatusBadge(log.status);
            const TypeIcon = typeBadge.icon;
            const StatusIcon = statusBadge.icon;
            const isExpanded = expandedLogId === log.id;

            return (
              <div
                key={log.id}
                className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 shadow-md transition space-y-3"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded border ${typeBadge.bg}`}
                    >
                      <TypeIcon className="w-3 h-3" />
                      <span>{typeBadge.label}</span>
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${statusBadge.color}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      <span>{statusBadge.label}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-200 font-semibold">{log.date}</span>
                    <span className="text-slate-600">•</span>
                    <span>{log.flightCycles.toLocaleString()} Cyc</span>
                    <span className="text-slate-600">•</span>
                    <span>{log.flightHours.toLocaleString()} Hrs</span>
                  </div>
                </div>

                {/* Work Order & Technician Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono bg-slate-950/70 p-2 rounded-lg border border-slate-800/60">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-sky-400 font-bold">{log.workOrderNumber}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-slate-400">{log.ammTaskRef}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-300">
                    <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                    <span className="font-semibold text-slate-200">{log.technicianName}</span>
                    <span className="text-[10px] text-slate-500">({log.technicianBadge})</span>
                  </div>
                </div>

                {/* Findings & Notes */}
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold">
                      Findings Summary:
                    </span>
                    <p className="text-slate-200 mt-0.5 leading-relaxed font-medium">
                      {log.findingsSummary}
                    </p>
                  </div>

                  <div className="pt-1">
                    <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold">
                      Technician Notes:
                    </span>
                    <p className="text-slate-300 mt-0.5 leading-relaxed italic bg-slate-950/40 p-2 rounded border border-slate-800/50">
                      "{log.technicianNotes}"
                    </p>
                  </div>
                </div>

                {/* Checked Items Pills */}
                {log.itemsChecked && log.itemsChecked.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-slate-800/60">
                    <span className="text-[10px] font-mono uppercase text-slate-500 block">
                      Verified Inspections:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {log.itemsChecked.map((chk, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-300 border border-slate-800"
                        >
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                          <span>{chk}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Repair Details Callout Box */}
                {log.repairDetails && (
                  <div className="bg-amber-950/20 border border-amber-600/40 p-3 rounded-lg space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Certified Aeronautical Repair Record</span>
                    </div>
                    <div className="text-[11px] text-slate-300 space-y-0.5 font-mono">
                      <div>
                        <span className="text-slate-500">Action:</span> {log.repairDetails.actionTaken}
                      </div>
                      {log.repairDetails.blendedDepthMm && (
                        <div>
                          <span className="text-slate-500">Blended Depth:</span>{" "}
                          <span className="text-amber-300 font-bold">{log.repairDetails.blendedDepthMm} mm</span> (Within Allowable OEM Limit)
                        </div>
                      )}
                      <div>
                        <span className="text-slate-500">NDT Method:</span> {log.repairDetails.ndtMethod}
                      </div>
                      <div>
                        <span className="text-slate-500">NDT Pass State:</span>{" "}
                        <span className="text-emerald-400 font-bold">{log.repairDetails.ndtResult}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Replacement Details Callout Box */}
                {log.replacementDetails && (
                  <div className="bg-purple-950/20 border border-purple-600/40 p-3 rounded-lg space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-purple-300">
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Certified Component Replacement & Airworthiness Tag</span>
                    </div>
                    <div className="text-[11px] text-slate-300 space-y-0.5 font-mono">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-500">Removed S/N:</span>{" "}
                          <span className="text-rose-400 font-bold">{log.replacementDetails.removedPartSerialNumber}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Installed S/N:</span>{" "}
                          <span className="text-emerald-400 font-bold">{log.replacementDetails.installedPartSerialNumber}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">Airworthiness Tag:</span>{" "}
                        <span className="text-sky-300 underline font-semibold">{log.replacementDetails.airworthinessReleaseCert}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Removal Reason:</span> {log.replacementDetails.reasonForRemoval}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
