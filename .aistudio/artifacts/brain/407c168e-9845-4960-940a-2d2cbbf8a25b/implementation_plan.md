# Enterprise MRO RBAC, Firebase Auth & Real-Time Firestore Architecture Plan

## 1. Benchmark Against Industry MRO Competitors (Swiss-AS AMOS, Airbus Skywise, Lufthansa AVIATAR)
In production airline MRO platforms (such as **Swiss-AS AMOS** and **Airbus Skywise**), maintenance actions are strictly governed by **CAR-145 / Part-145 Role-Based Access Control (RBAC)** and **Tail/Station Roster Assignments**:
- **Maintenance Control Center (MCC) / Fleet Supervisor (`Supervisor`)**:
  - Holds **full system visibility** across all line stations (`DEL`, `BOM`, `BLR`, `HYD`, `MAA`, `CCU`), all 8 flights, and all 16 engines.
  - Can **assign or reassign specific aircraft tails, flights, and engines to Certifying Line Engineers** from a live **RBAC Roster & Tail Assignment Console**.
  - Can override, audit, or co-sign any rectification or CRS dispatch certificate.
- **Certifying Line Engineer (`Engineer`)**:
  - Has **scoped visibility and write authority** restricted to their **Supervisor-assigned aircraft tails / flights** (with a toggle to request or view read-only fleet reference if permitted).
  - Actions taken by an engineer on their assigned aircraft are synced in real time to the **Fleet Supervisor's MCC dashboard**, while unassigned aircraft remain protected from accidental edits.
- **Trainee / Line Under-Instruction (`Trainee`)**:
  - Operates in a **strictly isolated personal sandbox (`sandbox_state/{uid}`)**. Any simulated incidents, micrometer inputs, or practice sign-offs made by a Trainee are **completely invisible to other users** and never alter live fleet airworthiness.

---

## 2. Firebase Authentication & Firestore Data Architecture
Upon approval of this plan, we will provision Firebase (`firebase_setup` UI + `ProvisionFirebase` RPC) and establish the following collections in `firebase-blueprint.json` and `firestore.rules`:

1. **`/users/{userId}` (`UserProfile`)**:
   - Stores `uid`, `email`, `displayName`, `role` (`Supervisor` | `Engineer` | `Trainee`), `badge` (e.g., `DGCA AME #8842`), `homeBase` (`DEL`, `BOM`, `BLR`, etc.), `assignedFlightNumbers` (bounded array of flight numbers assigned by Supervisor), and `assignedTailNumbers` (bounded array of aircraft registrations).
   - Bootstraps `dheeraj.aimit@gmail.com` with full **Fleet Supervisor** privileges by default.
2. **`/fleet_engines/{engineId}` (`FleetEngineDoc`)**:
   - Real-time operational state for all 16 PW1100G-JM engines (`status`, `cyclesSinceNew`, `openCaseIds`, `partStatuses`, `lastUpdatedBy`, `updatedAt`).
   - Writable by `Supervisor` on all engines, and by `Engineer` on their assigned aircraft tails.
3. **`/case_logs/{caseId}` & `/component_history/{logId}`**:
   - Real-time defect reports, AMM limit evaluations, micrometer measurements, and post-repair rectification sign-offs.
4. **`/flight_crs/{flightId}` (`FlightCRSDoc`)**:
   - Signed Certificate of Release to Service (CRS) dispatch records per flight.
5. **`/user_sandboxes/{userId}` (`UserSandboxDoc`)**:
   - Isolated state for `Trainee` users (or isolated testing mode) so their actions are never visible to other users and never affect live operational flights.

---

## 3. Zero-Breakage Hybrid Authentication & Express Backend (`server.ts`)
To guarantee that **nothing in the existing application breaks** under any network or browser condition:
- **Real Google Sign-In + Instant MRO Role Profile Switcher**:
  - `LoginView.tsx` will feature **Sign in with Google (Firebase Auth)** as the primary enterprise login, automatically creating/loading the user's Firestore RBAC profile.
  - Preserves an **Instant Demo Role Session** mode and **Live Role Switcher** in the header so evaluators can test `Fleet Supervisor (Full Access)`, `Assigned Line Engineer (Scoped Access)`, and `Trainee (Isolated Sandbox)` side-by-side without friction.
- **Resilient Sync Layer (`src/services/firebaseSync.ts`)**:
  - Uses Firestore `onSnapshot` listeners when authenticated with Firebase, with automatic `localStorage` fallback so every 3D interaction, micrometer gauge, rectification worksheet, and CRS release works identically online or offline.
- **Full-Stack Express Server (`server.ts`)**:
  - Runs Express on port `3000` with Vite middleware mounted in dev (`"dev": "tsx server.ts"`), exposing `/api/health` and `/api/rbac/summary` for backend verification while serving the SPA seamlessly.

---

## 4. Planned File Changes
1. **Provision Firebase & Security Rules**:
   - Provision Firebase via `show_aistudio_ui` (`firebase_setup`) and `ProvisionFirebase`.
   - Create `firebase-blueprint.json`, `security_spec.md`, and hardened `firestore.rules` enforcing RBAC (`Supervisor` full access, `Engineer` assigned-tail access, `Trainee` private sandbox isolation).
2. **`src/services/firebase.ts` & `src/components/RBACManagerModal.tsx`**:
   - Initialize Firebase Auth (`GoogleAuthProvider`, `signInWithPopup`) and Firestore (`getFirestore` with `firebaseConfig.firestoreDatabaseId`), plus `handleFirestoreError` diagnostics and startup `getDocFromServer` check.
   - Build the **Supervisor RBAC & Engineer Tail Assignment Console** (`src/components/RBACManagerModal.tsx`) allowing Supervisors to assign/unassign specific flights (`6E 204`, `6E 502`, `6E 112`, etc.) and aircraft tails (`VT-IZB`, `VT-ITG`, `VT-IMR`, etc.) to individual Engineers and control visibility scopes.
3. **`src/components/LoginView.tsx`, `src/components/FleetDashboard.tsx`, & `src/App.tsx`**:
   - Add Google Sign-In button and live Firebase Auth status badge to `LoginView.tsx`.
   - Enforce RBAC filtering in `FleetDashboard.tsx`:
     - **Supervisors** see all 8 flights, all 16 engines, and the **"RBAC & Engineer Assignments"** management button.
     - **Engineers** see their **Assigned Flights & Aircraft Tails** badge and scoped workload (unassigned aircraft are hidden or locked based on Supervisor policy).
     - **Trainees** see an **"Isolated Sandbox Mode — Changes Private to You"** badge where actions are isolated from all other users.
4. **`server.ts` & `package.json`**:
   - Add Express backend entry point on port 3000 with `/api/health` and `/api/rbac/policy` endpoints and Vite dev middleware integration.
