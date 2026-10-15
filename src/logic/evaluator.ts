import { evaluateLimitsCheck } from "./rulesEngine";
import { retrieveRelevantDocuments } from "./retrieval";
import { ActionLevel, EvaluationTestCase } from "../types";

export const EVALUATION_TEST_CASES: EvaluationTestCase[] = [
  {
    id: "TC-01",
    title: "Fan Blade Minor Leading-Edge Nick (0.5 mm)",
    description: "Evaluates lower boundary of AMM 72-12-00 (depth ≤ 0.8 mm is Level 0 continue in service).",
    findings: [
      {
        id: "f1",
        part: "fan_blades",
        damageType: "leading_edge_nick",
        zone: "Zone 102",
        measurement: { value: 0.5, unit: "depth_mm" },
      },
    ],
    expectedLevel: 0,
    expectedSourceDoc: "DEMO-AMM-72-01",
  },
  {
    id: "TC-02",
    title: "Fan Blade Moderate Blend Range Nick (1.8 mm)",
    description: "Evaluates Level 2 band (1.5 to 2.5 mm depth) requiring on-wing borescope blend repair.",
    findings: [
      {
        id: "f2",
        part: "fan_blades",
        damageType: "leading_edge_nick",
        zone: "Zone 102",
        measurement: { value: 1.8, unit: "depth_mm" },
      },
    ],
    expectedLevel: 2,
    expectedSourceDoc: "DEMO-AMM-72-01",
  },
  {
    id: "TC-03",
    title: "Fan Blade Zero-Tolerance Crack (4.0 mm)",
    description: "Evaluates zero-tolerance crack rule (>0 mm crack mandates immediate Level 4 engine removal).",
    findings: [
      {
        id: "f3",
        part: "fan_blades",
        damageType: "crack",
        zone: "Zone 102",
        measurement: { value: 4.0, unit: "length_mm" },
      },
    ],
    expectedLevel: 4,
    expectedSourceDoc: "DEMO-AMM-72-01",
  },
  {
    id: "TC-04",
    title: "Fan Case Acoustic Liner Dent (2.5 mm)",
    description: "Evaluates Level 1 repetitive inspection band (1.5 to 3.0 mm) for acoustic containment casing.",
    findings: [
      {
        id: "f4",
        part: "fan_case",
        damageType: "dent",
        zone: "Zone 101",
        measurement: { value: 2.5, unit: "depth_mm" },
      },
    ],
    expectedLevel: 1,
    expectedSourceDoc: "DEMO-AMM-72-02",
  },
  {
    id: "TC-05",
    title: "HPC Rotor Blade Nick Ingestion (0.6 mm)",
    description: "Evaluates HPC blade nick in 0.5 mm to 1.0 mm band requiring on-wing boroblending (Level 2).",
    findings: [
      {
        id: "f5",
        part: "hpc",
        damageType: "blade_nick",
        zone: "Zone 202",
        measurement: { value: 0.6, unit: "depth_mm" },
      },
    ],
    expectedLevel: 2,
    expectedSourceDoc: "DEMO-AMM-72-03",
  },
  {
    id: "TC-06",
    title: "HPT Thermal Barrier Coating Severe Loss (20%)",
    description: "Evaluates thermal barrier spallation exceeding 15% threshold requiring Level 4 engine shop visit.",
    findings: [
      {
        id: "f6",
        part: "hpt",
        damageType: "coating_loss",
        zone: "Zone 302",
        measurement: { value: 20.0, unit: "percent_area" },
      },
    ],
    expectedLevel: 4,
    expectedSourceDoc: "DEMO-AMM-72-04",
  },
  {
    id: "TC-07",
    title: "Accessory Gearbox Oil Seal Leak (4.0 drops/min)",
    description: "Evaluates lubrication leak in 2.0 to 5.0 drops/min band requiring Level 2 borescope of shaft seals.",
    findings: [
      {
        id: "f7",
        part: "oil_system",
        damageType: "leak",
        zone: "Zone 104",
        measurement: { value: 4.0, unit: "drops_per_min" },
      },
    ],
    expectedLevel: 2,
    expectedSourceDoc: "DEMO-AMM-79-01",
  },
  {
    id: "TC-08",
    title: "Unexplained High N1 Rotor Vibration (4.8 units)",
    description: "Evaluates vibration excursion exceeding 4.5 N1 units requiring Level 3 OEM technical escalation.",
    findings: [
      {
        id: "f8",
        part: "engine",
        damageType: "vibration",
        zone: "Engine Spool",
        measurement: { value: 4.8, unit: "n1_units" },
      },
    ],
    expectedLevel: 3,
    expectedSourceDoc: "DEMO-AMM-77-01",
  },
];

export interface TestResultItem {
  testCase: EvaluationTestCase;
  actualLevel: ActionLevel;
  actualDocId: string;
  levelPassed: boolean;
  docPassed: boolean;
  overallPassed: boolean;
  retrievedDocs: string[];
  executionTimeMs: number;
}

export interface EvaluationSummary {
  results: TestResultItem[];
  passedCount: number;
  totalCount: number;
  passPercentage: number;
  allPassed: boolean;
}

export async function runEvaluationSuite(): Promise<EvaluationSummary> {
  const results: TestResultItem[] = [];

  for (const tc of EVALUATION_TEST_CASES) {
    const start = performance.now();
    const limitsResult = evaluateLimitsCheck(tc.findings);
    const retrieved = await retrieveRelevantDocuments({
      findings: tc.findings,
      eventType: tc.findings[0]?.damageType === "vibration" ? "vibration" : undefined,
    });
    const end = performance.now();

    const actualLevel = limitsResult.overallLevel;
    const actualDocId = limitsResult.rows[0]?.sourceDocId || "";
    const retrievedIds = retrieved.map((d) => d.id);

    const levelPassed = actualLevel === tc.expectedLevel;
    const docPassed = actualDocId === tc.expectedSourceDoc || retrievedIds.includes(tc.expectedSourceDoc);
    const overallPassed = levelPassed && docPassed;

    results.push({
      testCase: tc,
      actualLevel,
      actualDocId,
      levelPassed,
      docPassed,
      overallPassed,
      retrievedDocs: retrievedIds,
      executionTimeMs: Math.round(end - start),
    });
  }

  const passedCount = results.filter((r) => r.overallPassed).length;

  return {
    results,
    passedCount,
    totalCount: results.length,
    passPercentage: Math.round((passedCount / results.length) * 100),
    allPassed: passedCount === results.length,
  };
}
