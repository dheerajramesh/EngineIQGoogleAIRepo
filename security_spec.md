# EngineIQ MRO Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Default-Deny Catch-All**: All paths not explicitly matched are denied by default (`match /{document=**} { allow read, write: if false; }`).
2. **PII Isolation**: User email addresses are isolated in `/users/{userId}/private/{infoId}` and never stored in `/users/{userId}`. Only the owner (`request.auth.uid == userId`) or a verified Supervisor (`isAdmin()`) may read `/users/{userId}/private/{infoId}`.
3. **Role Privilege Escalation Prevention**: During self-registration (`create` on `/users/{userId}`), a standard user cannot self-assign `role == 'Supervisor'` unless their verified email matches the bootstrapped Supervisor (`dheeraj.aimit@gmail.com`). Only an existing Supervisor (`isAdmin()`) can promote users or modify `role`, `assignedFlightNumbers`, and `assignedTailNumbers`.
4. **Tail-Scoped RBAC for Engineers**: A Certifying Engineer (`role == 'Engineer'`) can only create or update `/engine_states/{engineId}`, `/flight_crs/{flightId}`, and `/rectification_logs/{logId}` when the target aircraft `tailNumber` (or `aircraftTail`) is present in their Supervisor-assigned `assignedTailNumbers` list, whereas a `Supervisor` has full system access across all tails.
5. **Trainee Sandbox Isolation**: Trainees (`role == 'Trainee'`) cannot write to live operational collections (`/engine_states`, `/flight_crs`, `/rectification_logs`).
6. **Strict Schema, Key Allowlists & Temporal Integrity**: Every `create` and `update` validates `isValid[Entity](incoming())`, enforces exact key allowlists (`hasAll` + `hasOnly`), string `.size()` bounds, regex ID guards (`isValidId()`), and server timestamp (`request.time`) integrity.

---

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Payload 1 (Self-Assigned Supervisor Role)**: Unprivileged user creates `/users/attacker1` with `role: "Supervisor"`. -> `PERMISSION_DENIED`
2. **Payload 2 (Shadow Field Injection on UserProfile)**: Authenticated user updates `/users/user1` adding `"isAdmin": true`. -> `PERMISSION_DENIED`
3. **Payload 3 (Cross-User PII Read)**: Authenticated user `user2` attempts `get` on `/users/user1/private/info`. -> `PERMISSION_DENIED`
4. **Payload 4 (Unverified Email Spoof)**: User with `email: "dheeraj.aimit@gmail.com"` but `email_verified: false` attempts Supervisor assignment update. -> `PERMISSION_DENIED`
5. **Payload 5 (Unassigned Tail Write by Engineer)**: Engineer assigned only to `["VT-IZB"]` attempts to update `/engine_states/VT-DEM2-ENG1` (`tailNumber: "VT-ITG"`). -> `PERMISSION_DENIED`
6. **Payload 6 (Trainee Live Fleet Write)**: User with `role: "Trainee"` attempts to write `/engine_states/VT-DEM1-ENG2`. -> `PERMISSION_DENIED`
7. **Payload 7 (ID Poisoning Attack)**: User attempts to create `/rectification_logs/invalid$id!@#` with non-alphanumeric characters. -> `PERMISSION_DENIED`
8. **Payload 8 (Denial-of-Wallet Oversized String)**: Engineer sends a 10,000-character `releaseRemarks` string to `/flight_crs/6E-204`. -> `PERMISSION_DENIED`
9. **Payload 9 (Unbounded Array Overflow)**: Supervisor attempts to assign 25 flights in `assignedFlightNumbers` (limit is 10). -> `PERMISSION_DENIED`
10. **Payload 10 (Forged Client Timestamp)**: Engineer creates `/flight_crs/6E-204` with a past/future `createdAt` instead of `request.time`. -> `PERMISSION_DENIED`
11. **Payload 11 (Identity Spoofing on Rectification Log)**: Engineer creates `/rectification_logs/log-1` with `engineerUid` set to another engineer's UID. -> `PERMISSION_DENIED`
12. **Payload 12 (Immutable Field Tampering)**: Engineer updates `/engine_states/VT-DEM1-ENG2` and attempts to mutate `engineId` or `tailNumber`. -> `PERMISSION_DENIED`
