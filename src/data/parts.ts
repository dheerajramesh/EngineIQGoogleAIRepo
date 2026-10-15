import { EnginePartData } from "../types";

export const PW1100G_MACRO_SPECIFICATIONS = {
  modelName: "Pratt & Whitney PW1100G-JM PurePower® GTF",
  aircraftApplication: "Airbus A320neo / A321neo / A319neo",
  architecture: "1-G-3-8-2-3 (Two-Spool Geared Turbofan)",
  fanDiameterInches: 81,
  fanDiameterCm: 205.7,
  overallLengthMeters: 3.401,
  overallLengthInches: 133.9,
  dryWeightKg: 2858,
  dryWeightLb: 6300,
  bypassRatio: "12.5:1",
  overallPressureRatio: "45:1 (nominal 40:1 to 50:1)",
  takeoffThrustLbf: "24,000 - 33,110 lbf (107 - 147 kN)",
  fanDriveGearRatio: "3.06:1 planetary reduction ratio",
  fanBladeCount: 20,
  lpcStages: 3,
  hpcStages: 8,
  hptStages: 2,
  lptStages: 3,
  maxContinuousEgt: "1,045°C",
  takeoffEgtLimit: "1,080°C",
  fanShaftRpmMax: "4,600 RPM",
  hpSpoolRpmMax: "24,800 RPM",
  lpSpoolRpmMax: "14,080 RPM",
  fuelType: "Jet A / Jet A-1 / SAF up to 50% blend",
  oilCapacityQuarts: 28,
  typeCertificate: "FAA E00087EN / EASA.IM.E.093",
};

export const ENGINE_PARTS: Record<string, EnginePartData> = {
  fan_case: {
    id: "fan_case",
    name: "Fan Case & Nacelle",
    technicalName: "Fan Containment Casing and Acoustic Barrel Assembly",
    whatItDoes:
      "Encapsulates the 81-inch high-bypass fan rotor, absorbs acoustic noise through resonant acoustic panels, and provides structural blade-out containment in accordance with FAR Part 33.94.",
    whereItSits:
      "Foremost structural ring forming the outer bypass duct perimeter, mounted forward of the intermediate compressor case at Station STA 100 to STA 228.",
    connectedTo: [
      { id: "fan_blades", label: "Fan Blades", relation: "Surrounds rotating fan assembly" },
      { id: "oil_system", label: "Oil System", relation: "Houses sensor conduits & scavenge lines" },
    ],
    madeOf:
      "Aramid Kevlar-wrapped 2195 Aluminum-Lithium alloy barrel with perforated composite acoustic attenuation panels.",
    typicalOperatingConditions: {
      temperature: "-55°C to +75°C (ambient to aerodynamic stagnation)",
      pressure: "0.2 to 1.4 bar (inlet total to bypass duct)",
      speed: "Static aerodynamic containment boundary",
    },
    howItFails: [
      "Foreign object and bird strike dents / punctures",
      "Acoustic panel composite delamination",
      "Rub-strip abradable liner wear and grooving",
      "Fastener hole fretting and galvanic corrosion",
    ],
    howInspected: [
      "Visual surface inspection with calibrated depth micrometer",
      "Ultrasonic tap-testing for sandwich composite bond integrity",
      "Eddy-current inspection of structural flange bolt holes",
    ],
    lifeBasis: "On-condition (structural integrity & composite health monitored continuously).",
    replacementGuidance:
      "Remove for shop overhaul if dent depth exceeds 5.0 mm or Kevlar fabric braid is breached, per approved manual.",
    relatedIncidents: [
      "Bird strike acoustic panel indentation",
      "Ground handling tug scrape to lower cowlings",
    ],
    defaultZone: "Zone 101 - Fan Containment Duct",
    dimensions: {
      axialLengthCm: 128,
      outerDiameterCm: 222.0,
      innerBoreDiameterCm: 205.7,
      weightKg: 412,
      stageCount: 0,
      primaryAlloy: "Aramid Kevlar-wrapped 2195 Aluminum-Lithium alloy",
      coatingSpec: "Epoxy primer & fluoropolymer acoustic barrier",
      stationRange: "STA 100 - STA 228",
      tolerancesMm: "±0.50 mm",
    },
  },

  fan_blades: {
    id: "fan_blades",
    name: "Fan Blades & Hub",
    technicalName: "Wide-Chord Titanium Fan Rotor Blades (81-inch Tip Diameter)",
    whatItDoes:
      "Accelerates massive mass flow through the bypass duct (~90% of total thrust at 12.5:1 bypass ratio) and supercharges core airflow entering the booster compressor.",
    whereItSits:
      "At the very front of the engine, cantilevered on the low-speed fan shaft driven through the Fan Drive Gear System (FDGS) at Station STA 110 to STA 156.",
    connectedTo: [
      { id: "fan_case", label: "Fan Case", relation: "Enclosed within containment casing" },
      { id: "fan_drive_gear", label: "Fan Drive Gear", relation: "Driven by low-speed planetary output shaft" },
      { id: "lpc", label: "Low-Pressure Compressor", relation: "Feeds core air downstream to LPC booster" },
    ],
    madeOf:
      "Hollow diffusion-bonded / superplastically formed titanium alloy (Ti-6Al-4V Grade 5) with laser-clad titanium leading edge shield.",
    typicalOperatingConditions: {
      temperature: "-50°C to +95°C",
      pressure: "0.25 to 1.7 bar",
      speed: "Up to 4,600 RPM (decoupled from LP turbine speed)",
    },
    howItFails: [
      "Foreign object damage (FOD) / bird strike nicks and tears",
      "Leading edge erosion from sand, volcanic ash, or hail",
      "Tip curl from casing rub",
      "Aerodynamic flutter or high-cycle fatigue (HCF) cracking",
    ],
    howInspected: [
      "Visual walkaround inspection with 10x optical loupe",
      "Fluorescent penetrant inspection (FPI) for crack confirmation",
      "Eddy-current testing (ET) of root dovetail slots",
      "Blade tip clearance optical laser profiling",
    ],
    lifeBasis: "Life-limited part (LLP): Rotor disk 20,000 flight cycles; blades on-condition with strict blend limits.",
    lifeLimitCycles: 20000,
    replacementGuidance:
      "Replace or blend on-wing if leading-edge nick depth is ≤ 2.5 mm; reject immediately if through-crack is detected, per approved manual.",
    relatedIncidents: [
      "Bird strike on climb (1.9 mm nick)",
      "Severe flock bird ingestion (12 mm crack)",
    ],
    defaultZone: "Zone 102 - Fan Rotor Assembly",
    dimensions: {
      axialLengthCm: 46,
      outerDiameterCm: 205.7,
      innerBoreDiameterCm: 48.0,
      weightKg: 228,
      stageCount: 1,
      primaryAlloy: "Ti-6Al-4V Grade 5 (Hollow Titanium Diffusion-Bonded)",
      coatingSpec: "Laser-clad titanium leading edge erosion shield",
      stationRange: "STA 110 - STA 156",
      tolerancesMm: "±0.05 mm",
    },
  },

  fan_drive_gear: {
    id: "fan_drive_gear",
    name: "Fan Drive Gear System (FDGS)",
    technicalName: "Epicyclic Planetary Reduction Gearbox (3.06:1 Ratio)",
    whatItDoes:
      "Decouples the fan speed from the low-pressure turbine spool. Allows the fan to rotate slowly (~4,600 RPM) for peak aerodynamic efficiency while the LP turbine spins fast (~14,080 RPM) for maximum thermodynamic efficiency.",
    whereItSits:
      "Mounted concentrically on the centerline immediately behind the fan rotor hub and forward of the core compressor case (Station STA 160 to STA 198).",
    connectedTo: [
      { id: "fan_blades", label: "Fan Blades", relation: "Drives fan rotor via planetary carrier output" },
      { id: "lpt", label: "Low-Pressure Turbine", relation: "Driven by high-speed LP shaft via sun gear" },
      { id: "oil_system", label: "Oil System", relation: "Dedicated journal bearing pressure lubrication & scavenge" },
    ],
    madeOf:
      "Carburized high-strength alloy steel (AMS 6265 / Pyrowear 53) with journal fluid bearings and flex-spline carrier.",
    typicalOperatingConditions: {
      temperature: "+65°C to +135°C (oil-cooled envelope)",
      pressure: "4.5 to 7.0 bar lube oil pressure",
      speed: "Input ~14,080 RPM; Output ~4,600 RPM (3.06:1 reduction ratio); transmits up to 30,000 shp (22.4 MW)",
    },
    howItFails: [
      "Journal bearing boundary lubrication starvation / scuffing",
      "Gear tooth surface micropitting and spalling",
      "Contamination debris from bearing chip detectors",
      "Thermal expansion misalignment of flexible ring gear diaphragm",
    ],
    howInspected: [
      "Magnetic chip detector (MCD) inspection with scanning electron microscopy (SEM) debris analysis",
      "Borescope inspection of planet gear teeth through access ports",
      "Real-time oil filter differential pressure transducer monitoring",
      "Spectrometric oil analysis program (SOAP) for iron/copper PPM",
    ],
    lifeBasis: "Life-limited planetary carrier and sun gear (30,000 flight cycles); on-condition journal bearings.",
    lifeLimitCycles: 30000,
    replacementGuidance:
      "Remove engine for module replacement if magnetic chip detector accumulates metallic flakes > 5 mm² or ferrous particle count exceeds OEM alert threshold, per approved manual.",
    relatedIncidents: [
      "Low oil pressure warning on climb",
      "Chip detector continuity warning during post-flight transit",
    ],
    defaultZone: "Zone 103 - Epicyclic Gearbox Cavity",
    dimensions: {
      axialLengthCm: 38,
      outerDiameterCm: 52.0,
      innerBoreDiameterCm: 22.0,
      weightKg: 185,
      stageCount: 1,
      gearRatio: "3.06:1 Planetary",
      primaryAlloy: "Carburized AMS 6265 / Pyrowear 53 high-toughness steel",
      coatingSpec: "DLC (Diamond-Like Carbon) low-friction tooth coating",
      stationRange: "STA 160 - STA 198",
      tolerancesMm: "±0.01 mm",
    },
  },

  lpc: {
    id: "lpc",
    name: "Low-Pressure Compressor (Booster)",
    technicalName: "3-Stage Axial Low-Pressure Core Booster Compressor",
    whatItDoes:
      "Compresses incoming core airflow before entering the high-pressure spool, raising total core pressure by approximately 1.5x.",
    whereItSits:
      "Directly behind the fan drive gear system and forward of the intermediate compressor frame (Station STA 200 to STA 242).",
    connectedTo: [
      { id: "fan_blades", label: "Fan Blades", relation: "Receives core flow exiting fan root" },
      { id: "fan_drive_gear", label: "Fan Drive Gear", relation: "Sits immediately aft of gearbox casing" },
      { id: "hpc", label: "High-Pressure Compressor", relation: "Feeds pressurized air directly to HPC Stage 1" },
    ],
    madeOf:
      "Titanium Ti-6Al-4V integrally bladed disks (blisks) with stator vanes mounted in titanium casing rings.",
    typicalOperatingConditions: {
      temperature: "+20°C to +180°C",
      pressure: "1.2 to 2.8 bar",
      speed: "Operates at LP spool speed (~14,080 RPM)",
    },
    howItFails: [
      "FOD and bird ingestion blade tip bending",
      "Stator vane erosion from airborne particulates",
      "Rotor blade root fretting fatigue",
      "Surge-induced blade tip rub against abradable casing",
    ],
    howInspected: [
      "Borescope inspection through dedicated LPC ports (S1 to S3)",
      "Foreign object walk-in inspection with flexible video probe",
      "Variable stator vane (VSV) actuation linkage check",
    ],
    lifeBasis: "On-condition rotors with life-limited booster spool drum (25,000 flight cycles).",
    lifeLimitCycles: 25000,
    replacementGuidance:
      "Inspect adjacent booster stages following any verified fan blade bird ingestion per protocol DEMO-PRC-05-10; remove if blade chord loss exceeds 10%, per approved manual.",
    relatedIncidents: [
      "Post-bird strike secondary ingestion FOD",
      "Core airflow surge during crosswind takeoff",
    ],
    defaultZone: "Zone 104 - Booster Compressor Module",
    dimensions: {
      axialLengthCm: 42,
      outerDiameterCm: 62.0,
      innerBoreDiameterCm: 38.0,
      weightKg: 94,
      stageCount: 3,
      primaryAlloy: "Ti-6Al-4V Titanium Blisks (Integral Bladed Disks)",
      coatingSpec: "Titanium nitride (TiN) erosion protection",
      stationRange: "STA 200 - STA 242",
      tolerancesMm: "±0.05 mm",
    },
  },

  hpc: {
    id: "hpc",
    name: "High-Pressure Compressor (HPC)",
    technicalName: "8-Stage Axial High-Pressure Compressor Spool",
    whatItDoes:
      "Compresses core air through 8 axial stages to high pressure (overall pressure ratio ~45:1), delivering dense oxygen to the annular combustor.",
    whereItSits:
      "Inside the core engine compartment between the intermediate compressor case and the combustor diffuser case (Station STA 245 to STA 323).",
    connectedTo: [
      { id: "lpc", label: "Low-Pressure Compressor", relation: "Receives boosted core air from LPC" },
      { id: "combustor", label: "Combustor", relation: "Feeds high-pressure discharge air (P30) into combustor diffuser" },
      { id: "hpt", label: "High-Pressure Turbine", relation: "Driven by high-pressure turbine via rigid HP spool shaft" },
    ],
    madeOf:
      "Forward stages 1-4: Ti-6Al-4V titanium blisks; Aft stages 5-8: Forged Inconel 718 nickel-base superalloy rotor disks and vanes.",
    typicalOperatingConditions: {
      temperature: "+150°C (inlet) to +650°C (exit discharge T30)",
      pressure: "2.5 bar up to 45 bar discharge (P30)",
      speed: "Up to 24,800 RPM (N2 high-speed spool)",
    },
    howItFails: [
      "Blade leading edge erosion and chord loss",
      "Thermal fatigue cracking on aft Inconel rotor stages",
      "Compressor stall/surge rub on abradable seals",
      "Bleed air valve actuator sticking",
    ],
    howInspected: [
      "Borescope inspection through Stage 1 through Stage 8 guide ports",
      "Fluorescent penetrant inspection of accessible stage blisks",
      "Compressor discharge pressure (P30) transducer sanity check",
      "Transient surge margin monitoring via FADEC engine health data",
    ],
    lifeBasis: "Life-limited part (LLP): High-pressure compressor rotor drum 20,000 flight cycles.",
    lifeLimitCycles: 20000,
    replacementGuidance:
      "Replace rotor spool at life limit (20,000 FC); blend on-wing if blade leading-edge nick is ≤ 1.2 mm; unserviceable if cracks detected, per approved manual.",
    relatedIncidents: [
      "Compressor stall during high-altitude climb",
      "Borescope detection of Stage 7 blade tip curl",
    ],
    defaultZone: "Zone 105 - High-Pressure Compressor Core",
    dimensions: {
      axialLengthCm: 78,
      outerDiameterCm: 54.0,
      innerBoreDiameterCm: 32.0,
      weightKg: 218,
      stageCount: 8,
      primaryAlloy: "Ti-6Al-4V (Stages 1-4) & Forged Inconel 718 (Stages 5-8)",
      coatingSpec: "Thermally sprayed abradable nickel-graphite tip seals",
      stationRange: "STA 245 - STA 323",
      tolerancesMm: "±0.03 mm",
    },
  },

  combustor: {
    id: "combustor",
    name: "Combustor Assembly",
    technicalName: "TALON X™ Annular Lean-Burn Low-Emissions Combustor",
    whatItDoes:
      "Mixes high-pressure discharge air with atomized aviation fuel, burning continuously to convert chemical energy into high-velocity hot gas expansion with low NOx emissions.",
    whereItSits:
      "Between the compressor diffuser case and the high-pressure turbine nozzle guide vanes (Station STA 325 to STA 361).",
    connectedTo: [
      { id: "hpc", label: "High-Pressure Compressor", relation: "Receives diffuser air from HPC exit" },
      { id: "hpt", label: "High-Pressure Turbine", relation: "Discharges hot combustion gas into HPT Stage 1 nozzle" },
      { id: "oil_system", label: "Oil System", relation: "Surrounded by internal core bearing cavity heat shields" },
    ],
    madeOf:
      "Haynes 230 / Hastelloy-X nickel-base sheet superalloy with laser-drilled effusion cooling holes and yttria-stabilized zirconia (YSZ) thermal barrier coating.",
    typicalOperatingConditions: {
      temperature: "Up to 1,750°C flame core; 950°C liner wall metal temperature",
      pressure: "Up to 45 bar combustion chamber pressure",
      speed: "Static aerodynamic thermal combustion chamber",
    },
    howItFails: [
      "Thermal barrier coating (TBC) spallation and blistering",
      "Effusion cooling hole oxidation and clogging",
      "Liner dome sheet metal buckling and thermal cracks",
      "Fuel nozzle carbon coking and streak flame impingement",
    ],
    howInspected: [
      "High-definition video borescope inspection through igniter and fuel nozzle ports",
      "Thermal camera measurement of liner hot spots during ground runs",
      "Fuel nozzle spray pattern bench test during C-check",
    ],
    lifeBasis: "On-condition liner with periodic hot-section borescope inspection every 500-1000 flight cycles.",
    replacementGuidance:
      "Overhaul if combustor liner crack length exceeds 15.0 mm or crosses effusion hole arrays, per approved manual.",
    relatedIncidents: [
      "Hot section streak burn on outer liner",
      "Fuel nozzle coking causing localized EGT spread",
    ],
    defaultZone: "Zone 106 - Combustor Chamber",
    dimensions: {
      axialLengthCm: 36,
      outerDiameterCm: 88.0,
      innerBoreDiameterCm: 56.0,
      weightKg: 68,
      stageCount: 1,
      primaryAlloy: "Haynes 230 / Hastelloy-X Nickel-Base Superalloy",
      coatingSpec: "Yttria-Stabilized Zirconia (YSZ) Thermal Barrier Coating",
      stationRange: "STA 325 - STA 361",
      tolerancesMm: "±0.10 mm",
    },
  },

  hpt: {
    id: "hpt",
    name: "High-Pressure Turbine (HPT)",
    technicalName: "2-Stage Axial High-Pressure Turbine Rotor & Nozzle Module",
    whatItDoes:
      "Extracts intense kinetic and thermal energy from combustion gases to drive the 8-stage high-pressure compressor and core accessories at high rotational speeds.",
    whereItSits:
      "Immediately downstream of the combustor exit, mounted on the front section of the high-pressure rotor shaft (Station STA 365 to STA 399).",
    connectedTo: [
      { id: "combustor", label: "Combustor", relation: "Receives raw expanding gas directly from combustor exit" },
      { id: "hpc", label: "High-Pressure Compressor", relation: "Drives HPC through co-axial HP spool shaft" },
      { id: "lpt", label: "Low-Pressure Turbine", relation: "Discharges gas into LP turbine nozzle guide vanes" },
    ],
    madeOf:
      "Single-crystal nickel superalloy (PWA 1484 / CMSX-4) blades with serpentine internal cooling passages, platinum-aluminide bond coat, and electron-beam PVD 7YSZ thermal barrier coating.",
    typicalOperatingConditions: {
      temperature: "Gas temperature 1,450°C to 1,600°C (far above alloy melting point without active cooling)",
      pressure: "40 bar down to 12 bar across stages",
      speed: "Up to 24,800 RPM (N2 spool)",
    },
    howItFails: [
      "Thermal barrier coating (TBC) spallation and base single-crystal oxidation",
      "High-pressure turbine blade leading edge micro-cracks",
      "Cooling air hole blockage from volcanic ash or dust glazing",
      "Creep elongation and trailing edge bowing",
    ],
    howInspected: [
      "Borescope inspection of Stage 1 and Stage 2 blades with high-definition tip articulating probe",
      "EGT margin trend monitoring via aircraft ACARS / FOMS telemetry",
      "Optical pyrometry blade temperature profiling during engine testing",
    ],
    lifeBasis: "Life-limited part (LLP): HPT rotor disks 15,000 flight cycles; blades on-condition based on TBC loss %.",
    lifeLimitCycles: 15000,
    replacementGuidance:
      "Grounded (Level 4) if TBC coating loss exceeds 30% area or if any through-crack is detected on single-crystal airfoils, per approved manual.",
    relatedIncidents: [
      "Severe hot-section distress with 42% TBC loss (Case S6)",
      "High EGT margin drop after desert operation",
    ],
    defaultZone: "Zone 107 - High-Pressure Turbine Module",
    dimensions: {
      axialLengthCm: 34,
      outerDiameterCm: 72.0,
      innerBoreDiameterCm: 36.0,
      weightKg: 112,
      stageCount: 2,
      primaryAlloy: "Single-Crystal PWA 1484 / CMSX-4 Nickel Superalloy",
      coatingSpec: "7YSZ Electron-Beam PVD Thermal Barrier Coating with PtAl bond coat",
      stationRange: "STA 365 - STA 399",
      tolerancesMm: "±0.02 mm",
    },
  },

  lpt: {
    id: "lpt",
    name: "Low-Pressure Turbine (LPT)",
    technicalName: "3-Stage High-Speed Low-Pressure Turbine Spool",
    whatItDoes:
      "Extracts remaining thermal energy from core gas stream to drive the fan drive planetary gearbox and low-pressure booster via the high-speed LP shaft at ~14,080 RPM.",
    whereItSits:
      "Directly downstream of the high-pressure turbine module and forward of the exhaust nozzle (Station STA 405 to STA 473).",
    connectedTo: [
      { id: "hpt", label: "High-Pressure Turbine", relation: "Receives core flow exiting HPT Stage 2" },
      { id: "fan_drive_gear", label: "Fan Drive Gear", relation: "Transmits torque via inner shaft to reduction gearbox sun gear" },
      { id: "exhaust", label: "Exhaust Assembly", relation: "Discharges exhaust gas into tail cone and nozzle mixer" },
    ],
    madeOf:
      "Cast Inconel 713C and forged Udimet 720 / Inconel 718 nickel superalloy rotor disks and shrouded blades.",
    typicalOperatingConditions: {
      temperature: "+550°C to +850°C",
      pressure: "4.5 bar down to 1.1 bar",
      speed: "Up to 14,080 RPM (high-speed LP spool)",
    },
    howItFails: [
      "Blade shroud interlock wear and chattering",
      "Downstream foreign object damage from failed combustor or HPT fragments",
      "Rotor blade creep and disk rim thermal fatigue",
      "LPT shaft journal bearing carbon seal leakage",
    ],
    howInspected: [
      "Borescope inspection through LPT access ports (S1 to S3)",
      "Vibration analysis of N1 shaft harmonics via FADEC sensors",
      "Oil scavenge magnetic chip detector inspection for bearing cavity #4/#5",
    ],
    lifeBasis: "Life-limited part (LLP): Low-pressure turbine rotor disks 25,000 flight cycles.",
    lifeLimitCycles: 25000,
    replacementGuidance:
      "Replace rotor disks at 25,000 flight cycle life limit; mandatory inspect following high N1 vibration events, per approved manual.",
    relatedIncidents: [
      "Interlock shroud wear during high-cycle transit check",
      "Secondary impact marks following upstream bird ingestion",
    ],
    defaultZone: "Zone 108 - Low-Pressure Turbine Module",
    dimensions: {
      axialLengthCm: 68,
      outerDiameterCm: 86.0,
      innerBoreDiameterCm: 42.0,
      weightKg: 182,
      stageCount: 3,
      primaryAlloy: "Cast Inconel 713C & Forged Udimet 720 Nickel Superalloy",
      coatingSpec: "Diffused aluminide anti-oxidation coating",
      stationRange: "STA 405 - STA 473",
      tolerancesMm: "±0.05 mm",
    },
  },

  exhaust: {
    id: "exhaust",
    name: "Exhaust Nozzle & Tail Cone",
    technicalName: "Core Exhaust Mixer, Centerbody Plug and Tail Cone Assembly",
    whatItDoes:
      "Expands and accelerates core combustion gases into ambient air while mixing core and bypass streams to reduce acoustic shear noise and maximize propulsive thrust.",
    whereItSits:
      "Aft-most section of the engine nacelle assembly, extending behind the low-pressure turbine case (Station STA 475 to STA 561).",
    connectedTo: [
      { id: "lpt", label: "Low-Pressure Turbine", relation: "Bolted directly to rear LPT turbine rear frame" },
      { id: "fan_case", label: "Fan Case", relation: "Forms the inner boundary of the annular bypass duct exit" },
    ],
    madeOf:
      "Inconel 625 sheet metal, titanium Ti-6242 alloy centerbody tail cone, and honeycomb acoustic core nozzle liners.",
    typicalOperatingConditions: {
      temperature: "+350°C to +650°C",
      pressure: "0.95 to 1.3 bar (exhaust nozzle expansion ratio)",
      speed: "Static aerodynamic boundary containing supersonic core gas exhaust velocity",
    },
    howItFails: [
      "Thermal fatigue cracking on core mixer petals",
      "Tail cone fastener shear from acoustic vibration",
      "Internal acoustic honeycomb moisture ingress and core corrosion",
      "Ground equipment ramp rash damage",
    ],
    howInspected: [
      "Visual walkaround inspection of mixer petals and tail cone tip",
      "Tap-testing of nozzle composite/acoustic sandwich structure",
      "Eddy-current inspection of mixer attachment lugs and bolts",
    ],
    lifeBasis: "On-condition (structural integrity monitored on transit and line checks).",
    replacementGuidance:
      "Stop-drill or replace if exhaust mixer petal crack exceeds 25 mm or approaches attachment flange, per approved manual.",
    relatedIncidents: [
      "Tail cone vibration loose fastener detection",
      "Ramp servicing vehicle contact with lower nozzle fairing",
    ],
    defaultZone: "Zone 109 - Core Exhaust Module",
    dimensions: {
      axialLengthCm: 86,
      outerDiameterCm: 94.0,
      innerBoreDiameterCm: 38.0,
      weightKg: 96,
      stageCount: 1,
      primaryAlloy: "Inconel 625 & Titanium Ti-6242 Sheet",
      coatingSpec: "Ceramic heat-reflective thermal shield",
      stationRange: "STA 475 - STA 561",
      tolerancesMm: "±0.50 mm",
    },
  },

  oil_system: {
    id: "oil_system",
    name: "Auxiliary Oil Lubrication System",
    technicalName: "Dry-Sump Lubrication, Scavenge Circuit, ACOC & Debris Monitoring",
    whatItDoes:
      "Supplies conditioned synthetic ester lubricating oil (MIL-PRF-23699) to the fan drive reduction gearbox, main shaft bearings (bearings #1 through #5), and accessory drives while scavenging heat and capturing metallic wear debris.",
    whereItSits:
      "External core dress and fan containment case, featuring an accessory gearbox (AGB), 28-quart oil tank, air-cooled oil coolers (ACOC), and scavenge filter blocks (Station STA 140 to STA 320).",
    connectedTo: [
      { id: "fan_drive_gear", label: "Fan Drive Gear", relation: "Provides high-pressure fluid film journal bearing lubrication" },
      { id: "fan_case", label: "Fan Case", relation: "Oil tank, ACOC heat exchangers, and filler neck mounted to fan case" },
      { id: "hpc", label: "High-Pressure Compressor", relation: "Lubricates core bearing cavities #2 and #3" },
      { id: "hpt", label: "High-Pressure Turbine", relation: "Scavenges oil from rear turbine bearing cavity #4/#5" },
    ],
    madeOf:
      "MIL-PRF-23699 synthetic ester oil, 321 stainless steel braided armored lines, 6061-T6 aluminum reservoir tank, and fluorosilicone O-rings.",
    typicalOperatingConditions: {
      temperature: "+50°C (feed) to +145°C (scavenge return from gearbox journal bearings)",
      pressure: "4.5 to 7.0 bar supply pressure; scavenge negative suction",
      speed: "Positive displacement multi-element pump driven by AGB tower shaft",
    },
    howItFails: [
      "Union B-nut connection loosening causing oil seepage",
      "Carbon seal degradation causing oil mist ingestion into core",
      "Scavenge filter bypass activation from carbon coke accumulation",
      "Air-cooled oil cooler (ACOC) matrix fin clogging or bird strike leakage",
    ],
    howInspected: [
      "Daily oil consumption rate logging (quarts per flight hour)",
      "Static leakage drop count per minute during transit check (AMM 79-00-00)",
      "Magnetic chip detector (MCD) inspection and electronic debris sensor (EDS) logs",
      "Filter differential pressure indicator pop-out button check",
    ],
    lifeBasis: "On-condition with mandatory oil service interval checks every flight cycle.",
    replacementGuidance:
      "Level 2 dispatch under MEL allowable if leakage is ≤ 30 drops/min from non-pressurized unions with daily consumption tracking; ground immediately if pressurized B-nut spray occurs, per approved manual.",
    relatedIncidents: [
      "AGB drain mast oil seepage of 18 drops/min (Case S4)",
      "Scavenge filter delta-P pop-out during step climb",
    ],
    defaultZone: "Zone 110 - External Lubrication Circuit",
    dimensions: {
      axialLengthCm: 180,
      outerDiameterCm: 28.0,
      innerBoreDiameterCm: 12.0,
      weightKg: 54,
      stageCount: 1,
      primaryAlloy: "MIL-PRF-23699 Ester Lines, 321 Stainless Armor & 6061-T6 Tank",
      coatingSpec: "Anodized corrosion barrier & fluorosilicone seals",
      stationRange: "STA 140 - STA 320",
      tolerancesMm: "±0.25 mm",
    },
  },
};
