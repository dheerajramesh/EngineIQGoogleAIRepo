import { DECISION_RULES } from "../data/rules";
import { ActionLevel, IncidentFinding, LimitsCheckResult, LimitsCheckResultRow } from "../types";

export function evaluateLimitsCheck(findings: IncidentFinding[]): LimitsCheckResult {
  if (!findings || findings.length === 0) {
    return {
      rows: [],
      overallLevel: 0,
    };
  }

  const rows: LimitsCheckResultRow[] = [];
  let maxLevel: ActionLevel = 0;
  let highestRuleDocId = "";

  for (const finding of findings) {
    // Match rule by part & damageType
    const matchingRule = DECISION_RULES.find(
      (r) =>
        (r.part === finding.part || (r.part === "engine" && finding.part === "engine")) &&
        r.damageType === finding.damageType
    ) || DECISION_RULES.find(
      (r) => r.damageType === finding.damageType
    );

    // If measurement is missing
    if (!finding.measurement || finding.measurement.value === null || finding.measurement.value === undefined) {
      rows.push({
        component: formatPartName(finding.part),
        damageType: formatDamageType(finding.damageType),
        measured: "Missing measurement",
        limitBandApplied: "Insufficient data: escalate",
        resultLevel: 3, // escalate due to missing data
        sourceDocId: matchingRule?.sourceDocId || "DEMO-POL-01",
        notes: "Missing quantitative measurement requires physical gauge verification or OEM escalation.",
        isInsufficientData: true,
      });
      if (maxLevel < 3) {
        maxLevel = 3;
        highestRuleDocId = "DEMO-POL-01";
      }
      continue;
    }

    const val = finding.measurement.value;
    const unit = finding.measurement.unit;

    if (!matchingRule) {
      // Fallback if rule not in R1-R8
      rows.push({
        component: formatPartName(finding.part),
        damageType: formatDamageType(finding.damageType),
        measured: `${val} ${unit}`,
        limitBandApplied: "Uncatalogued finding: Refer to manual",
        resultLevel: 2,
        sourceDocId: "DEMO-POL-01",
        notes: "No direct automated band; requires standard on-wing borescope evaluation.",
      });
      if (maxLevel < 2) maxLevel = 2;
      continue;
    }

    // Evaluate against bands in order
    let assignedLevel: ActionLevel = matchingRule.finalLevel;
    let appliedBandDesc = `>${matchingRule.bands[matchingRule.bands.length - 1].max} → L${matchingRule.finalLevel}`;

    for (const band of matchingRule.bands) {
      if (val <= band.max) {
        assignedLevel = band.level;
        appliedBandDesc = band.description;
        break;
      }
    }

    rows.push({
      component: formatPartName(finding.part),
      damageType: formatDamageType(finding.damageType),
      measured: `${val} ${formatUnit(unit)}`,
      limitBandApplied: appliedBandDesc,
      resultLevel: assignedLevel,
      sourceDocId: matchingRule.sourceDocId,
      notes: matchingRule.description,
    });

    if (assignedLevel > maxLevel) {
      maxLevel = assignedLevel;
      highestRuleDocId = matchingRule.sourceDocId;
    }
  }

  return {
    rows,
    overallLevel: maxLevel,
    highestRuleDocId,
  };
}

export function formatPartName(partId: string): string {
  const map: Record<string, string> = {
    fan_case: "Fan Case & Nacelle",
    fan_blades: "Fan Blades",
    fan_drive_gear: "Fan Drive Gear System",
    lpc: "Low-Pressure Compressor (LPC)",
    hpc: "High-Pressure Compressor (HPC)",
    combustor: "Combustor Chamber",
    hpt: "High-Pressure Turbine (HPT)",
    lpt: "Low-Pressure Turbine (LPT)",
    exhaust: "Exhaust Nozzle & Cone",
    oil_system: "Oil & Lubrication System",
    engine: "Engine Overall Rotor",
  };
  return map[partId] || partId.replace(/_/g, " ").toUpperCase();
}

export function formatDamageType(type: string): string {
  const map: Record<string, string> = {
    leading_edge_nick: "Leading Edge Nick",
    crack: "Structural Crack",
    tip_curl: "Tip Curl Deflection",
    dent: "Casing Dent",
    blade_nick: "Airfoil Blade Nick",
    coating_loss: "Thermal Coating Loss",
    leak: "Oil Circuit Leakage",
    vibration: "N1 Vibration Amplitude",
  };
  return map[type] || type.replace(/_/g, " ");
}

export function formatUnit(unit: string): string {
  const map: Record<string, string> = {
    depth_mm: "mm depth",
    length_mm: "mm length",
    percent_area: "% area",
    drops_per_min: "drops/min",
    n1_units: "N1 units",
  };
  return map[unit] || unit;
}
