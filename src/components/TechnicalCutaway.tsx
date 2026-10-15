import React, { useState } from "react";
import { PartId } from "../types";
import { ENGINE_PARTS } from "../data/parts";
import { Crosshair, Eye, Info, CheckCircle2, ChevronRight, Sparkles } from "lucide-react";

interface TechnicalCutawayProps {
  selectedPartId: PartId;
  onSelectPart: (partId: PartId) => void;
  onSwitchTo3D?: () => void;
}

interface ComponentOverlayConfig {
  id: PartId;
  name: string;
  tag: string;
  station: string;
  axialPos: string; // e.g. "STA 110 - 156"
  radialSpan: string; // e.g. "R: 24cm -> 103cm"
  metricDim: string; // e.g. "L: 46cm, Ø: 205.7cm"
  alloy: string;
  color: string;
  accentHex: string;
  // SVG bounding box coordinates on viewBox 0 0 1000 440
  // Engine axis is at y = 220
  x: number;
  y: number;
  width: number;
  height: number;
  calloutX: number;
  calloutY: number;
  calloutSide: "top" | "bottom";
  pinX: number;
  pinY: number;
}

const CUTAWAY_COMPONENTS: ComponentOverlayConfig[] = [
  {
    id: "fan_case",
    name: "Fan Containment Case & Cowl",
    tag: "NACELLE / CASING",
    station: "STA 100 - 228",
    axialPos: "Axial: 0 - 128 cm",
    radialSpan: "Radius: 102.8 - 111.0 cm",
    metricDim: "L: 128 cm • Ø: 222.0 cm",
    alloy: "Kevlar Aramid / Al-Li 2195",
    color: "sky",
    accentHex: "#38bdf8",
    x: 35,
    y: 22,
    width: 255,
    height: 38,
    calloutX: 120,
    calloutY: 15,
    calloutSide: "top",
    pinX: 130,
    pinY: 42,
  },
  {
    id: "fan_blades",
    name: "Wide-Chord Fan Rotor (81 in)",
    tag: "BYPASS PROPULSOR",
    station: "STA 110 - 156",
    axialPos: "Axial: 12 - 58 cm",
    radialSpan: "Radius: 24.0 - 102.8 cm",
    metricDim: "L: 46 cm • Ø: 205.7 cm",
    alloy: "Ti-6Al-4V Grade 5 Hollow Diffusion",
    color: "cyan",
    accentHex: "#06b6d4",
    x: 65,
    y: 60,
    width: 72,
    height: 320,
    calloutX: 75,
    calloutY: 420,
    calloutSide: "bottom",
    pinX: 95,
    pinY: 340,
  },
  {
    id: "fan_drive_gear",
    name: "Fan Drive Gearbox (FDGS 3.06:1)",
    tag: "PLANETARY EPICYCLIC",
    station: "STA 160 - 198",
    axialPos: "Axial: 58 - 96 cm",
    radialSpan: "Radius: 11.0 - 26.0 cm",
    metricDim: "L: 38 cm • Ø: 52.0 cm",
    alloy: "Carburized AMS 6265 / Pyrowear 53",
    color: "indigo",
    accentHex: "#818cf8",
    x: 145,
    y: 180,
    width: 60,
    height: 80,
    calloutX: 175,
    calloutY: 420,
    calloutSide: "bottom",
    pinX: 175,
    pinY: 260,
  },
  {
    id: "oil_system",
    name: "Auxiliary Lubrication & ACOC",
    tag: "LUBE & HEAT EXCHANGER",
    station: "STA 140 - 320",
    axialPos: "Axial: 40 - 220 cm",
    radialSpan: "Radius: 95.0 - 110.0 cm",
    metricDim: "L: 180 cm • Multi-Unit System",
    alloy: "MIL-PRF-23699 / 321 SS / 6061-T6",
    color: "emerald",
    accentHex: "#34d399",
    x: 180,
    y: 405,
    width: 220,
    height: 30,
    calloutX: 300,
    calloutY: 422,
    calloutSide: "bottom",
    pinX: 290,
    pinY: 410,
  },
  {
    id: "lpc",
    name: "Low-Pressure Compressor (Booster)",
    tag: "3-STAGE CORE BOOSTER",
    station: "STA 200 - 242",
    axialPos: "Axial: 96 - 138 cm",
    radialSpan: "Radius: 19.0 - 31.0 cm",
    metricDim: "L: 42 cm • Ø: 62.0 cm",
    alloy: "Ti-6Al-4V Integral Blisks",
    color: "blue",
    accentHex: "#60a5fa",
    x: 212,
    y: 172,
    width: 58,
    height: 96,
    calloutX: 240,
    calloutY: 15,
    calloutSide: "top",
    pinX: 240,
    pinY: 172,
  },
  {
    id: "hpc",
    name: "High-Pressure Compressor (HPC)",
    tag: "8-STAGE CORE COMPRESSOR",
    station: "STA 245 - 323",
    axialPos: "Axial: 140 - 218 cm",
    radialSpan: "Radius: 16.0 - 27.0 cm",
    metricDim: "L: 78 cm • Ø: 54.0 cm",
    alloy: "Ti-6Al-4V (1-4) & Inconel 718 (5-8)",
    color: "amber",
    accentHex: "#f59e0b",
    x: 278,
    y: 176,
    width: 140,
    height: 88,
    calloutX: 348,
    calloutY: 15,
    calloutSide: "top",
    pinX: 348,
    pinY: 176,
  },
  {
    id: "combustor",
    name: "TALON X™ Annular Combustor",
    tag: "DIFFUSION & REVERSE FLOW",
    station: "STA 325 - 361",
    axialPos: "Axial: 220 - 256 cm",
    radialSpan: "Radius: 28.0 - 44.0 cm",
    metricDim: "L: 36 cm • Ø: 88.0 cm",
    alloy: "Haynes 230 / YSZ Thermal Coating",
    color: "orange",
    accentHex: "#fb923c",
    x: 426,
    y: 160,
    width: 82,
    height: 120,
    calloutX: 466,
    calloutY: 15,
    calloutSide: "top",
    pinX: 466,
    pinY: 160,
  },
  {
    id: "hpt",
    name: "High-Pressure Turbine (HPT)",
    tag: "2-STAGE AIR-COOLED HPT",
    station: "STA 365 - 399",
    axialPos: "Axial: 258 - 292 cm",
    radialSpan: "Radius: 18.0 - 36.0 cm",
    metricDim: "L: 34 cm • Ø: 72.0 cm",
    alloy: "Single-Crystal PWA 1484 / 7YSZ",
    color: "rose",
    accentHex: "#f43f5e",
    x: 516,
    y: 164,
    width: 68,
    height: 112,
    calloutX: 550,
    calloutY: 420,
    calloutSide: "bottom",
    pinX: 550,
    pinY: 276,
  },
  {
    id: "lpt",
    name: "Low-Pressure Turbine (LPT)",
    tag: "3-STAGE HIGH-SPEED LPT",
    station: "STA 405 - 473",
    axialPos: "Axial: 294 - 362 cm",
    radialSpan: "Radius: 21.0 - 43.0 cm",
    metricDim: "L: 68 cm • Ø: 86.0 cm",
    alloy: "Inconel 713C & Udimet 720",
    color: "violet",
    accentHex: "#a78bfa",
    x: 592,
    y: 160,
    width: 125,
    height: 120,
    calloutX: 654,
    calloutY: 15,
    calloutSide: "top",
    pinX: 654,
    pinY: 160,
  },
  {
    id: "exhaust",
    name: "Core Exhaust Mixer & Plug",
    tag: "MIXER & TAIL CONE PLUG",
    station: "STA 475 - 561",
    axialPos: "Axial: 364 - 450 cm",
    radialSpan: "Radius: 0.0 - 47.0 cm",
    metricDim: "L: 86 cm • Ø: 94.0 cm",
    alloy: "Inconel 625 & Titanium Ti-6242",
    color: "slate",
    accentHex: "#94a3b8",
    x: 725,
    y: 172,
    width: 195,
    height: 96,
    calloutX: 820,
    calloutY: 15,
    calloutSide: "top",
    pinX: 820,
    pinY: 172,
  },
];

export function TechnicalCutaway({
  selectedPartId,
  onSelectPart,
  onSwitchTo3D,
}: TechnicalCutawayProps) {
  const [hoveredPartId, setHoveredPartId] = useState<PartId | null>(null);
  const [showAirflowStreams, setShowAirflowStreams] = useState(true);
  const [showStationGrid, setShowStationGrid] = useState(true);

  const activePartId = hoveredPartId || selectedPartId;
  const activePart = ENGINE_PARTS[activePartId];
  const activeOverlay = CUTAWAY_COMPONENTS.find((c) => c.id === activePartId);

  return (
    <div className="space-y-4">
      {/* 1. Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-white font-bold tracking-wide">
            PW1100G-JM 1-G-3-8-2-3 ARCHITECTURE CUTAWAY
          </span>
          <span className="text-[10px] text-slate-500 hidden sm:inline">
            (Scale: 1:1 Relative to Centerline Axis • ±1-2 cm Tolerance)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAirflowStreams(!showAirflowStreams)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] transition ${
              showAirflowStreams
                ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
            }`}
          >
            Airflow Streams: {showAirflowStreams ? "ON" : "OFF"}
          </button>

          <button
            onClick={() => setShowStationGrid(!showStationGrid)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] transition ${
              showStationGrid
                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
            }`}
          >
            Station Grid: {showStationGrid ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* 2. Interactive SVG Cutaway Diagram */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-[#060a12] shadow-2xl">
        <svg
          viewBox="0 0 1000 440"
          className="w-full h-auto select-none"
          style={{ maxHeight: "560px", minHeight: "360px" }}
        >
          <defs>
            {/* Background Grid Pattern */}
            <pattern id="eng-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.5" />
            </pattern>

            {/* Linear Gradients for Jet Engines */}
            <linearGradient id="coreFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.2" />
              <stop offset="25%" stopColor="#60a5fa" stopOpacity="0.25" />
              <stop offset="45%" stopColor="#f59e0b" stopOpacity="0.3" />
              <stop offset="55%" stopColor="#ef4444" stopOpacity="0.45" />
              <stop offset="75%" stopColor="#f97316" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.15" />
            </linearGradient>

            <linearGradient id="bypassFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
              <stop offset="60%" stopColor="#0284c7" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.1" />
            </linearGradient>

            {/* Nacelle Shading */}
            <linearGradient id="cowlGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Component Active Glow Filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid Background */}
          <rect width="1000" height="440" fill="#060a12" />
          <rect width="1000" height="440" fill="url(#eng-grid)" />

          {/* Aerodynamic Airflow Layer */}
          {showAirflowStreams && (
            <g className="transition-opacity duration-300">
              {/* Upper Bypass Duct Stream */}
              <path
                d="M 20 60 Q 150 50 320 60 L 320 120 Q 150 120 135 150 Z"
                fill="url(#bypassFlowGrad)"
              />
              {/* Lower Bypass Duct Stream */}
              <path
                d="M 20 380 Q 150 390 320 380 L 320 320 Q 150 320 135 290 Z"
                fill="url(#bypassFlowGrad)"
              />
              {/* Core Stream Envelope */}
              <path
                d="M 135 150 Q 240 160 430 155 Q 600 155 740 170 L 920 180 L 920 260 L 740 270 Q 600 285 430 285 Q 240 280 135 290 Z"
                fill="url(#coreFlowGrad)"
              />
              {/* Streamline arrows */}
              <g stroke="#38bdf8" strokeWidth="1" strokeDasharray="6 4" opacity="0.6">
                <path d="M 10 90 L 320 90" />
                <path d="M 10 350 L 320 350" />
                <path d="M 140 200 Q 300 200 450 190 Q 600 190 850 200" stroke="#f59e0b" />
                <path d="M 140 240 Q 300 240 450 250 Q 600 250 850 240" stroke="#f59e0b" />
              </g>
            </g>
          )}

          {/* Nacelle Outer Cowling (Top and Bottom) */}
          <g>
            {/* Top Cowling */}
            <path
              d="M 25 25 Q 160 12 320 20 L 320 55 Q 160 48 45 60 Z"
              fill="url(#cowlGrad)"
              stroke="#475569"
              strokeWidth="1.5"
            />
            {/* Bottom Cowling */}
            <path
              d="M 25 415 Q 160 428 320 420 L 320 385 Q 160 392 45 380 Z"
              fill="url(#cowlGrad)"
              stroke="#475569"
              strokeWidth="1.5"
            />
            {/* Fan Exit Guide Vanes (FEGV) Struts */}
            <g stroke="#64748b" strokeWidth="2.5" opacity="0.8">
              <line x1="280" y1="55" x2="275" y2="155" />
              <line x1="295" y1="55" x2="290" y2="155" />
              <line x1="280" y1="385" x2="275" y2="285" />
              <line x1="295" y1="385" x2="290" y2="285" />
            </g>
          </g>

          {/* Engine Centerline Axis (CL) */}
          <g>
            <line
              x1="10"
              y1="220"
              x2="980"
              y2="220"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="14 4 3 4"
              opacity="0.8"
            />
            <text
              x="20"
              y="214"
              fill="#38bdf8"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
            >
              ENGINE ROTATIONAL AXIS ℄ (3.401 m TOTAL LENGTH)
            </text>
            <text
              x="920"
              y="214"
              fill="#38bdf8"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="end"
            >
              AFT EXHAUST →
            </text>
          </g>

          {/* Station Markings Grid */}
          {showStationGrid && (
            <g opacity="0.6">
              {[
                { sta: "STA 100", x: 35 },
                { sta: "STA 110", x: 75 },
                { sta: "STA 160", x: 145 },
                { sta: "STA 200", x: 212 },
                { sta: "STA 245", x: 278 },
                { sta: "STA 325", x: 426 },
                { sta: "STA 365", x: 516 },
                { sta: "STA 405", x: 592 },
                { sta: "STA 475", x: 725 },
                { sta: "STA 561", x: 920 },
              ].map((s) => (
                <g key={s.sta}>
                  <line
                    x1={s.x}
                    y1="40"
                    x2={s.x}
                    y2="400"
                    stroke="#334155"
                    strokeWidth="0.8"
                    strokeDasharray="2 3"
                  />
                  <text
                    x={s.x + 3}
                    y="398"
                    fill="#64748b"
                    fontSize="8"
                    fontFamily="monospace"
                  >
                    {s.sta}
                  </text>
                </g>
              ))}
            </g>
          )}

          {/* Dual Spool Shaft Lines (LP Inner High-Speed & HP Outer Coaxial) */}
          <g>
            {/* LP Spool Shaft (Runs all the way from LPT forward to FDGS Sun Gear) */}
            <rect
              x="180"
              y="216"
              width="520"
              height="8"
              fill="#475569"
              stroke="#06b6d4"
              strokeWidth="0.8"
              rx="2"
            />
            {/* HP Spool Shaft (Surrounds LP shaft, connecting HPC and HPT) */}
            <rect
              x="300"
              y="210"
              width="250"
              height="20"
              fill="#334155"
              stroke="#f59e0b"
              strokeWidth="1"
              rx="3"
              fillOpacity="0.7"
            />
          </g>

          {/* 10 Core Subsystems Visual & Interactive Slices */}
          {CUTAWAY_COMPONENTS.map((comp) => {
            const isSelected = selectedPartId === comp.id;
            const isHovered = hoveredPartId === comp.id;
            const isHighlight = isSelected || isHovered;

            return (
              <g
                key={comp.id}
                className="cursor-pointer transition-all duration-200"
                onClick={() => onSelectPart(comp.id)}
                onMouseEnter={() => setHoveredPartId(comp.id)}
                onMouseLeave={() => setHoveredPartId(null)}
              >
                {/* Visual Subsystem Envelope Geometry */}
                {comp.id === "fan_blades" && (
                  <g>
                    {/* Upper Blade Blisk */}
                    <path
                      d="M 68 62 C 85 80, 110 120, 105 180 L 85 180 C 75 130, 60 90, 68 62 Z"
                      fill={isHighlight ? comp.accentHex : "#0284c7"}
                      fillOpacity={isHighlight ? 0.9 : 0.65}
                      stroke={comp.accentHex}
                      strokeWidth={isHighlight ? 2.5 : 1}
                      filter={isHighlight ? "url(#glow)" : undefined}
                    />
                    {/* Lower Blade Blisk */}
                    <path
                      d="M 68 378 C 85 360, 110 320, 105 260 L 85 260 C 75 310, 60 350, 68 378 Z"
                      fill={isHighlight ? comp.accentHex : "#0284c7"}
                      fillOpacity={isHighlight ? 0.9 : 0.65}
                      stroke={comp.accentHex}
                      strokeWidth={isHighlight ? 2.5 : 1}
                      filter={isHighlight ? "url(#glow)" : undefined}
                    />
                    {/* Spinner Cone */}
                    <polygon
                      points="28,220 70,185 70,255"
                      fill="#e2e8f0"
                      stroke="#94a3b8"
                      strokeWidth="1"
                    />
                  </g>
                )}

                {comp.id === "fan_case" && (
                  <g>
                    {/* Upper Barrel */}
                    <rect
                      x="35"
                      y="20"
                      width="265"
                      height="36"
                      rx="4"
                      fill={isHighlight ? comp.accentHex : "#0369a1"}
                      fillOpacity={isHighlight ? 0.6 : 0.25}
                      stroke={comp.accentHex}
                      strokeWidth={isHighlight ? 2 : 1}
                      strokeDasharray={isHighlight ? "none" : "4 2"}
                    />
                    {/* Lower Barrel */}
                    <rect
                      x="35"
                      y="384"
                      width="265"
                      height="36"
                      rx="4"
                      fill={isHighlight ? comp.accentHex : "#0369a1"}
                      fillOpacity={isHighlight ? 0.6 : 0.25}
                      stroke={comp.accentHex}
                      strokeWidth={isHighlight ? 2 : 1}
                      strokeDasharray={isHighlight ? "none" : "4 2"}
                    />
                  </g>
                )}

                {comp.id === "fan_drive_gear" && (
                  <g>
                    {/* Planetary Star Carrier Housing */}
                    <rect
                      x="145"
                      y="180"
                      width="60"
                      height="80"
                      rx="6"
                      fill={isHighlight ? comp.accentHex : "#4338ca"}
                      fillOpacity={isHighlight ? 0.85 : 0.6}
                      stroke={comp.accentHex}
                      strokeWidth={isHighlight ? 2.5 : 1.2}
                      filter={isHighlight ? "url(#glow)" : undefined}
                    />
                    {/* Gear Teeth / Carrier Visuals */}
                    <circle cx="175" cy="200" r="10" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1" />
                    <circle cx="175" cy="240" r="10" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1" />
                    <circle cx="175" cy="220" r="6" fill="#c7d2fe" />
                  </g>
                )}

                {comp.id === "lpc" && (
                  <g>
                    {/* 3 Booster Stages Top */}
                    <path
                      d="M 212 172 L 270 176 L 268 206 L 212 206 Z"
                      fill={isHighlight ? comp.accentHex : "#2563eb"}
                      fillOpacity={isHighlight ? 0.85 : 0.55}
                      stroke={comp.accentHex}
                      strokeWidth={isHighlight ? 2 : 1}
                    />
                    {/* 3 Booster Stages Bottom */}
                    <path
                      d="M 212 268 L 270 264 L 268 234 L 212 234 Z"
                      fill={isHighlight ? comp.accentHex : "#2563eb"}
                      fillOpacity={isHighlight ? 0.85 : 0.55}
                      stroke={comp.accentHex}
                      strokeWidth={isHighlight ? 2 : 1}
                    />
                  </g>
                )}

                {comp.id === "hpc" && (
                  <g>
                    {/* 8 HPC Stages Top */}
                    <path
                      d="M 278 174 L 418 184 L 416 206 L 278 206 Z"
                      fill={isHighlight ? comp.accentHex : "#d97706"}
                      fillOpacity={isHighlight ? 0.85 : 0.6}
                      stroke={comp.accentHex}
                      strokeWidth={isHighlight ? 2.5 : 1}
                    />
                    {/* 8 HPC Stages Bottom */}
                    <path
                      d="M 278 266 L 418 256 L 416 234 L 278 234 Z"
                      fill={isHighlight ? comp.accentHex : "#d97706"}
                      fillOpacity={isHighlight ? 0.85 : 0.6}
                      stroke={comp.accentHex}
                      strokeWidth={isHighlight ? 2.5 : 1}
                    />
                    {/* Stage Divider Ridges */}
                    {[295, 315, 335, 355, 375, 395].map((sx) => (
                      <line
                        key={sx}
                        x1={sx}
                        y1="176"
                        x2={sx}
                        y2="264"
                        stroke="#78350f"
                        strokeWidth="1"
                        opacity="0.5"
                      />
                    ))}
                  </g>
                )}

                {comp.id === "combustor" && (
                  <g>
                    {/* Annular Chamber Upper */}
                    <path
                      d="M 426 160 C 450 156, 490 160, 508 175 L 500 196 C 480 185, 450 185, 428 190 Z"
                      fill={isHighlight ? comp.accentHex : "#ea580c"}
                      fillOpacity={isHighlight ? 0.9 : 0.6}
                      stroke={comp.accentHex}
                      strokeWidth={isHighlight ? 2.5 : 1}
                    />
                    {/* Annular Chamber Lower */}
                    <path
                      d="M 426 280 C 450 284, 490 280, 508 265 L 500 244 C 480 255, 450 255, 428 250 Z"
                      fill={isHighlight ? comp.accentHex : "#ea580c"}
                      fillOpacity={isHighlight ? 0.9 : 0.6}
                      stroke={comp.accentHex}
                      strokeWidth={isHighlight ? 2.5 : 1}
                    />
                    {/* Fuel Nozzle Dots */}
                    <circle cx="434" cy="174" r="4" fill="#fef08a" stroke="#ca8a04" />
                    <circle cx="434" cy="266" r="4" fill="#fef08a" stroke="#ca8a04" />
                  </g>
                )}

                {comp.id === "hpt" && (
                  <g>
                    {/* 2-Stage HPT Upper Blades */}
                    <path
                      d="M 516 165 L 576 168 L 572 206 L 518 206 Z"
                      fill={isHighlight ? comp.accentHex : "#e11d48"}
                      fillOpacity={isHighlight ? 0.9 : 0.65}
                      stroke={comp.accentHex}
                      strokeWidth={isHighlight ? 2.5 : 1.2}
                      filter={isHighlight ? "url(#glow)" : undefined}
                    />
                    {/* 2-Stage HPT Lower Blades */}
                    <path
                      d="M 516 275 L 576 272 L 572 234 L 518 234 Z"
                      fill={isHighlight ? comp.accentHex : "#e11d48"}
                      fillOpacity={isHighlight ? 0.9 : 0.65}
                      stroke={comp.accentHex}
                      strokeWidth={isHighlight ? 2.5 : 1.2}
                      filter={isHighlight ? "url(#glow)" : undefined}
                    />
                  </g>
                )}

                {comp.id === "lpt" && (
                  <g>
                    {/* 3-Stage LPT Upper Blades */}
                    <path
                      d="M 592 162 L 712 170 L 708 206 L 594 206 Z"
                      fill={isHighlight ? comp.accentHex : "#7c3aed"}
                      fillOpacity={isHighlight ? 0.85 : 0.55}
                      stroke={comp.accentHex}
                      strokeWidth={isHighlight ? 2.5 : 1}
                    />
                    {/* 3-Stage LPT Lower Blades */}
                    <path
                      d="M 592 278 L 712 270 L 708 234 L 594 234 Z"
                      fill={isHighlight ? comp.accentHex : "#7c3aed"}
                      fillOpacity={isHighlight ? 0.85 : 0.55}
                      stroke={comp.accentHex}
                      strokeWidth={isHighlight ? 2.5 : 1}
                    />
                  </g>
                )}

                {comp.id === "exhaust" && (
                  <g>
                    {/* Mixer Flange and Nozzle Duct */}
                    <path
                      d="M 725 174 L 810 185 L 810 206 L 725 206 Z"
                      fill={isHighlight ? comp.accentHex : "#475569"}
                      fillOpacity={isHighlight ? 0.85 : 0.5}
                      stroke={comp.accentHex}
                      strokeWidth={isHighlight ? 2 : 1}
                    />
                    <path
                      d="M 725 266 L 810 255 L 810 234 L 725 234 Z"
                      fill={isHighlight ? comp.accentHex : "#475569"}
                      fillOpacity={isHighlight ? 0.85 : 0.5}
                      stroke={comp.accentHex}
                      strokeWidth={isHighlight ? 2 : 1}
                    />
                    {/* Centerbody Tail Cone Plug */}
                    <polygon
                      points="725,206 910,220 725,234"
                      fill={isHighlight ? comp.accentHex : "#64748b"}
                      fillOpacity={isHighlight ? 0.9 : 0.7}
                      stroke={comp.accentHex}
                      strokeWidth={isHighlight ? 2 : 1}
                    />
                  </g>
                )}

                {comp.id === "oil_system" && (
                  <g>
                    {/* External ACOC Heat Exchanger & Reservoir Block */}
                    <rect
                      x="180"
                      y="404"
                      width="180"
                      height="24"
                      rx="5"
                      fill={isHighlight ? comp.accentHex : "#059669"}
                      fillOpacity={isHighlight ? 0.9 : 0.6}
                      stroke={comp.accentHex}
                      strokeWidth={isHighlight ? 2 : 1}
                    />
                    {/* Scavenge Line Conduit */}
                    <path
                      d="M 195 404 C 195 380, 175 320, 175 260"
                      fill="none"
                      stroke={isHighlight ? comp.accentHex : "#10b981"}
                      strokeWidth="2"
                      strokeDasharray="3 3"
                    />
                    <text
                      x="270"
                      y="420"
                      fill="#ffffff"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      AGB & OIL TANK / ACOC
                    </text>
                  </g>
                )}

                {/* Callout Pointer Pin Line when Highlighted */}
                {isHighlight && (
                  <g>
                    <line
                      x1={comp.pinX}
                      y1={comp.pinY}
                      x2={comp.calloutX}
                      y2={comp.calloutY}
                      stroke={comp.accentHex}
                      strokeWidth="1.5"
                      strokeDasharray="3 2"
                    />
                    <circle cx={comp.pinX} cy={comp.pinY} r="4" fill={comp.accentHex} />
                    <circle cx={comp.calloutX} cy={comp.calloutY} r="3" fill="#ffffff" />
                  </g>
                )}
              </g>
            );
          })}

          {/* Real-world Dimension Scale Marker Bar (0 to 3.401 m) */}
          <g>
            <line x1="35" y1="430" x2="920" y2="430" stroke="#64748b" strokeWidth="2" />
            <line x1="35" y1="424" x2="35" y2="436" stroke="#64748b" strokeWidth="2" />
            <line x1="920" y1="424" x2="920" y2="436" stroke="#64748b" strokeWidth="2" />
            {/* Intermediate Meter Ticks */}
            <line x1="295" y1="426" x2="295" y2="434" stroke="#475569" strokeWidth="1" />
            <line x1="555" y1="426" x2="555" y2="434" stroke="#475569" strokeWidth="1" />
            <line x1="815" y1="426" x2="815" y2="434" stroke="#475569" strokeWidth="1" />

            <text
              x="477"
              y="426"
              fill="#94a3b8"
              fontSize="9"
              fontFamily="monospace"
              textAnchor="middle"
            >
              Overall Engine Length: 3.401 m (133.9 in) • Baseline Tolerance ±1 to 2 cm
            </text>
          </g>
        </svg>

        {/* Floating Active Subsystem HUD Card */}
        {activeOverlay && activePart && (
          <div className="absolute top-3 right-3 max-w-xs sm:max-w-sm p-3.5 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-700/80 shadow-2xl space-y-2 pointer-events-auto font-mono text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: activeOverlay.accentHex }}
                />
                <span className="font-bold text-white text-xs tracking-wider">
                  {activeOverlay.station}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {activeOverlay.tag}
              </span>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-100">{activePart.name}</h4>
              <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                {activePart.technicalName}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2 rounded-lg border border-slate-800/80 text-[11px]">
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">Metric Dimensions</span>
                <span className="text-slate-200 font-semibold">{activeOverlay.metricDim}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">Axial Range</span>
                <span className="text-sky-300 font-semibold">{activeOverlay.axialPos}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[9px] text-slate-500 uppercase block">Certified Material</span>
                <span className="text-slate-300 text-[10px] truncate block" title={activeOverlay.alloy}>
                  {activeOverlay.alloy}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-500">
                Selected: {selectedPartId === activeOverlay.id ? "ACTIVE" : "CLICK TO LOCK"}
              </span>
              {onSwitchTo3D && (
                <button
                  onClick={() => {
                    onSelectPart(activeOverlay.id);
                    onSwitchTo3D();
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition"
                >
                  <Eye className="w-3 h-3" />
                  <span>Inspect in 3D</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. 10-Component Position Matrix Quick-Pills */}
      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2 font-mono">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5 text-sky-400" />
            10 Subsystem Real-World Axial Positions (Forward to Aft)
          </span>
          <span className="text-[10px] text-slate-500">Hover or click to highlight cross-section</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
          {CUTAWAY_COMPONENTS.map((c) => {
            const isSelected = selectedPartId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => onSelectPart(c.id)}
                onMouseEnter={() => setHoveredPartId(c.id)}
                onMouseLeave={() => setHoveredPartId(null)}
                className={`p-2 rounded-lg text-left transition border text-[11px] relative overflow-hidden ${
                  isSelected
                    ? "bg-slate-800 text-white border-sky-500 shadow-md"
                    : "bg-slate-900/60 text-slate-300 border-slate-800/80 hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-sky-400">{c.station.split(" ")[1]}</span>
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: c.accentHex }}
                  />
                </div>
                <div className="font-semibold truncate mt-0.5">{c.name.split(" ")[0]}</div>
                <div className="text-[9px] text-slate-500 truncate mt-0.5">{c.metricDim}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
