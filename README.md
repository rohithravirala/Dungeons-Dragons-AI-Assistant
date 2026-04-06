# AI-Powered Dungeons & Dragons Assistant

A full-stack web app that generates **campaign ideas**, **character profiles**, and **quests** using an AI agent workflow (n8n webhook), with a React frontend and Node.js + Express backend.

## Features

- Generate rich D&D campaign concepts from tone/theme/difficulty inputs.
- Create detailed playable characters with personality and backstory hooks.
- Build quest outlines with encounters, rewards, and optional twists.
- Clean, responsive UI with reusable React components.
- Modular REST API backend with robust validation and error handling.
- In-memory session continuity (no database required).

## Tech Stack

- **Frontend:** React (functional components + hooks), Vite
- **Backend:** Node.js, Express
- **AI Integration:** n8n AI Agent webhook (with optional OpenAI fallback)
- **State/Data:** Client state + in-memory backend session store

## Folder Structure

```text
AI_Ca2_Project/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── GeneratorForm.jsx
│   │   │   ├── PromptHints.jsx
│   │   │   ├── ResultDisplay.jsx
│   │   │   └── SectionCard.jsx
│   │   ├── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── .env.example
│   └── package.json
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── generateController.js
│   │   ├── middleware/
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   └── generateRoutes.js
│   │   ├── services/
│   │   │   └── openaiService.js
│   │   ├── store/
│   │   │   └── sessionStore.js
│   │   ├── utils/
│   │   │   └── promptTemplates.js
│   │   ├── app.js
│   │   └── index.js
│   ├── .env.example
│   └── package.json
├── .gitignore
├── package.json
└── README.md
```

## Step-by-Step Setup

1. **Install dependencies**

   ```bash
   npm install
   npm run install:all
   ```

2. **Configure backend environment**

   ```bash
   cp server/.env.example server/.env
   ```

   Open `server/.env` and set:

   - `AI_PROVIDER=n8n`
   - `N8N_WEBHOOK_URL=http://localhost:5678/webhook/generate-story`
   - `AI_FALLBACK_MODE=local` (uses built-in offline generator if n8n is unavailable)

   Optional fallback mode:

   - `AI_PROVIDER=openai`
   - `OPENAI_API_KEY=your_real_key`
   - `OPENAI_MODEL=gpt-4o-mini`

   Additional fallback option:

   - `AI_FALLBACK_MODE=openai` (tries n8n first, then OpenAI)
   - `AI_FALLBACK_MODE=none` (strict mode, returns error if n8n fails)

3. **Configure frontend environment**

   ```bash
   cp client/.env.example client/.env
   ```

   Usually default is fine:

   - `VITE_API_BASE_URL=http://localhost:5001/api`

4. **Run in development mode (frontend + backend together)**

   ```bash
   npm run dev
   ```

5. **Open the app**

   - Frontend: `http://localhost:5173`
   - Backend health: `http://localhost:5001/api/health`

## API Endpoints

- `POST /api/generate-campaign`
- `POST /api/generate-character`
- `POST /api/generate-quest`

## n8n Webhook Contract

Backend sends this payload to your n8n webhook:

```json
{
   "type": "character",
   "prompt": "...full generated prompt...",
   "input": {
      "characterType": "Arcane Trickster",
      "level": "5",
      "backstoryStyle": "Tragic redemption"
   },
   "sessionId": "sess_...",
   "timestamp": "2026-04-05T10:00:00.000Z"
}
```

Return any of these keys from n8n response for best compatibility:

- `content`
- `result`
- `output`
- `text`
- `message`

### Example Request: Generate Campaign

```json
{
  "theme": "Ancient dragon empires rising",
  "tone": "Epic and mysterious",
  "difficulty": "Hard",
  "setting": "Desert kingdoms over buried ruins",
  "playLength": "8 sessions"
}
```

### Example Request: Generate Character

```json
{
  "characterType": "Arcane Archer",
  "level": "5",
  "backstoryStyle": "Tragic redemption",
  "alignment": "Neutral Good",
  "partyRole": "Ranged control"
}
```

### Example Request: Generate Quest

```json
{
  "objective": "Recover a cursed crown",
  "location": "Sunken cathedral",
  "threatLevel": "Medium",
  "rewardStyle": "Political favor and magical item",
  "timePressure": "Before the blood moon in 2 days"
}
```

## Sample Prompt Inspirations

- **Campaign:** “Build a dark-fantasy campaign around a haunted royal bloodline and an eclipse prophecy.”
- **Character:** “Create a level 3 druid who secretly belongs to a forbidden circle protecting forgotten gods.”
- **Quest:** “Design a city intrigue quest where the party must expose a shapeshifter replacing guild leaders.”

## Error Handling & UX Notes

- Backend validates required fields and returns structured error JSON.
- Frontend shows loading indicators and friendly error messages per section.
- Generated markdown is rendered for easy readability.

## No-Database Session Handling

- Session continuity is managed in memory on the backend using `sessionStore.js`.
- A `sessionId` is returned and reused by the frontend via local storage.
- Data resets when server restarts (expected behavior without DB).

## Build for Production

```bash
npm run build
npm run start
```
