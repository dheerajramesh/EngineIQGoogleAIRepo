import { PartId } from "../types";

export interface LifeLimitedPartInfo {
  id: PartId;
  name: string;
  module: string;
  limitCycles: number;
}

export const LIFE_LIMITED_PARTS: LifeLimitedPartInfo[] = [
  {
    id: "fan_blades",
    name: "Fan Blades / Disk",
    module: "Fan Module",
    limitCycles: 20000,
  },
  {
    id: "fan_drive_gear",
    name: "Fan Drive Gear Carrier",
    module: "Gearbox Assembly",
    limitCycles: 30000,
  },
  {
    id: "lpc",
    name: "LPC Booster Rotor Spool (Stages 1-3)",
    module: "Low-Pressure Compressor",
    limitCycles: 25000,
  },
  {
    id: "hpc",
    name: "HPC Rotor Spool (Stages 1-8)",
    module: "High-Pressure Compressor",
    limitCycles: 20000,
  },
  {
    id: "hpt",
    name: "HPT Rotor Disk (Stage 1)",
    module: "High-Pressure Turbine",
    limitCycles: 15000,
  },
  {
    id: "lpt",
    name: "LPT Rotor Disks (Multi-Stage)",
    module: "Low-Pressure Turbine",
    limitCycles: 25000,
  },
];

export interface ComputedLifeStatus {
  id: PartId;
  name: string;
  module: string;
  limitCycles: number;
  currentCycles: number;
  remainingCycles: number;
  percentUsed: number;
  status: "green" | "amber" | "red";
  statusLabel: string;
}

export function computePartLife(
  part: LifeLimitedPartInfo,
  currentCycles: number
): ComputedLifeStatus {
  const safeCycles = Math.max(0, currentCycles);
  const remainingCycles = Math.max(0, part.limitCycles - safeCycles);
  const percentUsed = Math.min(100, Math.round((safeCycles / part.limitCycles) * 1000) / 10);

  let status: "green" | "amber" | "red" = "green";
  let statusLabel = "Normal Service (<70%)";

  if (percentUsed >= 90) {
    status = "red";
    statusLabel = "Critical Life (>90% Expended)";
  } else if (percentUsed >= 70) {
    status = "amber";
    statusLabel = "Elevated Monitoring (70-90%)";
  }

  return {
    id: part.id,
    name: part.name,
    module: part.module,
    limitCycles: part.limitCycles,
    currentCycles: safeCycles,
    remainingCycles,
    percentUsed,
    status,
    statusLabel,
  };
}
