/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PartId } from "../types";

export interface ComponentDefectInfo {
  partId: PartId;
  defectTitle: string;
  defectCategory: string;
  findings: string;
  isFixRequired: boolean;
  fixDetermination: string;
  fixDeterminationDescription: string;
  severity: "critical" | "urgent" | "advisory";
  governingManual: string;
  sourceDocId: string;
  bulletinRef: string;
  requiredAction: string[];
}

export const COMPONENT_DEFECTS: Record<PartId, ComponentDefectInfo> = {
  oil_system: {
    partId: "oil_system",
    defectTitle: "Main Scavenge Chip Detector Trigger & Low Oil Supply Pressure",
    defectCategory: "Lubrication & Scavenge Loop Anomaly",
    findings: "Oil delivery pressure 31.4 PSI (below 35.0 PSI minimum threshold). Ferromagnetic slivers detected across Master Chip Detector plug (STA 135).",
    isFixRequired: true,
    fixDetermination: "MANDATORY FIX BEFORE FLIGHT (AOG — Aircraft On Ground)",
    fixDeterminationDescription: "Engine CANNOT be released for flight. Oil system pressure deficit and metallic slivers indicate active bearing/pump distress requiring immediate physical inspection.",
    severity: "critical",
    governingManual: "AMM 79-20-00-200-801",
    sourceDocId: "DEMO-AMM-72-01",
    bulletinRef: "FAA AD 2024-01-08 / Pratt & Whitney SB PW1100G-79-0042",
    requiredAction: [
      "Remove and inspect magnetic chip detector plug P/N PW-CD-7901 for ferromagnetic debris per AMM 79-20-00-210-802.",
      "Cut and inspect scavenge filter cartridge. If debris exceeds 5 particles > 0.5 mm², perform laboratory oil ferrography.",
      "Inspect auxiliary scavenge oil pump bearings and seals for distress or bypass valve leakage.",
      "Flush lubrication circuit, install fresh Mobil Jet Oil II, and execute 15-minute dry motoring leak check before flight release.",
    ],
  },
  fan_blades: {
    partId: "fan_blades",
    defectTitle: "Leading Edge Foreign Object Damage (FOD) Nick Exceeding AMM Blend Limits",
    defectCategory: "Foreign Object Damage (FOD)",
    findings: "Blade #14 leading edge notch measured at 1.8 mm depth in Zone A (critical aerodynamic span). Maximum blendable depth in this zone is 1.0 mm.",
    isFixRequired: true,
    fixDetermination: "MANDATORY FIX BEFORE FLIGHT (Ground Aircraft)",
    fixDeterminationDescription: "Exceeds AMM blendable tolerance. Operating with an unblended notch in Zone A carries severe risk of high-cycle fatigue blade fracture.",
    severity: "critical",
    governingManual: "AMM 72-21-00-200-801",
    sourceDocId: "DEMO-AMM-72-01",
    bulletinRef: "FAA AD 2023-24-05 / EASA AD 2023-0199",
    requiredAction: [
      "Carry out fluorescent penetrant inspection (FPI ASTM E1417 Level 3) on Blade #14.",
      "Remove damaged fan blade pair (180° opposite balance pair) per AMM 72-21-00-000-801.",
      "Install replacement titanium wide-chord blade assembly with balanced moment-weight pairing.",
      "Perform ground engine vibration survey to verify N1 vibration below 0.8 IPS.",
    ],
  },
  fan_case: {
    partId: "fan_case",
    defectTitle: "Acoustic Attenuation Liner Delamination in Forward Inlet Cowl",
    defectCategory: "Containment & Acoustic Structure",
    findings: "30 cm² acoustic liner panel disbonding detected at 4 o'clock position in forward inlet cowl. Containment Kevlar wrap remains intact.",
    isFixRequired: false,
    fixDetermination: "DISPATCHABLE UNDER MEL (Category C — 10 Days)",
    fixDeterminationDescription: "Structural containment ring is unaffected. Acoustic liner disbonding is dispatchable under MEL Category C if perimeter fasteners are secure.",
    severity: "advisory",
    governingManual: "AMM 72-10-00-200-801",
    sourceDocId: "DEMO-AMM-72-01",
    bulletinRef: "Airbus A320neo MEL Item 72-10-01",
    requiredAction: [
      "Tap-test boundary of disbonded liner to verify no propagation beyond 50 cm².",
      "Apply aerodynamic high-temp sealing tape over exposed edges per AMM 72-10-00-300-801.",
      "Log deferred defect entry in Aircraft Technical Logbook with 10-calendar-day rectification limit.",
    ],
  },
  fan_drive_gear: {
    partId: "fan_drive_gear",
    defectTitle: "FDGS Epicyclic Gear Journal Bearing Thermal Distress",
    defectCategory: "Power Gearbox Telemetry Alert",
    findings: "Gearbox scavenge oil delta-T elevated (+18°C above baseline) with 0.95 IPS vibration on N1 accessory drive.",
    isFixRequired: true,
    fixDetermination: "MANDATORY FIX BEFORE FLIGHT",
    fixDeterminationDescription: "Bearing thermal elevation combined with vibration indicates loss of journal hydrodynamic film. Engine dispatch prohibited.",
    severity: "critical",
    governingManual: "AMM 72-15-00-200-801",
    sourceDocId: "DEMO-AMM-72-01",
    bulletinRef: "FAA AD 2024-03-12 / Pratt & Whitney SB PW1100G-72-0081",
    requiredAction: [
      "Perform borescope inspection of planet carrier gears, sun gear, and flex-mount coupling.",
      "Inspect chip detector at FDGS scavenge port for bronze or silver bearing alloy particles.",
      "If flakes detected, remove and replace FDGS power module in accordance with OEM AMM 72-15-00.",
    ],
  },
  lpc: {
    partId: "lpc",
    defectTitle: "LPC Stage 2 Stator Vane Erosion & Minor Tip Clearance Increase",
    defectCategory: "Booster Compressor Aerodynamic Degradation",
    findings: "Tip clearance measured 1.35 mm (nominal limit 1.2 mm). Leading edge erosion noted from desert operations.",
    isFixRequired: false,
    fixDetermination: "DISPATCHABLE WITH INCREASED MONITORING",
    fixDeterminationDescription: "Within operational clearance margin. No immediate flight cancellation required, but scheduled water wash and borescope tracking are mandated.",
    severity: "advisory",
    governingManual: "AMM 72-31-00-200-801",
    sourceDocId: "DEMO-AMM-72-01",
    bulletinRef: "Pratt & Whitney SIL 72-049",
    requiredAction: [
      "Measure booster stages 1-3 tip clearances with depth micrometer.",
      "Perform compressor core water wash to restore mass airflow.",
      "Schedule repetitive 100-cycle borescope check in CAMO system.",
    ],
  },
  hpc: {
    partId: "hpc",
    defectTitle: "HPC Stage 7-8 Powder Metal Disk Ultrasonic Inspection Exceedance",
    defectCategory: "Critical Rotating Hardware Sub-Surface Anomaly",
    findings: "Angled ultrasonic shear-wave inspection detected sub-surface non-metallic inclusion > 0.35 mm in Stage 8 compressor rotor bore.",
    isFixRequired: true,
    fixDetermination: "MANDATORY ENGINE SHOP VISIT REQUIRED (AOG)",
    fixDeterminationDescription: "Mandatory grounding under FAA Emergency Airworthiness Directive. Powder metal micro-crack propagation poses catastrophic rotor burst risk.",
    severity: "critical",
    governingManual: "AMM 72-35-00-200-801",
    sourceDocId: "DEMO-AMM-72-01",
    bulletinRef: "FAA AD 2023-24-01 / EASA Emergency AD 2023-0182-E",
    requiredAction: [
      "Ground aircraft immediately per FAA Airworthiness Directive mandate.",
      "De-mate engine from pylon and ship to authorized powerplant overhaul facility.",
      "Replace Stage 7-8 powdered metal disk stack with certified post-lot titanium alloy disk.",
    ],
  },
  combustor: {
    partId: "combustor",
    defectTitle: "Combustion Chamber Thermal Barrier Coating Spallation & Hot Streak",
    defectCategory: "Hot Section Burn-Through Risk",
    findings: "12 mm² TBC coating loss on inner liner panel #4 with localized discoloration from fuel nozzle spray unbalance.",
    isFixRequired: true,
    fixDetermination: "MANDATORY FIX BEFORE FLIGHT",
    fixDeterminationDescription: "Liner parent alloy is exposed to 1,650°C core combustion gas. Operating without repair will cause combustor burn-through.",
    severity: "critical",
    governingManual: "AMM 72-41-00-200-801",
    sourceDocId: "DEMO-AMM-72-01",
    bulletinRef: "EASA AD 2024-0018 / Airbus ABN-ENG-72-02",
    requiredAction: [
      "Perform 360-degree borescope inspection of all 18 fuel injectors and air swirlers.",
      "Check liner parent metal for cracking or wall thinning via optical eddy current probe.",
      "Clean or replace fuel nozzle #4 and verify combustor exit temperature distribution before release.",
    ],
  },
  hpt: {
    partId: "hpt",
    defectTitle: "High-Pressure Turbine Stage 1 Blade Tip Oxidation & Radial Crack",
    defectCategory: "Hot Gas Path High-Stress Hardware",
    findings: "0.8 mm trailing edge radial crack on HPT Stage 1 single-crystal nickel blade #22.",
    isFixRequired: true,
    fixDetermination: "MANDATORY FIX BEFORE FLIGHT",
    fixDeterminationDescription: "Cracks on single-crystal rotating airfoils in Stage 1 cannot be blended and require immediate turbine rotor module exchange.",
    severity: "critical",
    governingManual: "AMM 72-51-00-200-801",
    sourceDocId: "DEMO-AMM-72-01",
    bulletinRef: "FAA AD 2023-19-09 / PW SB 1100G-72-0114",
    requiredAction: [
      "Map crack length and trajectory relative to blade cooling air passages.",
      "Cracks extending into internal cooling holes are non-blendable: replace turbine rotor stage.",
      "Perform exhaust gas temperature (EGT) margin check upon reassembly.",
    ],
  },
  lpt: {
    partId: "lpt",
    defectTitle: "LPT Stage 3 Vane Segment Trailing Edge Thermal Bowing",
    defectCategory: "Turbine Aerodynamic Stator Thermal Distortion",
    findings: "Vane trailing edge deformation of 0.4 mm measured during scheduled borescope.",
    isFixRequired: false,
    fixDetermination: "PASS — WITHIN REPETITIVE BSI LIMITS (No immediate fix required)",
    fixDeterminationDescription: "Deformation is within AMM Table 601 dispatch tolerance. Re-inspection at next A-Check is acceptable.",
    severity: "advisory",
    governingManual: "AMM 72-53-00-200-801",
    sourceDocId: "DEMO-AMM-72-01",
    bulletinRef: "AMM Chapter 72-53 Table 601",
    requiredAction: [
      "Document current trailing edge measurement in component history log.",
      "Re-inspect in 250 flight cycles per standard line maintenance program.",
    ],
  },
  exhaust: {
    partId: "exhaust",
    defectTitle: "Exhaust Mixer & Tail Cone Fastener Torque Relaxation",
    defectCategory: "Exhaust Aerodynamic Duct",
    findings: "2 perimeter mounting bolts on core exhaust mixer below nominal torque specification (85 in-lb vs 120 in-lb required).",
    isFixRequired: true,
    fixDetermination: "LINE FIX REQUIRED (Fast 20-min rectification)",
    fixDeterminationDescription: "Fasteners must be torqued and lockwired before departure to prevent exhaust mixer vibration dislodgement.",
    severity: "urgent",
    governingManual: "AMM 78-11-00-200-801",
    sourceDocId: "DEMO-AMM-72-01",
    bulletinRef: "AMM Task 78-11-00-400-801",
    requiredAction: [
      "Inspect bolt threads for fretting or galling.",
      "Apply high-temperature anti-seize paste per AMM specifications.",
      "Torque fasteners to 120 in-lb and apply lockwire witness marks.",
    ],
  },
};
