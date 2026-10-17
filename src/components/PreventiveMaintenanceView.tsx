import React, { useState, useMemo } from "react";
import {
  PreventiveMaintenanceTask,
  PreventiveCategory,
  PartId,
  AircraftEngine,
  PMSignOffRecord,
} from "../types";
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ShieldCheck,
  FileText,
  Calendar,
  ChevronDown,
  ChevronUp,
  Cpu,
  Download,
  PlusCircle,
  Building2,
  Gauge,
  Sparkles,
  BookOpen,
  Radio,
  Activity,
  Flame,
} from "lucide-react";
import { SensorProvenanceBanner } from "./SensorProvenanceBanner";
import { getEngineTelemetrySnapshot, getSensorForTask } from "../data/telemetryData";

interface PreventiveMaintenanceViewProps {
  currentEngine: AircraftEngine;
  flightEngines?: AircraftEngine[];
  onSelectEngine?: (engineId: string) => void;
  tasks: PreventiveMaintenanceTask[];
  onSignOffTask: (taskId: string, record: PMSignOffRecord) => void;
  onInspectIn3D: (partId: PartId) => void;
}

export const PreventiveMaintenanceView: React.FC<PreventiveMaintenanceViewProps> = ({
  currentEngine,
  flightEngines,
  onSelectEngine,
  tasks,
  onSignOffTask,
  onInspectIn3D,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<PreventiveCategory | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "due_soon" | "compliant" | "overdue">("all");
  const [selectedPartFilter, setSelectedPartFilter] = useState<PartId | "all">("all");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Sign-off modal state
  const [signOffModalTask, setSignOffModalTask] = useState<PreventiveMaintenanceTask | null>(null);
  const [engineerName, setEngineerName] = useState("");
  const [engineerLicense, setEngineerLicense] = useState("");
  const [station, setStation] = useState("DEL Base Line Hangar 3");
  const [findings, setFindings] = useState<"no_defects" | "within_limits" | "minor_monitoring_required">("no_defects");
  const [remarks, setRemarks] = useState("");
  const [formError, setFormError] = useState("");
  const [exportNotice, setExportNotice] = useState(false);

  const engineCycles = currentEngine.cyclesSinceNew || 5120;
  const engineHours = 14220;

  const telemetrySnapshot = useMemo(
    () => getEngineTelemetrySnapshot(currentEngine),
    [currentEngine]
  );

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search
      const matchesSearch =
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.taskCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.adSbReference && task.adSbReference.toLowerCase().includes(searchTerm.toLowerCase()));

      // Category
      const matchesCategory = selectedCategory === "all" || task.category === selectedCategory;

      // Part
      const matchesPart = selectedPartFilter === "all" || task.partId === selectedPartFilter || task.partId === "all";

      // Status
      const cyclesRemaining = task.nextDueCycles - engineCycles;
      const isDueSoon = cyclesRemaining <= 200 || task.complianceStatus === "due_soon";
      const isOverdue = cyclesRemaining <= 0 || task.complianceStatus === "overdue";

      let matchesStatus = true;
      if (selectedStatus === "due_soon") {
        matchesStatus = isDueSoon && !isOverdue;
      } else if (selectedStatus === "overdue") {
        matchesStatus = isOverdue;
      } else if (selectedStatus === "compliant") {
        matchesStatus = !isDueSoon && !isOverdue;
      }

      return matchesSearch && matchesCategory && matchesPart && matchesStatus;
    });
  }, [tasks, searchTerm, selectedCategory, selectedPartFilter, selectedStatus, engineCycles]);

  // KPI Calculations
  const stats = useMemo(() => {
    let dueSoonCount = 0;
    let overdueCount = 0;
    let adSbCount = 0;
    let compliantCount = 0;

    tasks.forEach((t) => {
      const rem = t.nextDueCycles - engineCycles;
      if (rem <= 0 || t.complianceStatus === "overdue") {
        overdueCount++;
      } else if (rem <= 200 || t.complianceStatus === "due_soon") {
        dueSoonCount++;
      } else {
        compliantCount++;
      }

      if (t.category === "sb_ad_compliance" || t.adSbReference) {
        adSbCount++;
      }
    });

    return {
      total: tasks.length,
      dueSoon: dueSoonCount,
      overdue: overdueCount,
      adSb: adSbCount,
      compliant: compliantCount,
    };
  }, [tasks, engineCycles]);

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

  const handleExportWorkOrders = () => {
    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 3500);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Banner & Context */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
              IndiGo Fleet CAMO System
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-800 text-slate-300">
              Engine: {currentEngine.id} ({currentEngine.tailNumber})
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-800 text-slate-300">
              Pos: {currentEngine.enginePosition}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-800 text-amber-300">
              {engineCycles.toLocaleString()} CSN • {engineHours.toLocaleString()} FH
            </span>

            {/* Twin Engine Quick Selector strictly scoped to aircraft */}
            {flightEngines && flightEngines.length > 0 && onSelectEngine && (
              <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
                <span className="text-[10px] text-slate-400 uppercase font-semibold px-1.5 hidden sm:inline">Engine Options:</span>
                {flightEngines.map((eng) => (
                  <button
                    key={eng.id}
                    onClick={() => onSelectEngine(eng.id)}
                    className={`px-2.5 py-0.5 rounded-lg transition font-medium cursor-pointer ${
                      eng.id === currentEngine.id
                        ? "bg-sky-500 text-white font-bold shadow"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                    title={`Switch to ${eng.enginePosition} (${eng.enginePosition === "No.1" ? "Left Wing" : "Right Wing"})`}
                  >
                    {eng.enginePosition} ({eng.enginePosition === "No.1" ? "Left" : "Right"})
                  </button>
                ))}
              </div>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Wrench className="w-6 h-6 text-sky-400" />
            Preventive Maintenance & Regulatory Task Dispatcher
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
            Continuous Airworthiness Maintenance Organisation (CAMO) tracking of Airbus A320neo AMM inspection intervals,
            Borescope (BSI) schedules, OEM service bulletins, and EASA/DGCA Airworthiness Directives.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportWorkOrders}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 shadow transition"
            title="Export Work Orders for Line Stations"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Export Line Task Cards</span>
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              Work Order package generated for <strong>IndiGo Line Stations (DEL, BOM, BLR, MAA, HYD)</strong> with {filteredTasks.length} task cards.
            </span>
          </div>
          <span className="text-[10px] text-emerald-300/80">Dispatched via CAMO API</span>
        </div>
      )}

      {/* Direct Aircraft Sensor Provenance & Live Telemetry Stream Banner */}
      <SensorProvenanceBanner
        currentEngine={currentEngine}
        telemetrySnapshot={telemetrySnapshot}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Tasks */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Scheduled PM Programs</span>
            <FileText className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-black text-white font-mono">{stats.total}</p>
          <p className="text-[11px] text-slate-500">Airbus AMM Chapter 71 & 72</p>
        </div>

        {/* Due Soon */}
        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/60 space-y-1">
          <div className="flex items-center justify-between text-amber-300 text-xs font-medium">
            <span>Due Soon (&lt; 200 CSN)</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 font-mono">{stats.dueSoon}</p>
          <p className="text-[11px] text-amber-300/80">Scheduled next transit stops</p>
        </div>

        {/* Mandatory AD / SB */}
        <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/60 space-y-1">
          <div className="flex items-center justify-between text-indigo-300 text-xs font-medium">
            <span>AD / SB Compliance</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-indigo-300 font-mono">{stats.adSb}</p>
          <p className="text-[11px] text-indigo-300/80">DGCA & EASA Directives</p>
        </div>

        {/* Compliant */}
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/60 space-y-1">
          <div className="flex items-center justify-between text-emerald-300 text-xs font-medium">
            <span>Current & Compliant</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 font-mono">{stats.compliant}</p>
          <p className="text-[11px] text-emerald-300/80">Safe operating margin</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search preventive tasks by title, AMM code, AD number, or component..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="flex-1 md:flex-initial px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Categories</option>
              <option value="borescope">Borescope (BSI)</option>
              <option value="lube_filter">Lube & Filter Service</option>
              <option value="sb_ad_compliance">AD/SB Directives</option>
              <option value="engine_wash">Engine Desalination Wash</option>
              <option value="sensor_calibration">Sensor Calibration</option>
              <option value="containment_check">Containment & Structure</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="flex-1 md:flex-initial px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Statuses</option>
              <option value="due_soon">Due Soon (&lt;200 CSN)</option>
              <option value="compliant">Compliant</option>
              <option value="overdue">Overdue</option>
            </select>

            <select
              value={selectedPartFilter}
              onChange={(e) => setSelectedPartFilter(e.target.value as any)}
              className="flex-1 md:flex-initial px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Engine Components</option>
              <option value="fan_blades">Wide-Chord Fan Blades</option>
              <option value="fan_case">Fan Case & Nacelle</option>
              <option value="fan_drive_gear">Fan Drive Gear System (FDGS)</option>
              <option value="lpc">Low-Pressure Compressor</option>
              <option value="hpc">High-Pressure Compressor</option>
              <option value="combustor">Annular Combustor</option>
              <option value="hpt">High-Pressure Turbine</option>
              <option value="lpt">Low-Pressure Turbine</option>
              <option value="exhaust">Exhaust & Mixer</option>
              <option value="oil_system">Lube & Oil Subsystem</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task Cards Grid / List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>
            Showing <strong className="text-white">{filteredTasks.length}</strong> Preventive Maintenance Tasks
          </span>
          <span className="font-mono text-[11px] text-slate-500">
            Sorted by urgency & next inspection interval
          </span>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-slate-900/40 border border-slate-800 p-6 space-y-2">
            <Filter className="w-8 h-8 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No matching preventive tasks</h3>
            <p className="text-xs text-slate-500">
              Try adjusting your search criteria or filter categories.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredTasks.map((task) => {
              const isExpanded = expandedTaskId === task.id;
              const cyclesRemaining = task.nextDueCycles - engineCycles;
              const hoursRemaining = task.nextDueHours - engineHours;
              const isDueSoon = cyclesRemaining <= 200 || task.complianceStatus === "due_soon";
              const isOverdue = cyclesRemaining <= 0 || task.complianceStatus === "overdue";

              const sensorResolution = task.attachedSensor
                ? { attachedSensor: task.attachedSensor, sensorTriggerReason: task.sensorTriggerReason || "" }
                : getSensorForTask(task.taskCode, task.partId);
              const taskSensor = sensorResolution.attachedSensor;
              const sensorTriggerReason = sensorResolution.sensorTriggerReason;

              return (
                <div
                  key={task.id}
                  className={`rounded-2xl border transition overflow-hidden shadow-sm ${
                    isOverdue
                      ? "bg-rose-950/20 border-rose-800/80"
                      : isDueSoon
                      ? "bg-slate-900/90 border-amber-800/80 hover:border-amber-600"
                      : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Task Identity & Metadata */}
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-800 text-slate-200">
                            {task.taskCode}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-sky-950 text-sky-400 border border-sky-800">
                            {task.categoryLabel}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300">
                            Component: {task.partName}
                          </span>
                          {task.adSbReference && (
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800">
                              {task.adSbReference}
                            </span>
                          )}
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
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

                        <h3 className="text-base font-bold text-white tracking-tight">
                          {task.title}
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed max-w-4xl">
                          {task.description}
                        </p>

                        {/* Live Sensor Telemetry Badge */}
                        <div className="mt-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold shrink-0">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                              </span>
                              <span>ON-ENGINE SENSOR</span>
                            </span>
                            <span className="font-semibold text-slate-200 text-xs truncate">
                              {taskSensor.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono hidden lg:inline truncate">
                              • {taskSensor.physicalMountLocation}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                            <span className="text-[10px] text-slate-400 font-mono uppercase">Live Telemetry:</span>
                            <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-900 border border-slate-700 text-emerald-400">
                              {taskSensor.currentValue}
                            </span>
                            <span className="text-[10px] font-mono text-sky-400 bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-800 hidden sm:inline">
                              {taskSensor.busAddress.split("•")[0]?.trim() || "ARINC 429"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Quick Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {task.partId !== "all" && (
                          <button
                            onClick={() => onInspectIn3D(task.partId as PartId)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 text-xs font-semibold border border-slate-700 shadow transition"
                            title="Open in 3D Engine Twin and jump to this component"
                          >
                            <Cpu className="w-3.5 h-3.5" />
                            <span>Inspect in 3D Twin</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenSignOff(task)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md transition"
                          title="Sign off completed task"
                        >
                          <PlusCircle className="w-4 h-4" />
                          <span>Sign Off Task</span>
                        </button>
                      </div>
                    </div>

                    {/* Countdown and Timeline Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-800/80 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                        <span className="text-slate-500 block text-[10px] font-mono">Interval Requirement</span>
                        <span className="font-bold text-slate-200 font-mono">
                          Every {task.intervalCycles?.toLocaleString()} CSN
                        </span>
                        <span className="block text-[10px] text-slate-400 font-mono">
                          ({task.intervalHours?.toLocaleString()} FH)
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                        <span className="text-slate-500 block text-[10px] font-mono">Next Due Target</span>
                        <span className="font-bold text-slate-200 font-mono">
                          {task.nextDueCycles.toLocaleString()} CSN
                        </span>
                        <span className={`block text-[10px] font-bold ${cyclesRemaining <= 200 ? "text-amber-400" : "text-slate-400"}`}>
                          {cyclesRemaining > 0 ? `${cyclesRemaining} cycles remaining` : "0 cycles remaining"}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                        <span className="text-slate-500 block text-[10px] font-mono">Target Due Date</span>
                        <span className="font-bold text-slate-200 font-mono">
                          {task.nextDueDate}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          Est: {task.estimatedHours} hrs downtime
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                        <span className="text-slate-500 block text-[10px] font-mono">Mandated By</span>
                        <span className="font-bold text-slate-200 text-[11px] truncate block">
                          {task.mandatedBy}
                        </span>
                        <span className="block text-[10px] text-slate-400 truncate">
                          {task.requiredCertification}
                        </span>
                      </div>
                    </div>

                    {/* Expand Procedure and Logs footer */}
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-slate-500 text-[11px]">
                        Last completed: <strong className="text-slate-300">{task.lastCompletedDate}</strong> at{" "}
                        <strong className="text-slate-300">{task.lastCompletedCycles} CSN</strong>
                      </span>

                      <button
                        onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                        className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1.5 transition text-xs"
                      >
                        <span>{isExpanded ? "Hide AMM Procedures & Sign-off History" : "View AMM Procedures & Sign-off History"}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Procedure Drawer */}
                  {isExpanded && (
                    <div className="p-5 bg-slate-950/90 border-t border-slate-800 space-y-4">
                      {/* Attached Physical Sensor Hardware Specification & Telemetry Provenance */}
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-2">
                            <Radio className="w-4 h-4 text-sky-400" />
                            Direct Aircraft Sensor Provenance & ARINC 429 Channel
                          </h4>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            CERTIFIED HARDWARE LINK
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {sensorTriggerReason}
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                            <span className="text-slate-500 text-[10px] font-mono block">Attached Sensor</span>
                            <span className="font-semibold text-white text-xs truncate block">{taskSensor.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono truncate block">{taskSensor.model}</span>
                          </div>

                          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                            <span className="text-slate-500 text-[10px] font-mono block">Mounting Location</span>
                            <span className="text-slate-200 text-xs truncate block">{taskSensor.physicalMountLocation}</span>
                            <span className="text-[10px] text-slate-400 font-mono block">{taskSensor.busAddress}</span>
                          </div>

                          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                            <span className="text-slate-500 text-[10px] font-mono block">Current Reading</span>
                            <span className="font-mono font-bold text-emerald-400 text-xs block">{taskSensor.currentValue}</span>
                            <span className="text-[10px] text-slate-400 font-mono block">Envelope: {taskSensor.normalRange}</span>
                          </div>

                          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                            <span className="text-slate-500 text-[10px] font-mono block">Calibration Cert</span>
                            <span className="font-mono text-sky-400 text-xs truncate block">{taskSensor.calibrationCert}</span>
                            <span className="text-[10px] text-slate-400 block">Cal Date: {taskSensor.calibrationDate}</span>
                          </div>
                        </div>
                      </div>

                      {/* Detailed Steps */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-sky-400" />
                          Approved AMM Standard Operating Procedures (SOP)
                        </h4>
                        <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300 font-mono bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
                          {task.detailedProcedureSteps.map((step, idx) => (
                            <li key={idx} className="leading-relaxed">
                              <span className="font-sans text-slate-300">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      {/* Latest Sign-Off History */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          Historical Line Sign-Off & CAMO Archival Record
                        </h4>
                        <div className="space-y-2">
                          {task.signOffHistory.map((rec) => (
                            <div
                              key={rec.id}
                              className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-slate-400 gap-1">
                                <span className="font-semibold text-slate-200">
                                  Certifying AME: {rec.engineerName} (License: {rec.engineerLicense})
                                </span>
                                <span className="font-mono text-slate-400 text-[11px]">
                                  Signed on {rec.date} • Recorded at {rec.cyclesAtSignOff} CSN / {rec.hoursAtSignOff} FH
                                </span>
                              </div>
                              <p className="text-slate-300 italic">"{rec.remarks}"</p>
                              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                                <span>Operating Station: {rec.station}</span>
                                <span>•</span>
                                <span className="text-emerald-400 font-medium">Compliance: Verified & Archived</span>
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
      </div>

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
                  <span>Engine: {currentEngine.id} ({currentEngine.tailNumber})</span>
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
                  Sign Off & Recalculate Next Interval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
