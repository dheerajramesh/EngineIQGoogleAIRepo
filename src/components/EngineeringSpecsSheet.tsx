import React, { useState } from "react";
import { PartId } from "../types";
import { ENGINE_PARTS, PW1100G_MACRO_SPECIFICATIONS } from "../data/parts";
import { TechnicalCutaway } from "./TechnicalCutaway";
import {
  Ruler,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Maximize2,
  Minimize2,
  FileText,
  Cpu,
  Zap,
  Info,
  CheckCircle2,
  Crosshair,
  Image as ImageIcon,
} from "lucide-react";

interface EngineeringSpecsSheetProps {
  selectedPartId: PartId;
  onSelectPart: (partId: PartId) => void;
  onOpenCitation?: (docId: string) => void;
  onSwitchTo3D?: () => void;
}

export function EngineeringSpecsSheet({
  selectedPartId,
  onSelectPart,
  onOpenCitation,
  onSwitchTo3D,
}: EngineeringSpecsSheetProps) {
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [cutawayMode, setCutawayMode] = useState<"overlay" | "schematic">("overlay");
  const specs = PW1100G_MACRO_SPECIFICATIONS;
  const partsList = Object.values(ENGINE_PARTS);

  const cutawayImagePath = "/src/assets/images/pw1100g_gtf_cutaway_1791620123199.jpg";

  return (
    <div className="space-y-6 text-slate-200 animate-fade-in pb-12 max-w-7xl mx-auto">
      {/* 1. Header Card with OEM Baseline Verification */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center justify-center font-mono font-bold text-xs">
                PW
              </span>
              <div>
                <h2 className="text-base font-bold text-white font-mono tracking-wide">
                  {specs.modelName}
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  {specs.aircraftApplication} • Baseline Type Certificate {specs.typeCertificate}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-sky-950 text-sky-300 border border-sky-800 text-xs font-mono font-semibold">
              Arch: {specs.architecture}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-mono font-semibold">
              TCDS Verified
            </span>
            {onSwitchTo3D && (
              <button
                onClick={onSwitchTo3D}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono font-semibold transition shadow-md"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Return to 3D Assembly</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Macro Telemetry Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase block">Fan Tip Diameter</span>
            <span className="text-sm font-bold text-sky-400 tabular-nums">
              {specs.fanDiameterCm} cm
            </span>
            <span className="text-[10px] text-slate-500 block">({specs.fanDiameterInches} in)</span>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase block">Overall Length</span>
            <span className="text-sm font-bold text-slate-200 tabular-nums">
              {specs.overallLengthMeters} m
            </span>
            <span className="text-[10px] text-slate-500 block">({specs.overallLengthInches} in)</span>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase block">Dry Engine Weight</span>
            <span className="text-sm font-bold text-slate-200 tabular-nums">
              {specs.dryWeightKg.toLocaleString()} kg
            </span>
            <span className="text-[10px] text-slate-500 block">({specs.dryWeightLb.toLocaleString()} lb)</span>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase block">Bypass Ratio (BPR)</span>
            <span className="text-sm font-bold text-emerald-400 tabular-nums">
              {specs.bypassRatio}
            </span>
            <span className="text-[10px] text-slate-500 block">Ultra-high bypass</span>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase block">Pressure Ratio (OPR)</span>
            <span className="text-sm font-bold text-amber-400 tabular-nums">
              {specs.overallPressureRatio.split(" ")[0]}
            </span>
            <span className="text-[10px] text-slate-500 block">Overall core P30/P2</span>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase block">Gearbox Ratio</span>
            <span className="text-sm font-bold text-cyan-400 tabular-nums">
              3.06 : 1
            </span>
            <span className="text-[10px] text-slate-500 block">Planetary FDGS</span>
          </div>
        </div>
      </div>

      {/* 3. Authentic GTF Cutaway Blueprint Section */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                Geared Turbofan Structural Cutaway & Axial Stations
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Cross-section layout detailing 1-G-3-8-2-3 module stations and aerodynamic airflow splitting.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle: Technical Cutaway Overlay vs Photographic Schematic */}
            <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setCutawayMode("overlay")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
                  cutawayMode === "overlay"
                    ? "bg-sky-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Technical Cutaway</span>
              </button>
              <button
                onClick={() => setCutawayMode("schematic")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
                  cutawayMode === "schematic"
                    ? "bg-sky-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>OEM Illustration</span>
              </button>
            </div>

            {cutawayMode === "schematic" && (
              <button
                onClick={() => setIsImageExpanded(!isImageExpanded)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg transition font-mono"
              >
                {isImageExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{isImageExpanded ? "Collapse" : "Expand"}</span>
              </button>
            )}
          </div>
        </div>

        {/* View Mode Content: Technical Cutaway SVG Component vs OEM Illustration */}
        {cutawayMode === "overlay" ? (
          <TechnicalCutaway
            selectedPartId={selectedPartId}
            onSelectPart={onSelectPart}
            onSwitchTo3D={onSwitchTo3D}
          />
        ) : (
          /* OEM Illustration Container with Zero-Broken-Image Fallback */
          <div
            className={`relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 transition-all duration-300 ${
              isImageExpanded ? "max-h-[680px]" : "max-h-[380px]"
            }`}
          >
            <img
              src={cutawayImagePath}
              alt="Pratt & Whitney PW1100G-JM Geared Turbofan Technical Cutaway Illustration"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain mx-auto"
              onError={(e) => {
                // Graceful styled SVG fallback if image cannot be rendered
                (e.target as HTMLElement).style.display = "none";
                const fallback = document.getElementById("cutaway-fallback");
                if (fallback) fallback.style.display = "flex";
              }}
            />

            {/* Fallback container if image fails to load */}
            <div
              id="cutaway-fallback"
              style={{ display: "none" }}
              className="w-full h-64 flex flex-col items-center justify-center p-6 text-center space-y-2"
            >
              <Cpu className="w-10 h-10 text-sky-400 opacity-60" />
              <h4 className="text-sm font-mono font-bold text-slate-200">
                Pratt & Whitney PW1100G-JM Technical Cross-Section
              </h4>
              <p className="text-xs text-slate-400 max-w-md font-mono">
                Architecture 1-G-3-8-2-3 • Fan Diameter 205.7 cm (81 in) • Axial Length 3.401 m • Reduction Ratio 3.06:1
              </p>
            </div>

            {/* Quick-select module chip bar below image */}
            <div className="absolute bottom-2 inset-x-2 p-2 rounded-lg bg-slate-950/85 backdrop-blur-md border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="text-sky-400 font-bold">Station Guide:</span>
                <span>STA 100 Fan Case</span>
                <span>•</span>
                <span>STA 110 Blades</span>
                <span>•</span>
                <span>STA 160 FDGS</span>
                <span>•</span>
                <span>STA 245 HPC</span>
                <span>•</span>
                <span>STA 365 HPT</span>
              </div>
              <span className="text-[10px] text-slate-500">Click table below to locate 3D part</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Subsystem Dimensions & Certified Metallurgy Matrix */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                Subsystem Dimensional Specifications & Metallurgy (PW1100G-JM)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified metric dimensions (±1 to 2 cm aerospace tolerance), stage counts, and certified alloys.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase bg-slate-950/70">
                <th className="py-2.5 px-3">Subsystem & Station</th>
                <th className="py-2.5 px-2">Length</th>
                <th className="py-2.5 px-2">Diameter</th>
                <th className="py-2.5 px-2">Stages / Ratio</th>
                <th className="py-2.5 px-3">Certified Alloy & Coating</th>
                <th className="py-2.5 px-2">Dry Mass</th>
                <th className="py-2.5 px-2">Tolerance</th>
                <th className="py-2.5 px-3 text-right">3D Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {partsList.map((part) => {
                const dim = part.dimensions;
                const isSelected = selectedPartId === part.id;

                return (
                  <tr
                    key={part.id}
                    onClick={() => {
                      onSelectPart(part.id as PartId);
                    }}
                    className={`hover:bg-slate-800/40 transition cursor-pointer group ${
                      isSelected ? "bg-sky-950/40 border-l-2 border-sky-400" : ""
                    }`}
                  >
                    {/* Subsystem & Station */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                        <span>{part.name}</span>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 block">
                        {dim?.stationRange || "Core Spool"}
                      </span>
                    </td>

                    {/* Axial Length */}
                    <td className="py-3 px-2 font-mono text-slate-200 tabular-nums">
                      {dim ? `${dim.axialLengthCm} cm` : "—"}
                    </td>

                    {/* Outer Diameter */}
                    <td className="py-3 px-2 font-mono text-sky-400 font-bold tabular-nums">
                      {dim ? `Ø ${dim.outerDiameterCm} cm` : "—"}
                    </td>

                    {/* Stage Count / Gear Ratio */}
                    <td className="py-3 px-2 font-mono text-slate-300">
                      {dim?.gearRatio
                        ? dim.gearRatio
                        : dim?.stageCount && dim.stageCount > 0
                        ? `${dim.stageCount} stage${dim.stageCount > 1 ? "s" : ""}`
                        : "Housing"}
                    </td>

                    {/* Certified Alloy & Coating */}
                    <td className="py-3 px-3">
                      <div className="font-mono text-[11px] text-slate-200 leading-tight">
                        {dim?.primaryAlloy || part.madeOf.slice(0, 35)}
                      </div>
                      {dim?.coatingSpec && (
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {dim.coatingSpec}
                        </div>
                      )}
                    </td>

                    {/* Dry Mass */}
                    <td className="py-3 px-2 font-mono text-slate-300 tabular-nums">
                      {dim?.weightKg ? `${dim.weightKg} kg` : "—"}
                    </td>

                    {/* Tolerance Band */}
                    <td className="py-3 px-2 font-mono text-slate-400 text-[10px]">
                      {dim?.tolerancesMm || "±0.05 mm"}
                    </td>

                    {/* 3D Action Button */}
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPart(part.id as PartId);
                          if (onSwitchTo3D) onSwitchTo3D();
                        }}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-sky-950/80 hover:bg-sky-900 border border-sky-700/50 text-sky-300 hover:text-white font-mono group-hover:border-sky-500 transition"
                      >
                        <span>Focus 3D</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
