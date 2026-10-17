# Live Google Search Grounding for Component Copilot

Enable real-time Google Search Grounding powered by Gemini 3.8 Flash in "Ask Copilot About This Component", delivering live airworthiness directives (FAA/EASA/DGCA), OEM service bulletins, and propulsion engineering updates with clickable external web source badges alongside local AMM citations.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during Phase 1 clarification:
> - **Query Grounding Mode**: Auto-ground every component query with live Google Search so engineers always receive real-time intelligence instead of static pre-canned answers.
> - **Source Attribution**: Render clickable external web source badges displaying the document title, domain/authority tag, and direct live URL.
> - **Priority Knowledge Domains**: Prioritize Pratt & Whitney PW1100G-JM OEM bulletins, FAA Airworthiness Directives (ADs), EASA emergency alerts, and DGCA operational mandates.
> - **Hybrid Synthesis**: Seamlessly fuse local Aircraft Maintenance Manual (AMM/FCOM) citations (`[DEMO-AMM-...]`) with live web citations (`[FAA-AD-...]` / `[PW-SB-...]`).

---

## 1. Overview & Core Concept

Currently, the "Ask Copilot About This Component" drawer in `PartCard.tsx` calls `/api/gemini/part-ask`, which grounds answers solely on static mock document snippets from `retrieval.ts`. If an engineer asks about current fleet issues—such as the recent PW1100G powdered metal high-pressure compressor (HPC) stage 1-2 disk recall, EASA ultrasonic inspection bulletins, or DGCA hot-and-harsh environmental mandates—the local database cannot provide live answers.

This enhancement connects the Component Copilot to the Gemini 3.8 Flash model configured with the `{ googleSearch: {} }` tool. The response synthesizes both the physical engineering specifications of the selected component (metallurgy, dimensions, station location, lifecycle thresholds) and real-time regulatory bulletins retrieved via live Google Search, returning grounded text, search queries executed, and clickable source links.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Subsystem Selection**: The engineer selects any engine component (e.g. *HPC Rotor*, *Combustor Liner*, *Fan Blades*, or *High Pressure Turbine*).
2. **Copilot Query Submission**: The engineer clicks a quick-prompt chip (e.g., *"Latest FAA ADs on powder metal HPC disks"*) or types a custom question into the input field.
3. **Live Grounding Indicator**: A subtle, non-disruptive radar pulse indicator displays:  
   `"Grounding with Google Search • Querying FAA / EASA / P&W Bulletins..."`
4. **Live Synthesized Response**: The copilot renders a comprehensive answer combining:
   - Specific component physical context (dimensions, alloys, tolerances).
   - Real-time regulatory mandates and FAA/EASA inspection thresholds.
   - Clickable local AMM/FCOM badges (`[DEMO-AMM-72-01]`).
   - Clickable external web source badges (`[FAA AD 2024-001]`, `[EASA Safety Bulletin]`, `[P&W Service Digest]`) with live outbound URLs.
5. **Executed Search Queries**: An expandable drawer displays the exact queries Gemini executed against Google Search for transparency and verification.

### Visual Styling & Anti-Slop Layout
- **No Pill Clutter**: External references are presented as clean, functional source badges with subtle domain text, external link icons, and clear typography (`font-mono text-xs`).
- **Tabular & Monospace Integrity**: All AD numbers, dates, cycle limits, and tolerances maintain strict tabular numeral alignment (`font-mono tabular-nums`).
- **Dark Aerospace Theme**: Seamless integration with the existing Slate/Navy cockpit palette (`bg-slate-900/90`, `border-slate-800`, `text-sky-300` accents).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Server-Side Google Search Integration**
  - *Chosen Approach*: Execute `@google/genai` with `tools: [{ googleSearch: {} }]` inside the `/api/gemini/part-ask` server route.
  - *Why*: Conforms strictly to security guidelines (API keys never exposed to client), leverages Gemini 3.8 Flash's native search grounding engine, and extracts `groundingMetadata.groundingChunks` and `webSearchQueries` server-side.
  - *Alternatives Considered*: Client-side search scraping (rejected due to CORS, security, and fragility).

- **Decision 2: Dual Citation Architecture (Local AMM + Live Web)**
  - *Chosen Approach*: The prompt supplies local AMM chapter guidelines while the search tool queries public regulatory databases. The client renderer supports both local modal opening (`onOpenCitation(cleanId)`) and external tab opening (`target="_blank"`).
  - *Why*: Allows certifying engineers to cross-reference their physical maintenance manuals with active worldwide airworthiness directives.

- **Decision 3: Graceful Offline & Fallback Resilience**
  - *Chosen Approach*: When API keys are unavailable or the network times out, fall back to high-fidelity pre-cached PW1100G bulletin responses with simulated search sources rather than throwing an unhandled error.
  - *Why*: Guarantees zero downtime or blank error states in preview and evaluation environments.

---

## 4. Technical Architecture & Data Strategy

### System Component Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ENGINEIQ FRONTEND (React)                       │
│                                                                        │
│   PartCard.tsx                                                         │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ "Ask Copilot About This Component"                             │   │
│   │  - Question Input & Quick Aerospace Prompts                    │   │
│   │  - Live Google Search Badge Indicator                          │   │
│   │  - Synthesized Answer with Local AMM & Live Web Citations      │   │
│   │  - Clickable Web Source Chips (Title, Hostname, Outbound Link) │   │
│   │  - Executed Search Queries Transparency Bar                    │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │ POST /api/gemini/part-ask
                                    │ { partData, question, snippets }
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        EXPRESS SERVER (server.ts)                      │
│                                                                        │
│   /api/gemini/part-ask                                                 │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ GoogleGenAI SDK (model: gemini-3.8-flash)                      │   │
│   │  - tools: [{ googleSearch: {} }]                               │   │
│   │  - Injects component metallurgy, station, limits & AMM context │   │
│   │  - Extracts candidate text + groundingMetadata                 │   │
│   │  - Returns { text, sources, searchQueries, isOfflineSample }   │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Structures & Flow

1. **Client Service (`src/services/gemini.ts`)**:
   - Update `GeminiPartAskResponse` interface to include `sources: GroundedSource[]` and `searchQueries: string[]`.
   - Update `askAboutPart()` to parse and propagate sources and executed search queries.
   - Update `getOfflinePartAskFallback()` with realistic airworthiness sources for common parts (HPC, HPT, Combustor, Fan Blades).

2. **Backend Route (`server.ts`)**:
   - Update `/api/gemini/part-ask` to add `tools: [{ googleSearch: {} }]` to the Gemini call config.
   - Extract `groundingChunks` and `webSearchQueries` from `response.candidates[0].groundingMetadata`.
   - Map grounding chunks into standard `{ title, url }` source objects.

3. **UI Rendering (`src/components/PartCard.tsx`)**:
   - Add state for `sources: GroundedSource[]` and `searchQueries: string[]`.
   - Render live search status banner indicating real-time Google search grounding.
   - Render clickable external source badges at the bottom of the answer.
   - Render the executed Google search queries badge list.
