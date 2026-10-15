import React from "react";
import { DocSnippet } from "../types";
import { X, BookOpen, ExternalLink, ShieldCheck } from "lucide-react";

interface CitationModalProps {
  doc: DocSnippet | null;
  onClose: () => void;
}

export function CitationModal({ doc, onClose }: CitationModalProps) {
  if (!doc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <BookOpen className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-sky-400 tracking-wider bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/60">
                  {doc.id}
                </span>
                <span className="text-[10px] text-amber-400 uppercase font-mono tracking-wider bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-800/40">
                  Fictional Demo Document
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-100 mt-0.5">{doc.title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
            <div>
              <span className="text-slate-500 font-mono">Reference Section: </span>
              <span className="font-mono font-medium text-slate-200">{doc.section}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                Type: {doc.category}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/70 p-4 rounded-lg border border-slate-800 text-sm leading-relaxed text-slate-200 font-sans">
            {doc.text}
          </div>

          {doc.tags && doc.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-mono text-slate-500">Indexed Tags:</span>
              {doc.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800/70 text-slate-400 border border-slate-700/60"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Document cited by deterministic rules engine and verified against approved manual index.</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-5 py-3 bg-slate-950/80 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
