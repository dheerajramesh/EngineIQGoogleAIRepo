/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { FlightInfo, MROEngineerProfile, UserSession } from "../types";
import { INDIGO_FLIGHTS } from "../data/flights";
import {
  ShieldCheck,
  Users,
  Plane,
  Lock,
  CheckCircle2,
  Plus,
  X,
  UserCheck,
  Building2,
  Award,
  ArrowRight,
  Sparkles,
  Check,
} from "lucide-react";

interface RBACManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  roster: MROEngineerProfile[];
  onUpdateEngineerProfile: (updatedProfile: MROEngineerProfile) => void;
  onAddEngineerProfile: (newProfile: MROEngineerProfile) => void;
  onImpersonateProfile?: (profile: MROEngineerProfile) => void;
  currentSession: UserSession;
}

export function RBACManagerModal({
  isOpen,
  onClose,
  roster,
  onUpdateEngineerProfile,
  onAddEngineerProfile,
  onImpersonateProfile,
  currentSession,
}: RBACManagerModalProps) {
  const engineersOnly = roster.filter((p) => p.role === "Engineer");
  const [selectedUid, setSelectedUid] = useState<string>(
    engineersOnly[0]?.uid || roster[0]?.uid || ""
  );

  // Add New Engineer Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBadge, setNewBadge] = useState("DGCA AME #9105");
  const [newBase, setNewBase] = useState("Chennai (MAA - T1)");
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedProfile =
    roster.find((p) => p.uid === selectedUid) || engineersOnly[0] || roster[0];

  const isSupervisor = currentSession.role === "Supervisor";

  const handleToggleFlightTail = (flight: FlightInfo) => {
    if (!selectedProfile || !isSupervisor) return;
    const hasFlight = selectedProfile.assignedFlightNumbers.includes(flight.flightNumber);

    let nextFlights: string[];
    let nextTails: string[];

    if (hasFlight) {
      nextFlights = selectedProfile.assignedFlightNumbers.filter(
        (f) => f !== flight.flightNumber
      );
      nextTails = selectedProfile.assignedTailNumbers.filter(
        (t) => t !== flight.aircraftTail
      );
    } else {
      nextFlights = Array.from(
        new Set([...selectedProfile.assignedFlightNumbers, flight.flightNumber])
      ).slice(0, 10);
      nextTails = Array.from(
        new Set([...selectedProfile.assignedTailNumbers, flight.aircraftTail])
      ).slice(0, 10);
    }

    const updated: MROEngineerProfile = {
      ...selectedProfile,
      assignedFlightNumbers: nextFlights,
      assignedTailNumbers: nextTails,
      updatedAt: new Date().toISOString(),
    };

    onUpdateEngineerProfile(updated);
    setSavedBanner(
      `Updated RBAC access for ${selectedProfile.displayName}: ${nextTails.length} aircraft tail(s) assigned.`
    );
  };

  const handleAssignAllTails = () => {
    if (!selectedProfile || !isSupervisor) return;
    const allFlights = INDIGO_FLIGHTS.map((f) => f.flightNumber).slice(0, 10);
    const allTails = INDIGO_FLIGHTS.map((f) => f.aircraftTail).slice(0, 10);
    onUpdateEngineerProfile({
      ...selectedProfile,
      assignedFlightNumbers: allFlights,
      assignedTailNumbers: allTails,
      updatedAt: new Date().toISOString(),
    });
    setSavedBanner(`Granted full 8-aircraft line access to ${selectedProfile.displayName}.`);
  };

  const handleAddEngineer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newBadge.trim()) return;
    const uid = `eng-${newName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .slice(0, 24)}-${Date.now().toString().slice(-4)}`;
    const profile: MROEngineerProfile = {
      uid,
      displayName: newName.trim(),
      role: "Engineer",
      badge: newBadge.trim(),
      homeBase: newBase,
      assignedFlightNumbers: ["6E 204", "6E 714"],
      assignedTailNumbers: ["VT-IZB", "VT-IMR"],
      updatedAt: new Date().toISOString(),
    };
    onAddEngineerProfile(profile);
    setSelectedUid(uid);
    setNewName("");
    setShowAddForm(false);
    setSavedBanner(`Added ${profile.displayName} (${profile.badge}) to MRO Line Roster.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-2xl bg-[#070d1d] border border-sky-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/15 border border-sky-500/40 text-sky-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold font-mono text-white uppercase tracking-wide">
                  CAR-145 / Part-145 RBAC & Engineer Tail Assignment Console
                </h2>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-mono font-bold uppercase">
                  Firebase + Firestore RBAC Active
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Benchmarked against Swiss-AS AMOS & Airbus Skywise MCC • Supervisor assigns specific aircraft tails to Line Engineers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* 3-Tier Enterprise MRO Isolation Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-500/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-300 uppercase">1. Fleet Supervisor (MCC)</span>
                <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px]">
                  Full System
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                Global visibility across all 8 flights & 16 engines. Assigns aircraft tails to Line Engineers and audits all CRS releases.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-300 uppercase">2. Certifying Engineer</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                  Assigned Tails Only
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                Scoped strictly to Supervisor-assigned aircraft tails. Unassigned aircraft are hidden so engineers never overwrite each other's work.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 uppercase">3. Trainee Sandbox</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                  Private Isolation
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                Operates in an isolated sandbox. Simulated defects or practice sign-offs are never visible to other users or live operations.
              </p>
            </div>
          </div>

          {savedBanner && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/60 flex items-center justify-between text-xs font-mono text-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{savedBanner}</span>
              </div>
              <button
                onClick={() => setSavedBanner(null)}
                className="text-emerald-400 hover:text-white text-[10px] uppercase"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Roster & Assignment Split Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Personnel Roster */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>MRO Line Roster ({roster.length})</span>
                </h3>
                {isSupervisor && (
                  <button
                    type="button"
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-[11px] font-mono font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showAddForm ? "Cancel" : "Add Engineer"}</span>
                  </button>
                )}
              </div>

              {showAddForm && isSupervisor && (
                <form
                  onSubmit={handleAddEngineer}
                  className="p-3.5 rounded-xl bg-slate-900 border border-sky-500/50 space-y-2.5 text-xs font-mono"
                >
                  <div className="text-[11px] font-bold text-sky-300 uppercase">
                    Enroll New Certifying Line Engineer
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">
                      Engineer Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Capt. Siddharth Iyer"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">
                        DGCA AME License *
                      </label>
                      <input
                        type="text"
                        required
                        value={newBadge}
                        onChange={(e) => setNewBadge(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-sky-300 font-bold focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">
                        Station Base
                      </label>
                      <input
                        type="text"
                        value={newBase}
                        onChange={(e) => setNewBase(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs transition cursor-pointer"
                  >
                    Create Engineer Profile & Assign Default Tails
                  </button>
                </form>
              )}

              <div className="space-y-2">
                {roster.map((person) => {
                  const isSelected = person.uid === selectedProfile?.uid;
                  return (
                    <div
                      key={person.uid}
                      onClick={() => setSelectedUid(person.uid)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? "bg-sky-950/40 border-sky-500 shadow-lg"
                          : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-white font-sans flex items-center gap-2">
                            <span>{person.displayName}</span>
                            {currentSession.name.includes(person.displayName) && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono uppercase">
                                Active Session
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            {person.badge} • {person.homeBase.split(" ")[0]}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            person.role === "Supervisor"
                              ? "bg-sky-950 text-sky-300 border border-sky-700"
                              : person.role === "Engineer"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                              : "bg-amber-950 text-amber-300 border border-amber-700"
                          }`}
                        >
                          {person.role}
                        </span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-400">
                          {person.role === "Supervisor"
                            ? "All 8 Flights • 16 Engines"
                            : person.role === "Trainee"
                            ? "Isolated Training Sandbox"
                            : `${person.assignedTailNumbers.length} Assigned Tail(s): ${
                                person.assignedTailNumbers.join(", ") || "None"
                              }`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Aircraft Tail & Flight Assignment Matrix for Selected Person */}
            <div className="lg:col-span-7 p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
              {selectedProfile && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div>
                      <div className="text-xs font-mono text-sky-400 uppercase font-bold">
                        Access Scope Configuration
                      </div>
                      <h4 className="text-base font-bold text-white mt-0.5">
                        {selectedProfile.displayName} ({selectedProfile.badge})
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedProfile.role === "Engineer" && isSupervisor && (
                        <button
                          type="button"
                          onClick={handleAssignAllTails}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-mono font-bold transition cursor-pointer"
                        >
                          Assign All 8 Aircraft
                        </button>
                      )}
                      {onImpersonateProfile && (
                        <button
                          type="button"
                          onClick={() => {
                            onImpersonateProfile(selectedProfile);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow transition cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Switch View to {selectedProfile.displayName.split(" ")[0]}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {selectedProfile.role === "Supervisor" ? (
                    <div className="p-4 rounded-xl bg-sky-950/30 border border-sky-500/40 text-xs font-mono text-sky-200 space-y-2">
                      <div className="font-bold text-sky-300 uppercase flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-sky-400" />
                        <span>MCC Fleet Supervisor — Unrestricted System Authority</span>
                      </div>
                      <p className="font-sans text-slate-300 leading-relaxed">
                        Supervisors have permanent read/write access across all 8 flights, 16 PW1100G-JM engines, and all station bases, plus the ability to assign aircraft tails to Certifying Line Engineers.
                      </p>
                    </div>
                  ) : selectedProfile.role === "Trainee" ? (
                    <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs font-mono text-amber-200 space-y-2">
                      <div className="font-bold text-amber-300 uppercase flex items-center gap-2">
                        <Lock className="w-4 h-4 text-amber-400" />
                        <span>Trainee Sandbox — Strict Write Isolation</span>
                      </div>
                      <p className="font-sans text-slate-300 leading-relaxed">
                        Trainees operate in a personal sandbox container. Any simulated incidents, micrometer measurements, or practice sign-offs they perform are stored privately and never affect live aircraft or other users.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                        <span>
                          Click any flight / aircraft tail below to grant or revoke line certification access for{" "}
                          <strong className="text-white">{selectedProfile.displayName}</strong>:
                        </span>
                        <span className="text-emerald-400 font-bold">
                          {selectedProfile.assignedTailNumbers.length} / {INDIGO_FLIGHTS.length} Assigned
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {INDIGO_FLIGHTS.map((flight) => {
                          const isAssigned =
                            selectedProfile.assignedFlightNumbers.includes(flight.flightNumber) ||
                            selectedProfile.assignedTailNumbers.includes(flight.aircraftTail);

                          return (
                            <button
                              key={flight.flightNumber}
                              type="button"
                              disabled={!isSupervisor}
                              onClick={() => handleToggleFlightTail(flight)}
                              className={`p-3 rounded-xl border text-left transition flex items-start justify-between gap-2 ${
                                isAssigned
                                  ? "bg-emerald-950/40 border-emerald-500/70 text-white shadow-sm"
                                  : "bg-slate-950/70 border-slate-800 text-slate-400 opacity-75 hover:opacity-100"
                              } ${isSupervisor ? "cursor-pointer" : "cursor-not-allowed"}`}
                            >
                              <div className="space-y-0.5 font-mono">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-extrabold text-white">
                                    {flight.flightNumber}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-[10px] text-sky-300 font-bold">
                                    {flight.aircraftTail}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {flight.origin.code} → {flight.destination.code} • {flight.engine1Id.split("-ENG")[0]}
                                </div>
                              </div>

                              <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                                  isAssigned
                                    ? "bg-emerald-500 text-slate-950"
                                    : "bg-slate-900 border border-slate-700 text-transparent"
                                }`}
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>
            Firestore Security Rules (`firestore.rules`) enforce `canAccessTail(tailNumber)` on every write.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-bold transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
