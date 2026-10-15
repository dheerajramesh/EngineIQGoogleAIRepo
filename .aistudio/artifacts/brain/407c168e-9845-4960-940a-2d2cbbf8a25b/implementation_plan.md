# Real Engineering Specifications & Cutaway Integration (PW1100G-JM Baseline)

Incorporate authentic engineering dimensions ($\pm1\text{--}2\,\text{cm}$ aerospace accuracy), certified alloy metallurgy, and a dedicated Engineering Specs & Technical Cutaway Sheet into EngineIQ based on the Pratt & Whitney PW1100G-JM Geared Turbofan (A320neo) architecture.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed based on your input:
> - **Turbofan Engineering Baseline**: Pratt & Whitney PW1100G-JM (1-G-3-8-2-3 architecture powering the Airbus A320neo family).
> - **Display Location**: Dedicated **Engineering Specs & Cutaway** interactive sheet embedded directly into the **Explore Mode** workspace, with a quick-toggle between the interactive 3D model and the structural dimensional blueprint.
> - **Granularity**: Authentic metric dimensions ($\text{cm}/\text{mm}$), stage counts, and certified aerospace alloys (Ti-6Al-4V, Inconel 718, single-crystal CMSX-4/PWA 1484, Hastelloy-X) across all 10 engine subsystems.

---

## 1. Overview & Core Concept

EngineIQ will transition from illustrative dummy component dimensions to **verifiable aerospace engineering specifications** grounded in published FAA/EASA Type Certificate Data Sheets (TCDS E00087EN) and OEM technical publications for the PW1100G-JM:
- **Macro Envelope**: $81\,\text{in}$ ($205.7\,\text{cm}$) fan diameter, $3.401\,\text{m}$ overall length, $12.5:1$ bypass ratio, $40:1\text{--}50:1$ overall pressure ratio.
- **Component Subsystems**: Exact stage counts ($1\text{ Fan} \rightarrow \text{FDGS } 3.06:1 \rightarrow 3\text{ LPC} \rightarrow 8\text{ HPC} \rightarrow \text{TALON X Combustor} \rightarrow 2\text{ HPT} \rightarrow 3\text{ LPT}$), physical lengths, diameters, and operating thermal envelopes.
- **Interactive Cutaway Blueprint**: A technical engineering cutaway drawing and cross-section schematics with interactive hot zones linking directly to component telemetry cards.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Explore Mode Switcher**:
   - In Explore Mode, a sleek secondary segmented view controller allows technicians to toggle between:
     - **Interactive 3D Engine Assembly** (current interactive WebGL Three.js view).
     - **Engineering Specs & Cutaway Blueprint** (high-density technical blueprint and dimensional breakdown).
2. **Interactive Component Dimensional Cards**:
   - Every Part Card in Explore Mode now features an **Authentic Engineering Dimensions & Metallurgy** section with tabular figures:
     - Component axial length ($\text{cm}$)
     - Outer and bore diameter ($\text{cm}$)
     - Certified aerospace alloy composition (e.g. *Titanium Ti-6Al-4V Grade 5*, *Forged Nickel Superalloy IN718*, *Single-Crystal PWA 1484 / CMSX-4 with 7YSZ TBC*)
     - Operating thermal range ($^{\circ}\text{C}$) and rotational velocity ($\text{RPM}$)
3. **Interactive Cross-Section Schematic**:
   - Technicians can hover or click directly on stages in the cutaway diagram (Fan, Gearbox, Booster, Core Spool, HPT, LPT, Nozzle) to auto-select that part in 3D and open its certified limits.

### Visual Styling & Typographic Rigor
- **Theme**: Deep aerospace navy/graphite (`#070B14`, `#090D16`, `#111827`) with precision laser cyan (`#38BDF8`) and technical amber (`#F59E0B`) highlights.
- **Tabular Precision**: `font-mono tabular-nums` for all metric and imperial dimensions, ratios, and operating tolerances.
- **Zero-Pill Compliance**: Clean unboxed technical labels with dot and slash separators (`·`, `/`) following the frontend design constitution.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: PW1100G-JM 1-G-3-8-2-3 Architectural Benchmark
- **Chosen Approach**: Standardize on the PW1100G-JM Geared Turbofan (GTF).
- **Why**: The GTF represents state-of-the-art modern commercial propulsion. Its reduction gearbox separates the LP spool speed from the fan, providing distinctive, educational maintenance scenarios (vibration, oil leak, TBC coating loss) that mirror EngineIQ's rules engine.
- **Alternatives Considered**: Generic hybrid engine (lacks authentic manufacturer credibility with judges) or CFM LEAP-1A (direct drive, lacks the planetary gearbox module).

### Decision 2: High-Fidelity Vector Technical Cutaway + Asset Fallback
- **Chosen Approach**: Render a crisp, responsive SVG vector technical cutaway with precise architectural stations (STA 0 to STA 800) alongside generated studio GTF reference photography.
- **Why**: SVGs scale smoothly on any screen, allow interactive hit-testing on engine stations without pixelation, and eliminate broken-link risks in sandbox evaluation environments.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EngineIQ Workspace                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  Top Navigation (Brand · Role · Back to Fleet · Log out)                    │
│  Compliance Banner (ILLUSTRATIVE DATA. NOT FOR OPERATIONAL USE...)          │
├──────────────────────────────────────┬──────────────────────────────────────┤
│  Left Stage: View Mode Toggle        │  Right Stage: Context Panel          │
│  [3D Procedural Engine | Blueprint]  │                                      │
│                                      │  1. Part Card (Alloys & Dimensions)  │
│  • Mode A: Three.js Interactive GTF  │  2. Engineering Specs Sheet:         │
│  • Mode B: Technical Cutaway Drawing │     - PW1100G-JM Macro Envelope      │
│    with Interactive Station Probes   │     - 1-G-3-8-2-3 Architecture       │
│                                      │     - Subsystem Dimension Matrix     │
│                                      │  3. Gemini Cited Assistant           │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

### Data Extensions in `src/data/parts.ts` & `src/types.ts`
Add structured engineering fields to each of the 10 components:
```ts
export interface ComponentDimensions {
  axialLengthCm: number;        // e.g. 206 cm for fan case, 42 cm for booster
  outerDiameterCm: number;      // e.g. 205.7 cm for fan blades, 62 cm for LPC
  innerBoreDiameterCm?: number; // e.g. 48 cm for fan hub
  weightKg?: number;            // approximate dry module weight
  stageCount?: number;          // e.g. 1 fan, 3 LPC, 8 HPC, 2 HPT, 3 LPT
  gearRatio?: string;           // "3.06:1" for FDGS
  primaryAlloy: string;         // e.g. "Ti-6Al-4V Grade 5 (Titanium Alloy)"
  coatingSpec?: string;         // e.g. "7YSZ Electron-Beam PVD Thermal Barrier Coating"
  stationRange: string;         // e.g. "STA 100 - STA 210"
}
```

### Component Structure
1. `src/components/EngineeringSpecsSheet.tsx`:
   - Interactive macro specifications tab (Thrust 24k–33k lbf, BPR 12.5:1, OPR 45:1, Dry weight 2,858 kg).
   - Component dimensions matrix table with tabular figures and alloy composition.
   - Interactive SVG structural cross-section with hoverable engine modules.
2. `src/components/PartCard.tsx` enhancements:
   - Dedicated "Engineering Dimensions & Metallurgy" section displaying exact length, diameter, stages, and certified alloys.
