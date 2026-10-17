/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  AircraftEngine,
  CaseLogEntry,
  FlightCRSRecord,
  FlightInfo,
  MROEngineerProfile,
  PartId,
  UserSession,
} from "../types";
import { INDIGO_FLIGHTS } from "../data/flights";
import { ENGINE_PARTS } from "../data/parts";
import { DEMO_DOCUMENTS } from "../data/documents";
import {
  AIHealthStatus,
  AIProviderPreference,
  askCopilotChat,
  CopilotChatMessage,
  CopilotFleetSnapshot,
  CopilotSuggestedAction,
  fetchAIHealthStatus,
} from "../services/gemini";
import {
  Bot,
  X,
  Send,
  Globe,
  BookOpen,
  Plane,
  Cpu,
  Wrench,
  Trash2,
  ArrowRight,
  ExternalLink,
  Loader2,
  FileText,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  session: UserSession;
  engines: AircraftEngine[];
  caseLogs: CaseLogEntry[];
  crsRecords: Record<string, FlightCRSRecord>;
  roster: MROEngineerProfile[];
  currentEngine?: AircraftEngine | null;
  activeFlight?: FlightInfo | null;
  selectedPartId?: PartId;
  initialPrompt?: string;
  onSelectEngine: (engineId: string, initialTab?: string) => void;
  onSelectPart: (partId: PartId) => void;
  onSelectFlight: (flightNumber: string) => void;
  onOpenCitation: (docId: string) => void;
}

type PromptCategory = "fleet" | "amm" | "rbac" | "regulatory";

export function AICopilotDrawer({
  isOpen,
  onClose,
  session,
  engines,
  caseLogs,
  crsRecords,
  roster,
  currentEngine,
  activeFlight,
  selectedPartId,
  initialPrompt,
  onSelectEngine,
  onSelectPart,
  onSelectFlight,
  onOpenCitation,
}: AICopilotDrawerProps) {
  const [contextScope, setContextScope] = useState<"fleet" | "flight" | "part">("fleet");
  const [promptCategory, setPromptCategory] = useState<PromptCategory>("fleet");
  const [preferredProvider, setPreferredProvider] = useState<AIProviderPreference>(() => {
    const saved = localStorage.getItem("engineiq_preferred_ai_provider");
    if (saved === "gemini" || saved === "groq" || saved === "auto") return saved;
    return "auto";
  });
  const [healthStatus, setHealthStatus] = useState<AIHealthStatus | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const lastTriggeredPromptRef = useRef<string>("");

  useEffect(() => {
    try {
      localStorage.setItem("engineiq_preferred_ai_provider", preferredProvider);
    } catch {}
  }, [preferredProvider]);

  async function refreshHealthStatus() {
    const status = await fetchAIHealthStatus();
    setHealthStatus(status);
  }

  useEffect(() => {
    if (isOpen) {
      void refreshHealthStatus();
    }
  }, [isOpen]);

  // Compute live Fleet Snapshot from current React/Firestore state
  const fleetSnapshot: CopilotFleetSnapshot = useMemo(() => {
    const flights = INDIGO_FLIGHTS.map((f) => {
      const eng1 = engines.find((e) => e.id === f.engine1Id);
      const eng2 = engines.find((e) => e.id === f.engine2Id);
      const s1 = eng1?.status || "normal";
      const s2 = eng2?.status || "normal";
      const crs = crsRecords[f.flightNumber];

      let flightStatus = "ready";
      let statusLabel = crs
        ? `CRS Signed (${crs.crsReferenceNumber})`
        : "Ready for Dispatch";

      if (s1 === "action_required" || s2 === "action_required") {
        flightStatus = "action_required";
        statusLabel =
          s1 === "action_required" && s2 === "action_required"
            ? "AOG — Both Engines Action Required"
            : s1 === "action_required"
            ? "AOG — Engine #1 Action Required"
            : "AOG — Engine #2 Action Required";
      } else if (s1 === "watch" || s2 === "watch") {
        flightStatus = "watch";
        statusLabel =
          s1 === "watch" && s2 === "watch"
            ? "Watch — Inspect Both Engines"
            : s1 === "watch"
            ? "Watch — Inspect Engine #1"
            : "Watch — Inspect Engine #2";
      }

      return {
        flightNumber: f.flightNumber,
        aircraftTail: f.aircraftTail,
        aircraftType: f.aircraftModel,
        origin: f.origin.code,
        destination: f.destination.code,
        gate: f.gateBay,
        flightStatus,
        statusLabel,
        crewReportSummary: f.crewReport || "Nominal pre-flight check",
        crsSigned: Boolean(crs),
        crsRef: crs?.crsReferenceNumber,
        engine1Id: f.engine1Id,
        engine1Status: s1,
        engine1CSN: eng1?.cyclesSinceNew || 0,
        engine2Id: f.engine2Id,
        engine2Status: s2,
        engine2CSN: eng2?.cyclesSinceNew || 0,
      };
    });

    const openEngineCaseIds = new Set(engines.flatMap((e) => e.openCaseIds));
    const openCases = caseLogs
      .filter((c) => openEngineCaseIds.has(c.id))
      .map((c) => {
        const eng = engines.find((e) => e.id === c.engineId);
        return {
          id: c.id,
          engineId: c.engineId || "ik-eng-01",
          tailNumber: eng?.tailNumber || "VT-IFQ",
          enginePosition: c.enginePosition,
          eventType: c.eventType,
          overallLevel: c.overallLevel,
          summary: c.summary,
          partsAffected: c.findings.map((f) => f.part),
        };
      });

    const rosterData = roster.map((r) => ({
      name: r.displayName,
      role: r.role,
      badge: r.badge,
      homeBase: r.homeBase,
      assignedFlightNumbers: r.assignedFlightNumbers,
      assignedTailNumbers: r.assignedTailNumbers,
    }));

    return {
      flights,
      openCases,
      roster: rosterData,
    };
  }, [engines, caseLogs, crsRecords, roster]);

  const selectedPart = selectedPartId ? ENGINE_PARTS[selectedPartId] : null;

  // Auto-select scope when opened inside a flight or 3D engine view
  useEffect(() => {
    if (isOpen) {
      if (currentEngine && selectedPart) {
        setContextScope("part");
      } else if (activeFlight) {
        setContextScope("flight");
      } else {
        setContextScope("fleet");
      }
    }
  }, [isOpen, currentEngine, activeFlight, selectedPart]);

  // Persistent multi-turn conversation thread
  const [messages, setMessages] = useState<CopilotChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem("engineiq_copilot_chat_v3");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: "welcome-msg",
        role: "assistant",
        content: `Welcome to the **EngineIQ Live AI Copilot**. Every question is routed through our **Multi-Provider Live AI Engine** (**Groq GPT-OSS 120B / Qwen 3.8** + **Google Gemini Free-Tier Cascade**) with full access to:\n• **IndiGo Fleet Telemetry:** All 8 flights, 16 PW1100G-JM engines, open Red/Amber cases, and CRS dispatch certificates\n• **AMM & Repair Library:** Chapter 72 & 79 damage limits, boroblend thresholds, and torque specs [DEMO-AMM-72-01] [DEMO-AMM-72-02]\n• **CAR-145 RBAC Roster & Live Regulatory Directives:** Engineer tail assignments and FAA/EASA Airworthiness Directives.\n\nSelect your preferred AI provider above or ask any question below.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        contextLabel: "Multi-Provider Live AI Ready",
        suggestedActions: [
          {
            label: "View Flight 6E-204 (VT-IFQ)",
            type: "open_flight",
            flightNumber: "6E-204",
          },
          {
            label: "Inspect VT-IFQ in 3D Twin (ik-eng-01)",
            type: "open_engine",
            engineId: "ik-eng-01",
          },
        ],
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem("engineiq_copilot_chat_v3", JSON.stringify(messages));
    } catch {}
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-run initialPrompt if passed when opening the drawer
  useEffect(() => {
    if (
      isOpen &&
      initialPrompt &&
      initialPrompt.trim() &&
      lastTriggeredPromptRef.current !== initialPrompt
    ) {
      lastTriggeredPromptRef.current = initialPrompt;
      void handleSendMessage(initialPrompt);
    }
  }, [isOpen, initialPrompt]);

  const activeContextObj = useMemo(() => {
    if (contextScope === "part" && currentEngine && selectedPart) {
      return {
        scope: "part" as const,
        label: `${currentEngine.tailNumber} · ${currentEngine.enginePosition} · ${selectedPart.name}`,
        flightNumber: activeFlight?.flightNumber,
        tailNumber: currentEngine.tailNumber,
        engineId: currentEngine.id,
        partId: selectedPart.id,
        partName: selectedPart.name,
        userRole: session.role,
        userName: session.name,
      };
    }
    if (contextScope === "flight" && activeFlight) {
      return {
        scope: "flight" as const,
        label: `Flight ${activeFlight.flightNumber} · ${activeFlight.aircraftTail}`,
        flightNumber: activeFlight.flightNumber,
        tailNumber: activeFlight.aircraftTail,
        engineId: currentEngine?.id || activeFlight.engine1Id,
        userRole: session.role,
        userName: session.name,
      };
    }
    return {
      scope: "fleet" as const,
      label: "Entire IndiGo Fleet (8 Flights · 16 Engines)",
      userRole: session.role,
      userName: session.name,
    };
  }, [contextScope, currentEngine, selectedPart, activeFlight, session]);

  async function handleSendMessage(overrideText?: string) {
    const q = (overrideText !== undefined ? overrideText : input).trim();
    if (!q || isSending) return;

    if (overrideText === undefined) {
      setInput("");
    }

    const userMsg: CopilotChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      contextLabel: activeContextObj.label,
    };

    const updatedHistory = [...messages.filter((m) => !m.liveError), userMsg];
    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    try {
      const response = await askCopilotChat({
        message: q,
        history: updatedHistory.map((m) => ({ role: m.role, content: m.content })),
        fleetSnapshot,
        activeContext: activeContextObj,
        snippets: DEMO_DOCUMENTS,
        preferredProvider,
      });

      const assistantMsg: CopilotChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        contextLabel: activeContextObj.label,
        sources: response.sources,
        searchQueries: response.searchQueries,
        suggestedActions: response.suggestedActions,
        isOfflineSample: response.isOfflineSample,
        provider: response.provider,
        modelUsed: response.modelUsed,
        latencyMs: response.latencyMs,
        liveError: response.liveError,
        errorMessage: response.errorMessage,
        attemptErrors: response.attemptErrors,
        retryPrompt: q,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      void refreshHealthStatus();
    } catch (err: any) {
      console.error("Copilot chat failed:", err);
    } finally {
      setIsSending(false);
    }
  }

  function handleResetConversation() {
    const resetMsg: CopilotChatMessage = {
      id: `welcome-${Date.now()}`,
      role: "assistant",
      content: `Conversation history cleared. I am synced with the live **${activeContextObj.label}** telemetry, AMM manuals, and Multi-Provider Live AI (${preferredProvider.toUpperCase()}). What would you like to inspect or troubleshoot?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      contextLabel: activeContextObj.label,
    };
    setMessages([resetMsg]);
    try {
      localStorage.removeItem("engineiq_copilot_chat_v3");
    } catch {}
  }

  function handleExecuteSuggestedAction(action: CopilotSuggestedAction) {
    if (action.type === "open_citation" && action.docId) {
      onOpenCitation(action.docId);
      return;
    }
    if (action.type === "open_flight" && action.flightNumber) {
      onSelectFlight(action.flightNumber);
      onClose();
      return;
    }
    if (action.type === "open_engine" && action.engineId) {
      onSelectEngine(action.engineId, "explore");
      onClose();
      return;
    }
    if (action.type === "open_part" && action.partId) {
      if (!currentEngine && action.engineId) {
        onSelectEngine(action.engineId, "explore");
      }
      onSelectPart(action.partId as PartId);
      onClose();
      return;
    }
  }

  // Render inline [DEMO-AMM-...] citations as clickable buttons
  function renderFormattedContent(text: string) {
    const parts = text.split(/(\[[A-Z0-9-]+\])/g);
    return parts.map((segment, idx) => {
      const match = segment.match(/^\[([A-Z0-9-]+)\]$/);
      if (match) {
        const docId = match[1];
        const existsInLib = DEMO_DOCUMENTS.some((d) => d.id === docId);
        if (existsInLib) {
          return (
            <button
              key={idx}
              onClick={() => onOpenCitation(docId)}
              className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded bg-sky-950/90 hover:bg-sky-900 text-sky-300 border border-sky-700/70 font-mono text-[10px] font-bold transition cursor-pointer"
              title={`Open Manual Reference ${docId}`}
            >
              <BookOpen className="w-2.5 h-2.5 text-sky-400" />
              <span>{docId}</span>
            </button>
          );
        }
      }
      return <span key={idx}>{segment}</span>;
    });
  }

  const quickPromptsByCategory: Record<PromptCategory, string[]> = {
    fleet: [
      "Which flights are currently grounded AOG and why?",
      activeFlight
        ? `What is the live dispatch status and open cases for Flight ${activeFlight.flightNumber} (${activeFlight.aircraftTail})?`
        : "What is the live dispatch status and open cases for Flight 6E-204 (VT-IFQ)?",
      "Which engines across the fleet have the lowest LLP cycle margin remaining?",
    ],
    amm: [
      selectedPart
        ? `What are the AMM damage limits and repair procedures for ${selectedPart.name}?`
        : "What are the AMM Zone A vs Zone B blend limits for a fan blade nick?",
      "What is the AMM troubleshooting procedure for an oil scavenge leak > 3 drops/min?",
      "What are the HPT single-crystal blade crack and TBC coating loss limits?",
    ],
    rbac: [
      "Who is assigned to each aircraft tail in the CAR-145 RBAC roster?",
      "Which flights have a signed CRS certificate and which are still locked?",
      "How does EngineIQ's 3-tier RBAC compare to Swiss-AS AMOS and Airbus Skywise?",
    ],
    regulatory: [
      "Latest FAA and EASA Airworthiness Directives on PW1100G powder metal HPC/HPT disks",
      "Pratt & Whitney Service Bulletin requirements for Fan Drive Gear System vibration",
      "DGCA India CAR-145 requirements for certifying engineer CRS sign-off",
    ],
  };

  if (!isOpen) return null;

  const aogCount = fleetSnapshot.flights.filter((f) => f.flightStatus === "action_required").length;
  const watchCount = fleetSnapshot.flights.filter((f) => f.flightStatus === "watch").length;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="copilot-drawer-title"
    >
      {/* Backdrop click to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Slide-Over Conversational Workspace Drawer */}
      <aside className="relative w-full max-w-xl h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        {/* 1. Drawer Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="copilot-drawer-title" className="text-sm sm:text-base font-bold text-white tracking-tight">
                  EngineIQ AI Copilot & Fleet Q&A
                </h2>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                <span className={healthStatus?.hasGeminiKey ? "text-emerald-400" : "text-slate-500"}>
                  Gemini {healthStatus?.hasGeminiKey ? "Key Active" : "Not Set"}
                </span>
                <span>·</span>
                <span className={healthStatus?.hasGroqKey ? "text-emerald-400" : "text-slate-500"}>
                  Groq {healthStatus?.hasGroqKey ? "Key Active" : "Not Set"}
                </span>
                <button
                  onClick={() => void refreshHealthStatus()}
                  className="ml-1 text-slate-400 hover:text-sky-400 transition cursor-pointer"
                  title="Refresh server API key status"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleResetConversation}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-slate-800 transition cursor-pointer"
              title="Clear conversation history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Close AI Copilot Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Live Provider Selector & Context Scope Bar */}
        <div className="px-4 py-2.5 bg-slate-950/70 border-b border-slate-800 space-y-2 shrink-0">
          {/* Provider Routing Mode Selector */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-mono text-slate-400">Live AI Router:</span>
            <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800">
              {(
                [
                  { id: "auto", label: "Auto (Gemini + Groq)" },
                  { id: "gemini", label: "Gemini Free Tier" },
                  { id: "groq", label: "Groq (GPT-OSS 120B)" },
                ] as { id: AIProviderPreference; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setPreferredProvider(opt.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition whitespace-nowrap cursor-pointer ${
                    preferredProvider === opt.id
                      ? "bg-sky-500 text-white font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Context Scope & Live Fleet Counters */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-800/60">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
              <span>Scope:</span>
              <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800">
                <button
                  onClick={() => setContextScope("fleet")}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition whitespace-nowrap cursor-pointer ${
                    contextScope === "fleet"
                      ? "bg-slate-800 text-sky-300 font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  All Fleet ({fleetSnapshot.flights.length})
                </button>
                {activeFlight && (
                  <button
                    onClick={() => setContextScope("flight")}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition whitespace-nowrap cursor-pointer ${
                      contextScope === "flight"
                        ? "bg-slate-800 text-sky-300 font-semibold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Flight {activeFlight.flightNumber}
                  </button>
                )}
                {currentEngine && selectedPart && (
                  <button
                    onClick={() => setContextScope("part")}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition whitespace-nowrap cursor-pointer ${
                      contextScope === "part"
                        ? "bg-slate-800 text-sky-300 font-semibold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {selectedPart.name.split(" ")[0]}
                  </button>
                )}
              </div>
            </div>

            {/* Live Fleet Counters (Tabular Numerals) */}
            <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums">
              <span className="text-rose-400 font-semibold">{aogCount} AOG</span>
              <span className="text-slate-600">·</span>
              <span className="text-amber-400 font-semibold">{watchCount} Watch</span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400 font-semibold">
                {fleetSnapshot.openCases.length} Open Cases
              </span>
            </div>
          </div>
        </div>

        {/* 3. Multi-Turn Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              {/* Metadata Header (Clean unboxed typography with · separators) */}
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 mb-1 px-1 flex-wrap">
                <span className="font-semibold text-slate-300">
                  {msg.role === "user"
                    ? `${session.name.split(" ")[0]} (${session.role})`
                    : "EngineIQ Copilot"}
                </span>
                <span>·</span>
                <span className="tabular-nums">{msg.timestamp}</span>
                {msg.role === "assistant" && msg.modelUsed && (
                  <>
                    <span>·</span>
                    <span className="text-emerald-400 font-semibold">
                      LIVE · {msg.provider?.toUpperCase()} · {msg.modelUsed}
                    </span>
                  </>
                )}
                {msg.role === "assistant" && msg.latencyMs !== undefined && (
                  <>
                    <span>·</span>
                    <span className="tabular-nums text-slate-400">{msg.latencyMs}ms</span>
                  </>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`w-full rounded-xl p-3.5 text-xs leading-relaxed border ${
                  msg.role === "user"
                    ? "max-w-[88%] bg-sky-600/20 border-sky-500/40 text-slate-100"
                    : msg.liveError
                    ? "bg-rose-950/30 border-rose-500/40 text-slate-200 space-y-3"
                    : "bg-slate-950/90 border-slate-800 text-slate-200 space-y-3"
                }`}
              >
                {msg.liveError ? (
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2 text-rose-300 font-semibold">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>Live AI Provider Request Failed (No Canned Data Substituted)</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {msg.errorMessage}
                    </p>
                    {msg.attemptErrors && msg.attemptErrors.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 font-mono text-[10px] text-slate-400 space-y-1">
                        <div className="text-slate-300 font-semibold">Cascade Attempts:</div>
                        {msg.attemptErrors.map((errLine, idx) => (
                          <div key={idx}>• {errLine}</div>
                        ))}
                      </div>
                    )}
                    <div className="p-2.5 rounded-lg bg-sky-950/40 border border-sky-500/30 text-[11px] text-sky-200 space-y-1">
                      <div className="font-semibold text-white">
                        How to Enable Free Live AI in 30 Seconds:
                      </div>
                      <div>
                        1. Open <strong>Settings &gt; Secrets</strong> in the AI Studio panel.
                      </div>
                      <div>
                        2. Add <code>GROQ_API_KEY</code> (free from{" "}
                        <a
                          href="https://console.groq.com/keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-sky-300 hover:text-white"
                        >
                          console.groq.com
                        </a>
                        ) or a free-tier <code>GEMINI_API_KEY</code> (from{" "}
                        <a
                          href="https://aistudio.google.com/apikey"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-sky-300 hover:text-white"
                        >
                          aistudio.google.com
                        </a>
                        ).
                      </div>
                    </div>
                    {msg.retryPrompt && (
                      <div className="pt-1 flex items-center gap-2">
                        <button
                          onClick={() => void handleSendMessage(msg.retryPrompt)}
                          disabled={isSending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-mono text-[11px] font-semibold transition cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Retry Live AI</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="whitespace-pre-line font-sans">
                    {renderFormattedContent(msg.content)}
                  </div>
                )}

                {/* Actionable 1-Click Navigation Deep Links */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="pt-2.5 border-t border-slate-800/80 space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-400 block">
                      Quick Actions & Deep Links:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestedActions.map((act, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleExecuteSuggestedAction(act)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 hover:text-white border border-sky-500/40 font-mono text-[11px] font-semibold transition cursor-pointer whitespace-nowrap"
                        >
                          {act.type === "open_flight" && <Plane className="w-3 h-3 text-sky-400" />}
                          {act.type === "open_engine" && <Cpu className="w-3 h-3 text-sky-400" />}
                          {act.type === "open_part" && <Wrench className="w-3 h-3 text-sky-400" />}
                          {act.type === "open_citation" && <FileText className="w-3 h-3 text-sky-400" />}
                          <span>{act.label}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grounded Regulatory / Web Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 block">
                      Grounded Regulatory & Technical Sources:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src, i) => (
                        <a
                          key={i}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-sky-300 text-[10px] font-mono transition"
                        >
                          <Globe className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate max-w-[210px]">{src.title}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs text-sky-300 font-mono">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                <span>
                  Querying Live AI ({preferredProvider.toUpperCase()} — Gemini Free Tier / Groq)...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 4. Quick Question Starters & Input Bar */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950 space-y-2.5 shrink-0">
          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
            {(
              [
                { id: "fleet", label: "Live Fleet & AOG" },
                { id: "amm", label: "AMM Repair & Limits" },
                { id: "rbac", label: "RBAC & Dispatch CRS" },
                { id: "regulatory", label: "FAA / EASA ADs" },
              ] as { id: PromptCategory; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPromptCategory(tab.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition whitespace-nowrap shrink-0 cursor-pointer ${
                  promptCategory === tab.id
                    ? "bg-slate-800 text-sky-300 font-semibold border border-slate-700"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Starter Prompt Buttons */}
          <div className="flex flex-col gap-1">
            {quickPromptsByCategory[promptCategory].map((qText, i) => (
              <button
                key={i}
                onClick={() => void handleSendMessage(qText)}
                disabled={isSending}
                className="text-left px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800/90 hover:border-sky-500/40 text-[11px] text-slate-300 hover:text-white transition flex items-center justify-between gap-2 cursor-pointer disabled:opacity-50"
              >
                <span className="truncate">{qText}</span>
                <ArrowRight className="w-3 h-3 text-sky-400 shrink-0" />
              </button>
            ))}
          </div>

          {/* Text Input Box */}
          <div className="flex items-center gap-2 pt-1">
            <input
              id="input-copilot-drawer-question"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSendMessage();
              }}
              placeholder="Ask any question (routed to live Gemini Free Tier / Groq)..."
              className="flex-1 bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition font-sans"
            />
            <button
              id="btn-send-copilot-question"
              onClick={() => void handleSendMessage()}
              disabled={isSending || !input.trim()}
              className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Ask</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
