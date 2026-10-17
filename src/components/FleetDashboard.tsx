/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { AircraftEngine, CaseLogEntry, UserSession, FlightInfo, AppTheme, FlightCRSRecord, MROEngineerProfile } from "../types";
import { WORST_LLP_CYCLE_LIMIT, FLEET_LOCATIONS } from "../data/fleet";
import { INDIGO_FLIGHTS } from "../data/flights";
import { FlightStatusView } from "./FlightStatusView";
import { SimulateIncidentModal } from "./SimulateIncidentModal";
import { EvaluationView } from "./EvaluationView";
import { ThemeToggle } from "./ThemeToggle";
import { SearchGroundingModal } from "./SearchGroundingModal";
import { RBACManagerModal } from "./RBACManagerModal";
import {
  ShieldAlert,
  Plane,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  Globe,
  Filter,
  ArrowRight,
  LogOut,
  Building2,
  Wrench,
  GraduationCap,
  Layers,
  Sparkles,
  ChevronRight,
  MapPin,
  Calendar,
  Zap,
  Award,
  ShieldCheck,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Cpu,
  Activity,
  User,
  Radio,
} from "lucide-react";

interface FleetDashboardProps {
  engines: AircraftEngine[];
  caseLogs: CaseLogEntry[];
  session: UserSession;
  onSelectEngine: (engineId: string, initialTab?: string) => void;
  onSimulateIncident: (engineId: string, scenarioId: string) => void;
  onOpenCitation: (docId: string) => void;
  onLogout: () => void;
  initialFlightNumber?: string | null;
  onFlightChange?: (flightNumber: string | null) => void;
  theme?: AppTheme;
  onToggleTheme?: () => void;
  crsRecords?: Record<string, FlightCRSRecord>;
  onIssueFlightCRS?: (record: FlightCRSRecord) => void;
  roster?: MROEngineerProfile[];
  onUpdateEngineerProfile?: (profile: MROEngineerProfile) => void;
  onAddEngineerProfile?: (profile: MROEngineerProfile) => void;
  onSwitchSessionProfile?: (profile: MROEngineerProfile) => void;
}

export function FleetDashboard({
  engines,
  caseLogs,
  session,
  onSelectEngine,
  onSimulateIncident,
  onOpenCitation,
  onLogout,
  initialFlightNumber = null,
  onFlightChange,
  theme,
  onToggleTheme,
  crsRecords = {},
  onIssueFlightCRS,
  roster = [],
  onUpdateEngineerProfile,
  onAddEngineerProfile,
  onSwitchSessionProfile,
}: FleetDashboardProps) {
  // Selected flight for detailed flight status view
  const [selectedFlightNumber, setSelectedFlightNumber] = useState<string | null>(initialFlightNumber);

  // Synchronize when initialFlightNumber changes
  React.useEffect(() => {
    if (initialFlightNumber !== undefined) {
      setSelectedFlightNumber(initialFlightNumber);
    }
  }, [initialFlightNumber]);

  // Active Dashboard Level Tab: "flights" | "engines" | "fleet_caselog" | "evaluation"
  const [dashboardTab, setDashboardTab] = useState<"flights" | "engines" | "fleet_caselog" | "evaluation">("flights");

  // Flight Filters
  const [flightStationFilter, setFlightStationFilter] = useState<string>("all");
  const [flightStatusFilter, setFlightStatusFilter] = useState<string>("all");
  const [flightSearchQuery, setFlightSearchQuery] = useState("");

  // Engine Filters
  const [statusFilter, setStatusFilter] = useState<"all" | "action_required" | "watch" | "normal">("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"status_worst" | "cycles_desc" | "cycles_asc" | "tail">("status_worst");

  // Case Log Filters
  const [caseSearchQuery, setCaseSearchQuery] = useState("");
  const [caseSortBy, setCaseSortBy] = useState<"date_desc" | "level_desc" | "tail">("date_desc");
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);

  // Simulate Incident Modal state
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);

  // Search Grounding Modal state (gemini-3.8-flash with googleSearch)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchModalInitialQuery, setSearchModalInitialQuery] = useState("");

  // RBAC Roster & Engineer Tail Assignment Modal state
  const [isRBACModalOpen, setIsRBACModalOpen] = useState(false);

  // Determine active user's allowed aircraft tails under CAR-145 RBAC
  const allowedTailNumbers = useMemo(() => {
    if (session.role === "Supervisor") {
      return INDIGO_FLIGHTS.map((f) => f.aircraftTail);
    }
    const cleanName = session.name.split(" (")[0].toLowerCase().trim();
    const matchedProfile = roster.find(
      (r) =>
        (session.uid && r.uid === session.uid) ||
        r.displayName.toLowerCase().trim() === cleanName
    );
    if (matchedProfile && matchedProfile.assignedTailNumbers.length > 0) {
      return matchedProfile.assignedTailNumbers;
    }
    if (session.assignedTailNumbers && session.assignedTailNumbers.length > 0) {
      return session.assignedTailNumbers;
    }
    return ["VT-IZB", "VT-ITG", "VT-IMR", "VT-IFA"];
  }, [session, roster]);

  // Scoped engines visible to this user under RBAC
  const rbacEngines = useMemo(() => {
    if (session.role === "Supervisor") return engines;
    return engines.filter((e) => allowedTailNumbers.includes(e.tailNumber));
  }, [engines, session.role, allowedTailNumbers]);

  // Engines strictly scoped for simulation when a flight is active
  const modalEngines = useMemo(() => {
    if (selectedFlightNumber) {
      const flight = INDIGO_FLIGHTS.find((f) => f.flightNumber === selectedFlightNumber);
      if (flight) {
        const flightEngs = rbacEngines.filter((e) => e.id === flight.engine1Id || e.id === flight.engine2Id);
        if (flightEngs.length > 0) return flightEngs;
      }
    }
    return rbacEngines;
  }, [selectedFlightNumber, rbacEngines]);

  // Dynamically derive flight overallStatus, statusLabel, and activeAlertCount from live engine states & CRS records
  const liveFlights = useMemo(() => {
    return INDIGO_FLIGHTS.map((f) => {
      const e1 = engines.find((e) => e.id === f.engine1Id);
      const e2 = engines.find((e) => e.id === f.engine2Id);
      const statuses = [e1?.status, e2?.status];
      const overallStatus: FlightInfo["overallStatus"] = statuses.includes("action_required")
        ? "action_required"
        : statuses.includes("watch")
        ? "watch"
        : "normal";
      const activeAlertCount =
        (e1 && e1.status !== "normal" ? Math.max(1, e1.openCaseIds.length) : 0) +
        (e2 && e2.status !== "normal" ? Math.max(1, e2.openCaseIds.length) : 0);
      const crs = crsRecords[f.flightNumber];
      const statusLabel =
        overallStatus === "action_required"
          ? "Maintenance Hold • Action Required"
          : crs
          ? `CRS Signed • Released (${crs.crsReferenceNumber})`
          : overallStatus === "watch"
          ? "Turnaround • Watch"
          : f.overallStatus === "action_required"
          ? "Rectified • Ready for CRS"
          : f.statusLabel;
      return {
        ...f,
        overallStatus,
        statusLabel,
        activeAlertCount,
      };
    });
  }, [engines, crsRecords]);

  // Filtered Flights List (RBAC-Scoped for Engineers/Trainees, Full System for Supervisor)
  const filteredFlights = useMemo(() => {
    let result = liveFlights.filter((f) =>
      session.role === "Supervisor" ? true : allowedTailNumbers.includes(f.aircraftTail)
    );

    if (flightStationFilter !== "all") {
      result = result.filter(
        (f) => f.origin.code === flightStationFilter || f.destination.code === flightStationFilter
      );
    }

    if (flightStatusFilter !== "all") {
      if (flightStatusFilter === "action_required") {
        result = result.filter((f) => f.overallStatus === "action_required");
      } else if (flightStatusFilter === "watch") {
        result = result.filter((f) => f.overallStatus === "watch");
      } else if (flightStatusFilter === "turnaround") {
        result = result.filter((f) => f.flightStatus === "arrived_turnaround");
      }
    }

    if (flightSearchQuery.trim()) {
      const q = flightSearchQuery.toLowerCase().trim();
      result = result.filter(
        (f) =>
          f.flightNumber.toLowerCase().includes(q) ||
          f.aircraftTail.toLowerCase().includes(q) ||
          f.origin.city.toLowerCase().includes(q) ||
          f.destination.city.toLowerCase().includes(q) ||
          f.origin.code.toLowerCase().includes(q) ||
          f.destination.code.toLowerCase().includes(q) ||
          f.aircraftModel.toLowerCase().includes(q)
      );
    }

    return result;
  }, [liveFlights, session.role, allowedTailNumbers, flightStationFilter, flightStatusFilter, flightSearchQuery]);

  // Engine Summary counts (RBAC-Scoped)
  const engineCounts = useMemo(() => {
    const actionRequired = rbacEngines.filter((e) => e.status === "action_required").length;
    const watch = rbacEngines.filter((e) => e.status === "watch").length;
    const normal = rbacEngines.filter((e) => e.status === "normal").length;
    const total = rbacEngines.length;
    return { actionRequired, watch, normal, total };
  }, [rbacEngines]);

  // Filtered & Sorted Engine List (RBAC-Scoped)
  const filteredEngines = useMemo(() => {
    let result = [...rbacEngines];

    if (statusFilter !== "all") {
      result = result.filter((e) => e.status === statusFilter);
    }

    if (locationFilter !== "all") {
      result = result.filter((e) => e.location === locationFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.tailNumber.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (sortBy === "status_worst") {
        const score = (s: string) => (s === "action_required" ? 3 : s === "watch" ? 2 : 1);
        if (score(b.status) !== score(a.status)) {
          return score(b.status) - score(a.status);
        }
        return b.cyclesSinceNew - a.cyclesSinceNew;
      }
      if (sortBy === "cycles_desc") {
        return b.cyclesSinceNew - a.cyclesSinceNew;
      }
      if (sortBy === "cycles_asc") {
        return a.cyclesSinceNew - b.cyclesSinceNew;
      }
      return a.tailNumber.localeCompare(b.tailNumber);
    });

    return result;
  }, [rbacEngines, statusFilter, locationFilter, searchQuery, sortBy]);

  // Filtered & Sorted Case Logs (RBAC-Scoped)
  const filteredCases = useMemo(() => {
    let result = caseLogs.filter((c) =>
      session.role === "Supervisor" ? true : !c.tailNumber || allowedTailNumbers.includes(c.tailNumber)
    );

    if (caseSearchQuery.trim()) {
      const q = caseSearchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          (c.tailNumber && c.tailNumber.toLowerCase().includes(q)) ||
          (c.engineId && c.engineId.toLowerCase().includes(q)) ||
          c.eventType.toLowerCase().includes(q) ||
          c.summary.toLowerCase().includes(q) ||
          c.engineerName.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (caseSortBy === "date_desc") {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
      if (caseSortBy === "level_desc") {
        return b.overallLevel - a.overallLevel;
      }
      const tailA = a.tailNumber || "";
      const tailB = b.tailNumber || "";
      return tailA.localeCompare(tailB);
    });

    return result;
  }, [caseLogs, caseSearchQuery, caseSortBy]);

  // If a specific flight is selected, render the dedicated FlightStatusView
  if (selectedFlightNumber) {
    const flight = liveFlights.find((f) => f.flightNumber === selectedFlightNumber) || liveFlights[0];
    const eng1 = engines.find((e) => e.id === flight.engine1Id);
    const eng2 = engines.find((e) => e.id === flight.engine2Id);

    return (
      <div className="min-h-screen w-full bg-[#050a14] text-slate-100 flex flex-col font-sans select-none">
        {/* Permanent Compliance Banner */}
        <div className="w-full bg-amber-500/10 border-b border-amber-500/30 px-4 py-1.5 flex items-center justify-between text-xs text-amber-300 select-none z-30 shrink-0 font-mono">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold tracking-wide">
              ILLUSTRATIVE DATA. NOT FOR OPERATIONAL USE. Decision support only. Certifying engineer sign-off required.
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-amber-400/80">
            <span>IndiGo Line Operations • Flight {flight.flightNumber}</span>
          </div>
        </div>

        {/* Flight Status View Body */}
        <FlightStatusView
          flight={flight}
          engine1={eng1}
          engine2={eng2}
          session={session}
          caseLogs={caseLogs}
          onSelectEngine={onSelectEngine}
          onBackToFlights={() => {
            setSelectedFlightNumber(null);
            onFlightChange?.(null);
          }}
          onOpenCitation={onOpenCitation}
          theme={theme}
          onToggleTheme={onToggleTheme}
          crsRecord={crsRecords[flight.flightNumber]}
          onIssueFlightCRS={onIssueFlightCRS}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#050a14] text-slate-100 flex flex-col font-sans select-none">
      {/* 1. Permanent Compliance Banner */}
      <div className="w-full bg-amber-500/10 border-b border-amber-500/30 px-4 py-1.5 flex items-center justify-between text-xs text-amber-300 select-none z-30 shrink-0 font-mono">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold tracking-wide">
            ILLUSTRATIVE DATA. NOT FOR OPERATIONAL USE. Decision support only. Certifying engineer sign-off required.
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[11px] text-amber-400/80">
          <span>IndiGo Airlines Maintenance & Engineering Fleet Portal</span>
        </div>
      </div>

      {/* 2. Persistent Navigation Header */}
      <header className="h-16 bg-slate-950/95 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between z-20 shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#001b94] via-[#0284c7] to-sky-400 p-0.5 shadow-lg shadow-blue-900/40 shrink-0">
            <div className="w-full h-full bg-[#070e24] rounded-[10px] flex flex-col items-center justify-center text-white">
              <span className="font-mono font-black text-xs leading-none tracking-tighter text-sky-400">6E</span>
              <span className="font-mono text-[8px] uppercase tracking-widest text-slate-300">M&E</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-white font-sans">
                IndiGo <span className="text-sky-400">EngineIQ</span>
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800">
                Line Ops & Twin
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
              Airbus A320neo / A321neo PW1100G Fleet Propulsion Health
            </p>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex items-center gap-3">
          <nav className="hidden md:flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              id="tab-dashboard-flights"
              onClick={() => setDashboardTab("flights")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition font-medium ${
                dashboardTab === "flights"
                  ? "bg-sky-500 text-white font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Plane className="w-3.5 h-3.5" />
              <span>Active Flights ({filteredFlights.length})</span>
            </button>

            <button
              id="tab-dashboard-engines"
              onClick={() => setDashboardTab("engines")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition font-medium ${
                dashboardTab === "engines"
                  ? "bg-sky-500 text-white font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Fleet Engines ({rbacEngines.length})</span>
            </button>

            <button
              id="tab-dashboard-caselog"
              onClick={() => setDashboardTab("fleet_caselog")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition font-medium ${
                dashboardTab === "fleet_caselog"
                  ? "bg-sky-500 text-white font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Case Log ({filteredCases.length})</span>
            </button>

            <button
              id="tab-dashboard-evaluation"
              onClick={() => setDashboardTab("evaluation")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition font-medium ${
                dashboardTab === "evaluation"
                  ? "bg-sky-500 text-white font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Evaluation (8/8)</span>
            </button>
          </nav>

          {/* RBAC & Engineer Tail Assignment Console Button */}
          <button
            id="btn-open-rbac-manager"
            onClick={() => setIsRBACModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/90 hover:bg-emerald-900/90 text-emerald-300 hover:text-white border border-emerald-700/80 text-xs font-mono font-bold transition cursor-pointer shadow-sm"
            title="Open CAR-145 RBAC & Engineer Tail Assignment Console"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">
              {session.role === "Supervisor" ? "RBAC & Assign Engineers" : "RBAC Scope"}
            </span>
            <span className="sm:hidden">RBAC</span>
          </button>

          {/* Live AD & OEM Search Grounding Button (Google Search Grounding) */}
          <button
            id="btn-open-search-grounding"
            onClick={() => {
              setSearchModalInitialQuery("Latest FAA and EASA Airworthiness Directives on Pratt Whitney PW1100G powder metal HPC disks inspection intervals");
              setIsSearchModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-950/90 hover:bg-sky-900/90 text-sky-300 hover:text-white border border-sky-800 text-xs font-mono font-bold transition cursor-pointer shadow-sm"
            title="Search live FAA/EASA Airworthiness Directives and OEM Service Bulletins with Google Search Grounding"
          >
            <Globe className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span className="hidden sm:inline">Live AD Search</span>
            <span className="sm:hidden">ADs</span>
          </button>

          {/* Simulate New Incident Button */}
          <button
            id="btn-simulate-incident"
            onClick={() => setIsSimulateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition cursor-pointer"
            title="Inject an incident into the fleet to demo real-time state updates"
          >
            <Zap className="w-3.5 h-3.5 animate-pulse" />
            <span className="hidden lg:inline">Simulate Incident</span>
            <span className="lg:hidden">Simulate</span>
          </button>

          {/* Whiteboard / Dark HUD Toggle */}
          {theme && onToggleTheme && (
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          )}

          {/* User Session Chip */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="flex flex-col text-right">
              <span className="text-slate-200 font-semibold text-[11px] leading-tight truncate max-w-[130px]">
                {session.name.split(" ")[0]}
              </span>
              <span className="text-slate-500 text-[10px] uppercase">
                {session.role} • {session.homeBase.split(" ")[0]}
              </span>
            </div>
          </div>

          {/* Logout */}
          <button
            id="btn-logout"
            onClick={onLogout}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg border border-slate-800 hover:border-rose-900 transition font-mono cursor-pointer"
            title="Log out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </header>

      {/* Mobile Tab Switcher */}
      <div className="md:hidden bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-around text-xs font-mono overflow-x-auto no-scrollbar">
        <button
          onClick={() => setDashboardTab("flights")}
          className={`px-3 py-1 rounded whitespace-nowrap ${
            dashboardTab === "flights" ? "bg-sky-500 text-white font-bold" : "text-slate-400"
          }`}
        >
          Flights ({INDIGO_FLIGHTS.length})
        </button>
        <button
          onClick={() => setDashboardTab("engines")}
          className={`px-3 py-1 rounded whitespace-nowrap ${
            dashboardTab === "engines" ? "bg-sky-500 text-white font-bold" : "text-slate-400"
          }`}
        >
          Engines ({engines.length})
        </button>
        <button
          onClick={() => setDashboardTab("fleet_caselog")}
          className={`px-3 py-1 rounded whitespace-nowrap ${
            dashboardTab === "fleet_caselog" ? "bg-sky-500 text-white font-bold" : "text-slate-400"
          }`}
        >
          Cases ({caseLogs.length})
        </button>
        <button
          onClick={() => setDashboardTab("evaluation")}
          className={`px-3 py-1 rounded whitespace-nowrap ${
            dashboardTab === "evaluation" ? "bg-sky-500 text-white font-bold" : "text-slate-400"
          }`}
        >
          Eval (8/8)
        </button>
      </div>

      {/* 3. Main Dashboard Body */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* RBAC Scope & Data Isolation Status Strip */}
        <div
          className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono ${
            session.role === "Supervisor"
              ? "bg-sky-950/35 border-sky-500/40 text-sky-200"
              : session.role === "Engineer"
              ? "bg-emerald-950/35 border-emerald-500/40 text-emerald-200"
              : "bg-amber-950/35 border-amber-500/40 text-amber-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                session.role === "Supervisor"
                  ? "bg-sky-500/20 text-sky-400"
                  : session.role === "Engineer"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-amber-500/20 text-amber-400"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold uppercase tracking-wide flex flex-wrap items-center gap-2">
                <span>
                  {session.role === "Supervisor"
                    ? "MCC Fleet Supervisor Authority — Full System Access (All 8 Flights • 16 Engines)"
                    : session.role === "Engineer"
                    ? `CAR-145 Assigned Line Engineer Scope — Authorized for ${allowedTailNumbers.length} Aircraft Tail(s)`
                    : "Isolated Trainee Sandbox — Private Practice Container"}
                </span>
                <span className="px-2 py-0.2 rounded bg-slate-950/80 border border-slate-700 text-[10px] text-slate-300">
                  {session.authProvider === "firebase" ? "Firebase Auth Verified" : "Firebase RBAC Policy Enforced"}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans mt-0.5">
                {session.role === "Supervisor"
                  ? "You have full visibility across all line stations and can assign specific aircraft tails to Certifying Line Engineers."
                  : session.role === "Engineer"
                  ? `Assigned Aircraft Tails: ${allowedTailNumbers.join(", ")}. Unassigned aircraft are hidden so engineers never interfere with another team's turnaround.`
                  : "Any simulated incidents, gauge measurements, or practice sign-offs you perform are isolated to your personal sandbox and invisible to other users."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsRBACModalOpen(true)}
            className="shrink-0 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 font-mono font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {session.role === "Supervisor" ? "Assign Engineers & Tails" : "View RBAC Assignments / Switch Role"}
            </span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: ACTIVE FLIGHTS & TURNAROUND SCHEDULE (PRIMARY USER FLOW) */}
        {/* ========================================================================= */}
        {dashboardTab === "flights" && (
          <div className="space-y-6 animate-fade-in">
            {/* Presentation Hero Header */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-[#071330] to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded bg-blue-950 text-sky-400 font-mono text-[10px] font-bold uppercase border border-blue-800">
                    IndiGo Airside Operations
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Live Flight Dispatch & Turnaround Board
                  </span>
                </div>
                <h2 className="text-xl font-bold font-sans text-white">
                  Scheduled Flights & Turnaround Propulsion Monitor
                </h2>
                <p className="text-xs font-mono text-slate-400 mt-1 max-w-2xl">
                  Select a flight arriving or on turnaround at your line station to review flight crew logbook defects, investigate dual engine telemetry, and launch into the 3D Digital Twin.
                </p>
              </div>

              {/* Station Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
                {["all", "DEL", "BOM", "BLR", "HYD", "MAA"].map((station) => (
                  <button
                    key={station}
                    onClick={() => setFlightStationFilter(station)}
                    className={`px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                      flightStationFilter === station
                        ? "bg-sky-500 text-white font-bold shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {station === "all" ? "All Hubs" : station}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Status Bar & Search Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="text-slate-400 text-[11px] uppercase mr-1">Status:</span>
                <button
                  onClick={() => setFlightStatusFilter("all")}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    flightStatusFilter === "all"
                      ? "bg-slate-800 text-white font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  All ({INDIGO_FLIGHTS.length})
                </button>
                <button
                  onClick={() => setFlightStatusFilter("action_required")}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                    flightStatusFilter === "action_required"
                      ? "bg-rose-950 border border-rose-500 text-rose-200 font-bold"
                      : "text-rose-400 hover:text-rose-300"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                  <span>Action Required (2)</span>
                </button>
                <button
                  onClick={() => setFlightStatusFilter("turnaround")}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                    flightStatusFilter === "turnaround"
                      ? "bg-amber-950 border border-amber-500 text-amber-200 font-bold"
                      : "text-amber-400 hover:text-amber-300"
                  }`}
                >
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>On Turnaround</span>
                </button>
              </div>

              {/* Search Box */}
              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={flightSearchQuery}
                  onChange={(e) => setFlightSearchQuery(e.target.value)}
                  placeholder="Search flight, tail, or city..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Flight Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredFlights.map((flight) => {
                const eng1 = engines.find((e) => e.id === flight.engine1Id);
                const eng2 = engines.find((e) => e.id === flight.engine2Id);

                return (
                  <div
                    key={flight.flightNumber}
                    className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-4 relative overflow-hidden group cursor-pointer ${
                      flight.overallStatus === "action_required"
                        ? "bg-gradient-to-b from-slate-900 to-[#14080c] border-rose-800/80 hover:border-rose-500 shadow-xl shadow-rose-950/20"
                        : flight.overallStatus === "watch"
                        ? "bg-gradient-to-b from-slate-900 to-[#140e06] border-amber-800/80 hover:border-amber-500 shadow-xl shadow-amber-950/20"
                        : "bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                    onClick={() => {
                      setSelectedFlightNumber(flight.flightNumber);
                      onFlightChange?.(flight.flightNumber);
                    }}
                  >
                    <div className="space-y-3">
                      {/* Flight Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-[#001b94] text-white font-mono font-bold text-[10px] tracking-wider">
                              {flight.airline}
                            </span>
                            <span className="text-xl font-black font-mono tracking-tight text-white">
                              {flight.flightNumber}
                            </span>
                          </div>
                          <p className="text-xs font-mono text-slate-400 mt-0.5">
                            Tail: <strong className="text-sky-300">{flight.aircraftTail}</strong> • {flight.aircraftModel.split(" ")[0]} {flight.aircraftModel.split(" ")[1]}
                          </p>
                        </div>

                        {/* Status badge */}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase flex items-center gap-1 ${
                            flight.overallStatus === "action_required"
                              ? "bg-rose-950 text-rose-300 border border-rose-700"
                              : flight.overallStatus === "watch"
                              ? "bg-amber-950 text-amber-300 border border-amber-700"
                              : "bg-emerald-950 text-emerald-300 border border-emerald-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              flight.overallStatus === "action_required"
                                ? "bg-rose-400 animate-ping"
                                : flight.overallStatus === "watch"
                                ? "bg-amber-400"
                                : "bg-emerald-400"
                            }`}
                          />
                          {flight.statusLabel}
                        </span>
                      </div>

                      {/* Route Banner */}
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                        <div className="text-center">
                          <span className="text-base font-bold text-white block">{flight.origin.code}</span>
                          <span className="text-[10px] text-slate-400">{flight.origin.city}</span>
                        </div>
                        <div className="flex flex-col items-center px-2">
                          <div className="flex items-center gap-1 text-sky-400">
                            <div className="w-4 h-px bg-sky-500/50" />
                            <Plane className="w-3.5 h-3.5 rotate-90" />
                            <div className="w-4 h-px bg-sky-500/50" />
                          </div>
                          <span className="text-[9px] text-slate-500 mt-0.5">
                            {flight.departureTime}
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="text-base font-bold text-white block">{flight.destination.code}</span>
                          <span className="text-[10px] text-slate-400">{flight.destination.city}</span>
                        </div>
                      </div>

                      {/* Gate & Turnaround timer */}
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span>{flight.gateBay}</span>
                        </div>
                        {flight.turnaroundMinutesRemaining !== undefined && flight.turnaroundMinutesRemaining > 0 && (
                          <div className="flex items-center gap-1 text-amber-300 font-bold">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{flight.turnaroundMinutesRemaining}m left</span>
                          </div>
                        )}
                      </div>

                      {/* Crew Log Excerpt */}
                      {flight.crewReport && (
                        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 text-[11px] text-slate-300 line-clamp-2 leading-relaxed font-sans">
                          <strong className="font-mono text-sky-400">Log: </strong>
                          {flight.crewReport}
                        </div>
                      )}

                      {/* Dual Engines Status Row */}
                      <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400">No. 1 Engine</span>
                            <span
                              className={`text-[9px] font-bold uppercase ${
                                eng1?.status === "action_required"
                                  ? "text-rose-400"
                                  : eng1?.status === "watch"
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                              }`}
                            >
                              {eng1?.status.replace("_", " ") || "OK"}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-slate-200 block mt-0.5">
                            {eng1?.cyclesSinceNew.toLocaleString()} CSN
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400">No. 2 Engine</span>
                            <span
                              className={`text-[9px] font-bold uppercase ${
                                eng2?.status === "action_required"
                                  ? "text-rose-400"
                                  : eng2?.status === "watch"
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                              }`}
                            >
                              {eng2?.status.replace("_", " ") || "OK"}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-slate-200 block mt-0.5">
                            {eng2?.cyclesSinceNew.toLocaleString()} CSN
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom CTA Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFlightNumber(flight.flightNumber);
                        onFlightChange?.(flight.flightNumber);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-sky-500 text-sky-400 hover:text-white font-mono font-bold text-xs transition flex items-center justify-center gap-1.5 shadow cursor-pointer group-hover:bg-sky-500 group-hover:text-white"
                    >
                      <span>Choose Flight & Inspect Status</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: FLEET ENGINES MASTER MATRIX */}
        {/* ========================================================================= */}
        {dashboardTab === "engines" && (
          <div className="space-y-6 animate-fade-in">
            {/* Alert Strip */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                  <Layers className="w-4 h-4 text-sky-400" />
                  <span className="font-bold text-white uppercase tracking-wider">Fleet Airworthiness Status:</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Live Telemetry</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-mono pt-1">
                <button
                  onClick={() => setStatusFilter(statusFilter === "action_required" ? "all" : "action_required")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                    statusFilter === "action_required"
                      ? "bg-rose-950 border-rose-500 text-rose-200 shadow-lg shadow-rose-950/50"
                      : "bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-900/40"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                  <span className="font-bold">{engineCounts.actionRequired} Require Action</span>
                </button>

                <button
                  onClick={() => setStatusFilter(statusFilter === "watch" ? "all" : "watch")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                    statusFilter === "watch"
                      ? "bg-amber-950 border-amber-500 text-amber-200 shadow-lg shadow-amber-950/50"
                      : "bg-amber-950/40 border-amber-800/60 text-amber-300 hover:bg-amber-900/40"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="font-bold">{engineCounts.watch} Under Watch</span>
                </button>

                <button
                  onClick={() => setStatusFilter(statusFilter === "normal" ? "all" : "normal")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                    statusFilter === "normal"
                      ? "bg-emerald-950 border-emerald-500 text-emerald-200 shadow-lg shadow-emerald-950/50"
                      : "bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/40"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-bold">{engineCounts.normal} Normal Operation</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="text-slate-400 text-[11px] uppercase mr-1">Base:</span>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-xs text-sky-400 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="all">All Bases (Fleet-wide)</option>
                  {FLEET_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>

                <span className="text-slate-400 text-[11px] uppercase ml-2 mr-1">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 text-xs text-sky-400 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="status_worst">Worst Status First</option>
                  <option value="cycles_desc">Highest Cycles (CSN)</option>
                  <option value="cycles_asc">Lowest Cycles (CSN)</option>
                  <option value="tail">Tail Number (A-Z)</option>
                </select>
              </div>

              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search engine ID, tail, base..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Engines Table */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Engine ID & Pod</th>
                      <th className="py-3 px-4">Aircraft Tail</th>
                      <th className="py-3 px-4">Operating Base</th>
                      <th className="py-3 px-4">Cycles (CSN)</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Open Incidents</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredEngines.map((engine) => (
                      <tr
                        key={engine.id}
                        className="hover:bg-slate-800/50 transition cursor-pointer"
                        onClick={() => onSelectEngine(engine.id)}
                      >
                        <td className="py-3 px-4 font-bold text-white">
                          <div className="flex items-center gap-2">
                            <Cpu className="w-3.5 h-3.5 text-sky-400" />
                            <span>{engine.id}</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({engine.enginePosition})
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sky-300 font-semibold">{engine.tailNumber}</td>
                        <td className="py-3 px-4 text-slate-300">{engine.location}</td>
                        <td className="py-3 px-4 text-sky-300 font-bold tabular-nums">
                          {engine.cyclesSinceNew.toLocaleString()} cyc
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                              engine.status === "action_required"
                                ? "bg-rose-950 text-rose-300 border border-rose-700"
                                : engine.status === "watch"
                                ? "bg-amber-950 text-amber-300 border border-amber-700"
                                : "bg-emerald-950 text-emerald-300 border border-emerald-700"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                engine.status === "action_required"
                                  ? "bg-rose-400 animate-ping"
                                  : engine.status === "watch"
                                  ? "bg-amber-400"
                                  : "bg-emerald-400"
                              }`}
                            />
                            {engine.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {engine.openCaseIds.length > 0 ? (
                            <span className="text-rose-400 font-bold">
                              {engine.openCaseIds.length} Active Case
                            </span>
                          ) : (
                            <span className="text-slate-500">None</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectEngine(engine.id);
                            }}
                            className="px-3 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500 text-sky-400 hover:text-white border border-sky-500/40 font-bold transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Inspect 3D Twin</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: FLEET CASE LOG */}
        {/* ========================================================================= */}
        {dashboardTab === "fleet_caselog" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
              <span className="text-xs font-mono font-bold text-white uppercase">
                Fleet Case Log & Sign-Offs ({filteredCases.length})
              </span>
              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={caseSearchQuery}
                  onChange={(e) => setCaseSearchQuery(e.target.value)}
                  placeholder="Search case, event type, or engineer..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div className="space-y-3">
              {filteredCases.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-2 text-xs font-mono"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sky-400">{c.id}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-300 font-semibold">{c.tailNumber} ({c.enginePosition})</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">{c.eventType.replace(/_/g, " ")}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        c.overallLevel >= 3
                          ? "bg-rose-950 text-rose-300 border border-rose-800"
                          : c.overallLevel === 2
                          ? "bg-amber-950 text-amber-300 border border-amber-800"
                          : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                      }`}
                    >
                      Action Level {c.overallLevel}
                    </span>
                  </div>
                  <p className="text-slate-300 font-sans text-xs leading-relaxed">{c.summary}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                    <span>Certifying Engineer: <strong className="text-slate-200">{c.engineerName}</strong></span>
                    <span>Decision: <strong className="text-emerald-400">{c.decision}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: EVALUATION */}
        {/* ========================================================================= */}
        {dashboardTab === "evaluation" && (
          <div className="animate-fade-in">
            <EvaluationView onOpenCitation={onOpenCitation} />
          </div>
        )}
      </main>

      {/* Incident Simulation Modal */}
      <SimulateIncidentModal
        isOpen={isSimulateModalOpen}
        onClose={() => setIsSimulateModalOpen(false)}
        engines={modalEngines}
        onConfirm={onSimulateIncident}
      />

      {/* Live Airworthiness & OEM Search Grounding Modal (gemini-3.8-flash with googleSearch) */}
      <SearchGroundingModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        initialQuery={searchModalInitialQuery}
      />

      {/* CAR-145 RBAC & Engineer Tail Assignment Console */}
      <RBACManagerModal
        isOpen={isRBACModalOpen}
        onClose={() => setIsRBACModalOpen(false)}
        roster={roster}
        onUpdateEngineerProfile={(p) => onUpdateEngineerProfile?.(p)}
        onAddEngineerProfile={(p) => onAddEngineerProfile?.(p)}
        onImpersonateProfile={(p) => onSwitchSessionProfile?.(p)}
        currentSession={session}
      />
    </div>
  );
}
