import { AttachedSensorTelemetry, EngineLiveTelemetrySnapshot, AircraftEngine, PartId } from "../types";

// Master catalogue of direct aircraft physical sensors attached to the engine
export const ATTACHED_ENGINE_SENSORS: AttachedSensorTelemetry[] = [
  {
    sensorId: "SENS-VIB-BRG1",
    name: "Bearing #1 Fan Shaft Piezoelectric Accelerometer",
    model: "Endevco 6233C-50 High-Temp Vibrosensor",
    serialNumber: "SN-VIB-99214-A",
    busAddress: "ARINC 429 Bus A • Word 341 (Ch A)",
    physicalMountLocation: "Fan Case / #1 Bearing Housing (Forward Frame 12 o'clock)",
    metricType: "vibration",
    currentValue: "0.42 mils pk-pk",
    unit: "mils pk-pk",
    normalRange: "< 1.20 mils (Advisory @ 1.50, Alert @ 2.00)",
    status: "nominal",
    calibrationDate: "2026-03-15",
    calibrationCert: "NIST/DGCA-CAL-2026-8812",
    sampleRateHz: 64,
    summaryExplanation: "Directly attached to the #1 bearing scavenge housing. Tracks low-pressure spool (N1) dynamic imbalance and fan blade integrity.",
  },
  {
    sensorId: "SENS-VIB-TRF",
    name: "Turbine Rear Frame (TRF) Core Accelerometer",
    model: "Meggitt Vibro-Meter CA901 Hardline",
    serialNumber: "SN-VIB-88402-B",
    busAddress: "ARINC 429 Bus A • Word 342 (Ch B)",
    physicalMountLocation: "Turbine Rear Frame Strut 6 Inner Ring (Station 5)",
    metricType: "vibration",
    currentValue: "0.68 mils pk-pk",
    unit: "mils pk-pk",
    normalRange: "< 1.40 mils (Advisory @ 1.70, Alert @ 2.20)",
    status: "nominal",
    calibrationDate: "2026-04-10",
    calibrationCert: "NIST/DGCA-CAL-2026-8904",
    sampleRateHz: 64,
    summaryExplanation: "Attached to the high-temperature core turbine frame. Detects high-pressure spool (N2) bearing eccentricity and rotor blade vibration.",
  },
  {
    sensorId: "SENS-EGT-RAKE",
    name: "LPT Exhaust Gas Temperature (EGT) 8-Probe Rake",
    model: "Ametek T-49 Dual-Immersion Chromel-Alumel (Type K)",
    serialNumber: "SN-EGT-55410-C",
    busAddress: "ARINC 429 Bus B • Word 270 (Dual EEC Channels)",
    physicalMountLocation: "LPT Exhaust Case (Station 4.95, circumferential 8-point harness)",
    metricType: "egt",
    currentValue: "642 °C",
    unit: "°C",
    normalRange: "Takeoff Redline: 950°C • Current Margin: +78°C",
    status: "nominal",
    calibrationDate: "2026-05-02",
    calibrationCert: "EASA-CAL-2026-1049",
    sampleRateHz: 20,
    summaryExplanation: "Rake harness hard-bolted into the exhaust stream. Provides hot-section health telemetry; sudden rise flags combustor or turbine blade degradation.",
  },
  {
    sensorId: "SENS-OIL-PRESS",
    name: "Main Engine Oil Pressure Piezoresistive Transmitter",
    model: "Kulite KH-375 Hermetic Sensor",
    serialNumber: "SN-OIL-33102-D",
    busAddress: "ARINC 429 Bus A • Word 134",
    physicalMountLocation: "Main Oil Lubrication Unit (Accessory Gearbox lower pad)",
    metricType: "oil_pressure",
    currentValue: "74.5 psid",
    unit: "psid",
    normalRange: "Nominal 60.0 - 95.0 psid (Min caution < 45.0 psid)",
    status: "nominal",
    calibrationDate: "2026-02-18",
    calibrationCert: "DGCA-CAL-2026-7201",
    sampleRateHz: 10,
    summaryExplanation: "Hard-wired sensor measuring delta-pressure across the main engine bearing feed lines, ensuring hydrodynamic wedge protection.",
  },
  {
    sensorId: "SENS-OIL-TEMP",
    name: "Scavenge Oil Return Line Platinum RTD (Pt100)",
    model: "Rosemount Aerospace 0078N Resistance Thermometer",
    serialNumber: "SN-RTD-22109-E",
    busAddress: "ARINC 429 Bus B • Word 135",
    physicalMountLocation: "Scavenge Return Manifold before Fuel-Oil Heat Exchanger",
    metricType: "oil_temp",
    currentValue: "108.4 °C",
    unit: "°C",
    normalRange: "Normal 85 - 130 °C (Max allowable 155 °C)",
    status: "nominal",
    calibrationDate: "2026-02-18",
    calibrationCert: "DGCA-CAL-2026-7202",
    sampleRateHz: 5,
    summaryExplanation: "Direct contact probe sensing thermal rejection from bearing chambers. High delta triggers heat exchanger or bearing seal inspection.",
  },
  {
    sensorId: "SENS-CHIP-FDGS",
    name: "FDGS Scavenge Cavity Magnetic Chip Detector & Pulse Counter",
    model: "Eaton TED Quantitative Debris Monitor (QDM)",
    serialNumber: "SN-CHIP-77180-F",
    busAddress: "ARINC 429 Bus A • Word 140 (Discrete Bit 12)",
    physicalMountLocation: "FDGS Reduction Gearbox Lowest Sump Port (6 o'clock)",
    metricType: "chip_detector",
    currentValue: "0 bits (Nil particles)",
    unit: "particles",
    normalRange: "0 particles • Continuity OK • Resistance > 10 MΩ",
    status: "nominal",
    calibrationDate: "2026-06-01",
    calibrationCert: "OEM-QDM-2026-4402",
    sampleRateHz: 1,
    summaryExplanation: "Continuously attracts ferrous wear particles. Detects spalling or surface fatigue on planetary gears before visual inspection.",
  },
  {
    sensorId: "SENS-PRESS-P3",
    name: "Compressor Discharge (P3/P2.5) Static Delta-P Sensor",
    model: "Sensata Engine Control Differential Cell",
    serialNumber: "SN-PRS-44910-G",
    busAddress: "ARINC 429 Bus B • Word 204",
    physicalMountLocation: "High-Pressure Compressor Outer Diffuser Case (Station 3)",
    metricType: "pressure_delta",
    currentValue: "442.8 psia",
    unit: "psia",
    normalRange: "Expected 430 - 460 psia at rated EPR",
    status: "nominal",
    calibrationDate: "2026-01-20",
    calibrationCert: "DGCA-CAL-2026-5519",
    sampleRateHz: 20,
    summaryExplanation: "Measures compression pressure ratio. Used by CAMO to calculate compressor aerodynamic fouling and trigger compressor core water-wash.",
  },
  {
    sensorId: "SENS-FLOW-FMU",
    name: "Coriolis Fuel Mass Flowmeter & Temp Sensor",
    model: "Parker Meggitt FMU-88 Coriolis Core",
    serialNumber: "SN-FMU-11983-H",
    busAddress: "ARINC 429 Bus A • Word 244",
    physicalMountLocation: "Hydromechanical Unit (HMU) Fuel Metering Outlet",
    metricType: "fuel_flow",
    currentValue: "1,180 kg/hr",
    unit: "kg/hr",
    normalRange: "Cruise: 1,120 - 1,240 kg/hr",
    status: "nominal",
    calibrationDate: "2026-03-30",
    calibrationCert: "NIST-FLOW-2026-3021",
    sampleRateHz: 10,
    summaryExplanation: "Directly calculates fuel burn efficiency. Discrepancies vs target specific fuel consumption indicate combustor nozzle coking.",
  },
];

// Generate dynamic telemetry snapshot based on engine state
export function getEngineTelemetrySnapshot(engine: AircraftEngine): EngineLiveTelemetrySnapshot {
  const isNo1 = engine.enginePosition === "No.1";
  const cycles = engine.cyclesSinceNew || 5120;
  const isActionRequired = engine.status === "action_required";
  const isWatch = engine.status === "watch";

  // Vibration values tailored realistically per position and health
  const vibN1Val = isActionRequired ? 1.48 : isWatch ? 0.94 : isNo1 ? 0.42 : 0.48;
  const vibN2Val = isActionRequired ? 1.82 : isWatch ? 1.12 : isNo1 ? 0.68 : 0.72;
  const vibN1Status = vibN1Val >= 1.5 ? "alert" : vibN1Val >= 1.0 ? "advisory" : "nominal";
  const vibN2Status = vibN2Val >= 1.7 ? "alert" : vibN2Val >= 1.2 ? "advisory" : "nominal";

  // EGT values
  const egtVal = isActionRequired ? 718 : isWatch ? 674 : isNo1 ? 642 : 650;
  const egtMargin = 950 - egtVal;
  const egtStatus = egtVal >= 720 ? "alert" : egtVal >= 670 ? "advisory" : "nominal";

  // Oil pressure
  const oilPressVal = isActionRequired ? 52.4 : isNo1 ? 74.5 : 72.8;
  const oilPressStatus = oilPressVal < 45 ? "alert" : oilPressVal < 55 ? "advisory" : "nominal";

  // Oil temp
  const oilTempVal = isNo1 ? 108.4 : 109.1;
  const oilTempStatus = oilTempVal > 135 ? "alert" : "nominal";

  // Chip detector
  const chipParticles = isActionRequired ? 2 : 0;
  const chipStatus = chipParticles > 0 ? "warning" : "clear";

  const updatedSensors = ATTACHED_ENGINE_SENSORS.map((s) => {
    if (s.sensorId === "SENS-VIB-BRG1") {
      return {
        ...s,
        currentValue: `${vibN1Val.toFixed(2)} mils pk-pk`,
        status: vibN1Status as any,
      };
    }
    if (s.sensorId === "SENS-VIB-TRF") {
      return {
        ...s,
        currentValue: `${vibN2Val.toFixed(2)} mils pk-pk`,
        status: vibN2Status as any,
      };
    }
    if (s.sensorId === "SENS-EGT-RAKE") {
      return {
        ...s,
        currentValue: `${egtVal} °C`,
        status: egtStatus as any,
        normalRange: `Takeoff Redline: 950°C • Margin: +${egtMargin}°C`,
      };
    }
    if (s.sensorId === "SENS-OIL-PRESS") {
      return {
        ...s,
        currentValue: `${oilPressVal.toFixed(1)} psid`,
        status: oilPressStatus as any,
      };
    }
    if (s.sensorId === "SENS-OIL-TEMP") {
      return {
        ...s,
        currentValue: `${oilTempVal.toFixed(1)} °C`,
        status: oilTempStatus as any,
      };
    }
    if (s.sensorId === "SENS-CHIP-FDGS") {
      return {
        ...s,
        currentValue: chipParticles > 0 ? `${chipParticles} ferrous flakes detected` : "0 bits (Nil particles)",
        status: chipStatus === "warning" ? "advisory" : "nominal",
      };
    }
    return s;
  });

  return {
    engineId: engine.id,
    tailNumber: engine.tailNumber || "VT-IZB",
    enginePosition: engine.enginePosition,
    aircraftModel: engine.aircraftType || "Airbus A320-271N (PW1127G-JM)",
    fadecChannel: "FADEC Dual-Channel EEC (Channel A Active / B Hot-Standby)",
    arincBus: "ARINC 429 High-Speed Avionics Bus (100 kbps) • ACARS/FOMAX Downlink",
    timestamp: new Date().toISOString(),
    vibrationN1: {
      value: vibN1Val,
      unit: "mils pk-pk",
      status: vibN1Status as any,
      sensor: "SENS-VIB-BRG1 (#1 Bearing Accelerometer)",
      limit: 1.5,
    },
    vibrationN2: {
      value: vibN2Val,
      unit: "mils pk-pk",
      status: vibN2Status as any,
      sensor: "SENS-VIB-TRF (TRF Core Accelerometer)",
      limit: 1.7,
    },
    egt: {
      value: egtVal,
      unit: "°C",
      status: egtStatus as any,
      margin: egtMargin,
      redline: 950,
      sensor: "SENS-EGT-RAKE (LPT 8-Probe Rake)",
    },
    oilPressure: {
      value: oilPressVal,
      unit: "psid",
      status: oilPressStatus as any,
      normalMin: 60.0,
      normalMax: 95.0,
      sensor: "SENS-OIL-PRESS (Main Lubrication Transmitter)",
    },
    oilTemp: {
      value: oilTempVal,
      unit: "°C",
      status: oilTempStatus as any,
      sensor: "SENS-OIL-TEMP (Scavenge Platinum RTD)",
    },
    chipDetector: {
      status: chipStatus,
      debrisParticlesCount: chipParticles,
      sensor: "SENS-CHIP-FDGS (FDGS Scavenge Magnetic Plug)",
    },
    sensorList: updatedSensors,
  };
}

// Maps part/task to specific attached aircraft sensor telemetry
export function getSensorForTask(taskCode: string, partId: PartId | "all"): {
  attachedSensor: AttachedSensorTelemetry;
  sensorTriggerReason: string;
} {
  const code = taskCode.toUpperCase();

  // Borescope HPT / Combustor / LPT
  if (code.includes("72-51") || partId === "hpt" || code.includes("HPT")) {
    const s = ATTACHED_ENGINE_SENSORS.find((x) => x.sensorId === "SENS-EGT-RAKE")!;
    return {
      attachedSensor: s,
      sensorTriggerReason: "EGT rake harness thermal margin (+78°C margin) & core TRF vibration baseline confirm condition-based interval.",
    };
  }

  // FDGS / Lube / Bearing chip inspection
  if (code.includes("72-10") || partId === "fan_drive_gear" || code.includes("FDGS")) {
    const s = ATTACHED_ENGINE_SENSORS.find((x) => x.sensorId === "SENS-CHIP-FDGS")!;
    return {
      attachedSensor: s,
      sensorTriggerReason: "Continuous magnetic chip detector inductive impedance: 0 bits (nil conductive particles) verified on ARINC 429 Word 140.",
    };
  }

  // Combustor
  if (code.includes("72-41") || partId === "combustor") {
    const s = ATTACHED_ENGINE_SENSORS.find((x) => x.sensorId === "SENS-FLOW-FMU")!;
    return {
      attachedSensor: s,
      sensorTriggerReason: "FMU Coriolis mass flow (1,180 kg/hr) and EGT circumferential gradient confirm no injector streak hot spots.",
    };
  }

  // Fan Rotor / Containment
  if (code.includes("72-12") || partId === "fan_blades" || partId === "fan_case") {
    const s = ATTACHED_ENGINE_SENSORS.find((x) => x.sensorId === "SENS-VIB-BRG1")!;
    return {
      attachedSensor: s,
      sensorTriggerReason: "#1 Bearing Piezoelectric Accelerometer tracks low spool (N1) dynamic balance at 0.42 mils pk-pk (limit < 1.20).",
    };
  }

  // Compressor Wash / HPC / LPC
  if (code.includes("72-31") || partId === "lpc" || partId === "hpc") {
    const s = ATTACHED_ENGINE_SENSORS.find((x) => x.sensorId === "SENS-PRESS-P3")!;
    return {
      attachedSensor: s,
      sensorTriggerReason: "Compressor P3/P2.5 discharge pressure differential cell verifies aerodynamic clean margin across axial stages.",
    };
  }

  // Oil / Scavenge
  if (code.includes("OIL") || code.includes("LUBE") || code.includes("79-")) {
    const s = ATTACHED_ENGINE_SENSORS.find((x) => x.sensorId === "SENS-OIL-PRESS")!;
    return {
      attachedSensor: s,
      sensorTriggerReason: "Piezoresistive delta-P transmitter on main lube unit reads 74.5 psid (within 60-95 psid flight envelope).",
    };
  }

  // Default sensor: TRF vibration or EGT rake
  const s = ATTACHED_ENGINE_SENSORS.find((x) => x.sensorId === "SENS-VIB-TRF")!;
  return {
    attachedSensor: s,
    sensorTriggerReason: "FADEC dual-channel ARINC 429 continuous health stream correlates scheduled interval with physical sensor logs.",
  };
}
