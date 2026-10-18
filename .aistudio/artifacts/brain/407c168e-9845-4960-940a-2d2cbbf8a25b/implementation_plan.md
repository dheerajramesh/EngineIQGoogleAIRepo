# EngineIQ Production Polish & Workflow Implementation Plan

This plan addresses all production requirements for the MRO digital twin and aviation maintenance platform, ensuring strict compliance with engineering standards, DGCA CAR-66 authorization, split finding dispositions, and clean UI architecture.

## User Review & Critical Decisions

> [!IMPORTANT]
> - **Confirmed Sign-off Authorization**: Sign-off requires the user's logged-in profile name, an Indian DGCA CAR-66 license number, and a 4-digit security PIN re-entry.
> - **Confirmed Telemetry Simulation**: Real-time simulated vibration & N1 peak telemetry with a live/stale status toggle.
> - **Confirmed Split Findings**: Independent disposition handling (Remove vs Defer) for Fan Blade #8 crack and Containment Ring dent, with conflict review flags.

---

## 1. Overview & Core Concept

- **What It Does**: Refines the MRO inspection, rectification, and sign-off workflow, splits defect findings with independent dispositions, enforces DGCA license & PIN security, introduces live telemetry strips, and cleans up demo artifacts.
- **Key Value**: Professional-grade aviation compliance, zero contradictory data, audit-ready sign-offs, and seamless step-by-step repair workflows.

---

## 2. User Experience & Visual Design

- **Repair Stepper (W1)**: Clear progression `Report -> Measure -> Rectify -> Sign off -> CRS`. Sign-off remains disabled until preceding steps are completed.
- **Split Findings (W2)**: Dedicated cards for Fan Blade #8 Crack and Containment Ring Dent with independent limits, measured values, and dispositions.
- **Telemetry Strip (W5)**: Real-time sensor bar displaying vibration, N1 peak, limits, sparklines, timestamp, and live/stale toggle.
- **Sign-off Security Modal (W4)**: DGCA CAR-66 licence input and 4-digit PIN confirmation prior to record locking.
- **Unified History Timeline (H1/H2)**: Scrollable panel containing open incidents, maintenance logs, and sign-offs with filter chips.

---

## 3. Key Technical Components & Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Fleet & Flight Dashboard                 │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐    ┌─────────────────────────┐
│     Engine 3D Twin View      │    │    Right Panel / Tabs   │
│  - Split Findings (W2)       │    │  - Repair Stepper (W1)  │
│  - Telemetry Strip (W5)      │    │  - Task Status (W3)     │
└──────────────┬───────────────┘    └──────────┬──────────────┘
               │                               │
               └───────────────┬───────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              Sign-Off & CRS Authorization (W4)              │
│       - DGCA CAR-66 License + 4-Digit PIN Verification      │
│       - Immutable Audit Trail & Read-Only Locking           │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Implementation Steps

1. **Defect & Finding Split (W2)**:
   - Update engine data model to separate Finding 1 (Fan Blade #8 Crack) and Finding 2 (Containment Ring Dent).
   - Provide independent disposition controls (Remove / Blend / Defer) and conflict review flag.
2. **Workflow Stepper & Task Logic (W1, W3)**:
   - Implement `Report > Measure > Rectify > Sign off > CRS` stepper in the right panel.
   - Hide Sign Off on compliant tasks; show red "Overdue by N cycles" on overdue items based on current engine CSN.
3. **Sign-Off Security (W4)**:
   - Build DGCA license & 4-digit PIN verification modal.
   - Remove test records (`asd (asd)`, `VT-DEM2-ENG1`, etc.) and standardize Indian CAR-66 license numbers (e.g., `CAR-66/A&P-48921`).
4. **Telemetry & Sensor Strip (W5)**:
   - Add telemetry strip component with vibration (mils pk-pk), N1 peak, limits, sparkline, timestamp, and live/stale toggle.
5. **Life Tracker & LLP Comparison (L1, L2, L3)**:
   - Clean up on-condition parts to show single line ("On-condition. No cycle limit.") and remove LLP banner.
   - Display engine-level LLP comparison table by default with active subsystem highlighted.
6. **History Timeline & Demo Data Cleanup (H1, H2, D1)**:
   - Create unified scrollable timeline with open incidents on top and filter chips with counts.
   - Purge demo leftovers and standardize AMM references (e.g., `AMM 72-10-00`).
