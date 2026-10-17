# Component Defect & Airworthiness Action Required Banner

Provide line engineers and maintenance technicians with immediate, unambiguous visibility into why a component is illuminated in red ("Affected") in the 3D digital twin, whether it must be repaired prior to flight, the governing AMM procedure, and the step-by-step corrective action.

## User Review & Critical Decisions

> [!IMPORTANT]
> The presentation style and required details have been confirmed:

- **Confirmed Decision 1 (Placement)**: Display a high-visibility **Defect & Required Action Alert Banner** pinned directly at the top of the component inspection card (`PartCard`) whenever a subsystem is in an "Affected" state.
- **Confirmed Decision 2 (Required Information)**: Every affected part banner will clearly present:
  1. **Defect Summary**: The specific fault, sensor trigger, or physical damage observed.
  2. **Governing AMM Procedure**: The exact Airbus/Pratt & Whitney Aircraft Maintenance Manual reference code.
  3. **Required Action / Fix Status**: An explicit airworthiness determination stating whether the part must be repaired/replaced before departure or if it is dispatchable under MEL.
- **Confirmed Decision 3 (Cross-Subsystem Discovery Alert)**: When an affected red part exists in the engine but another subsystem is currently selected (as shown in the user's screenshot where Oil System is red but Fan Blades is viewed), display an **"Affected Subsystem Alert"** allowing the engineer to jump directly to the defective part with one click.

---

## 1. Overview & Core Concept

- **What It Does**: Bridges the visual gap between 3D red warning lights and technical maintenance actions. Certifying engineers can immediately see why a component is flagged, whether flight operations are impacted, the authoritative AMM chapter/task code, and the required engineering fix.
- **Target Audience**: Line Maintenance Engineers, AOG (Aircraft On Ground) Duty Managers, and Powerplant Reliability Specialists inspecting fleet engines.
- **Key Value**: Closes the loop from spatial symptom (red glowing 3D part) to operational diagnosis (defect description) and maintenance disposition (AMM task & required fix).

---

## 2. User Experience & Visual Design

### Component Card Layout with Defect Alert Banner

```
┌────────────────────────────────────────────────────────────────────────┐
│ SUBSYSTEM: Auxiliary Oil Lubrication System (Zone 108)               ▼ │
├────────────────────────────────────────────────────────────────────────┤
│ 🚨 AFFECTED SUBSYSTEM — ACTION REQUIRED BEFORE DISPATCH                │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ DEFECT: Scavenge pump chip detector activation + 31 PSI oil drop   │ │
│ │ STATUS: FIX REQUIRED BEFORE DEPARTURE (Non-MEL Dispatch Item)      │ │
│ │ GOVERNING MANUAL: AMM 79-20-00-200-801 / SB PW1100G-79-0042        │ │
│ │ REQUIRED ACTION:                                                   │ │
│ │ 1. Remove and inspect magnetic chip plug for ferromagnetic debris. │ │
│ │ 2. If flakes exceed 0.5 mm², perform oil scavenge filter cut.       │ │
│ │ 3. Replace main scavenge pump & execute 15-min dry motoring check. │ │
│ └────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ [ Specs ]   [ Predictive 2 ]   [ Life Tracker 71% ]   [ History 4 ]    │
├────────────────────────────────────────────────────────────────────────┤
│ Technical Description & Operational Data                               │
└────────────────────────────────────────────────────────────────────────┘
```

### Visual Specifications
- **Container Styling**: `bg-gradient-to-b from-rose-950/90 via-slate-900 to-slate-950 border-2 border-rose-600/80 rounded-xl p-4 shadow-2xl space-y-3`.
- **Status Badge**: Glowing pulsing indicator `bg-rose-500/20 text-rose-300 border border-rose-500 text-xs font-mono font-bold uppercase tracking-wider`.
- **Determination Callout**: High-contrast contrast card with amber/rose emphasis on whether the part must be grounded or can be released under MEL limits.
- **AMM Citation Link**: Clickable manual code that opens the authoritative citation modal with one click.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Real Case & Pre-Seeded Defect Data Mapping**:
  - *Chosen Approach*: Map component statuses directly to active case logs, incident reports, and realistic GTF defect profiles for all 10 engine subsystems.
  - *Why*: Ensures that if the 3D model highlights a component in red, the card instantly displays authentic, domain-accurate engineering data.
- **Decision 2: Global Attention Strip for Non-Selected Affected Parts**:
  - *Chosen Approach*: If the user is viewing `Fan Blades` while `Auxiliary Oil System` is red, show a persistent alert banner: *"⚠️ 1 Subsystem requires attention: Auxiliary Oil Lubrication System — View Defect & Fix →"*.
  - *Why*: Solves the exact scenario in the user's screenshot where the engineer might not know which part is in red or why.

---

## 4. Technical Architecture & File Changes

- **`src/data/componentDefects.ts`**:
  - Comprehensive defect repository keyed by `PartId` providing:
    - `defectTitle`: Concise description of the anomaly.
    - `defectSeverity`: `"critical"` | `"urgent"` | `"advisory"`.
    - `isFixRequired`: Boolean indicating mandatory repair before next flight.
    - `governingManual`: Standard AMM / EASA AD task code.
    - `requiredAction`: Bulleted step-by-step engineering rectification procedure.
    - `sourceDocId`: Reference to document in retrieval system.
- **`src/components/PartCard.tsx`**:
  - Integrate `partStatus: PartStatus` and `allPartStatuses: Record<PartId, PartStatus>`.
  - Render the **Prominent Defect & Required Fix Alert Banner** when the selected part is `affected` or `inspect`.
  - Render the **Global Subsystem Attention Strip** when another part is affected, with a 1-click jump button (`onSelectConnectedPart(affectedPartId)`).
- **`src/App.tsx`**:
  - Pass `partStatus={partStatuses[selectedPartId]}` and `allPartStatuses={partStatuses}` to `<PartCard />`.
