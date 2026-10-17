# End-to-End MRO Audit Remediation Plan

Resolve all 10 data integrity, airworthiness logic, 3D spatial label collision, and closed-loop state synchronization bugs uncovered during the full-application audit.

## User Review & Confirmed Scope

> [!IMPORTANT]
> All four remediation tracks have been approved for implementation:
> 1. **Data & Identity Integrity**: Synchronize tail numbers between flights and engines, align pilot Crew Reports with actual open cases, map real case findings into the Defect Banner, compute realistic Flight Hours per engine, and fix the illegal >15,000 CSN LLP exceedance on healthy engines.
> 2. **Closed-Loop Defect Sign-Off (No More Zombie Red Lights)**: Signing off a component rectification updates `partStatuses`, removes the resolved finding/case from `openCaseIds`, and transitions the engine's status badge to `NORMAL` when all defects are cleared.
> 3. **3D Label Anti-Collision Layout**: Stagger 3D `<Html>` labels alternating above and below the core centerline with leader lines so they never stack into an unreadable pile in assembled view.
> 4. **Engine-Scoped Component History & Zero `window.alert()`**: Scope maintenance history logs and cycle stamps to the selected engine's actual CSN, and replace native browser `alert()` calls with inline validation banners.

---

## 1. Data & Identity Synchronization (`flights.ts`, `fleet.ts`, `PartCard.tsx`)

- **Unified Aircraft Tail Numbers**:
  - Update `INDIGO_FLIGHTS` in `src/data/flights.ts` and `INITIAL_FLEET_ENGINES` / `INITIAL_FLEET_CASES` in `src/data/fleet.ts` so every flight's `aircraftTail` and its twin engines' `tailNumber` match 100% (e.g., `VT-IZB` (`VT-DEM2`), `VT-ITG` (`VT-DEM1`), `VT-IFA` (`VT-DEM3`), `VT-IMR` (`VT-DEM4`), `VT-IJC` (`VT-DEM6`), `VT-IKL` (`VT-DEM5`), `VT-IOD` (`VT-DEM7`), `VT-IVN` (`VT-DEM8`)).
  - Pass `activeFlight?.aircraftTail || currentEngine.tailNumber` consistently to all child views.
- **Pilot Crew Reports Aligned 1-to-1 with Open Cases**:
  - **Flight 6E 2134 (`VT-DEM2-ENG1`)**: Flock bird ingestion on takeoff — Fan Blade #8 12.0 mm through-crack, Fan Case 4.0 mm containment dent, 4.8 N1 vibration (`CASE-2026-S2`).
  - **Flight 6E 548 (`VT-DEM1-ENG2`)**: Climb bird strike at 1,500 ft — Fan Blade #14 1.9 mm leading-edge nick & 2.2 N1 vibration (`CASE-2026-S1`).
  - **Flight 6E 902 (`VT-DEM4-ENG1`)**: Transit walkaround oil seepage — No.1 Engine Accessory Gearbox drain mast leaking at 18 drops/min (`CASE-2026-S4`).
  - **Flight 6E 174 (`VT-DEM6-ENG2`)**: High EGT trend post-landing — Stage 1 HPT borescope confirmed 42% thermal barrier coating spallation (`CASE-2026-S6`).
  - **Flight 6E 831 (`VT-DEM5-ENG2`)**: ACARS step-climb vibration advisory — 2.9 N1 units on No.2 Engine core spool (`CASE-2026-S3`).
- **Fix LLP Exceedance on `VT-DEM6-ENG1`**:
  - Adjust `VT-DEM6-ENG1` cycles to `13,600 CSN` and `VT-DEM6-ENG2` to `13,950 CSN` so healthy/watch engines do not illegally exceed the 15,000-cycle HPT rotor disk mandatory retirement limit.
- **Dynamic Case Findings in `PartCard` Defect Banner**:
  - Pass the current engine's active `openCases` into `PartCard`. When an open case has a finding for the selected component, overlay the exact measured finding, zone, limit band, and source document from that active case onto the Defect & Fix Required Alert Banner.
- **Realistic Per-Engine Flight Hours (`engineHours`)**:
  - Replace hardcoded `14220` FH with `Math.round(currentEngine.cyclesSinceNew * 1.85)` across `App.tsx` and `PartCard.tsx`.

---

## 2. Closed-Loop Defect Sign-Off (`src/App.tsx`, `src/components/PartCard.tsx`)

- **Full State Resolution on Sign-Off**:
  - Enhance `handleUpdatePartStatus(partId, status)` in `src/App.tsx`:
    - When `status === "default"` (rectified), update `partStatuses` for `partId`.
    - Check if any other component on `currentEngine` remains `"affected"` or `"inspect"`.
    - Update `engines` state (and persist to `localStorage`):
      - If no `"affected"` or `"inspect"` parts remain, set `engine.status = "normal"` and clear resolved `openCaseIds`.
      - If only `"inspect"` parts remain, downgrade `engine.status` from `"action_required"` to `"watch"`.
    - Also dynamically compute flight `overallStatus` and `activeAlertCount` in `FleetDashboard` and `FlightStatusView` from the live `engines` state so the Flight Dashboard immediately reflects the green `NORMAL` status after rectification!

---

## 3. 3D Component Label Anti-Collision (`src/components/EngineCanvas.tsx`)

- **Staggered 3D Label Anchors `[x, y, z]`**:
  - Instead of placing all 10 `<Html>` labels at `[0, labelHeight, 0]` along the top ridge where they collide in assembled view, assign each part a distinct `[labelX, labelY, labelZ]` offset alternating top-left, top-right, bottom-left, and bottom-right with a subtle vertical stem line:
    - `fan_case`: `[-0.8, 2.05, 0.2]`
    - `fan_blades`: `[0.7, 1.65, 0.35]`
    - `fan_drive_gear`: `[-0.85, -1.15, 0]`
    - `lpc`: `[0.75, 1.15, 0]`
    - `hpc`: `[-0.75, 1.35, 0]`
    - `combustor`: `[0.8, -1.05, 0]`
    - `hpt`: `[0.75, 1.25, 0]`
    - `lpt`: `[-0.75, 1.05, 0]`
    - `exhaust`: `[0.65, 0.95, -0.2]`
    - `oil_system`: `[0.95, -1.35, 0.2]`

---

## 4. Engine-Scoped History Logs & Inline Sign-Off Validation (`PartCard.tsx`, `IncidentView.tsx`)

- **Engine-Scoped & Cycle-Consistent Logbook**:
  - Filter `componentLogs` in `PartCard.tsx` and `ComponentHistoryView.tsx` so logs explicitly created for another `engineId` do not bleed across engines, and normalize baseline seeded history entries so their `tailNumber`, `engineId`, `flightCycles`, and `flightHours` scale realistically below `currentEngine.cyclesSinceNew`.
- **Replace `window.alert()` in `IncidentView.tsx`**:
  - Replace `alert("Please provide Certifying Engineer Name and License ID before signing.")` at line 260 of `src/components/IncidentView.tsx` with an inline rose validation alert banner directly inside the Certifying Engineer Sign-Off section.
