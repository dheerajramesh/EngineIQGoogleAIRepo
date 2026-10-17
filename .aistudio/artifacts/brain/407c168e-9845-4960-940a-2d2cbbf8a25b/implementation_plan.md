# End-to-End MRO Line Engineer Interactive Workflow Plan

Transform the application into a complete, closed-loop MRO Line Maintenance workstation where engineers actively enter physical measurements, verify AMM tolerance bands in real time, record post-rectification gauge readings before clearing 3D Red/Amber warning lights, and sign a formal Certificate of Release to Service (CRS) to dispatch the aircraft.

## User Review & Confirmed Decisions

> [!IMPORTANT]
> All four interactive engineering workflows and strict sign-off input requirements have been confirmed:
> - **Confirmed Decision 1 — Mandatory Rectification Worksheet Before Clearing Red/Amber Lights**: Clearing an active component defect now requires completing an interactive form with **Action Type**, **Post-Repair Measurement** (validated against AMM serviceable limits), **Work Order #**, and **Certifying AME License ID**.
> - **Confirmed Decision 2 — Live Component Measurement / Micrometer Input on 3D Part Cards**: Every component in the 3D Digital Twin includes an interactive gauge input panel to test live field measurements against AMM limit bands and dynamically trigger Normal (Green), Inspect (Amber), or Action Required (Red) status.
> - **Confirmed Decision 3 — Final Flight CRS Dispatch Release Form**: Once both engines on an aircraft are in serviceable status (`Normal` or approved `Watch` under MEL), the Flight Status screen unlocks an interactive **Certificate of Release to Service (CRS)** sign-off panel to formally release the flight for departure.
> - **Confirmed Decision 4 — Auto-Load Active Flight Crew Tech Log into Incident Intake**: The Incident Intake workspace links directly to the active flight's Captain Logbook report and open case telemetry so engineers never face a blank intake screen.

---

## 1. Overview & Core Concept

- **What It Does**: Closes every functional gap in the MRO engineer's journey—from login and flight selection to on-wing micrometer measurement entry, AMM limit verification, component defect rectification with post-repair gauge validation, and final aircraft CRS dispatch release.
- **Target Audience / Persona**: Line Maintenance Engineers (DGCA Part-66 / FAA A&P), Powerplant CAMO Supervisors, and MRO Technical Evaluators.
- **Key Value**: Replaces passive, single-click status toggles with authentic aviation MRO input workflows where every state transition is backed by quantitative engineer inputs, deterministic AMM limit checks, and traceable work orders.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Engineer Sign-In & Credentials**: Engineer selects their station role or customizes their Name, AME License Badge ID, and Line Station Base on the login screen; these credentials automatically pre-populate downstream work orders and CRS forms.
  2. **3D Component Live Gauge & Micrometer Input**: On any 3D subsystem card, the engineer opens **"Enter Field Measurement / Gauge Check"**, selects the inspection parameter (e.g., *Leading Edge Nick Depth (mm)*, *Crack Length (mm)*, *Oil Seepage (drops/min)*, *TBC Coating Loss (%)*, *N1 Vibration*), enters a numeric reading, and sees the live AMM Limit Band calculation (`Level 0–4`). Submitting the reading immediately updates the 3D component's lighting (Neutral Metallic, Amber Inspect, or Red Alert) and logs the finding.
  3. **Interactive Defect Rectification & Post-Repair Sign-Off**: When a component is in Red (`ACTION REQUIRED`) or Amber (`INSPECT`) status, clicking **"Complete Rectification & Sign Off"** opens the **AMM Rectification Worksheet**:
     - **Rectification Action Performed** (*On-Wing Cold Blend Repair*, *QEC / Line Replaceable Unit Swap*, *B-Nut Re-Torque & Seal Replacement*, or *MEL Category C Deferred Dispatch*).
     - **Post-Rectification Measured Value** (e.g., `0.0 mm` residual crack, `1.1 mm` blended contour, `2 drops/min` seepage) + **Replacement S/N & Form 1 / 8130-3 Release Tag** (when replacing hardware).
     - **Work Order #** and **Certifying AME License ID** (mandatory validation before clearing the red light).
  4. **Incident Intake Crew Report Pre-Loader**: Opening **Incident Intake** displays an active banner with the current flight's Captain Tech Logbook report and a 1-click **"Load Flight Crew Report & Telemetry"** action that populates the narrative and calibrated numeric fields automatically.
  5. **Aircraft Certificate of Release to Service (CRS) Dispatch Panel**: On the Flight Status screen, engineers can enter pre-departure checks (**Oil Uplift (Quarts)**, **EGT Margin (°C)**, **Walkaround / FOD Check Status**, **CRS Release Certificate #**, and **AME License ID**) and click **"Issue CRS & Release Aircraft for Dispatch"**, transitioning the flight badge to **DISPATCH RELEASED (CRS SIGNED)**.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: High-contrast aviation MRO cockpit & digital twin instrument panel (`#070b14` obsidian canvas, `#0f172a` structural slate surfaces, crisp 1px borders).
  - *Color Palette & Semantic Signaling*: Sky blue (`#0ea5e9`) for interactive engineering controls, Emerald (`#10b981`) for verified within-limit measurements and CRS release, Amber (`#f59e0b`) for Level 2 watch/repetitive inspection bands, and Rose (`#f43f5e`) for Level 3/4 grounding exceedances.
  - *Typography & Tabular Discipline*: Geometric sans headings paired with strict tabular monospace numerals (`font-mono tabular-nums`) for all micrometer readings, cycle counters, limit bands, and work order references.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Post-Repair Measurement Validation Before Clearing Red Lights**:
  - *Chosen Approach*: Require the engineer to input the post-repair measurement (along with action type, Work Order #, and AME License ID) and verify it against the governing AMM threshold before the 3D component clears to `default` and the engine transitions to `normal`.
  - *Why*: Prevents accidental or unverified 1-click sign-offs during stakeholder evaluations and mirrors real EASA Part-145 / DGCA CAR-145 digital tech log compliance.
- **Decision 2 — Deterministic Live AMM Limit Preview on Component Cards**:
  - *Chosen Approach*: Wire the existing deterministic rules engine directly into each 3D component card's measurement input box so typing a number immediately previews the exact AMM rule band (`L0` through `L4`) before the engineer commits the finding.
  - *Why*: Gives evaluators instant, transparent feedback showing how the rules engine classifies different numeric thresholds right inside the 3D workspace.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────────┐
│                     Application State & Persistence                        │
│  • engines (status, openCaseIds, CSN)   • dispatchedFlights (CRS records)  │
│  • caseLogs (findings, limit rows)      • componentLogs (scoped per eng)   │
└───────────────┬────────────────────────────────────────────┬───────────────┘
                │                                            │
                ▼                                            ▼
┌───────────────────────────────────────┐  ┌─────────────────────────────────┐
│     Flight Turnaround & CRS View      │  │     3D Digital Twin Workspace   │
│  • Twin-Pod Telemetry & Open Cases    │  │  • Staggered 3D Component Mesh  │
│  • Interactive CRS Dispatch Form:     │  │  • Live Gauge Measurement Input │
│    - Oil Uplift / EGT / FOD Check     │  │    -> Deterministic AMM Check   │
│    - AME License & Release Cert #     │  │  • Mandatory Rectification Form │
│    - Transitions Flight -> DISPATCHED │  │    -> Post-Repair Value + WO #  │
└───────────────────────────────────────┘  └─────────────────┬───────────────┘
                                                             │
                                                             ▼
                                           ┌─────────────────────────────────┐
                                           │  Incident Intake & Rules Engine │
                                           │  • 1-Click Load Active Crew Log │
                                           │  • Calibrated Numeric Inputs    │
                                           │  • Inline Sign-Off Validation   │
                                           └─────────────────────────────────┘
```

- **Interactive Component & State Mapping**:
  - **Login Credentials Enhancement**: Allow editing both Engineer Name and License Badge ID on sign-in so `session.badge` and `session.name` pre-fill all downstream sign-off forms.
  - **Live Component Gauge Evaluator**: Evaluates entered measurements against `DECISION_RULES`, creates or updates a `CaseLogEntry` and `ComponentHistoryEntry` when logged, and updates `partStatuses` (`default` / `inspect` / `affected`) and `engines` status (`normal` / `watch` / `action_required`).
  - **Mandatory Rectification Worksheet**: Validates non-empty Work Order #, AME License ID, Action Type, and Post-Repair Measurement before invoking `onUpdatePartStatus(part.id, "default")` and appending a `defect_rectification` log entry with full repair/replacement metadata.
  - **Flight CRS Release State**: Stores signed `FlightCRSRecord` entries per flight number (persisted in `localStorage`) and updates the Flight Schedule & Flight Status header badges to reflect formal dispatch clearance.
