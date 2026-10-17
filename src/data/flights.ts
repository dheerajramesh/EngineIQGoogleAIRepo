/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FlightInfo } from "../types";

export const INDIGO_FLIGHTS: FlightInfo[] = [
  {
    flightNumber: "6E 2134",
    airline: "IndiGo",
    origin: {
      code: "DEL",
      city: "Delhi",
      name: "Indira Gandhi International",
      terminal: "Terminal 3",
    },
    destination: {
      code: "BLR",
      city: "Bengaluru",
      name: "Kempegowda International",
      terminal: "Terminal 1",
    },
    departureTime: "14:15 IST",
    arrivalTime: "17:00 IST",
    aircraftTail: "VT-IZB",
    aircraftModel: "Airbus A320-271N (PW1127G-JM)",
    gateBay: "Gate 42B • Bay 12",
    flightStatus: "arrived_turnaround",
    statusLabel: "Turnaround in Progress",
    turnaroundMinutesRemaining: 34,
    pilotName: "Capt. Rohan Sharma / FO S. Deshmukh",
    crewReport:
      "Captain Logbook: Severe flock bird ingestion on takeoff climb on No.1 Engine. Peak N1 vibration reached 4.8 units. Walkaround confirmed 12.0 mm through-crack on Fan Blade #8 and 4.0 mm containment ring dent.",
    engine1Id: "VT-DEM2-ENG1", // 14,200 cyc, action_required
    engine2Id: "VT-DEM2-ENG2", // 13,800 cyc, normal
    overallStatus: "action_required",
    activeAlertCount: 1,
  },
  {
    flightNumber: "6E 548",
    airline: "IndiGo",
    origin: {
      code: "BOM",
      city: "Mumbai",
      name: "Chhatrapati Shivaji Maharaj",
      terminal: "Terminal 2",
    },
    destination: {
      code: "DEL",
      city: "Delhi",
      name: "Indira Gandhi International",
      terminal: "Terminal 1D",
    },
    departureTime: "16:40 IST",
    arrivalTime: "18:55 IST",
    aircraftTail: "VT-ITG",
    aircraftModel: "Airbus A321-271NX (PW1133G-JM)",
    gateBay: "Gate 18A • Bay 06",
    flightStatus: "pre_flight_check",
    statusLabel: "Pre-Flight Line Transit",
    turnaroundMinutesRemaining: 48,
    pilotName: "Capt. Ananya Iyer / FO K. Patel",
    crewReport:
      "Transit Check Item: Bird strike reported at 1,500 ft during climb on No.2 Engine. Fan Blade #14 leading-edge nick measured at 1.9 mm depth with 2.2 units peak N1 vibration. On-wing blend evaluation required per AMM 72-12-00.",
    engine1Id: "VT-DEM1-ENG1", // 8,150 cyc, normal
    engine2Id: "VT-DEM1-ENG2", // 8,400 cyc, watch
    overallStatus: "watch",
    activeAlertCount: 1,
  },
  {
    flightNumber: "6E 902",
    airline: "IndiGo",
    origin: {
      code: "HYD",
      city: "Hyderabad",
      name: "Rajiv Gandhi International",
      terminal: "Main Terminal",
    },
    destination: {
      code: "DXB",
      city: "Dubai",
      name: "Dubai International",
      terminal: "Terminal 1",
    },
    departureTime: "19:20 IST",
    arrivalTime: "21:45 GST",
    aircraftTail: "VT-IMR",
    aircraftModel: "Airbus A320-271N (PW1127G-JM)",
    gateBay: "Hangar Bay 03",
    flightStatus: "maintenance_hold",
    statusLabel: "Maintenance Hold (Scheduled)",
    turnaroundMinutesRemaining: 110,
    pilotName: "Capt. Farhan Akhtar / FO M. Chawla",
    crewReport:
      "Transit Walkaround Alert: Oil accumulation noted in No.1 Engine lower nacelle drain mast. Static leak test recorded 18 drops/min from accessory gearbox B-nut coupling. Verify dispatch limits under AMM 79-00-00.",
    engine1Id: "VT-DEM4-ENG1", // 11,900 cyc, watch
    engine2Id: "VT-DEM4-ENG2", // 11,500 cyc, normal
    overallStatus: "watch",
    activeAlertCount: 1,
  },
  {
    flightNumber: "6E 6012",
    airline: "IndiGo",
    origin: {
      code: "BLR",
      city: "Bengaluru",
      name: "Kempegowda International",
      terminal: "Terminal 1",
    },
    destination: {
      code: "CCU",
      city: "Kolkata",
      name: "Netaji Subhash Chandra Bose",
      terminal: "Terminal 2",
    },
    departureTime: "15:10 IST",
    arrivalTime: "17:40 IST",
    aircraftTail: "VT-IFA",
    aircraftModel: "Airbus A320-271N (PW1127G-JM)",
    gateBay: "Gate 24 • Stand 08",
    flightStatus: "in_flight",
    statusLabel: "In-Flight (ACARS Stream)",
    turnaroundMinutesRemaining: 0,
    pilotName: "Capt. Manish Gupta / FO R. Sen",
    crewReport:
      "ACARS Live Telemetry Stream: Cruise at FL360. Core vibration N2: 0.8 units, EGT margin +24°C. Zero telemetry exceedances.",
    engine1Id: "VT-DEM3-ENG1", // 4,200 cyc, normal
    engine2Id: "VT-DEM3-ENG2", // 4,200 cyc, normal
    overallStatus: "normal",
    activeAlertCount: 0,
  },
  {
    flightNumber: "6E 174",
    airline: "IndiGo",
    origin: {
      code: "MAA",
      city: "Chennai",
      name: "Chennai International",
      terminal: "Terminal 4",
    },
    destination: {
      code: "DEL",
      city: "Delhi",
      name: "Indira Gandhi International",
      terminal: "Terminal 3",
    },
    departureTime: "13:30 IST",
    arrivalTime: "16:15 IST",
    aircraftTail: "VT-IJC",
    aircraftModel: "Airbus A321-271NX (PW1133G-JM)",
    gateBay: "Gate 31B • Stand 14",
    flightStatus: "arrived_turnaround",
    statusLabel: "Hot Section Borescope Hold",
    turnaroundMinutesRemaining: 22,
    pilotName: "Capt. Vikramaditya / FO P. Nair",
    crewReport:
      "High EGT Trend Alert: Post-flight borescope on No.2 Engine Stage 1 HPT rotor blades confirmed 42% thermal barrier coating (TBC) spallation, exceeding AMM 72-51-00 max 30% dispatch limit.",
    engine1Id: "VT-DEM6-ENG1", // 13,600 cyc, normal
    engine2Id: "VT-DEM6-ENG2", // 13,950 cyc, action_required
    overallStatus: "action_required",
    activeAlertCount: 1,
  },
  {
    flightNumber: "6E 831",
    airline: "IndiGo",
    origin: {
      code: "DEL",
      city: "Delhi",
      name: "Indira Gandhi International",
      terminal: "Terminal 2",
    },
    destination: {
      code: "BOM",
      city: "Mumbai",
      name: "Chhatrapati Shivaji Maharaj",
      terminal: "Terminal 2",
    },
    departureTime: "18:00 IST",
    arrivalTime: "20:15 IST",
    aircraftTail: "VT-IKL",
    aircraftModel: "Airbus A320-271N (PW1127G-JM)",
    gateBay: "Gate 12 • Stand 03",
    flightStatus: "scheduled",
    statusLabel: "Scheduled Boarding (Watch)",
    turnaroundMinutesRemaining: 55,
    pilotName: "Capt. Alok Verma / FO D. Saxena",
    crewReport:
      "ACARS Vibration Advisory: Elevated N1 vibration (2.9 units) logged during step climb passing FL280 on No.2 Engine Fan Drive Gear System & core spool. Trim balance and chip detector check required.",
    engine1Id: "VT-DEM5-ENG1", // 12,200 cyc, normal
    engine2Id: "VT-DEM5-ENG2", // 12,650 cyc, watch
    overallStatus: "watch",
    activeAlertCount: 1,
  },
];

export function getFlightByNumber(flightNumber: string): FlightInfo | undefined {
  return INDIGO_FLIGHTS.find((f) => f.flightNumber === flightNumber);
}

export function getFlightByEngineId(engineId: string): FlightInfo | undefined {
  return INDIGO_FLIGHTS.find((f) => f.engine1Id === engineId || f.engine2Id === engineId);
}
