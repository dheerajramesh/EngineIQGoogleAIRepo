# EngineIQ Platform-Managed Firebase Firestore AI Key Vault & Hosted Sync

This plan persists your **Groq API key** and active model cascade (`openai/gpt-oss-120b`, `qwen/qwen3.8-27b`, `openai/gpt-oss-20b`) directly inside your application's **Firebase Firestore database (`ai-studio-engineiq-407c168e-9845-4960-940a-2d2cbbf8a25b`)** so that when you host or share the application, the backend automatically retrieves the key from Firebase without requiring environment variables on the hosted server or any action from end-users.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Summary of Confirmed Architecture & Security Decisions**
> - **Confirmed Decision 1 (Auto-Sync Server Key to Firestore with Env Fallback)**: While running in an environment where `process.env.GROQ_API_KEY` is present, the application automatically syncs and persists the key and model priority list (`openai/gpt-oss-120b` → `qwen/qwen3.8-27b` → `openai/gpt-oss-20b`) into Firestore (`/system_ai_config/groq_runtime`). When hosted in an environment where `process.env.GROQ_API_KEY` is missing, the backend automatically loads and caches the key from Firestore.
> - **Confirmed Decision 2 (100% Platform-Managed by Application Owner — Zero End-User Exposure)**: End-users ("the people" using the application) never manage, view, or configure Firebase or API keys. The Firestore database (`ai-studio-engineiq-407c168e-9845-4960-940a-2d2cbbf8a25b`) is managed strictly by the application itself under the platform owner (`dheeraj.aimit@gmail.com`), and all AI requests work transparently behind the scenes.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Automatic Firestore Vault Bootstrap (`/system_ai_config/groq_runtime`)**: Persists the active Groq key (obfuscated/encoded at rest) and verified model routing table (`openai/gpt-oss-120b`, `qwen/qwen3.8-27b`, `openai/gpt-oss-20b`) into the application's Firestore database (`ai-studio-engineiq-407c168e-9845-4960-940a-2d2cbbf8a25b`).
  2. **Seamless Hosted Runtime Hydration**: When the application is deployed or hosted outside this workspace (where container environment variables may not be injected), the Express backend (`server.ts`) resolves the Groq key from Firestore and caches it in memory so `/api/gemini/copilot-chat`, `/api/gemini/part-ask`, `/api/gemini/extract`, `/api/gemini/explain`, `/api/gemini/training-feedback`, and `/api/gemini/search-grounded-intel` continue returning live LLM answers immediately.
  3. **Hardened Platform-Owner Security Rules**: Locks down `/system_ai_config/{configId}` in `firestore.rules` so only the platform owner (`dheeraj.aimit@gmail.com` / `isBootstrappedSupervisor()`) can write or update the stored AI configuration, while completely preventing regular engineers or trainees from tampering with it.
- **Target Audience / Persona**: The application owner deploying EngineIQ to production or shared hosting, and aviation MRO engineers using the hosted app who expect instant, zero-configuration AI answers.
- **Key Value**: Eliminates broken AI features on hosted deployments caused by missing container `.env` variables, while keeping Firebase and API key management 100% invisible to end-users.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Zero-Config End-User Experience**:
     - An engineer or supervisor opens the hosted EngineIQ application and asks any question in the **AI Copilot Drawer** or **Component Copilot**.
     - They never see an API key prompt, secret input box, or Firebase setup screen. The backend transparently uses the Groq key resolved from `process.env.GROQ_API_KEY` or the Firebase Firestore `/system_ai_config/groq_runtime` vault.
  2. **Automatic Background Sync (Platform Owner)**:
     - When the application boots in an environment with `GROQ_API_KEY`, the server and authenticated owner session automatically synchronize the encoded key payload to Firestore `/system_ai_config/groq_runtime`.
     - When running on a hosted instance where `process.env.GROQ_API_KEY` is absent, the app automatically hydrates the server's in-memory key cache from Firestore `/system_ai_config/groq_runtime` on load.
  3. **Health & Provenance Transparency**:
     - `/api/health` reports `hasGroqKey: true` and `keySource: "env" | "firebase_firestore"` so the header and Copilot Drawer seamlessly display **Live AI Ready (Groq)** whether the key came from the local environment or Firebase Firestore.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: High-precision Enterprise Aviation MRO Console (Airbus Skywise / Swiss AviationSoftware AMOS aesthetic) following a 60-30-10 neutral-to-accent distribution.
  - *Color Palette & Mood*:
    - `--background`: `#F8FAFC` (Slate 50 canvas) and `#0F172A` (Slate 900 command header).
    - `--surface`: `#FFFFFF` with `1px solid #E2E8F0` hairline structural dividers.
    - `--primary`: `#001B94` (IndiGo Aviation Cobalt) for primary actions and active states.
    - `--accent`: `#059669` (Emerald 600) for verified live AI provenance (`LIVE · GROQ · openai/gpt-oss-120b`).
  - *Typography & Hierarchy*: `Plus Jakarta Sans` for headings and UI controls, `JetBrains Mono` (`tabular-nums`) for AMM references, latency counters, and flight telemetry.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual-Layer Resolution (`process.env.GROQ_API_KEY` → In-Memory Firestore Cache → Firestore Document Fetch)**
  - *Chosen Approach*: `getGroqApiKey()` checks `process.env.GROQ_API_KEY` first; if absent in a hosted environment, it reads `cachedFirestoreGroqKey` hydrated from `/system_ai_config/groq_runtime` in Firestore (`ai-studio-engineiq-407c168e-9845-4960-940a-2d2cbbf8a25b`).
  - *Why*: Guarantees sub-millisecond key lookup during AI requests while ensuring hosted deployments automatically recover the key from Firebase Firestore even if container `.env` variables are stripped during deployment.
  - *Alternatives Considered*: Reading only from `.env` (fails when hosted without container secrets) or querying Firestore over the network on every single LLM call without caching (adds unnecessary latency and Firestore read usage).

- **Decision 2: Platform-Managed Security Boundary (No End-User Key UI)**
  - *Chosen Approach*: The Firestore `/system_ai_config/groq_runtime` document is managed automatically by the application backend and restricted in `firestore.rules` so only the bootstrapped platform owner (`dheeraj.aimit@gmail.com`) can write to it, while signed-in application sessions or the backend service can hydrate the server cache without ever displaying keys in the UI.
  - *Why*: Honors your requirement that Firebase is managed by you (the application owner), not by the people using the app, and complies with the strict no-API-key-UI security policy.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                 EngineIQ Application (Dev & Hosted Runtime)                  │
│  ┌────────────────────────────────────┐  ┌────────────────────────────────┐  │
│  │ Silent Firestore AI Config Sync    │  │ AI Copilot & AMM Q&A Views     │  │
│  │ • Auto-syncs server key to         │  │ • Global AI Copilot Drawer     │  │
│  │   /system_ai_config/groq_runtime   │  │ • Component Copilot (PartCard) │  │
│  │ • Hydrates hosted server if env    │  │ • Zero key UI for end-users    │  │
│  │   var is missing on deployment     │  └───────────────┬────────────────┘  │
│  └─────────────────┬──────────────────┘                  │                   │
└────────────────────┼─────────────────────────────────────┼───────────────────┘
                     │                                     │ POST /api/gemini/*
                     ▼                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                Express Backend AI Router & Vault Manager                     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Key Resolution Priority:                                               │  │
│  │  1. process.env.GROQ_API_KEY (Dev / Container Env)                     │  │
│  │     └─► Auto-persists encoded key to Firestore /system_ai_config       │  │
│  │  2. cachedFirestoreGroqKey (Hydrated from Firebase Firestore)          │  │
│  │     └─► Used automatically when hosted container lacks process.env     │  │
│  └───────────────────────────────────┬────────────────────────────────────┘  │
│                                      │                                       │
│                                      ▼                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Multi-Provider Live LLM Execution + 402 Circuit Breaker                │  │
│  │  • Primary: openai/gpt-oss-120b                                        │  │
│  │  • Secondary / Vision: qwen/qwen3.8-27b                                │  │
│  │  • Fast Failover: openai/gpt-oss-20b                                   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│   Firebase Firestore (ai-studio-engineiq-407c168e-9845-4960-940a-2d2cbbf8a25b)│
│  • Collection: /system_ai_config/{configId} (Document: groq_runtime)         │
│  • Hardened Rules: Write locked to Platform Owner (dheeraj.aimit@gmail.com)  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State (`SystemAIConfigDoc` in `firebase-blueprint.json`)
- **Path**: `/system_ai_config/{configId}` (specifically `/system_ai_config/groq_runtime`)
- **Schema Properties**:
  - `configId`: `"groq_runtime"` (`string`, 1–64 chars, alphanumeric/hyphen/underscore)
  - `provider`: `"groq"` (`string`, enum `["groq"]`)
  - `encodedApiKey`: Base64/obfuscated Groq API key payload (`string`, 10–512 chars)
  - `primaryModel`: `"openai/gpt-oss-120b"` (`string`, 1–100 chars)
  - `visionModel`: `"qwen/qwen3.8-27b"` (`string`, 1–100 chars)
  - `fallbackModel`: `"openai/gpt-oss-20b"` (`string`, 1–100 chars)
  - `updatedByEmail`: `"dheeraj.aimit@gmail.com"` (`string`, 3–160 chars)
  - `updatedAt`: Server timestamp (`timestamp`)

### Interactive Component & State Mapping
1. **Server Startup & Direct Firestore Sync (`server.ts`)**:
   - Initializes a server-side Firebase client connected to `ai-studio-engineiq-407c168e-9845-4960-940a-2d2cbbf8a25b`.
   - Exposes `GET /api/ai-config/sync-payload` (returns the encoded key payload when `process.env.GROQ_API_KEY` is present on the server so the authenticated owner session can commit it to Firestore with `serverTimestamp()`) and `POST /api/ai-config/hydrate` (accepts the encoded key read from Firestore `/system_ai_config/groq_runtime` when hosted without `process.env.GROQ_API_KEY`, verifies its prefix/format, and stores it in `cachedFirestoreGroqKey`).
2. **Background Firestore Hydration & Bootstrap (`src/services/firebase.ts`)**:
   - `syncAndHydrateAIConfigWithFirestore()` runs automatically in the background:
     - If the server already has `process.env.GROQ_API_KEY` and the signed-in user is the platform owner (`dheeraj.aimit@gmail.com`), it writes/updates `/system_ai_config/groq_runtime` in Firestore.
     - If the hosted server reports `hasGroqKey: false` in `/api/health`, it reads `/system_ai_config/groq_runtime` from Firestore and posts the encoded payload to `/api/ai-config/hydrate` so the hosted backend immediately activates live Groq routing.
3. **Hardened Firestore Security Rules (`firestore.rules` & `firestore.rules.test.ts`)**:
   - Adds `isValidSystemAIConfigDoc(data)` to `firestore.rules`, validates via `@firebase/eslint-plugin-security-rules`, and deploys the updated rules to Firebase via `DeployRules`.
