/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { searchGroundedIntel, GroundedSource } from "../services/gemini";
import {
  Globe,
  Search,
  ExternalLink,
  Sparkles,
  X,
  RefreshCw,
  ShieldAlert,
  Bot,
  FileText,
  Cpu,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  Zap,
} from "lucide-react";

interface SearchGroundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  onNavigateToIncident?: () => void;
  onNavigateToComponent?: () => void;
}

export function SearchGroundingModal({
  isOpen,
  onClose,
  initialQuery = "",
  onNavigateToIncident,
  onNavigateToComponent,
}: SearchGroundingModalProps) {
  const [activeTab, setActiveTab] = useState<"search" | "overview">("search");
  const [query, setQuery] = useState(
    initialQuery ||
      "Latest FAA and EASA Airworthiness Directives on Pratt Whitney PW1100G powder metal HPC disks inspection intervals"
  );
  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState<string>("");
  const [sources, setSources] = useState<GroundedSource[]>([]);
  const [searchQueries, setSearchQueries] = useState<string[]>([]);
  const [isOfflineSample, setIsOfflineSample] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initial query when opened
  useEffect(() => {
    if (initialQuery && isOpen) {
      setQuery(initialQuery);
      // Auto-trigger search if query provided
      handleSearch(initialQuery);
    }
  }, [initialQuery, isOpen]);

  if (!isOpen) return null;

  async function handleSearch(searchQuery?: string) {
    const q = searchQuery !== undefined ? searchQuery : query;
    if (!q.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await searchGroundedIntel(q.trim(), {
        aircraftFleet: "IndiGo Airbus A320neo / A321neo",
        engineType: "Pratt & Whitney GTF PW1100G-JM",
        hubBases: ["DEL", "BOM", "BLR"],
      });

      if (response.liveError) {
        setResultText("");
        setSources([]);
        setSearchQueries([]);
        setIsOfflineSample(false);
        setError(
          response.errorMessage ||
            "All live AI providers failed. Configure a free GROQ_API_KEY or GEMINI_API_KEY in Settings > Secrets."
        );
      } else {
        setResultText(response.text);
        setSources(response.sources);
        setSearchQueries(response.searchQueries || []);
        setIsOfflineSample(response.isOfflineSample);
      }
    } catch (err: any) {
      console.error("Search Grounding query failed:", err);
      setError(err.message || "Failed to query search-grounded intelligence.");
    } finally {
      setLoading(false);
    }
  }

  const sampleQueries = [
    "Pratt & Whitney PW1100G powder metal HPC disk FAA AD 2024",
    "EASA Emergency AD PW1100G A320neo high pressure turbine inspection",
    "PW1100G Combustor liner thermal distress AMM limits and borescope intervals",
    "DGCA India Pratt & Whitney GTF engine grounding directives 2024",
    "Pratt & Whitney Service Bulletin PW1100G-JM-72 oil filter bypass warnings",
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-hub-title"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 text-white shrink-0">
              <Sparkles className="w-5 h-5 text-sky-100 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="ai-hub-title" className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>EngineIQ AI & Intelligence Center</span>
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1">
                  <Bot className="w-3 h-3" />
                  Gemini 3.8 Flash
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  Google Search Grounded
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-sans">
                Real-time FAA/EASA airworthiness directives, natural language extraction & aerospace propulsion copilot
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-4 sm:px-6 pt-3 border-b border-slate-800 bg-slate-950/50 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab("search")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-bold border-b-2 transition ${
              activeTab === "search"
                ? "border-sky-400 text-sky-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Live AD & OEM Search Grounding</span>
          </button>

          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-bold border-b-2 transition ${
              activeTab === "overview"
                ? "border-sky-400 text-sky-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>All Integrated AI Features (5)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 font-sans">
          {activeTab === "search" ? (
            <>
              {/* Search Bar */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase text-slate-400 tracking-wider font-semibold block">
                  Search Query (FAA / EASA / DGCA / Pratt & Whitney Bulletins):
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSearch();
                      }}
                      placeholder="e.g. Pratt & Whitney PW1100G powder metal HPC disk inspection intervals"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none transition"
                    />
                  </div>
                  <button
                    onClick={() => handleSearch()}
                    disabled={loading || !query.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-mono font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Grounding...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>Query Search</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Quick Prompts */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] font-mono text-slate-500">Quick queries:</span>
                  {sampleQueries.map((sq, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setQuery(sq);
                        handleSearch(sq);
                      }}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-sky-300 hover:text-white border border-slate-700/60 transition cursor-pointer"
                    >
                      {sq.split(" ").slice(0, 5).join(" ")}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Status and Error */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Offline sample notice */}
              {isOfflineSample && (
                <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>Using authoritative pre-cached aerospace ground-truth sample (offline mode).</span>
                  </div>
                </div>
              )}

              {/* Search Engine Queries Executed */}
              {searchQueries.length > 0 && (
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px] mb-1">
                    <Globe className="w-3.5 h-3.5 text-sky-400" />
                    <span>Google Search Grounding Queries Executed by Gemini:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {searchQueries.map((sq, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-800/60 font-mono text-[10px]"
                      >
                        &quot;{sq}&quot;
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Result Text Area */}
              {resultText ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-xs font-mono font-bold text-sky-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Grounded Airworthiness Intelligence
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Model: gemini-3.8-flash (with googleSearch)
                    </span>
                  </div>
                  <div className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line">
                    {resultText}
                  </div>
                </div>
              ) : (
                !loading && (
                  <div className="p-8 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-2">
                    <Globe className="w-8 h-8 text-sky-500/50 mx-auto" />
                    <p className="text-xs text-slate-300 font-mono">
                      Query live regulatory databases & OEM service bulletins
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                      Gemini 3.8 Flash uses live Google Search Grounding to cross-reference FAA Airworthiness Directives, EASA safety bulletins, and Pratt & Whitney GTF advisories.
                    </p>
                    <button
                      onClick={() => handleSearch()}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 text-white text-xs font-mono font-semibold hover:bg-sky-400 transition"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Run Initial Airworthiness Search</span>
                    </button>
                  </div>
                )
              )}

              {/* Grounded Sources Cards */}
              {sources.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold block">
                    Grounded Regulatory & Technical Sources ({sources.length}):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {sources.map((src, i) => (
                      <a
                        key={i}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500/50 transition flex flex-col justify-between group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-semibold text-sky-300 group-hover:text-white transition line-clamp-2">
                            {src.title || "Regulatory Reference Document"}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 shrink-0 mt-0.5" />
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 truncate mt-2 group-hover:text-slate-400">
                          {src.url.replace(/^https?:\/\//, "")}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Overview of all 5 AI Integrations */
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-200">
                <p className="font-semibold mb-1">
                  Where AI (Gemini 3.8 Flash) is Integrated in EngineIQ:
                </p>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  EngineIQ pairs strict, deterministic safety limits engines with Gemini 3.8 Flash for intelligent aerospace workflows. AI never overrides airworthiness safety thresholds; it acts as a decision-support, explanation, extraction, and real-time research partner for certifying engineers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Integration 1: Google Search Grounding */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 hover:border-sky-500/50 transition">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">1. Live Search Grounding</h4>
                      <span className="text-[10px] font-mono text-sky-400">gemini-3.8-flash + googleSearch</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Live queries to FAA, EASA, DGCA, and OEM databases for airworthiness directives, powdered-metal recalls, and service bulletins.
                  </p>
                  <button
                    onClick={() => setActiveTab("search")}
                    className="text-xs font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold pt-1"
                  >
                    <span>Use Search Tool</span> &rarr;
                  </button>
                </div>

                {/* Integration 2: Natural Language Extraction */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 hover:border-sky-500/50 transition">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">2. Incident NLP Extraction</h4>
                      <span className="text-[10px] font-mono text-amber-400">/api/gemini/extract</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Converts unstructured pilot logbook notes, audio transcripts, or mechanic remarks into structured engine parameters (EGT, vibration, chip detection).
                  </p>
                  {onNavigateToIncident && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateToIncident();
                      }}
                      className="text-xs font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold pt-1"
                    >
                      <span>Open Incident Intake</span> &rarr;
                    </button>
                  )}
                </div>

                {/* Integration 3: Explainer & Tech-Log Generator */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 hover:border-sky-500/50 transition">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">3. AMM Decision Explainer</h4>
                      <span className="text-[10px] font-mono text-emerald-400">/api/gemini/explain</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Provides plain-language synthesis, next-step inspection intervals, and draft aircraft tech-log entries citing exact AMM/FCOM/MEL manuals.
                  </p>
                  {onNavigateToIncident && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateToIncident();
                      }}
                      className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold pt-1"
                    >
                      <span>View in Incident Evaluator</span> &rarr;
                    </button>
                  )}
                </div>

                {/* Integration 4: 3D Part Technical Copilot */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 hover:border-sky-500/50 transition">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">4. 3D Subsystem Copilot</h4>
                      <span className="text-[10px] font-mono text-indigo-400">/api/gemini/part-ask</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Contextual Q&A on any 3D engine component (fan blades, HPC rotors, combustors, turbine disks) grounded in manual specifications.
                  </p>
                  {onNavigateToComponent && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateToComponent();
                      }}
                      className="text-xs font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold pt-1"
                    >
                      <span>Open 3D Engine Copilot</span> &rarr;
                    </button>
                  )}
                </div>

                {/* Integration 5: Maintenance Training & Feedback */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 hover:border-sky-500/50 transition md:col-span-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">5. Training Evaluation & Feedback</h4>
                      <span className="text-[10px] font-mono text-purple-400">/api/gemini/training-feedback</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Acts as an aerospace maintenance instructor evaluating junior engineers on incident assessment scenarios, providing rigorous OEM-cited feedback.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs font-mono text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[11px]">
              AI Decision Support Only • Certifying engineer sign-off strictly required
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
