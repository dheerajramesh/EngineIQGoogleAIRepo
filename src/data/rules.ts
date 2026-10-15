import { RuleDefinition } from "../types";

export const DECISION_RULES: RuleDefinition[] = [
  {
    id: "R1",
    part: "fan_blades",
    damageType: "leading_edge_nick",
    unit: "depth_mm",
    bands: [
      { max: 0.8, level: 0, description: "≤0.8 mm → L0 (Continue, record in tech log)" },
      { max: 1.5, level: 1, description: "≤1.5 mm → L1 (Repeat inspection within set interval)" },
      { max: 2.5, level: 2, description: "≤2.5 mm → L2 (Borescope inspection / on-wing blend repair)" },
    ],
    finalLevel: 4, // > 2.5 mm
    sourceDocId: "DEMO-AMM-72-01",
    description: "Fan blade leading edge nick damage depth limits.",
  },
  {
    id: "R2",
    part: "fan_blades",
    damageType: "crack",
    unit: "length_mm",
    bands: [
      { max: 0, level: 0, description: "0 mm (No crack detected) → L0" },
    ],
    finalLevel: 4, // > 0 mm
    sourceDocId: "DEMO-AMM-72-01",
    description: "Fan blade crack criteria (zero tolerance).",
  },
  {
    id: "R3",
    part: "fan_blades",
    damageType: "tip_curl",
    unit: "length_mm",
    bands: [
      { max: 3.0, level: 1, description: "≤3.0 mm → L1 (Repetitive visual check)" },
      { max: 6.0, level: 2, description: "≤6.0 mm → L2 (Blend or cold-work assessment)" },
    ],
    finalLevel: 4, // > 6.0 mm
    sourceDocId: "DEMO-AMM-72-01",
    description: "Fan blade tip curl deformation limits.",
  },
  {
    id: "R4",
    part: "fan_case",
    damageType: "dent",
    unit: "depth_mm",
    bands: [
      { max: 1.5, level: 0, description: "≤1.5 mm → L0 (Record & monitor)" },
      { max: 3.0, level: 1, description: "≤3.0 mm → L1 (Repeat ultrasonic / NDT check)" },
      { max: 5.0, level: 2, description: "≤5.0 mm → L2 (Acoustic liner integrity check)" },
    ],
    finalLevel: 3, // > 5.0 mm
    sourceDocId: "DEMO-AMM-72-02",
    description: "Fan case containment and acoustic liner dent depth limits.",
  },
  {
    id: "R5",
    part: "hpc",
    damageType: "blade_nick",
    unit: "depth_mm",
    bands: [
      { max: 0.5, level: 1, description: "≤0.5 mm → L1 (Repeat borescope at 100 cycles)" },
      { max: 1.0, level: 2, description: "≤1.0 mm → L2 (On-wing borescope blending)" },
    ],
    finalLevel: 4, // > 1.0 mm
    sourceDocId: "DEMO-AMM-72-03",
    description: "High-pressure compressor airfoil nick depth limits.",
  },
  {
    id: "R6",
    part: "hpt",
    damageType: "coating_loss",
    unit: "percent_area",
    bands: [
      { max: 5.0, level: 1, description: "≤5% area → L1 (Monitor hot section degradation)" },
      { max: 15.0, level: 2, description: "≤15% area → L2 (Detailed thermal barrier inspection)" },
    ],
    finalLevel: 4, // > 15% area
    sourceDocId: "DEMO-AMM-72-04",
    description: "HPT thermal barrier coating (TBC) spallation area limits.",
  },
  {
    id: "R7",
    part: "oil_system",
    damageType: "leak",
    unit: "drops_per_min",
    bands: [
      { max: 1.0, level: 0, description: "≤1 drop/min → L0 (Normal seepage, wipe & monitor)" },
      { max: 2.0, level: 1, description: "≤2 drops/min → L1 (Repeat inspection next transit)" },
      { max: 5.0, level: 2, description: "≤5 drops/min → L2 (Borescope accessory gearbox seal)" },
    ],
    finalLevel: 4, // > 5 drops/min
    sourceDocId: "DEMO-AMM-79-01",
    description: "Accessory gearbox and oil lubrication circuit static/dynamic leak limits.",
  },
  {
    id: "R8",
    part: "engine",
    damageType: "vibration",
    unit: "n1_units",
    bands: [
      { max: 2.5, level: 0, description: "≤2.5 units → L0 (Nominal baseline vibration)" },
      { max: 3.5, level: 1, description: "≤3.5 units → L1 (Trend tracking & fan trim balance check)" },
      { max: 4.5, level: 2, description: "≤4.5 units → L2 (Borescope fan drive gear & bearing cavity)" },
    ],
    finalLevel: 3, // > 4.5 units
    sourceDocId: "DEMO-AMM-77-01",
    description: "N1 low-pressure rotor overall vibration amplitude limits.",
  },
];

export const ACTION_LEVEL_DEFINITIONS: Record<
  0 | 1 | 2 | 3 | 4,
  { label: string; action: string; color: string; bg: string; border: string }
> = {
  0: {
    label: "Level 0",
    action: "Continue, record in tech log",
    color: "text-emerald-400",
    bg: "bg-emerald-950/40",
    border: "border-emerald-500/40",
  },
  1: {
    label: "Level 1",
    action: "Repeat inspection within set interval",
    color: "text-sky-400",
    bg: "bg-sky-950/40",
    border: "border-sky-500/40",
  },
  2: {
    label: "Level 2",
    action: "Borescope inspection / on-wing repair",
    color: "text-amber-400",
    bg: "bg-amber-950/40",
    border: "border-amber-500/40",
  },
  3: {
    label: "Level 3",
    action: "Escalate to OEM technical support",
    color: "text-orange-400",
    bg: "bg-orange-950/40",
    border: "border-orange-500/40",
  },
  4: {
    label: "Level 4",
    action: "Remove from service (shop visit / engine change)",
    color: "text-rose-400",
    bg: "bg-rose-950/40",
    border: "border-rose-500/40",
  },
};
