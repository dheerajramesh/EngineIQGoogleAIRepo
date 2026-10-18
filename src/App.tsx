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
  FlightCRSRecord,
  MROEngineerProfile,
} from "./types";
import {
  INITIAL_MRO_ROSTER,
  signOutFromFirebase,
  syncEngineerAssignmentToFirestore,
  syncEngineStateToFirestore,
  syncFlightCRSToFirestore,
  syncRectificationLogToFirestore,
} from "./services/firebase";
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
import { TechnicalCutaway } from "./components/TechnicalCutaway";
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
import { AICopilotDrawer } from "./components/AICopilotDrawer";
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
  Bot,
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

  // 1a. MRO Personnel Roster & Aircraft Tail Assignments (CAR-145 RBAC)
  const [mroRoster, setMroRoster] = useState<MROEngineerProfile[]>(() => {
    try {
      const saved = localStorage.getItem("engineiq_mro_roster_v3");
      return saved ? JSON.parse(saved) : INITIAL_MRO_ROSTER;
    } catch {
      return INITIAL_MRO_ROSTER;
    }
  });

  const handleUpdateEngineerProfile = (updatedProfile: MROEngineerProfile) => {
    setMroRoster((prev) => {
      const next = prev.map((p) => (p.uid === updatedProfile.uid ? updatedProfile : p));
      try {
        localStorage.setItem("engineiq_mro_roster_v3", JSON.stringify(next));
      } catch {}
      return next;
    });
    void syncEngineerAssignmentToFirestore(updatedProfile);
  };

  const handleAddEngineerProfile = (newProfile: MROEngineerProfile) => {
    setMroRoster((prev) => {
      const next = [...prev, newProfile];
      try {
        localStorage.setItem("engineiq_mro_roster_v3", JSON.stringify(next));
      } catch {}
      return next;
    });
    void syncEngineerAssignmentToFirestore(newProfile);
  };

  // Helper to resolve storage key based on whether user is in Isolated Trainee Sandbox or Live Operational Fleet
  const isTraineeSandbox = session?.role === "Trainee";
  const enginesStorageKey = isTraineeSandbox ? "engineiq_sandbox_engines_v3" : "engineiq_engines_v3";
  const casesStorageKey = isTraineeSandbox ? "engineiq_sandbox_cases_v3" : "engineiq_case_logs_v3";
  const historyStorageKey = isTraineeSandbox ? "engineiq_sandbox_history_v3" : "engineiq_component_history_v3";
  const crsStorageKey = isTraineeSandbox ? "engineiq_sandbox_crs_v3" : "engineiq_flight_crs_v3";

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
      const saved = localStorage.getItem("engineiq_engines_v3");
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
      const saved = localStorage.getItem("engineiq_case_logs_v3");
      return saved ? JSON.parse(saved) : INITIAL_FLEET_CASES;
    } catch {
      return INITIAL_FLEET_CASES;
    }
  });

  // 5b. Component Maintenance History State (pre-seeded for all 10 core subsystems)
  const [componentLogs, setComponentLogs] = useState<ComponentHistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem("engineiq_component_history_v3");
      return saved ? JSON.parse(saved) : INITIAL_COMPONENT_HISTORY;
    } catch {
      return INITIAL_COMPONENT_HISTORY;
    }
  });

  const handleAddComponentLog = (newEntry: ComponentHistoryEntry) => {
    setComponentLogs((prev) => {
      const updated = [newEntry, ...prev];
      try {
        localStorage.setItem(historyStorageKey, JSON.stringify(updated));
      } catch (e) {
        console.warn("Failed to save component history", e);
      }
      return updated;
    });

    if (session && !isTraineeSandbox) {
      void syncRectificationLogToFirestore(newEntry, session);
    }

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

  // 6b. Signed Flight Certificate of Release to Service (CRS) Records State
  const [flightCRSRecords, setFlightCRSRecords] = useState<Record<string, FlightCRSRecord>>(() => {
    try {
      const saved = localStorage.getItem("engineiq_flight_crs_v3");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleIssueFlightCRS = (record: FlightCRSRecord) => {
    setFlightCRSRecords((prev) => {
      const updated = { ...prev, [record.flightNumber]: record };
      try {
        localStorage.setItem(crsStorageKey, JSON.stringify(updated));
      } catch (e) {
        console.warn("Failed to save flight CRS records", e);
      }
      return updated;
    });

    if (session && !isTraineeSandbox) {
      void syncFlightCRSToFirestore(record, session);
    }

    setLiveToast({
      id: `toast-crs-${Date.now()}`,
      message: `Flight ${record.flightNumber} (${record.aircraftTail}): CRS ${record.crsReferenceNumber} signed by ${record.engineerName}. Aircraft released for dispatch.`,
      engineId: "",
      tailNumber: record.aircraftTail,
      level: 1,
    });
  };

  const handleSignOffPMTask = (taskId: string, record: PMSignOffRecord) => {
    const activeCycles = currentEngine?.cyclesSinceNew || 5120;
    const activeHours = Math.round(activeCycles * 1.85);
    setPreventiveTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const nextCycles = t.intervalCycles ? t.intervalCycles + activeCycles : t.nextDueCycles + 1000;
          const nextHours = t.intervalHours ? t.intervalHours + activeHours : t.nextDueHours + 2500;
          const targetDate = new Date();
          targetDate.setMonth(targetDate.getMonth() + 6);
          const nextDueDate = targetDate.toISOString().split("T")[0];

          return {
            ...t,
            lastCompletedCycles: activeCycles,
            lastCompletedHours: activeHours,
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
  const [exploreSubView, setExploreSubView] = useState<"3d" | "cutaway" | "specs">("3d");
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

  // Helper: Deterministically compute 3D part statuses from engine health & open cases
  const computeEnginePartStatuses = (
    engineId: string | null,
    enginesList: AircraftEngine[],
    casesList: CaseLogEntry[]
  ): { statuses: Record<PartId, PartStatus>; initialPart: PartId } => {
    const statuses: Record<PartId, PartStatus> = {
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
    };
    let initialPart: PartId = "fan_blades";
    if (!engineId) return { statuses, initialPart };

    const targetEng = enginesList.find((e) => e.id === engineId);
    // Healthy normal engines must have ALL components in default (neutral metallic) state
    if (!targetEng || targetEng.status === "normal") {
      return { statuses, initialPart };
    }

    if (targetEng.openCaseIds && targetEng.openCaseIds.length > 0) {
      const engCases = casesList.filter((c) => targetEng.openCaseIds.includes(c.id));
      for (const c of engCases) {
        for (const f of c.findings) {
          if (f.part !== "engine" && statuses[f.part as PartId] !== undefined) {
            statuses[f.part as PartId] = c.overallLevel >= 3 ? "affected" : "inspect";
            initialPart = f.part as PartId;
          }
        }
      }
    }
    return { statuses, initialPart };
  };

  // 8. 3D Engine Component Selection & Statuses
  const [selectedPartId, setSelectedPartId] = useState<PartId>(() => {
    return computeEnginePartStatuses(currentEngineId, engines, caseLogs).initialPart;
  });
  const [partStatuses, setPartStatuses] = useState<Record<PartId, PartStatus>>(() => {
    return computeEnginePartStatuses(currentEngineId, engines, caseLogs).statuses;
  });

  // 9. Multi-select for Training Mode
  const [multiSelectedParts, setMultiSelectedParts] = useState<PartId[]>([]);

  // 10. Modals & Multi-Turn AI Copilot Drawer
  const [activeDoc, setActiveDoc] = useState<DocSnippet | null>(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [isCopilotDrawerOpen, setIsCopilotDrawerOpen] = useState(false);
  const [copilotInitialPrompt, setCopilotInitialPrompt] = useState<string>("");

  const handleOpenAICopilot = (prompt?: string) => {
    setCopilotInitialPrompt(prompt || "");
    setIsCopilotDrawerOpen(true);
  };

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

  // Reload operational vs trainee-sandbox data whenever role changes
  const reloadWorkspaceDataForRole = (role: UserSession["role"]) => {
    const isSandbox = role === "Trainee";
    try {
      const savedEngines = localStorage.getItem(
        isSandbox ? "engineiq_sandbox_engines_v3" : "engineiq_engines_v3"
      );
      setEngines(savedEngines ? JSON.parse(savedEngines) : INITIAL_FLEET_ENGINES);

      const savedCases = localStorage.getItem(
        isSandbox ? "engineiq_sandbox_cases_v3" : "engineiq_case_logs_v3"
      );
      setCaseLogs(savedCases ? JSON.parse(savedCases) : INITIAL_FLEET_CASES);

      const savedHistory = localStorage.getItem(
        isSandbox ? "engineiq_sandbox_history_v3" : "engineiq_component_history_v3"
      );
      setComponentLogs(savedHistory ? JSON.parse(savedHistory) : INITIAL_COMPONENT_HISTORY);

      const savedCrs = localStorage.getItem(
        isSandbox ? "engineiq_sandbox_crs_v3" : "engineiq_flight_crs_v3"
      );
      setFlightCRSRecords(savedCrs ? JSON.parse(savedCrs) : {});
    } catch {
      // ignore
    }
  };

  // Sync session to localStorage
  const handleLogin = (userSession: UserSession) => {
    setSession(userSession);
    reloadWorkspaceDataForRole(userSession.role);
    try {
      localStorage.setItem("engineiq_session", JSON.stringify(userSession));
    } catch {
      // ignore
    }
  };

  const handleSwitchSessionProfile = (profile: MROEngineerProfile) => {
    const nextSession: UserSession = {
      uid: profile.uid,
      name: `${profile.displayName} (${profile.badge})`,
      role: profile.role,
      badge: profile.badge,
      homeBase: profile.homeBase,
      authProvider: session?.authProvider || "demo",
      assignedFlightNumbers: profile.assignedFlightNumbers,
      assignedTailNumbers: profile.assignedTailNumbers,
    };
    setSelectedFlightNumber(null);
    setCurrentEngineId(null);
    handleLogin(nextSession);
    setLiveToast({
      id: `toast-rbac-${Date.now()}`,
      message: `Switched active RBAC view to ${profile.displayName} (${profile.role}) — ${
        profile.role === "Supervisor"
          ? "Full Fleet Access"
          : profile.role === "Trainee"
          ? "Isolated Sandbox Mode"
          : `${profile.assignedTailNumbers.length} Assigned Aircraft Tail(s)`
      }`,
      engineId: "",
      tailNumber: "",
      level: 1,
    });
  };

  const handleLogout = () => {
    void signOutFromFirebase();
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

    const { statuses: newStatuses, initialPart: initialSelectedPart } = computeEnginePartStatuses(
      engineId,
      engines,
      caseLogs
    );

    setSelectedPartId(initialSelectedPart);
    setExploreSubView("3d");
    setPartStatuses(newStatuses);

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
      localStorage.setItem(casesStorageKey, JSON.stringify(updatedLogs));
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
        localStorage.setItem(enginesStorageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // If the simulated incident targets the currently open engine, immediately update 3D statuses
    if (engineId === currentEngineId) {
      setPartStatuses((prev) => ({
        ...prev,
        [affectedPartKey]: "affected",
      }));
      setSelectedPartId(affectedPartKey);
    }

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
      localStorage.setItem(casesStorageKey, JSON.stringify(updatedLogs));
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
          localStorage.setItem(enginesStorageKey, JSON.stringify(updatedEngines));
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
      localStorage.removeItem(casesStorageKey);
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

  // Closed-Loop Component Status & Rectification Handler
  const handleUpdatePartStatus = (partId: PartId, status: PartStatus) => {
    const nextStatuses: Record<PartId, PartStatus> = {
      ...partStatuses,
      [partId]: status,
    };
    setPartStatuses(nextStatuses);

    if (currentEngineId) {
      const remainingValues = Object.values(nextStatuses);
      const hasRemainingAffected = remainingValues.includes("affected");
      const hasRemainingInspect = remainingValues.includes("inspect");
      const nextEngineStatus: AircraftEngine["status"] = hasRemainingAffected
        ? "action_required"
        : hasRemainingInspect
        ? "watch"
        : "normal";

      if (status === "default") {
        // Remove the rectified part finding from the engine's open cases
        setCaseLogs((prevCases) => {
          const currentEng = engines.find((e) => e.id === currentEngineId);
          const openIds = currentEng?.openCaseIds || [];
          const updatedCases = prevCases.map((c) => {
            if (openIds.includes(c.id)) {
              return {
                ...c,
                findings: c.findings.filter((f) => f.part !== partId),
              };
            }
            return c;
          });
          try {
            localStorage.setItem(casesStorageKey, JSON.stringify(updatedCases));
          } catch {}
          return updatedCases;
        });
      }

      // Update the engine's overall airworthiness status and clear resolved openCaseIds when normal
      setEngines((prevEngines) => {
        const updated = prevEngines.map((eng) => {
          if (eng.id === currentEngineId) {
            const nextEng = {
              ...eng,
              status: nextEngineStatus,
              openCaseIds: nextEngineStatus === "normal" ? [] : eng.openCaseIds,
            };
            if (session && !isTraineeSandbox) {
              void syncEngineStateToFirestore(nextEng, nextStatuses, session);
            }
            return nextEng;
          }
          return eng;
        });
        try {
          localStorage.setItem(enginesStorageKey, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
  };

  const handleModeChange = (mode: AppMode) => {
    setActiveMode(mode);
  };

  // If not logged in, render the Login Screen with Firebase Auth + RBAC Roster
  if (!session) {
    return (
      <LoginView
        onLogin={handleLogin}
        theme={theme}
        onToggleTheme={toggleTheme}
        roster={mroRoster}
      />
    );
  }

  // If logged in but no engine selected, render Fleet Dashboard
  if (!currentEngineId || !currentEngine) {
    return (
      <div className={`relative min-h-screen w-screen overflow-hidden transition-colors duration-300 ${theme === "light" ? "bg-[#f8fafc]" : "bg-[#070b14]"}`}>
        {/* Live Incident / CRS Toast Banner */}
        {liveToast && (
          <div className="fixed top-10 right-4 sm:right-6 z-50 animate-bounce-short max-w-md w-full">
            <div
              className={`p-4 rounded-xl bg-slate-900 border-2 shadow-2xl flex items-center justify-between gap-3 text-white ${
                liveToast.level === 1
                  ? "border-emerald-500 shadow-emerald-950/60"
                  : "border-rose-500 shadow-rose-950/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    liveToast.level === 1
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                      : "bg-rose-500/20 text-rose-400 border-rose-500/40"
                  }`}
                >
                  <Zap className="w-4 h-4 animate-pulse" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded border ${
                        liveToast.level === 1
                          ? "bg-emerald-950 text-emerald-300 border-emerald-700"
                          : "bg-rose-950 text-rose-300 border-rose-700"
                      }`}
                    >
                      {liveToast.level === 1 ? "MRO LOGBOOK UPDATED" : "LIVE INCIDENT INJECTED"}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Just Now</span>
                  </div>
                  <p className="font-mono text-xs font-bold text-slate-100 mt-0.5">
                    {liveToast.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {liveToast.engineId && (
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
                )}
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
          crsRecords={flightCRSRecords}
          onIssueFlightCRS={handleIssueFlightCRS}
          roster={mroRoster}
          onUpdateEngineerProfile={handleUpdateEngineerProfile}
          onAddEngineerProfile={handleAddEngineerProfile}
          onSwitchSessionProfile={handleSwitchSessionProfile}
          onOpenAICopilot={handleOpenAICopilot}
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

        {/* Floating Multi-Turn AI Copilot Quick Launcher */}
        {!isCopilotDrawerOpen && (
          <button
            id="btn-floating-ai-copilot-fleet"
            onClick={() => handleOpenAICopilot()}
            className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-mono text-xs font-bold shadow-xl border border-sky-400/50 transition cursor-pointer"
            title="Open Multi-Turn AI Copilot Drawer (Live Fleet + AMM + Search)"
          >
            <Bot className="w-4 h-4" />
            <span>Ask AI Copilot</span>
          </button>
        )}

        {/* Global Modals & Multi-Turn AI Copilot Drawer for Fleet Dashboard */}
        <AICopilotDrawer
          isOpen={isCopilotDrawerOpen}
          onClose={() => setIsCopilotDrawerOpen(false)}
          session={session}
          engines={engines}
          caseLogs={caseLogs}
          crsRecords={flightCRSRecords}
          roster={mroRoster}
          currentEngine={currentEngine || null}
          activeFlight={activeFlight || null}
          selectedPartId={selectedPartId}
          initialPrompt={copilotInitialPrompt}
          onSelectEngine={handleSelectEngine}
          onSelectPart={(partId) => setSelectedPartId(partId)}
          onSelectFlight={(fNum) => {
            setCurrentEngineId(null);
            setSelectedFlightNumber(fNum);
            try {
              localStorage.setItem("engineiq_selected_flight", fNum);
              localStorage.removeItem("engineiq_selected_engine");
            } catch {}
          }}
          onOpenCitation={handleOpenCitation}
        />
        <CitationModal doc={activeDoc} onClose={() => setActiveDoc(null)} />
        <AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
      </div>
    );
  }

  // If loading skeleton is active during engine switch
  if (isLoadingEngine) {
    return (
      <div className="min-h-screen w-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-center space-y-4">
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
      {/* 2. Persistent Navigation Header & Engine Context Strip */}
      <header className={`h-14 border-b px-3 sm:px-4 flex items-center justify-between z-20 shrink-0 transition-colors duration-300 ${theme === "light" ? "bg-white/95 border-slate-200" : "bg-slate-950/90 border-slate-800"}`}>
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Back to Flight Operations Button (Icon only) */}
          <button
            id="btn-back-to-fleet"
            onClick={handleBackToFleet}
            className="flex items-center justify-center w-8 h-8 text-sky-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-sky-500/50 rounded-lg transition"
            title="Return to Flights Schedule"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Twin-Engine Quick Switcher (Strictly scoped to the aircraft's 2 engines) */}
          <div className="flex items-center gap-2">
            {activeFlight && (
              <span className="px-2.5 py-1 rounded-lg bg-blue-950/80 text-sky-300 border border-blue-800/80 font-mono text-xs font-bold hidden xl:inline-flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5 text-sky-400" />
                <span>Flight {activeFlight.flightNumber} • {activeFlight.aircraftTail}</span>
              </span>
            )}

            {/* Segmented Toggle for the Aircraft's Twin Engines */}
            <div className="inline-flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-800 shadow-sm gap-1">
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
                    className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
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
                      className={`px-1.5 py-0.2 rounded text-[10px] font-semibold hidden sm:inline ${
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

            {/* Segmented Switch: 3D | Cutaway | Specs */}
            <div className="hidden xl:inline-flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-800 text-xs font-mono shadow-sm ml-2">
              <button
                onClick={() => setExploreSubView("3d")}
                className={`px-2.5 py-1 rounded-lg transition font-bold ${
                  exploreSubView === "3d" ? "bg-sky-500 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                3D
              </button>
              <button
                onClick={() => setExploreSubView("cutaway")}
                className={`px-2.5 py-1 rounded-lg transition font-bold ${
                  exploreSubView === "cutaway" ? "bg-sky-500 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                Cutaway
              </button>
              <button
                onClick={() => setExploreSubView("specs")}
                className={`px-2.5 py-1 rounded-lg transition font-bold ${
                  exploreSubView === "specs" ? "bg-sky-500 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                Specs
              </button>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {activeMode === "incident" && (
            <button
              onClick={() => {
                setActiveMode("explore");
                setExploreSubView("3d");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-md transition font-mono"
            >
              <Cpu className="w-3.5 h-3.5 text-sky-200" />
              <span>Return to 3D Assembly</span>
            </button>
          )}

          {/* Unified Multi-Turn AI Copilot Button */}
          <button
            id="btn-open-ai-copilot-workspace"
            onClick={() => handleOpenAICopilot()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-mono font-bold shadow-sm transition cursor-pointer whitespace-nowrap"
            title="Open Multi-Turn AI Copilot Drawer"
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ask AI Copilot</span>
            <span className="sm:hidden">AI Q&A</span>
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

      {/* 3. Main Workspace: Fixed Layout Split Screen (Left: 3D Canvas / Cutaway / Specs, Right: Persistent PartCard) */}
      {activeMode === "preventive" ? (
        <div className="flex-1 overflow-y-auto bg-[#090d16] flex flex-col">
          <div className="px-4 pt-4 sm:px-6 flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30 font-bold uppercase">
                CAMO Maintenance Center
              </span>
              <span className="text-slate-300 font-semibold hidden sm:inline">
                Predictive Maintenance Schedule & Regulatory Directives
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
          {/* Left Side Center Stage: 3D Canvas, Cutaway, or Specs */}
          <div className="w-full md:w-1/2 lg:w-3/5 h-64 md:h-full relative border-b md:border-b-0 md:border-r border-slate-800 shrink-0 overflow-y-auto">
            {exploreSubView === "cutaway" ? (
              <div className="w-full h-full bg-[#070b14] p-4">
                <TechnicalCutaway
                  selectedPartId={selectedPartId}
                  onSelectPart={(partId) => setSelectedPartId(partId)}
                  onSwitchTo3D={() => setExploreSubView("3d")}
                />
              </div>
            ) : exploreSubView === "specs" ? (
              <div className="w-full h-full bg-[#070b14] p-4 overflow-y-auto">
                <EngineeringSpecsSheet
                  selectedPartId={selectedPartId}
                  onSelectPart={(partId) => setSelectedPartId(partId)}
                  onOpenCitation={handleOpenCitation}
                  onSwitchTo3D={() => setExploreSubView("3d")}
                />
              </div>
            ) : (
              <EngineCanvas
                selectedPartId={selectedPartId}
                onSelectPart={(partId) => {
                  setSelectedPartId(partId);
                  if (activeMode === "incident") {
                    setActiveMode("explore");
                    setExploreSubView("3d");
                  }
                }}
                partStatuses={partStatuses}
                allowMultiSelect={false}
                multiSelectedParts={multiSelectedParts}
                onToggleMultiSelectPart={handleToggleMultiSelect}
                theme={theme}
                isModalOpen={showAboutModal || !!activeDoc}
                activeMode={activeMode}
                exploreSubView={exploreSubView}
                onSelectMode={(mode) => handleModeChange(mode)}
                onSelectExploreSubView={(subView) => {
                  setActiveMode("explore");
                  setExploreSubView(subView);
                }}
              />
            )}
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
                tailNumber={activeFlight?.aircraftTail || currentEngine.tailNumber}
                engineCycles={currentEngine.cyclesSinceNew}
                engineHours={Math.round(currentEngine.cyclesSinceNew * 1.85)}
                preventiveTasks={preventiveTasks}
                onSignOffPreventiveTask={handleSignOffPMTask}
                onOpenFullPreventiveSchedule={() => setActiveMode("preventive")}
                activeSubTab={partCardSubTab}
                onSubTabChange={(tab) => setPartCardSubTab(tab)}
                partStatus={partStatuses[selectedPartId] || "default"}
                allPartStatuses={partStatuses}
                onUpdatePartStatus={handleUpdatePartStatus}
                openCases={caseLogs.filter((c) => currentEngine.openCaseIds.includes(c.id))}
                onSaveCaseLog={handleSaveCaseLog}
                onOpenAICopilot={handleOpenAICopilot}
              />
            )}

            {activeMode === "incident" && (
              <IncidentView
                onUpdate3DStatuses={(statuses) => setPartStatuses(statuses)}
                onOpenCitation={handleOpenCitation}
                onSaveCaseLog={handleSaveCaseLog}
                onSelectPartIn3D={(id) => {
                  setSelectedPartId(id);
                  setActiveMode("explore");
                  setExploreSubView("3d");
                }}
                defaultAircraftType={currentEngine.aircraftType || "A320-family, illustrative"}
                defaultEnginePosition={currentEngine.enginePosition}
                currentEngineId={currentEngine.id}
                tailNumber={currentEngine.tailNumber}
                userRole={session.role}
                userName={session.name}
                userBadge={session.badge}
                activeFlight={activeFlight || undefined}
                openCases={caseLogs.filter((c) => currentEngine.openCaseIds.includes(c.id))}
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

      {/* 5. Global Modals & Multi-Turn AI Copilot Drawer */}
      <AICopilotDrawer
        isOpen={isCopilotDrawerOpen}
        onClose={() => setIsCopilotDrawerOpen(false)}
        session={session}
        engines={engines}
        caseLogs={caseLogs}
        crsRecords={flightCRSRecords}
        roster={mroRoster}
        currentEngine={currentEngine}
        activeFlight={activeFlight || null}
        selectedPartId={selectedPartId}
        initialPrompt={copilotInitialPrompt}
        onSelectEngine={handleSelectEngine}
        onSelectPart={(partId) => {
          setSelectedPartId(partId);
          setActiveMode("explore");
          setExploreSubView("3d");
        }}
        onSelectFlight={(fNum) => {
          setCurrentEngineId(null);
          setSelectedFlightNumber(fNum);
          try {
            localStorage.setItem("engineiq_selected_flight", fNum);
            localStorage.removeItem("engineiq_selected_engine");
          } catch {}
        }}
        onOpenCitation={handleOpenCitation}
      />
      <CitationModal doc={activeDoc} onClose={() => setActiveDoc(null)} />
      <AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
      <div className="py-2 text-center text-[10px] text-slate-500 font-mono border-t border-slate-900/80 bg-slate-950/40 select-none shrink-0">
        ILLUSTRATIVE DATA. NOT FOR OPERATIONAL USE. Decision support only. Certifying engineer sign-off required.
      </div>
    </div>
  );
}
