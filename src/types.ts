export type PartId =
  | "fan_case"
  | "fan_blades"
  | "fan_drive_gear"
  | "lpc"
  | "hpc"
  | "combustor"
  | "hpt"
  | "lpt"
  | "exhaust"
  | "oil_system";

export type PartStatus = "default" | "affected" | "inspect" | "unaffected";

export interface PartConnection {
  id: PartId;
  label: string;
  relation: string; // "upstream", "downstream", "mechanical drive", "support", etc.
}

export interface ComponentDimensions {
  axialLengthCm: number; // e.g. 128 cm
  outerDiameterCm: number; // e.g. 205.7 cm
  innerBoreDiameterCm?: number; // e.g. 48 cm
  weightKg?: number; // dry mass
  stageCount?: number; // e.g. 1, 3, 8, 2
  gearRatio?: string; // "3.06:1" for FDGS
  primaryAlloy: string; // e.g. "Ti-6Al-4V Grade 5 (Titanium Alloy)"
  coatingSpec?: string; // e.g. "7YSZ Electron-Beam PVD Thermal Barrier Coating"
  stationRange: string; // e.g. "STA 100 - STA 210"
  tolerancesMm?: string; // e.g. "±0.05 mm"
}

export interface EnginePartData {
  id: PartId;
  name: string;
  technicalName: string;
  whatItDoes: string;
  whereItSits: string;
  connectedTo: PartConnection[];
  madeOf: string;
  typicalOperatingConditions: {
    temperature: string;
    pressure: string;
    speed: string;
  };
  howItFails: string[];
  howInspected: string[];
  lifeBasis: string;
  lifeLimitCycles?: number;
  replacementGuidance: string;
  relatedIncidents: string[];
  defaultZone: string;
  dimensions?: ComponentDimensions;
}

export type ComponentLogType =
  | "daily_check"
  | "weekly_check"
  | "borescope_inspection"
  | "preventive_check"
  | "defect_rectification"
  | "field_measurement"
  | "repair"
  | "replacement";

export type ComponentLogStatus = "passed" | "discrepancy" | "repaired" | "replaced";

export interface ComponentRepairInfo {
  actionTaken: string;
  blendedDepthMm?: number;
  ndtMethod?: string;
  ndtResult?: string;
}

export interface ComponentReplacementInfo {
  removedPartSerialNumber: string;
  installedPartSerialNumber: string;
  batchLotNumber?: string;
  airworthinessReleaseCert: string;
  reasonForRemoval: string;
}

export interface ComponentHistoryEntry {
  id: string;
  partId: PartId;
  engineId?: string;
  tailNumber?: string;
  date: string;
  flightHours: number;
  flightCycles: number;
  logType: ComponentLogType;
  status: ComponentLogStatus;
  workOrderNumber: string;
  ammTaskRef: string;
  technicianName: string;
  technicianBadge: string;
  itemsChecked: string[];
  findingsSummary: string;
  technicianNotes: string;
  repairDetails?: ComponentRepairInfo;
  replacementDetails?: ComponentReplacementInfo;
}

export type DamageType =
  | "leading_edge_nick"
  | "crack"
  | "tip_curl"
  | "dent"
  | "blade_nick"
  | "coating_loss"
  | "leak"
  | "vibration"
  | "other";

export type MeasurementUnit = "depth_mm" | "length_mm" | "percent_area" | "drops_per_min" | "n1_units" | string;

export type ActionLevel = 0 | 1 | 2 | 3 | 4;

export type UserRole = "Engineer" | "Supervisor" | "Trainee";

export interface UserSession {
  name: string;
  role: UserRole;
  homeBase: string; // e.g. "Bengaluru (BLR)"
  badge?: string; // e.g. "DGCA AME #8842"
}

export interface AircraftEngine {
  id: string; // e.g. "VT-DEM1-ENG1"
  tailNumber: string; // fictional, e.g. "VT-DEM1"
  enginePosition: "No.1" | "No.2";
  cyclesSinceNew: number;
  status: "normal" | "watch" | "action_required";
  openCaseIds: string[]; // references into the existing Case Log
  lastInspectionDate: string; // fictional date
  location: string; // fictional base, e.g. "Bengaluru (BLR)"
  aircraftType?: string;
  assignedEngineer?: string;
}

export interface FlightInfo {
  flightNumber: string; // e.g. "6E 2134"
  airline: string; // "IndiGo"
  origin: {
    code: string;
    city: string;
    name: string;
    terminal: string;
  };
  destination: {
    code: string;
    city: string;
    name: string;
    terminal: string;
  };
  departureTime: string;
  arrivalTime: string;
  aircraftTail: string; // "VT-IZB"
  aircraftModel: string; // "Airbus A320-271N (PW1127G-JM)"
  gateBay: string; // "Gate 42B / Bay 12"
  flightStatus: "arrived_turnaround" | "pre_flight_check" | "maintenance_hold" | "in_flight" | "scheduled";
  statusLabel: string;
  turnaroundMinutesRemaining?: number;
  crewReport?: string;
  pilotName?: string;
  engine1Id: string; // e.g. "VT-DEM2-ENG1"
  engine2Id: string; // e.g. "VT-DEM2-ENG2"
  overallStatus: "normal" | "watch" | "action_required";
  activeAlertCount: number;
}

export interface LimitBand {
  max: number; // value <= max triggers this band
  level: ActionLevel;
  description: string;
}

export interface RuleDefinition {
  id: string; // e.g. R1
  part: PartId | "engine";
  damageType: DamageType;
  unit: MeasurementUnit;
  bands: LimitBand[];
  finalLevel: ActionLevel; // if > last band
  sourceDocId: string;
  description: string;
}

export interface DocSnippet {
  id: string; // e.g. DEMO-AMM-72-01
  title: string;
  section: string;
  category: "AMM" | "PRC" | "POL";
  text: string;
  tags: string[];
  applicableParts?: (PartId | "engine")[];
}

export interface IncidentMeasurementInput {
  damageDepthMm?: number | null;
  crackLengthMm?: number | null;
  vibrationN1?: number | null;
  oilLeakDropsMin?: number | null;
  coatingLossPct?: number | null;
}

export interface IncidentFinding {
  id: string;
  part: PartId | "engine";
  damageType: DamageType;
  zone: string;
  measurement: {
    value: number;
    unit: MeasurementUnit;
  } | null;
  isAiSuggested?: boolean;
  aiNotes?: string;
}

export interface ExtractedIncident {
  eventType: "bird_strike" | "fod" | "oil_leak" | "vibration" | "hot_section" | "other";
  enginePosition: "No.1" | "No.2" | "unspecified";
  summary: string;
  findings: IncidentFinding[];
  missingInfo: string[];
}

export interface LimitsCheckResultRow {
  component: string;
  damageType: string;
  measured: string;
  limitBandApplied: string;
  resultLevel: ActionLevel | null;
  sourceDocId: string;
  notes: string;
  isInsufficientData?: boolean;
}

export interface LimitsCheckResult {
  rows: LimitsCheckResultRow[];
  overallLevel: ActionLevel;
  highestRuleDocId?: string;
}

export interface IncidentScenario {
  id: string; // S1 to S6
  title: string;
  narrative: string;
  enginePosition: "No.1" | "No.2";
  eventType: string;
  measurements: IncidentMeasurementInput;
  expectedParts: Record<PartId, PartStatus>;
  expectedLevel: ActionLevel;
  expectedReasoning: string;
  docRefs: string[];
}

export interface CaseLogEntry {
  id: string;
  timestamp: string;
  aircraftType: string;
  enginePosition: string;
  engineId?: string;
  tailNumber?: string;
  eventType: string;
  summary: string;
  overallLevel: ActionLevel;
  findings: IncidentFinding[];
  limitsRows: LimitsCheckResultRow[];
  engineerName: string;
  engineerId: string;
  decision: "Approved" | "Edited" | "Rejected";
  reason?: string;
  draftTechLog: string;
  aiExplanation?: string;
}

export interface EvaluationTestCase {
  id: string;
  title: string;
  findings: IncidentFinding[];
  expectedLevel: ActionLevel;
  expectedSourceDoc: string;
  description: string;
}

export type AppTheme = "dark" | "light";

export type PreventiveCategory =
  | "borescope"
  | "lube_filter"
  | "sb_ad_compliance"
  | "engine_wash"
  | "sensor_calibration"
  | "containment_check";

export type PreventiveComplianceStatus = "compliant" | "due_soon" | "overdue" | "in_progress";

export interface PMSignOffRecord {
  id: string;
  date: string;
  engineerName: string;
  engineerLicense: string;
  station: string;
  cyclesAtSignOff: number;
  hoursAtSignOff: number;
  remarks: string;
  findings: "no_defects" | "within_limits" | "minor_monitoring_required";
}

export interface PreventiveMaintenanceTask {
  id: string;
  title: string;
  taskCode: string;
  partId: PartId | "all";
  partName: string;
  category: PreventiveCategory;
  categoryLabel: string;
  description: string;
  detailedProcedureSteps: string[];
  intervalCycles?: number;
  intervalHours?: number;
  intervalDays?: number;
  lastCompletedCycles: number;
  lastCompletedHours: number;
  lastCompletedDate: string;
  nextDueCycles: number;
  nextDueHours: number;
  nextDueDate: string;
  complianceStatus: PreventiveComplianceStatus;
  mandatedBy: "DGCA / EASA Airworthiness Directive" | "Pratt & Whitney OEM AMM" | "IndiGo Engineering CAMO";
  adSbReference?: string;
  estimatedHours: number;
  requiredCertification: string;
  signOffHistory: PMSignOffRecord[];
  attachedSensor?: AttachedSensorTelemetry;
  sensorTriggerReason?: string;
}

export type SensorMetricType =
  | "vibration"
  | "egt"
  | "oil_pressure"
  | "oil_temp"
  | "chip_detector"
  | "pressure_delta"
  | "fuel_flow";

export interface AttachedSensorTelemetry {
  sensorId: string;
  name: string;
  model: string;
  serialNumber: string;
  busAddress: string; // e.g. "ARINC 429 Word 341 (Channel A)"
  physicalMountLocation: string; // e.g. "Bearing #1 Housing, Forward Fan Frame"
  metricType: SensorMetricType;
  currentValue: number | string;
  unit: string;
  normalRange: string;
  status: "nominal" | "advisory" | "alert";
  calibrationDate: string;
  calibrationCert: string;
  sampleRateHz: number;
  summaryExplanation?: string;
}

export interface EngineLiveTelemetrySnapshot {
  engineId: string;
  tailNumber: string;
  enginePosition: "No.1" | "No.2";
  aircraftModel: string;
  fadecChannel: string;
  arincBus: string;
  timestamp: string;
  vibrationN1: {
    value: number;
    unit: string;
    status: "nominal" | "advisory" | "alert";
    sensor: string;
    limit: number;
  };
  vibrationN2: {
    value: number;
    unit: string;
    status: "nominal" | "advisory" | "alert";
    sensor: string;
    limit: number;
  };
  egt: {
    value: number;
    unit: string;
    status: "nominal" | "advisory" | "alert";
    margin: number;
    redline: number;
    sensor: string;
  };
  oilPressure: {
    value: number;
    unit: string;
    status: "nominal" | "advisory" | "alert";
    normalMin: number;
    normalMax: number;
    sensor: string;
  };
  oilTemp: {
    value: number;
    unit: string;
    status: "nominal" | "advisory" | "alert";
    sensor: string;
  };
  chipDetector: {
    status: "clear" | "warning";
    debrisParticlesCount: number;
    sensor: string;
  };
  sensorList: AttachedSensorTelemetry[];
}

export interface FlightCRSRecord {
  flightNumber: string;
  aircraftTail: string;
  crsReferenceNumber: string;
  engineerName: string;
  engineerLicense: string;
  engine1OilUpliftQt: number;
  engine2OilUpliftQt: number;
  egtMarginDegC: number;
  fodWalkaroundCheck: string;
  releaseRemarks: string;
  signedAt: string;
}

