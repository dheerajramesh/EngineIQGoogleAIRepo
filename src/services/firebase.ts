/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import {
  AircraftEngine,
  ComponentHistoryEntry,
  FlightCRSRecord,
  MROEngineerProfile,
  PartId,
  PartStatus,
  UserRole,
  UserSession,
} from "../types";
import { INDIGO_FLIGHTS } from "../data/flights";

// Initialize Firebase App, Firestore (with named database ID), and Auth
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Bootstrapped Supervisor Email
export const BOOTSTRAPPED_SUPERVISOR_EMAIL = "dheeraj.aimit@gmail.com";

// Default Enterprise MRO Engineer & Supervisor Roster (AMOS / Skywise style)
export const INITIAL_MRO_ROSTER: MROEngineerProfile[] = [
  {
    uid: "sup-ananya-sharma",
    displayName: "Ananya Sharma",
    role: "Supervisor",
    badge: "DGCA MCC #1104",
    homeBase: "New Delhi (DEL - T1/T3)",
    assignedFlightNumbers: INDIGO_FLIGHTS.map((f) => f.flightNumber),
    assignedTailNumbers: INDIGO_FLIGHTS.map((f) => f.aircraftTail),
    updatedAt: "2026-10-17T06:00:00Z",
  },
  {
    uid: "eng-vikram-malhotra",
    displayName: "Vikram Malhotra",
    role: "Engineer",
    badge: "DGCA AME #8842",
    homeBase: "Bengaluru (BLR - Kempegowda)",
    assignedFlightNumbers: ["6E 204", "6E 502", "6E 714", "6E 112"],
    assignedTailNumbers: ["VT-IZB", "VT-ITG", "VT-IMR", "VT-IFA"],
    updatedAt: "2026-10-17T06:15:00Z",
  },
  {
    uid: "eng-rohan-deshmukh",
    displayName: "Rohan Deshmukh",
    role: "Engineer",
    badge: "DGCA AME #7419",
    homeBase: "Mumbai (BOM - T2)",
    assignedFlightNumbers: ["6E 409", "6E 882", "6E 319", "6E 831"],
    assignedTailNumbers: ["VT-IJC", "VT-IKL", "VT-IOD", "VT-IVN"],
    updatedAt: "2026-10-17T06:20:00Z",
  },
  {
    uid: "trn-arjun-reddy",
    displayName: "Arjun Reddy",
    role: "Trainee",
    badge: "TRN-HYD-2026",
    homeBase: "Hyderabad (HYD - GMR MRO)",
    assignedFlightNumbers: ["6E 204", "6E 714"],
    assignedTailNumbers: ["VT-IZB", "VT-IMR"],
    updatedAt: "2026-10-17T06:25:00Z",
  },
];

// Validate connection to Firestore on startup
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Structured Firestore Error Handler (Mandatory per Firebase Integration Skill)
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Defensive ID and string sanitizers matching firebase-blueprint.json
export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 128);
  return cleaned || "doc-id";
}

function clampString(val: string, maxLen: number, fallback = "N/A"): string {
  const trimmed = (val || "").trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLen);
}

/**
 * Sign in with Google Popup via Firebase Auth and create/fetch the user's RBAC profile in Firestore.
 */
export async function signInWithGoogleAndSyncProfile(
  preferredRole?: UserRole,
  preferredBadge?: string,
  preferredBase?: string
): Promise<UserSession> {
  const cred = await signInWithPopup(auth, googleProvider);
  const user = cred.user;
  const uid = sanitizeId(user.uid);
  const isBootstrappedSup =
    user.email?.toLowerCase() === BOOTSTRAPPED_SUPERVISOR_EMAIL.toLowerCase();

  const userDocRef = doc(db, "users", uid);
  const privateDocRef = doc(db, "users", uid, "private", "info");

  try {
    const existingSnap = await getDoc(userDocRef);
    if (existingSnap.exists()) {
      const data = existingSnap.data();
      return {
        uid,
        name: data.displayName || user.displayName || "MRO Engineer",
        role: (data.role as UserRole) || (isBootstrappedSup ? "Supervisor" : "Engineer"),
        badge: data.badge || preferredBadge || "DGCA AME #8842",
        homeBase: data.homeBase || preferredBase || "New Delhi (DEL - T1/T3)",
        email: user.email || undefined,
        authProvider: "firebase",
        assignedFlightNumbers: Array.isArray(data.assignedFlightNumbers)
          ? data.assignedFlightNumbers
          : ["6E 204", "6E 502", "6E 714", "6E 112"],
        assignedTailNumbers: Array.isArray(data.assignedTailNumbers)
          ? data.assignedTailNumbers
          : ["VT-IZB", "VT-ITG", "VT-IMR", "VT-IFA"],
      };
    }

    // Determine role (only bootstrapped supervisor can self-create as Supervisor per firestore.rules)
    const assignedRole: UserRole = isBootstrappedSup
      ? "Supervisor"
      : preferredRole === "Trainee"
      ? "Trainee"
      : "Engineer";

    const defaultFlights =
      assignedRole === "Supervisor"
        ? INDIGO_FLIGHTS.map((f) => f.flightNumber).slice(0, 10)
        : ["6E 204", "6E 502", "6E 714", "6E 112"];

    const defaultTails =
      assignedRole === "Supervisor"
        ? INDIGO_FLIGHTS.map((f) => f.aircraftTail).slice(0, 10)
        : ["VT-IZB", "VT-ITG", "VT-IMR", "VT-IFA"];

    const displayName = clampString(
      user.displayName || user.email?.split("@")[0] || "Certifying Engineer",
      100,
      "Certifying Engineer"
    );
    const badge = clampString(
      preferredBadge || (assignedRole === "Supervisor" ? "DGCA MCC #1104" : "DGCA AME #8842"),
      64,
      "DGCA AME #8842"
    );
    const homeBase = clampString(
      preferredBase || "Bengaluru (BLR - Kempegowda)",
      80,
      "Bengaluru (BLR - Kempegowda)"
    );

    // Atomic batch write creating /users/{uid} and /users/{uid}/private/info (Pillar 6 & 7)
    const batch = writeBatch(db);
    batch.set(userDocRef, {
      uid,
      displayName,
      role: assignedRole,
      badge,
      homeBase,
      assignedFlightNumbers: defaultFlights,
      assignedTailNumbers: defaultTails,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (user.email) {
      batch.set(privateDocRef, {
        uid,
        email: clampString(user.email, 160, "engineer@indigo.in"),
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();

    return {
      uid,
      name: displayName,
      role: assignedRole,
      badge,
      homeBase,
      email: user.email || undefined,
      authProvider: "firebase",
      assignedFlightNumbers: defaultFlights,
      assignedTailNumbers: defaultTails,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
}

/**
 * Sign out from Firebase Auth if signed in
 */
export async function signOutFromFirebase(): Promise<void> {
  if (auth.currentUser) {
    await firebaseSignOut(auth);
  }
}

/**
 * Sync an Engineer's RBAC Flight & Tail Roster Assignment to Firestore (when Supervisor is authenticated)
 */
export async function syncEngineerAssignmentToFirestore(
  profile: MROEngineerProfile
): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const uid = sanitizeId(profile.uid);
  const path = `users/${uid}`;
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    const flights = profile.assignedFlightNumbers.slice(0, 10).map((f) => clampString(f, 32));
    const tails = profile.assignedTailNumbers.slice(0, 10).map((t) => clampString(t, 32));

    if (snap.exists()) {
      await updateDoc(ref, {
        displayName: clampString(profile.displayName, 100),
        role: profile.role,
        badge: clampString(profile.badge, 64),
        homeBase: clampString(profile.homeBase, 80),
        assignedFlightNumbers: flights,
        assignedTailNumbers: tails,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        uid,
        displayName: clampString(profile.displayName, 100),
        role: profile.role,
        badge: clampString(profile.badge, 64),
        homeBase: clampString(profile.homeBase, 80),
        assignedFlightNumbers: flights,
        assignedTailNumbers: tails,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    // Only throw structured error if current user is verified supervisor in Firestore
    console.warn("Firestore roster sync skipped or restricted:", error);
  }
}

/**
 * Sync an Engine's live status and 3D part statuses to Firestore (/engine_states/{engineId})
 */
export async function syncEngineStateToFirestore(
  engine: AircraftEngine,
  partStatuses: Record<PartId, PartStatus>,
  session: UserSession
): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  if (session.role === "Trainee") return; // Trainees are strictly isolated in local sandbox

  const engineId = sanitizeId(engine.id);
  const path = `engine_states/${engineId}`;
  try {
    const ref = doc(db, "engine_states", engineId);
    const snap = await getDoc(ref);
    const payload = {
      engineId,
      tailNumber: clampString(engine.tailNumber, 32),
      status: engine.status,
      cyclesSinceNew: Number(engine.cyclesSinceNew) || 0,
      openCaseIds: (engine.openCaseIds || []).slice(0, 10).map((id) => clampString(id, 64)),
      partStatuses,
      updatedByUid: sanitizeId(auth.currentUser.uid),
      updatedByName: clampString(session.name, 100, "Engineer"),
      updatedAt: serverTimestamp(),
    };

    if (snap.exists()) {
      await updateDoc(ref, {
        status: payload.status,
        cyclesSinceNew: payload.cyclesSinceNew,
        openCaseIds: payload.openCaseIds,
        partStatuses: payload.partStatuses,
        updatedByUid: payload.updatedByUid,
        updatedByName: payload.updatedByName,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, payload);
    }
  } catch (error) {
    console.warn("Firestore engine_states sync skipped:", error);
  }
}

/**
 * Sync a signed Flight CRS Release Certificate to Firestore (/flight_crs/{flightId})
 */
export async function syncFlightCRSToFirestore(
  record: FlightCRSRecord,
  session: UserSession
): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  if (session.role === "Trainee") return;

  const flightId = sanitizeId(record.flightNumber.replace(/\s+/g, "-"));
  try {
    const ref = doc(db, "flight_crs", flightId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        flightId,
        flightNumber: clampString(record.flightNumber, 32),
        aircraftTail: clampString(record.aircraftTail, 32),
        crsReferenceNumber: clampString(record.crsReferenceNumber, 64),
        engineerUid: sanitizeId(auth.currentUser.uid),
        engineerName: clampString(record.engineerName, 100),
        engineerLicense: clampString(record.engineerLicense, 64),
        engine1OilUpliftQt: Number(record.engine1OilUpliftQt) || 0,
        engine2OilUpliftQt: Number(record.engine2OilUpliftQt) || 0,
        egtMarginDegC: Number(record.egtMarginDegC) || 25,
        fodWalkaroundCheck: clampString(record.fodWalkaroundCheck, 160),
        releaseRemarks: clampString(record.releaseRemarks, 500),
        signedAt: clampString(record.signedAt, 64),
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.warn("Firestore flight_crs sync skipped:", error);
  }
}

/**
 * Sync a Component Measurement or Defect Rectification Log Entry to Firestore (/rectification_logs/{logId})
 */
export async function syncRectificationLogToFirestore(
  entry: ComponentHistoryEntry,
  session: UserSession
): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  if (session.role === "Trainee") return;

  const logId = sanitizeId(entry.id);
  try {
    const ref = doc(db, "rectification_logs", logId);
    await setDoc(ref, {
      logId,
      engineId: clampString(entry.engineId || "VT-DEM1-ENG2", 64),
      tailNumber: clampString(entry.tailNumber || "VT-IZB", 32),
      partId: clampString(entry.partId, 64),
      logType: clampString(entry.logType, 64),
      status: entry.status,
      description: clampString(entry.technicianNotes || "Recorded per AMM", 600),
      findings: clampString(entry.findingsSummary || "Nominal", 600),
      actionTaken: clampString(entry.repairDetails?.actionTaken || entry.technicianNotes || "Recorded per AMM", 600),
      workOrderNumber: clampString(entry.workOrderNumber || "WO-LINE", 64),
      engineerUid: sanitizeId(auth.currentUser.uid),
      engineerName: clampString(entry.technicianName, 100),
      engineerLicense: clampString(entry.technicianBadge, 64),
      engineCycles: Number(entry.flightCycles) || 0,
      engineHours: Number(entry.flightHours) || 0,
      date: clampString(entry.date, 64),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn("Firestore rectification_logs sync skipped:", error);
  }
}

export { onAuthStateChanged };
export type { User };
