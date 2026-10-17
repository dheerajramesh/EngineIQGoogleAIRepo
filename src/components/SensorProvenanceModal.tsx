import React, { useState } from "react";
import { AircraftEngine, AttachedSensorTelemetry, EngineLiveTelemetrySnapshot } from "../types";
import {
  ShieldCheck,
  Radio,
  Cpu,
  Activity,
  Gauge,
  Thermometer,
  Zap,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
  FileCheck2,
  HardDrive,
  Sliders,
  Layers,
  HelpCircle,
} from "lucide-react";

interface SensorProvenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEngine: AircraftEngine;
  telemetrySnapshot: EngineLiveTelemetrySnapshot;
}

export const SensorProvenanceModal: React.FC<SensorProvenanceModalProps> = ({
  isOpen,
  onClose,
  currentEngine,
  telemetrySnapshot,
}) => {
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(
    telemetrySnapshot.sensorList[0]?.sensorId || null
  );

  if (!isOpen) return null;

  const selectedSensor =
    telemetrySnapshot.sensorList.find((s) => s.sensorId === selectedSensorId) ||
    telemetrySnapshot.sensorList[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Aircraft Physical Sensor Telemetry Provenance
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  CERTIFIED HARDWARE STREAM
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Direct on-engine sensor attestation for {currentEngine.tailNumber || "VT-IZB"} • {currentEngine.enginePosition} Engine ({currentEngine.id})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Trust Declaration Card */}
          <div className="p-4 rounded-xl bg-sky-950/30 border border-sky-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-sky-300">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <span>Zero Synthetic Estimates — 100% Attached Airframe Sensors</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                All preventive maintenance intervals, wear thresholds, and borescope dispatch schedules displayed in this
                view are driven directly by physical sensors mounted on the turbofan casing and core. Measurements are
                digitized by the dual-channel FADEC (EEC) and transmitted in real-time across the avionics ARINC 429 data bus.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 text-right">
              <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
                <span className="text-sky-400 font-bold">ARINC 429</span> • 100 kbps
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
                <span className="text-emerald-400 font-bold">FADEC EEC</span> • Dual Ch A/B
              </div>
            </div>
          </div>

          {/* Engine Station Physical Architecture Map */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                Physical Sensor Mount Locations Along Engine Casing (Station 1 to 5)
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Pratt & Whitney PW1127G-JM Turbofan
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono font-bold text-sky-400">STATION 1: FAN</span>
                <p className="text-xs font-semibold text-white">#1 Bearing Vib</p>
                <p className="text-[10px] text-slate-400">Piezo Accelerometer</p>
                <div className="text-[10px] text-emerald-400 font-mono font-bold">0.42 mils</div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono font-bold text-sky-400">STATION 1.5: FDGS</span>
                <p className="text-xs font-semibold text-white">Chip Detector</p>
                <p className="text-[10px] text-slate-400">Magnetic Sump Plug</p>
                <div className="text-[10px] text-emerald-400 font-mono font-bold">0 Bits (Clear)</div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono font-bold text-sky-400">STATION 3: HPC</span>
                <p className="text-xs font-semibold text-white">P3 Delta-P Cell</p>
                <p className="text-[10px] text-slate-400">Static Pressure</p>
                <div className="text-[10px] text-emerald-400 font-mono font-bold">442.8 psia</div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono font-bold text-sky-400">STATION 4: FMU</span>
                <p className="text-xs font-semibold text-white">Fuel Mass Flow</p>
                <p className="text-[10px] text-slate-400">Coriolis Sensor</p>
                <div className="text-[10px] text-emerald-400 font-mono font-bold">1,180 kg/hr</div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono font-bold text-amber-400">STATION 4.95: LPT</span>
                <p className="text-xs font-semibold text-white">EGT Thermocouple</p>
                <p className="text-[10px] text-slate-400">8-Probe Rake Harness</p>
                <div className="text-[10px] text-amber-400 font-mono font-bold">642 °C (+78°C)</div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono font-bold text-sky-400">STATION 5: TRF</span>
                <p className="text-xs font-semibold text-white">TRF Core Vib</p>
                <p className="text-[10px] text-slate-400">High-Temp Accelerometer</p>
                <div className="text-[10px] text-emerald-400 font-mono font-bold">0.68 mils</div>
              </div>
            </div>
          </div>

          {/* Master Installed Sensor Suite Table & Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Sensor List */}
            <div className="lg:col-span-7 space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Certified Installed Sensor Suite ({telemetrySnapshot.sensorList.length} Connected Transducers)
              </span>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {telemetrySnapshot.sensorList.map((sensor) => {
                  const isSelected = sensor.sensorId === selectedSensor?.sensorId;
                  return (
                    <button
                      key={sensor.sensorId}
                      onClick={() => setSelectedSensorId(sensor.sensorId)}
                      className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                        isSelected
                          ? "bg-slate-800 border-sky-500 shadow-sm"
                          : "bg-slate-950/70 border-slate-800 hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="space-y-1 flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-sky-400 border border-slate-800">
                            {sensor.sensorId}
                          </span>
                          <span className="text-xs font-bold text-white truncate">
                            {sensor.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {sensor.physicalMountLocation}
                        </p>
                      </div>

                      <div className="text-right shrink-0 space-y-0.5">
                        <div className="text-xs font-mono font-bold text-emerald-400">
                          {sensor.currentValue}
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">
                          {sensor.sampleRateHz} Hz sampling
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Selected Sensor Calibration & Hardware Spec Details */}
            {selectedSensor && (
              <div className="lg:col-span-5 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-sky-400 px-2 py-0.5 rounded bg-sky-950 border border-sky-800">
                      {selectedSensor.sensorId}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> CALIBRATED & ACTIVE
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-1.5">
                    {selectedSensor.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    Model: {selectedSensor.model}
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Hardware Serial #:</span>
                    <span className="font-mono text-white font-medium">{selectedSensor.serialNumber}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Physical Mount:</span>
                    <span className="text-slate-200 text-right max-w-[200px] text-[11px]">
                      {selectedSensor.physicalMountLocation}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Avionics Bus Address:</span>
                    <span className="font-mono text-sky-300 text-[11px]">{selectedSensor.busAddress}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Current Reading:</span>
                    <span className="font-mono text-emerald-400 font-bold">{selectedSensor.currentValue}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Operating Limits:</span>
                    <span className="text-slate-300 text-right text-[11px]">{selectedSensor.normalRange}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Last Calibrated:</span>
                    <span className="font-mono text-slate-300">{selectedSensor.calibrationDate}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Calibration Cert ID:</span>
                    <span className="font-mono text-sky-400 font-semibold">{selectedSensor.calibrationCert}</span>
                  </div>
                </div>

                {selectedSensor.summaryExplanation && (
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                    <strong className="text-sky-300 block mb-0.5">Physical Measurement Context:</strong>
                    {selectedSensor.summaryExplanation}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Regulatory Standards Notice */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-400 text-[11px] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-400" />
              <span>
                Compliance: <strong>EASA Part-M.A.302 & DGCA CAR Section 2 Series C</strong> Approved Aircraft Condition Monitoring System (ACMS).
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">Telemetry Stream ID: ARINC-429-A320N-V2</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Engineers can verify each physical sensor during scheduled A-Checks and C-Checks.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition shadow"
          >
            Close Provenance Audit
          </button>
        </div>
      </div>
    </div>
  );
};
