# UI Streamlining & Predictive Maintenance Refinement

A targeted refinement across the navigation headers, 3D engine canvas overlays, component widget dropdowns, and log boxes to declutter the interface and eliminate visual overflow.

## User Review & Critical Decisions

> [!IMPORTANT]
> All architectural and UX decisions have been aligned with the user's responses:

- **Confirmed Decision 1 (Log Box Scrollbar)**: Add custom scrollbars with constrained height to both the **Component History timeline logbook** and the **Incident Intake Draft Tech Log text box**.
- **Confirmed Decision 2 (Predictive Maintenance & Tab Bar)**: Remove the "Preventive Maint.", "Case Log", and "Evaluation" tabs from the bottom footer bar. Rename the component tab in `PartCard` and all maintenance views from "Preventive" to **"Predictive Maintenance"**.
- **Confirmed Decision 3 (Subsystem Selector Containment)**: Convert the subsystem selector into a responsive, full-width contained dropdown with text truncation so it never overflows the widget boundary.
- **Confirmed Decision 4 (3D Labels During Modal)**: Constrain Drei `<Html>` `zIndexRange` and conditionally suppress 3D floating part tags when `AboutModal` or other modal dialogs are active.

---

## 1. Overview & Core Concept

- **What It Does**: Polishes the Engine Workspace by removing redundant telemetry badges ("Global Engine Cycles", "14,220 FH", "Live AD Search"), simplifying the back button to a clean arrow icon, fixing 3D canvas labels bleeding over the About modal, eliminating widget overflow on the Subsystem selector, adding scroll containment to log boxes, and focusing the bottom navigation strictly on core views (3D Assembly, Specs & Cutaway, Incident Intake).
- **Target Audience**: Certifying line maintenance engineers and airline powerplant managers reviewing turbofan subsystems without visual distractions or UI clipping.
- **Key Value**: Crisp, clutter-free HUD experience with smooth scrolling in logbooks and clean containment within the right-side card.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Top Header & Back Navigation**:
   - The back button shows an uncluttered `←` arrow (`<ArrowLeft />`), instantly returning the user to the Flight Operations schedule.
   - The central metric clutter (`Global Engine Cycles` and `14,220 FH`) and the `Live AD Search` button are removed, leaving a calm, focused header with aircraft twin-engine switcher and user profile.
2. **Subsystem Dropdown**:
   - The Subsystem selector inside `PartCard` is styled with full-width layout, clean borders, and text truncation (`truncate`), eliminating any horizontal overflow outside the right panel.
3. **About Modal & 3D Canvas Cleanliness**:
   - Clicking "About" opens the modal with high z-index backdrop (`z-[100]`), while 3D component tag labels (`<Html>`) are either clipped with low z-index or hidden while the modal is open.
4. **Predictive Maintenance Renaming & Bottom Tabs**:
   - The PartCard second tab is now titled **"Predictive Maintenance"** (with Wrench icon and due-count badge).
   - Bottom navigation footer is streamlined to 3 focused tabs: `3D Assembly`, `Specs & Cutaway`, and `Incident Intake`. "Preventive Maint.", "Case Log", and "Evaluation" are removed from the bottom bar.
5. **Log Box Scrollability**:
   - **Component History**: The timeline log list is wrapped in an overflow container (`max-h-[480px] overflow-y-auto pr-1`) with a sleek custom scrollbar.
   - **Incident Intake Draft Tech Log**: The draft aircraft logbook textarea features a constrained height and styled scrollbar.

### ASCII System Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [←]   [ No.1 Left Wing ] [ No.2 Right Wing ]       [Dark/Light] [About] [User]│
├──────────────────────────────────────┬───────────────────────────────────────┤
│                                      │ [ Subsystem: Fan Blades (Zone A) ▼ ]  │
│                                      ├───────────────────────────────────────┤
│                                      │ [Specs] [Predictive] [Life] [History] │
│          3D TURBOFAN ASSEMBLY        ├───────────────────────────────────────┤
│                                      │ Component Details / Copilot Box       │
│    (3D labels hidden when About      │                                       │
│          modal is opened)            │ LOG BOX (Max-Height + Scrollbar)      │
│                                      │ ┌───────────────────────────────────┐ │
│                                      │ │ WO-2026-8192 | Borescope NDT      │ │
│                                      │ │ WO-2026-4102 | Daily Check    [▲] │ │
│                                      │ │ WO-2026-1182 | Ultrasonic     [█] │ │
│                                      │ └───────────────────────────────[▼]─┘ │
├──────────────────────────────────────┴───────────────────────────────────────┤
│ [ 3D Assembly ]   [ Specs & Cutaway ]   [ Incident Intake ]   ● Telemetry OK │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Removal of Redundant Top Telemetry & Live AD Button**:
  - *Chosen Approach*: Remove "Global Engine Cycles", "14,220 FH", and the standalone "Live AD Search" button from the top navigation bar.
  - *Why*: The engine cycles are already visible in the engine selector buttons (`No.1 5,120 CSN`), and Google Search Grounding is embedded inside the Component Copilot and Incident Diagnosis.
- **Decision 2: 3D Html Labels Stacking Fix**:
  - *Chosen Approach*: Set `<Html zIndexRange={[10, 0]}>` in `EngineCanvas.tsx`, increase `AboutModal` wrapper to `z-[100]`, and pass `isModalOpen` prop to suppress labels while modals are open.
  - *Why*: Drei's `<Html>` defaults to `zIndexRange: [16777271, 0]`, causing 3D DOM labels to pierce through modal backdrops.
- **Decision 3: Predictive Maintenance Rebranding**:
  - *Chosen Approach*: Replace "Preventive" with "Predictive" across all component tabs, task headers, and CAMO descriptions. Remove the bottom footer tab as requested.

---

## 4. Technical Architecture & Component Changes

- **`src/App.tsx`**:
  - Update `#btn-back-to-fleet` to display only `<ArrowLeft className="w-4 h-4" />`.
  - Remove center telemetry block containing "Global Engine Cycles" and "14,220 FH".
  - Remove `#btn-open-search-grounding-top` ("Live AD Search").
  - In bottom footer `<nav>`: remove `#tab-mode-preventive`, `#tab-mode-caselog`, and `#tab-mode-evaluation`.
  - Pass `isModalOpen={showAboutModal || !!activeDoc || isSearchModalOpen}` to `EngineCanvas`.
- **`src/components/EngineCanvas.tsx`**:
  - Receive `isModalOpen?: boolean`.
  - In `<Html>`, set `zIndexRange={[10, 0]}` and conditionally hide when `isModalOpen` is true.
- **`src/components/AboutModal.tsx`**:
  - Ensure backdrop and container use `z-[100]`.
- **`src/components/PartCard.tsx`**:
  - Restyle Subsystem selector container to `w-full` with `truncate` on the `<select>` to guarantee it never extends beyond the card.
  - Remove any "Global CSN" pill from the subsystem bar.
  - Rename tab from "Preventive" to "Predictive Maintenance" / "Predictive".
- **`src/components/ComponentHistoryView.tsx`**:
  - Wrap the timeline logbook list (`filteredLogs`) in a scrollable container with `max-h-[460px] overflow-y-auto pr-1` and custom scrollbar styling.
- **`src/components/IncidentView.tsx`**:
  - Ensure the Draft Technical Log textarea has clean scrollbar styling and responsive height.
- **`src/components/ComponentPreventiveTab.tsx` & `PreventiveMaintenanceView.tsx`**:
  - Update user-facing text from "Preventive" to "Predictive Maintenance".
