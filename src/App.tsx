/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  CaseLogEntry,
  DocSnippet,
  PartId,
  PartStatus,
  UserSession,
  AircraftEngine,
  ActionLevel,
  ComponentHistoryEntry,
  PreventiveMaintenanceTask,
  PMSignOffRecord,
  AppTheme,
} from "./types";
import { ENGINE_PARTS } from "./data/parts";
import {
  INITIAL_FLEET_ENGINES,
  INITIAL_FLEET_CASES,
  getEngineById,
} from "./data/fleet";
import { getFlightByEngineId, INDIGO_FLIGHTS } from "./data/flights";
import { INITIAL_COMPONENT_HISTORY } from "./data/componentHistory";
import { INITIAL_PREVENTIVE_TASKS } from "./data/preventiveMaintenance";
import { DUMMY_SCENARIOS } from "./data/scenarios";
import { formatPartName } from "./logic/rulesEngine";
import { getDocumentById } from "./logic/retrieval";
import { EngineCanvas } from "./components/EngineCanvas";
import { PartCard } from "./components/PartCard";
import { IncidentView } from "./components/IncidentView";
import { CaseLogView } from "./components/CaseLogView";
import { EvaluationView } from "./components/EvaluationView";
import { PreventiveMaintenanceView } from "./components/PreventiveMaintenanceView";
import { CitationModal } from "./components/CitationModal";
import { AboutModal } from "./components/AboutModal";
import { LoginView } from "./components/LoginView";
import { FleetDashboard } from "./components/FleetDashboard";
import { EngineeringSpecsSheet } from "./components/EngineeringSpecsSheet";
import { ThemeToggle } from "./components/ThemeToggle";
import { SearchGroundingModal } from "./components/SearchGroundingModal";
import {
  Compass,
  AlertTriangle,
  Globe,
  Clock,
  FileCheck2,
  TestTube2,
  Info,
  ShieldAlert,
  ArrowLeft,
  LogOut,
  Plane,
  ChevronDown,
  Loader2,
  Cpu,
  X,
  Zap,
  ArrowRight,
  Bell,
  Ruler,
  ClipboardList,
  Gauge,
  Wrench,
} from "lucide-react";

type AppMode = "explore" | "incident" | "caselog" | "evaluation" | "preventive";

interface LiveToast {
  id: string;
  message: string;
  engineId: string;
  tailNumber: string;
  level: ActionLevel;
}

export default function App() {
  // 1. Session State
  const [session, setSession] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem("engineiq_session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 1b. App Theme State ("dark" | "light")
  const [theme, setTheme] = useState<AppTheme>(() => {
    try {
      return (localStorage.getItem("engineiq_theme") as AppTheme) || "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("engineiq_theme", theme);
    } catch {
      // ignore
    }
    if (theme === "light") {
      document.documentElement.classList.add("theme-light");
      document.documentElement.classList.remove("theme-dark");
      document.documentElement.style.colorScheme = "light";
    } else {
      document.documentElement.classList.remove("theme-light");
      document.documentElement.classList.add("theme-dark");
      document.documentElement.style.colorScheme = "dark";
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // 2. Fleet Engines State
  const [engines, setEngines] = useState<AircraftEngine[]>(() => {
    try {
      const saved = localStorage.getItem("engineiq_engines");
      return saved ? JSON.parse(saved) : INITIAL_FLEET_ENGINES;
    } catch {
      return INITIAL_FLEET_ENGINES;
    }
  });

  // 3. Current Engine ID State (null means on Fleet Dashboard)
  const [currentEngineId, setCurrentEngineId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem("engineiq_current_engine_id");
      return saved || null;
    } catch {
      return null;
    }
  });

  // 3b. Active Flight Number State (tracks the flight context chosen by the user)
  const [selectedFlightNumber, setSelectedFlightNumber] = useState<string | null>(() => {
    try {
      return localStorage.getItem("engineiq_selected_flight") || null;
    } catch {
      return null;
    }
  });

  // 4. Loading skeleton state when switching engines
  const [isLoadingEngine, setIsLoadingEngine] = useState(false);

  // 5. Global Case Log State (pre-seeded with initial fleet cases)
  const [caseLogs, setCaseLogs] = useState<CaseLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem("engineiq_case_logs");
      return saved ? JSON.parse(saved) : INITIAL_FLEET_CASES;
    } catch {
      return INITIAL_FLEET_CASES;
    }
  });

  // 5b. Component Maintenance History State (pre-seeded for all 10 core subsystems)
  const [componentLogs, setComponentLogs] = useState<ComponentHistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem("engineiq_component_history");
      return saved ? JSON.parse(saved) : INITIAL_COMPONENT_HISTORY;
    } catch {
      return INITIAL_COMPONENT_HISTORY;
    }
  });

  const handleAddComponentLog = (newEntry: ComponentHistoryEntry) => {
    setComponentLogs((prev) => {
      const updated = [newEntry, ...prev];
      try {
        localStorage.setItem("engineiq_component_history", JSON.stringify(updated));
      } catch (e) {
        console.warn("Failed to save component history", e);
      }
      return updated;
    });

    const partName = formatPartName(newEntry.partId);
    setLiveToast({
      id: `toast-log-${Date.now()}`,
      message: `${partName}: New ${newEntry.logType.replace(/_/g, " ")} recorded (${newEntry.status.toUpperCase()})`,
      engineId: newEntry.engineId || currentEngine?.id || "",
      tailNumber: newEntry.tailNumber || currentEngine?.tailNumber || "",
      level: 1,
    });
  };

  // 6. Preventive Maintenance Tasks State
  const [preventiveTasks, setPreventiveTasks] = useState<PreventiveMaintenanceTask[]>(() => {
    try {
      const saved = localStorage.getItem("engineiq_preventive_tasks");
      return saved ? JSON.parse(saved) : INITIAL_PREVENTIVE_TASKS;
    } catch {
      return INITIAL_PREVENTIVE_TASKS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("engineiq_preventive_tasks", JSON.stringify(preventiveTasks));
    } catch (e) {
      console.warn("Could not save preventive tasks to localStorage", e);
    }
  }, [preventiveTasks]);

  const handleSignOffPMTask = (taskId: string, record: PMSignOffRecord) => {
    setPreventiveTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const nextCycles = t.intervalCycles ? t.intervalCycles + (currentEngine?.cyclesSinceNew || 5120) : t.nextDueCycles + 1000;
          const nextHours = t.intervalHours ? t.intervalHours + 14220 : t.nextDueHours + 2500;
          const targetDate = new Date();
          targetDate.setMonth(targetDate.getMonth() + 6);
          const nextDueDate = targetDate.toISOString().split("T")[0];

          return {
            ...t,
            lastCompletedCycles: currentEngine?.cyclesSinceNew || 5120,
            lastCompletedHours: 14220,
            lastCompletedDate: record.date,
            nextDueCycles: nextCycles,
            nextDueHours: nextHours,
            nextDueDate,
            complianceStatus: "compliant",
            signOffHistory: [record, ...t.signOffHistory],
          };
        }
        return t;
      })
    );

    // Also auto-record into Component History for cross-tab continuity
    const matchingTask = preventiveTasks.find((t) => t.id === taskId);
    if (matchingTask && matchingTask.partId !== "all") {
      const historyLog: ComponentHistoryEntry = {
        id: `LOG-PM-${Date.now().toString(36)}`,
        partId: matchingTask.partId as PartId,
        engineId: currentEngine?.id || "VT-DEM1-ENG1",
        tailNumber: currentEngine?.tailNumber || "VT-DEM1",
        date: record.date,
        flightCycles: record.cyclesAtSignOff,
        flightHours: record.hoursAtSignOff,
        logType: matchingTask.category === "borescope" ? "borescope_inspection" : "preventive_check",
        status: "passed",
        workOrderNumber: `WO-${taskId.replace("PM-", "")}-${record.cyclesAtSignOff}`,
        ammTaskRef: matchingTask.taskCode,
        technicianName: record.engineerName,
        technicianBadge: record.engineerLicense,
        itemsChecked: matchingTask.detailedProcedureSteps.slice(0, 3),
        findingsSummary: `Scheduled PM Check: ${record.remarks}`,
        technicianNotes: `Signed off in compliance with ${matchingTask.mandatedBy}. Findings: ${record.findings}`,
      };
      setComponentLogs((prev) => [historyLog, ...prev]);
    }

    setLiveToast({
      id: `toast-pm-${Date.now()}`,
      message: `Signed off ${taskId} at ${record.cyclesAtSignOff} CSN (${record.engineerName})`,
      engineId: currentEngine?.id || "",
      tailNumber: currentEngine?.tailNumber || "",
      level: 0,
    });
  };

  // 7. Active Engine Workspace Tab Mode
  const [activeMode, setActiveMode] = useState<AppMode>("explore");
  const [exploreSubView, setExploreSubView] = useState<"3d" | "specs">("3d");
  const [partCardSubTab, setPartCardSubTab] = useState<"specs" | "preventive" | "lifetracker" | "history">("specs");

  // 8. Live Toast Notification State
  const [liveToast, setLiveToast] = useState<LiveToast | null>(null);

  // Auto-dismiss toast after 9 seconds
  useEffect(() => {
    if (!liveToast) return;
    const timer = setTimeout(() => {
      setLiveToast(null);
    }, 9000);
    return () => clearTimeout(timer);
  }, [liveToast]);

  // 8. 3D Engine Component Selection & Statuses
  const [selectedPartId, setSelectedPartId] = useState<PartId>("fan_blades");
  const [partStatuses, setPartStatuses] = useState<Record<PartId, PartStatus>>({
    fan_case: "default",
    fan_blades: "default",
    fan_drive_gear: "default",
    lpc: "default",
    hpc: "default",
    combustor: "default",
    hpt: "default",
    lpt: "default",
    exhaust: "default",
    oil_system: "default",
  });

  // 9. Multi-select for Training Mode
  const [multiSelectedParts, setMultiSelectedParts] = useState<PartId[]>([]);

  // 10. Modals
  const [activeDoc, setActiveDoc] = useState<DocSnippet | null>(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchModalQuery, setSearchModalQuery] = useState("");

  // Derived current engine
  const currentEngine = useMemo(() => {
    if (!currentEngineId) return undefined;
    return engines.find((e) => e.id === currentEngineId) || engines[0];
  }, [engines, currentEngineId]);

  // Derived current flight (strictly prioritizing selectedFlightNumber, then currentEngine)
  const activeFlight = useMemo(() => {
    if (selectedFlightNumber) {
      const byNum = INDIGO_FLIGHTS.find((f) => f.flightNumber === selectedFlightNumber);
      if (byNum) return byNum;
    }
    if (!currentEngine) return undefined;
    return getFlightByEngineId(currentEngine.id);
  }, [selectedFlightNumber, currentEngine]);

  // Active aircraft twin engines (strictly scoped to the selected flight)
  const flightEngines = useMemo(() => {
    if (activeFlight) {
      const eng1 = engines.find((e) => e.id === activeFlight.engine1Id);
      const eng2 = engines.find((e) => e.id === activeFlight.engine2Id);
      const list: AircraftEngine[] = [];
      if (eng1) list.push(eng1);
      if (eng2) list.push(eng2);
      if (list.length > 0) return list;
    }
    if (currentEngine) {
      const sameTail = engines.filter((e) => e.tailNumber === currentEngine.tailNumber);
      if (sameTail.length > 0) return sameTail;
      return [currentEngine];
    }
    return engines.slice(0, 2);
  }, [activeFlight, engines, currentEngine]);

  // Sync session to localStorage
  const handleLogin = (userSession: UserSession) => {
    setSession(userSession);
    try {
      localStorage.setItem("engineiq_session", JSON.stringify(userSession));
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    setSession(null);
    setCurrentEngineId(null);
    setSelectedFlightNumber(null);
    setLiveToast(null);
    try {
      localStorage.removeItem("engineiq_session");
      localStorage.removeItem("engineiq_current_engine_id");
      localStorage.removeItem("engineiq_selected_flight");
    } catch {
      // ignore
    }
  };

  const handleSelectEngine = (engineId: string, initialTab?: string) => {
    setIsLoadingEngine(true);
    setCurrentEngineId(engineId);
    const flight = getFlightByEngineId(engineId);
    if (flight) {
      setSelectedFlightNumber(flight.flightNumber);
      try {
        localStorage.setItem("engineiq_selected_flight", flight.flightNumber);
      } catch {
        // ignore
      }
    }
    try {
      localStorage.setItem("engineiq_current_engine_id", engineId);
    } catch {
      // ignore
    }

    // Reset 3D selection and statuses
    setSelectedPartId("fan_blades");
    setExploreSubView("3d");
    setPartStatuses({
      fan_case: "default",
      fan_blades: "default",
      fan_drive_gear: "default",
      lpc: "default",
      hpc: "default",
      combustor: "default",
      hpt: "default",
      lpt: "default",
      exhaust: "default",
      oil_system: "default",
    });

    if (initialTab === "lifetracker") {
      setActiveMode("explore");
      setPartCardSubTab("lifetracker");
    } else if (initialTab && ["explore", "incident", "caselog", "evaluation"].includes(initialTab)) {
      setActiveMode(initialTab as AppMode);
    } else {
      setActiveMode("explore");
    }

    // Realistic brief telemetry load simulation
    setTimeout(() => {
      setIsLoadingEngine(false);
    }, 320);
  };

  const handleBackToFleet = () => {
    setCurrentEngineId(null);
    try {
      localStorage.removeItem("engineiq_current_engine_id");
    } catch {
      // ignore
    }
  };

  // Live Incident Simulation Handler (Demo)
  const handleSimulateIncident = (engineId: string, scenarioId: string) => {
    const targetEngine = engines.find((e) => e.id === engineId);
    const scenario = DUMMY_SCENARIOS.find((s) => s.id === scenarioId) || DUMMY_SCENARIOS[0];
    if (!targetEngine) return;

    const caseId = `CASE-SIM-${Date.now().toString().slice(-4)}`;
    const timestamp = new Date().toISOString();

    const affectedPartKey =
      (Object.entries(scenario.expectedParts).find(([_, st]) => st === "affected")?.[0] as PartId) || "fan_blades";

    const newCase: CaseLogEntry = {
      id: caseId,
      timestamp,
      aircraftType: targetEngine.aircraftType || "A320-family, illustrative",
      tailNumber: targetEngine.tailNumber,
      engineId: targetEngine.id,
      enginePosition: targetEngine.enginePosition,
      eventType: scenario.eventType,
      summary: scenario.narrative.slice(0, 160),
      overallLevel: scenario.expectedLevel,
      findings: [
        {
          id: `f-sim-1`,
          part: affectedPartKey,
          damageType: scenario.measurements.crackLengthMm
            ? "crack"
            : scenario.measurements.damageDepthMm
            ? "leading_edge_nick"
            : "vibration",
          zone: "Zone A Airfoil",
          measurement: scenario.measurements.damageDepthMm
            ? { value: scenario.measurements.damageDepthMm, unit: "depth_mm" }
            : scenario.measurements.crackLengthMm
            ? { value: scenario.measurements.crackLengthMm, unit: "length_mm" }
            : null,
          isAiSuggested: false,
        },
      ],
      limitsRows: [
        {
          component: formatPartName(affectedPartKey),
          damageType: scenario.measurements.crackLengthMm ? "crack" : "leading_edge_nick",
          measured: scenario.measurements.damageDepthMm
            ? `${scenario.measurements.damageDepthMm} mm`
            : scenario.measurements.crackLengthMm
            ? `${scenario.measurements.crackLengthMm} mm`
            : "Limit exceeded",
          limitBandApplied: `Scenario limit evaluated Level ${scenario.expectedLevel}`,
          resultLevel: scenario.expectedLevel,
          sourceDocId: scenario.docRefs[0] || "DEMO-AMM-72-01",
          notes: scenario.expectedReasoning.slice(0, 140),
        },
      ],
      engineerName: session?.name || "Certifying Engineer",
      engineerId: "AME-LIC-DEMO",
      decision: "Approved",
      draftTechLog: `MAINTENANCE INCIDENT LOGGED: ${targetEngine.tailNumber} (${targetEngine.enginePosition}) reported ${scenario.eventType.replace(/_/g, " ")}. Classified Level ${scenario.expectedLevel}. Citations: [${scenario.docRefs.join("], [")}]. Certifying engineer sign-off required.`,
      aiExplanation: scenario.expectedReasoning,
    };

    // 1. Add new case to caseLogs
    const updatedLogs = [newCase, ...caseLogs];
    setCaseLogs(updatedLogs);
    try {
      localStorage.setItem("engineiq_case_logs", JSON.stringify(updatedLogs));
    } catch {}

    // 2. Update engine status to action_required and prepend case ID
    setEngines((prevEngines) => {
      const updated = prevEngines.map((eng) => {
        if (eng.id === engineId) {
          return {
            ...eng,
            status: "action_required" as const,
            openCaseIds: [caseId, ...eng.openCaseIds],
          };
        }
        return eng;
      });
      try {
        localStorage.setItem("engineiq_engines", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 3. Trigger live animated toast notification
    const scenarioShortTitle = scenario.title.includes(":") ? scenario.title.split(":")[1].trim() : scenario.title;
    const toastMsg = `⚠ ${targetEngine.tailNumber} ${targetEngine.enginePosition} — ${scenarioShortTitle}, Level L${scenario.expectedLevel}`;
    setLiveToast({
      id: caseId,
      message: toastMsg,
      engineId: targetEngine.id,
      tailNumber: targetEngine.tailNumber,
      level: scenario.expectedLevel,
    });
  };

  // Case Log Save Handler: update caseLogs and update engine's openCaseIds / status
  const handleSaveCaseLog = (entry: CaseLogEntry) => {
    const updatedLogs = [entry, ...caseLogs];
    setCaseLogs(updatedLogs);
    try {
      localStorage.setItem("engineiq_case_logs", JSON.stringify(updatedLogs));
    } catch {
      // ignore
    }

    if (currentEngineId) {
      setEngines((prevEngines) => {
        const updatedEngines = prevEngines.map((eng) => {
          if (eng.id === currentEngineId) {
            const openCaseIds = eng.openCaseIds.includes(entry.id)
              ? eng.openCaseIds
              : [entry.id, ...eng.openCaseIds];
            const newStatus =
              entry.overallLevel >= 3
                ? "action_required"
                : entry.overallLevel >= 1
                ? "watch"
                : eng.status;
            return {
              ...eng,
              openCaseIds,
              status: newStatus,
            };
          }
          return eng;
        });
        try {
          localStorage.setItem("engineiq_engines", JSON.stringify(updatedEngines));
        } catch {
          // ignore
        }
        return updatedEngines;
      });
    }
  };

  const handleClearLogs = () => {
    setCaseLogs([]);
    try {
      localStorage.removeItem("engineiq_case_logs");
    } catch {
      // ignore
    }
  };

  const handleOpenCitation = (docId: string) => {
    const doc = getDocumentById(docId);
    if (doc) {
      setActiveDoc(doc);
    }
  };

  const handleToggleMultiSelect = (partId: PartId) => {
    if (multiSelectedParts.includes(partId)) {
      setMultiSelectedParts(multiSelectedParts.filter((p) => p !== partId));
    } else {
      setMultiSelectedParts([...multiSelectedParts, partId]);
    }
  };

  const handleModeChange = (mode: AppMode) => {
    setActiveMode(mode);
    if (mode === "explore") {
      setPartStatuses({
        fan_case: "default",
        fan_blades: "default",
        fan_drive_gear: "default",
        lpc: "default",
        hpc: "default",
        combustor: "default",
        hpt: "default",
        lpt: "default",
        exhaust: "default",
        oil_system: "default",
      });
    }
  };

  // If not logged in, render the Mock Login Screen
  if (!session) {
    return <LoginView onLogin={handleLogin} theme={theme} onToggleTheme={toggleTheme} />;
  }

  // If logged in but no engine selected, render Fleet Dashboard
  if (!currentEngineId || !currentEngine) {
    return (
      <div className={`relative min-h-screen w-screen overflow-hidden transition-colors duration-300 ${theme === "light" ? "bg-[#f8fafc]" : "bg-[#070b14]"}`}>
        {/* Live Incident Toast Banner */}
        {liveToast && (
          <div className="fixed top-10 right-4 sm:right-6 z-50 animate-bounce-short max-w-md w-full">
            <div className="p-4 rounded-xl bg-slate-900 border-2 border-rose-500 shadow-2xl shadow-rose-950/60 flex items-center justify-between gap-3 text-white">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 animate-pulse" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-700">
                      LIVE INCIDENT INJECTED
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Just Now</span>
                  </div>
                  <p className="font-mono text-xs font-bold text-slate-100 mt-0.5">
                    {liveToast.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleSelectEngine(liveToast.engineId, "caselog");
                    setLiveToast(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs flex items-center gap-1 transition shadow"
                >
                  <span>View</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setLiveToast(null)}
                  className="p-1 text-slate-400 hover:text-white rounded transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <FleetDashboard
          engines={engines}
          caseLogs={caseLogs}
          session={session}
          onSelectEngine={handleSelectEngine}
          onSimulateIncident={handleSimulateIncident}
          onOpenCitation={handleOpenCitation}
          onLogout={handleLogout}
          initialFlightNumber={selectedFlightNumber}
          theme={theme}
          onToggleTheme={toggleTheme}
          onFlightChange={(fNum) => {
            setSelectedFlightNumber(fNum);
            try {
              if (fNum) {
                localStorage.setItem("engineiq_selected_flight", fNum);
              } else {
                localStorage.removeItem("engineiq_selected_flight");
              }
            } catch {
              // ignore
            }
          }}
        />

        {/* Global Modals for Fleet Dashboard */}
        <CitationModal doc={activeDoc} onClose={() => setActiveDoc(null)} />
        <AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
      </div>
    );
  }

  // If loading skeleton is active during engine switch
  if (isLoadingEngine) {
    return (
      <div className="min-h-screen w-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-center space-y-4">
        {/* Permanent disclaimer during loading */}
        <div className="fixed top-0 inset-x-0 bg-amber-500/10 border-b border-amber-500/30 px-4 py-1.5 flex items-center justify-between text-xs text-amber-300 select-none z-30">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold tracking-wide">
              ILLUSTRATIVE DATA. NOT FOR OPERATIONAL USE. Decision support only. Certifying engineer sign-off required.
            </span>
          </div>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center shadow-xl shadow-sky-500/10">
          <Loader2 className="w-7 h-7 text-sky-400 animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <div className="font-mono text-sm font-bold text-white tracking-wider uppercase">
            Loading Engine Telemetry & 3D Assembly...
          </div>
          <div className="font-mono text-xs text-sky-400">
            {currentEngine.tailNumber} • {currentEngine.enginePosition} ({currentEngine.id}) • {currentEngine.cyclesSinceNew.toLocaleString()} CSN
          </div>
        </div>
      </div>
    );
  }

  // Render the Engine Workspace for the currently selected engine
  return (
    <div className={`flex flex-col h-screen w-screen text-slate-100 overflow-hidden font-sans transition-colors duration-300 ${theme === "light" ? "bg-[#f8fafc]" : "bg-[#070b14]"}`}>
      {/* 1. Permanent Required Compliance Banner on Every Screen */}
      <div className="w-full bg-amber-500/10 border-b border-amber-500/30 px-4 py-1.5 flex items-center justify-between text-xs text-amber-300 select-none z-30 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold tracking-wide">
            ILLUSTRATIVE DATA. NOT FOR OPERATIONAL USE. Decision support only. Certifying engineer sign-off required.
          </span>
        </div>
        <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-amber-400/80">
          <span>Engine Workspace</span>
          <span>•</span>
          <span>{activeFlight ? `Flight ${activeFlight.flightNumber} (${activeFlight.aircraftTail})` : currentEngine.tailNumber}</span>
          <span>•</span>
          <span>{currentEngine.enginePosition} ({currentEngine.id})</span>
        </div>
      </div>

      {/* 2. Persistent Navigation Header & Engine Context Strip */}
      <header className={`h-14 border-b px-3 sm:px-4 flex items-center justify-between z-20 shrink-0 transition-colors duration-300 ${theme === "light" ? "bg-white/95 border-slate-200" : "bg-slate-950/90 border-slate-800"}`}>
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Back to Flight Operations Button */}
          <button
            id="btn-back-to-fleet"
            onClick={handleBackToFleet}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold text-sky-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-sky-500/50 rounded-lg transition"
            title="Return to IndiGo Flight Operations Schedule"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {activeFlight ? `← Flight ${activeFlight.flightNumber}` : "← Flights Schedule"}
            </span>
          </button>

          {/* Twin-Engine Quick Switcher (Strictly scoped to the aircraft's 2 engines) */}
          <div className="flex items-center gap-2">
            {activeFlight && (
              <span className="px-2.5 py-1 rounded-lg bg-blue-950/80 text-sky-300 border border-blue-800/80 font-mono text-xs font-bold hidden xl:inline-flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5 text-sky-400" />
                <span>Flight {activeFlight.flightNumber} • {activeFlight.aircraftTail}</span>
              </span>
            )}

            {/* Desktop Segmented Toggle for the Aircraft's Twin Engines */}
            <div className="hidden lg:inline-flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-800 shadow-sm gap-1">
              {flightEngines.map((eng) => {
                const isCurrent = eng.id === currentEngine.id;
                const isAction = eng.status === "action_required";
                const isWatch = eng.status === "watch";
                const wingLabel = eng.enginePosition === "No.1" ? "Left Wing" : "Right Wing";

                return (
                  <button
                    key={eng.id}
                    id={`btn-switch-engine-${eng.id}`}
                    onClick={() => handleSelectEngine(eng.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                      isCurrent
                        ? "bg-sky-500 text-white shadow-md font-extrabold"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/80"
                    }`}
                    title={`Switch to ${eng.enginePosition} Engine (${wingLabel})`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isCurrent
                          ? "bg-white"
                          : isAction
                          ? "bg-rose-400 animate-ping"
                          : isWatch
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                      }`}
                    />
                    <span>{eng.enginePosition}</span>
                    <span className="text-[10px] opacity-80 font-normal hidden xl:inline">({wingLabel})</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                        isCurrent
                          ? "bg-white/20 text-white"
                          : isAction
                          ? "bg-rose-950 text-rose-300 border border-rose-800"
                          : isWatch
                          ? "bg-amber-950 text-amber-300 border border-amber-800"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {eng.cyclesSinceNew.toLocaleString()} CSN
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Dedicated Engine Options Dropdown (Strictly scoped to the aircraft's 2 engines) */}
            <div className="relative flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold hidden sm:inline lg:hidden">
                Engine Options:
              </span>
              <div className="relative">
                <select
                  id="select-engine-switcher"
                  aria-label="Engine Options"
                  title="Engine Options (strictly scoped to the 2 engines of this flight)"
                  value={currentEngine.id}
                  onChange={(e) => handleSelectEngine(e.target.value)}
                  className="bg-slate-900 border border-slate-700 hover:border-sky-500/50 text-xs font-mono font-bold text-white rounded-lg pl-2.5 pr-7 py-1.5 focus:outline-none focus:border-sky-500 cursor-pointer appearance-none"
                >
                  {flightEngines.map((eng) => (
                    <option key={eng.id} value={eng.id}>
                      {eng.enginePosition} ({eng.enginePosition === "No.1" ? "Left Wing" : "Right Wing"}) — {eng.status === "action_required" ? "⚠ ACTION" : eng.status === "watch" ? "• WATCH" : "OK"} ({eng.cyclesSinceNew.toLocaleString()} cyc)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
              </div>
            </div>

            {/* Status Pill Badge */}
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase hidden md:inline-flex items-center gap-1 ${
                currentEngine.status === "action_required"
                  ? "bg-rose-950 text-rose-300 border border-rose-700"
                  : currentEngine.status === "watch"
                  ? "bg-amber-950 text-amber-300 border border-amber-700"
                  : "bg-emerald-950 text-emerald-300 border border-emerald-700"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  currentEngine.status === "action_required"
                    ? "bg-rose-400 animate-ping"
                    : currentEngine.status === "watch"
                    ? "bg-amber-400"
                    : "bg-emerald-400"
                }`}
              />
              {currentEngine.status.replace("_", " ")}
            </span>

            {/* Station Chip */}
            <span className="text-[10px] font-mono text-slate-400 hidden xl:inline">
              Base: {currentEngine.location}
            </span>
          </div>
        </div>

        {/* Global Engine Telemetry Metric in the Center of Top Nav Bar */}
        <div className="flex items-center gap-2 sm:gap-3 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl shadow-sm">
          <Gauge className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider hidden sm:inline">
              Global Engine Cycles:
            </span>
            <span className="font-bold text-sky-300 tabular-nums">
              {currentEngine.cyclesSinceNew.toLocaleString()} CSN
            </span>
            <span className="text-slate-600 hidden md:inline">•</span>
            <span className="text-slate-400 tabular-nums text-[11px] hidden md:inline">
              14,220 FH
            </span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* Live AD & OEM Search Grounding Button (gemini-3.8-flash with googleSearch) */}
          <button
            id="btn-open-search-grounding-top"
            onClick={() => {
              setSearchModalQuery(`Pratt Whitney PW1100G ${currentEngine.enginePosition} engine airworthiness directives`);
              setIsSearchModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-sky-300 hover:text-white bg-sky-950/80 hover:bg-sky-900/80 rounded-lg border border-sky-800 transition font-mono shadow-sm cursor-pointer"
            title="Search live FAA/EASA ADs and OEM Bulletins with Google Search Grounding"
          >
            <Globe className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span className="hidden lg:inline">Live AD Search</span>
            <span className="lg:hidden">ADs</span>
          </button>

          {/* Whiteboard / Dark HUD Toggle */}
          <ThemeToggle theme={theme} onToggle={toggleTheme} />

          <button
            id="btn-open-about"
            onClick={() => setShowAboutModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition"
          >
            <Info className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">About</span>
          </button>

          {/* User Profile Badge */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
            <span className="text-slate-300 font-semibold text-[11px]">
              {session.name.split(" ")[0]}
            </span>
            <span className="text-slate-500 text-[10px] uppercase">
              ({session.role})
            </span>
          </div>

          {/* Logout Button */}
          <button
            id="btn-logout-workspace"
            onClick={handleLogout}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg border border-slate-800 hover:border-rose-900 transition font-mono"
            title="Log out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Log out</span>
          </button>
        </div>
      </header>

      {/* 3. Main Workspace: Split Screen or Full Engineering Specs Sheet or Preventive Maintenance Schedule */}
      {activeMode === "explore" && exploreSubView === "specs" ? (
        <div className="flex-1 overflow-y-auto bg-[#090d16] p-4 md:p-6">
          <div className="max-w-7xl mx-auto mb-4 flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Explore View:</span>
              <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
                <button
                  onClick={() => setExploreSubView("3d")}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-md text-slate-400 hover:text-white transition"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>3D Assembly</span>
                </button>
                <button
                  onClick={() => setExploreSubView("specs")}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-sky-500 text-white font-semibold shadow transition"
                >
                  <Ruler className="w-3.5 h-3.5" />
                  <span>Engineering Specs & Cutaway</span>
                </button>
              </div>
            </div>

            <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
              <span className="hidden sm:inline">PW1100G-JM 1-G-3-8-2-3 GTF Baseline</span>
              <span className="hidden sm:inline">•</span>
              <button
                onClick={() => setExploreSubView("3d")}
                className="text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1"
              >
                <span>Return to 3D Assembly</span> &rarr;
              </button>
            </div>
          </div>

          <EngineeringSpecsSheet
            selectedPartId={selectedPartId}
            onSelectPart={(partId) => setSelectedPartId(partId)}
            onOpenCitation={handleOpenCitation}
            onSwitchTo3D={() => setExploreSubView("3d")}
          />
        </div>
      ) : activeMode === "preventive" ? (
        <div className="flex-1 overflow-y-auto bg-[#090d16] flex flex-col">
          <div className="px-4 pt-4 sm:px-6 flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30 font-bold uppercase">
                CAMO Maintenance Center
              </span>
              <span className="text-slate-300 font-semibold hidden sm:inline">
                Preventive Maintenance Schedule & Regulatory Directives
              </span>
            </div>
            <button
              onClick={() => {
                setActiveMode("explore");
                setExploreSubView("3d");
              }}
              className="text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Return to 3D Assembly</span> &rarr;
            </button>
          </div>
          <PreventiveMaintenanceView
            currentEngine={currentEngine}
            flightEngines={flightEngines}
            onSelectEngine={handleSelectEngine}
            tasks={preventiveTasks}
            onSignOffTask={handleSignOffPMTask}
            onInspectIn3D={(partId) => {
              setSelectedPartId(partId);
              setActiveMode("explore");
              setExploreSubView("3d");
              setPartCardSubTab("preventive");
            }}
          />
        </div>
      ) : (
        <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          {/* Left Side: Interactive 3D Turbofan Engine Canvas (reused seamlessly) */}
          <div className="w-full md:w-1/2 lg:w-3/5 h-64 md:h-full relative border-b md:border-b-0 md:border-r border-slate-800 shrink-0">
            {activeMode === "explore" && (
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                <button
                  onClick={() => setExploreSubView("specs")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-sky-400 border border-slate-700/80 hover:border-sky-500/60 shadow-xl backdrop-blur-md text-xs font-mono transition"
                  title="View authentic technical specs and GTF cutaway blueprint"
                >
                  <Ruler className="w-3.5 h-3.5" />
                  <span>Engineering Specs & Cutaway Blueprint</span>
                </button>
                <button
                  onClick={() => setActiveMode("preventive")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-slate-700/80 hover:border-amber-500/60 shadow-xl backdrop-blur-md text-xs font-mono transition"
                  title="View complete preventive maintenance schedule"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Preventive Schedule</span>
                </button>
              </div>
            )}
            <EngineCanvas
              selectedPartId={selectedPartId}
              onSelectPart={(partId) => {
                setSelectedPartId(partId);
              }}
              partStatuses={partStatuses}
              allowMultiSelect={false}
              multiSelectedParts={multiSelectedParts}
              onToggleMultiSelectPart={handleToggleMultiSelect}
              theme={theme}
            />
          </div>

          {/* Right Side: Tab Panel Views */}
          <div className="w-full md:w-1/2 lg:w-2/5 h-full overflow-y-auto bg-[#090d16] p-4 md:p-6">
            {activeMode === "explore" && (
              <PartCard
                part={ENGINE_PARTS[selectedPartId] || ENGINE_PARTS.fan_blades}
                onSelectConnectedPart={(id) => setSelectedPartId(id)}
                onOpenCitation={handleOpenCitation}
                onOpenSpecsSheet={() => setExploreSubView("specs")}
                historyLogs={componentLogs}
                onAddLog={handleAddComponentLog}
                userSession={session}
                engineId={currentEngine.id}
                tailNumber={currentEngine.tailNumber}
                engineCycles={currentEngine.cyclesSinceNew}
                engineHours={14220}
                preventiveTasks={preventiveTasks}
                onSignOffPreventiveTask={handleSignOffPMTask}
                onOpenFullPreventiveSchedule={() => setActiveMode("preventive")}
                activeSubTab={partCardSubTab}
                onSubTabChange={(tab) => setPartCardSubTab(tab)}
              />
            )}

          {activeMode === "incident" && (
            <IncidentView
              onUpdate3DStatuses={(statuses) => setPartStatuses(statuses)}
              onOpenCitation={handleOpenCitation}
              onSaveCaseLog={handleSaveCaseLog}
              onSelectPartIn3D={(id) => setSelectedPartId(id)}
              defaultAircraftType={currentEngine.aircraftType || "A320-family, illustrative"}
              defaultEnginePosition={currentEngine.enginePosition}
              currentEngineId={currentEngine.id}
              tailNumber={currentEngine.tailNumber}
              userRole={session.role}
              userName={session.name}
              onOpenSearchGrounding={(q) => {
                if (q) setSearchModalQuery(q);
                setIsSearchModalOpen(true);
              }}
            />
          )}

          {activeMode === "caselog" && (
            <CaseLogView
              caseLogs={caseLogs}
              onClearLogs={handleClearLogs}
              onOpenCitation={handleOpenCitation}
              currentEngineId={currentEngine.id}
              tailNumber={currentEngine.tailNumber}
            />
          )}

          {activeMode === "evaluation" && (
            <EvaluationView onOpenCitation={handleOpenCitation} />
          )}
        </div>
      </main>
    )}

      {/* 4. Bottom Navigation Bar & Component Details Dock */}
      <footer className="h-14 bg-slate-950/95 border-t border-slate-800 px-3 sm:px-4 flex items-center justify-between z-20 shrink-0 backdrop-blur-md">
        {/* Navigation Tabs moved to the bottom */}
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1 text-xs font-mono">
          <button
            id="tab-mode-explore-3d"
            onClick={() => {
              setActiveMode("explore");
              setExploreSubView("3d");
              setPartCardSubTab("specs");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeMode === "explore" && exploreSubView === "3d" && partCardSubTab === "specs"
                ? "bg-sky-500 text-white font-bold shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
            title="3D Engine Digital Twin & Specs"
          >
            <Cpu className="w-3.5 h-3.5 text-sky-300" />
            <span>3D Assembly</span>
          </button>

          <button
            id="tab-mode-specs-cutaway"
            onClick={() => {
              setActiveMode("explore");
              setExploreSubView("specs");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeMode === "explore" && exploreSubView === "specs"
                ? "bg-sky-500 text-white font-bold shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
            title="Engineering Specs & GTF Cutaway Blueprint"
          >
            <Ruler className="w-3.5 h-3.5 text-sky-300" />
            <span>Specs & Cutaway</span>
          </button>

          <button
            id="tab-mode-preventive"
            onClick={() => {
              setActiveMode("preventive");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeMode === "preventive"
                ? "bg-sky-500 text-white font-bold shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
            title="Scheduled Preventive Maintenance, Borescope Intervals & CAMO Task Dispatcher"
          >
            <Wrench className="w-3.5 h-3.5 text-sky-300" />
            <span>Preventive Maint.</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeMode === "preventive"
                  ? "bg-white/20 text-white"
                  : "bg-amber-950 text-amber-300 border border-amber-800"
              }`}
            >
              {preventiveTasks.filter((t) => (t.nextDueCycles - (currentEngine.cyclesSinceNew || 5120)) <= 200).length} Due
            </span>
          </button>

          <button
            id="tab-mode-component-history"
            onClick={() => {
              setActiveMode("explore");
              setExploreSubView("3d");
              setPartCardSubTab("history");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeMode === "explore" && exploreSubView === "3d" && partCardSubTab === "history"
                ? "bg-sky-500 text-white font-bold shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
            title="Component-wise maintenance logs, checks, repairs & replacements"
          >
            <ClipboardList className="w-3.5 h-3.5 text-sky-300" />
            <span>Component History</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeMode === "explore" && exploreSubView === "3d" && partCardSubTab === "history"
                  ? "bg-white/20 text-white"
                  : "bg-sky-950 text-sky-400 border border-sky-800"
              }`}
            >
              {componentLogs.filter((l) => l.partId === selectedPartId).length}
            </span>
          </button>

          <button
            id="tab-mode-component-lifetracker"
            onClick={() => {
              setActiveMode("explore");
              setExploreSubView("3d");
              setPartCardSubTab("lifetracker");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeMode === "explore" && exploreSubView === "3d" && partCardSubTab === "lifetracker"
                ? "bg-sky-500 text-white font-bold shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
            title="Component-wise Life-Limited Part (LLP) tracker & cycle retirement criteria"
          >
            <Clock className="w-3.5 h-3.5 text-sky-300" />
            <span>LLP Life Tracker</span>
            {ENGINE_PARTS[selectedPartId]?.lifeLimitCycles && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeMode === "explore" && exploreSubView === "3d" && partCardSubTab === "lifetracker"
                    ? "bg-white/20 text-white"
                    : "bg-amber-950 text-amber-300 border border-amber-800"
                }`}
              >
                {Math.round(((currentEngine.cyclesSinceNew || 0) / (ENGINE_PARTS[selectedPartId].lifeLimitCycles || 1)) * 100)}%
              </span>
            )}
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

          <button
            id="tab-mode-incident"
            onClick={() => handleModeChange("incident")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeMode === "incident"
                ? "bg-sky-500 text-white font-semibold shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
            title="AI-Assisted Incident Intake & Diagnosis"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Incident Intake</span>
          </button>

          <button
            id="tab-mode-caselog"
            onClick={() => handleModeChange("caselog")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeMode === "caselog"
                ? "bg-sky-500 text-white font-semibold shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
            title="Audit trail and evaluated maintenance case logs"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Case Log ({currentEngine.openCaseIds.length})</span>
          </button>

          <button
            id="tab-mode-evaluation"
            onClick={() => handleModeChange("evaluation")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeMode === "evaluation"
                ? "bg-sky-500 text-white font-semibold shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
            title="Evaluate deterministic rules against benchmark incidents"
          >
            <TestTube2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Evaluation (EVAL)</span>
          </button>
        </nav>

        {/* Component Quick Selector on the Bottom Right */}
        <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-800 shrink-0">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Subsystem:
          </span>
          <div className="relative">
            <select
              id="select-bottom-component-switcher"
              value={selectedPartId}
              onChange={(e) => setSelectedPartId(e.target.value as PartId)}
              className="bg-slate-900 border border-slate-700 hover:border-sky-500/50 text-xs font-mono font-semibold text-sky-300 rounded-lg pl-2 pr-6 py-1 focus:outline-none focus:border-sky-500 cursor-pointer transition appearance-none"
            >
              {Object.values(ENGINE_PARTS).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.defaultZone})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-2 pointer-events-none" />
          </div>
        </div>
      </footer>

      {/* 5. Global Modals */}
      <CitationModal doc={activeDoc} onClose={() => setActiveDoc(null)} />
      <AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
      <SearchGroundingModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        initialQuery={searchModalQuery}
      />
    </div>
  );
}
