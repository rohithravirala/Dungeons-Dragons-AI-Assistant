import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.join(__dirname, 'server/.env') });

const DEFAULT_WEBHOOK_URL = 'https://demouser001.app.n8n.cloud/webhook/generate-character';
const DEFAULT_TIMEOUT_MS = 120000;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const sessionMemory = new Map();
const MAX_ENTRIES = 15;

const app = express();
 
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

function createSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function appendSessionEntry(sessionId, entry) {
  const current = sessionMemory.get(sessionId) || [];
  const updated = [...current, { ...entry, timestamp: new Date().toISOString() }].slice(-MAX_ENTRIES);
  sessionMemory.set(sessionId, updated);
}

function getProvider() {
  return (process.env.AI_PROVIDER || 'n8n').toLowerCase();
}

function getFallbackMode() {
  return (process.env.AI_FALLBACK_MODE || 'local').toLowerCase();
}

function getWebhookUrl() {
  return process.env.N8N_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
}

function hasOpenAiKey() {
  return Boolean(process.env.OPENAI_API_KEY && String(process.env.OPENAI_API_KEY).trim());
}

function getSessionId(req) {
  return req.body.sessionId || createSessionId();
}

function ensureFields(payload, fields) {
  const missing = fields.filter((field) => !payload[field] || String(payload[field]).trim() === '');
  if (missing.length) {
    const error = new Error(`Missing required field(s): ${missing.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }
}

function sharedStyleInstructions() {
  return `
Write output in clear markdown with headings and bullet points.
Make it imaginative, detailed, and immediately usable for tabletop play.
Include sensory details, NPC hooks, and 2-3 optional twists.
Keep structure easy to scan for game masters and players.
`;
}

function buildCampaignPrompt({ theme, tone, difficulty, setting, playLength }) {
  return `
You are an award-winning Dungeons & Dragons campaign designer.

Generate a campaign concept with these inputs:
- Theme: ${theme}
- Tone: ${tone}
- Difficulty: ${difficulty}
- Setting notes: ${setting || 'Any rich fantasy setting'}
- Expected play length: ${playLength || '4-8 sessions'}

Output format:
1. Campaign Title
2. One-Paragraph Hook
3. Main Antagonist (motivation + signature tactic)
4. Key Locations (3-5 with one-line descriptions)
5. Story Arc in 3 Acts
6. Important NPCs (at least 4)
7. Twist Options (2-3)
8. Session Zero Tips

${sharedStyleInstructions()}
`;
}

function buildCharacterPrompt({ characterType, level, backstoryStyle, alignment, partyRole }) {
  return `
You are a Dungeons & Dragons character creator.

Generate a character profile with these inputs:
- Character type/class archetype: ${characterType}
- Starting level: ${level}
- Backstory style: ${backstoryStyle}
- Alignment preference: ${alignment || 'Any fitting alignment'}
- Party role: ${partyRole || 'Flexible'}

Output format:
1. Character Name + Race/Class suggestion
2. Visual Description
3. Personality Traits, Ideals, Bonds, Flaws
4. Backstory (2-4 short paragraphs)
5. Signature Ability/Combat Style
6. Roleplaying Voice Cues
7. Secret or Hidden Agenda
8. Character Growth Hooks

${sharedStyleInstructions()}
`;
}

function buildQuestPrompt({ objective, location, threatLevel, rewardStyle, timePressure }) {
  return `
You are a quest architect for Dungeons & Dragons.

Generate a playable quest with these inputs:
- Quest objective: ${objective}
- Location: ${location}
- Threat level: ${threatLevel}
- Reward style: ${rewardStyle || 'Balanced treasure + story reward'}
- Time pressure: ${timePressure || 'No strict timer'}

Output format:
1. Quest Title
2. Quest Brief
3. Encounter Flow (beginning, middle, climax)
4. Enemies/Challenges (combat + social + puzzle)
5. Key NPCs
6. Loot and Rewards
7. Failure Consequences
8. Optional Side Objectives

${sharedStyleInstructions()}
`;
}

function buildWholeStoryPrompt({ campaignOutput, characterOutput, questOutput, storyTone, storyLength }) {
  return `
You are a master fantasy storyteller crafting one cohesive Dungeons & Dragons narrative.

You will merge three generated texts into one polished, cinematic story.

Inputs:
- Campaign Output:\n${campaignOutput}
- Character Output:\n${characterOutput}
- Quest Output:\n${questOutput}

Additional preferences:
- Preferred tone: ${storyTone || 'Epic, emotional, immersive fantasy'}
- Target length: ${storyLength || '700-1000 words'}

Requirements:
1. Keep consistency between world, character, and quest details.
2. Make the character central in every major scene.
3. Build clear progression: setup, tension, turning point, consequence, unresolved hook.
4. Use vivid sensory details and cinematic prose.
5. Preserve important facts from all three inputs while improving flow and quality.

Output:
- Return only the final story text.
- No headings, no labels, no explanations.
`;
}

function buildLocalFallback({ type, input }) {
  const baseHeader = '## Offline Story Forge';

  if (type === 'whole-story') {
    return `${baseHeader}

From the shattered skies above ${input.campaignOutput?.slice(0, 80) || 'a broken world'}, one hero stepped into a fate larger than legend. ${input.characterOutput || 'A determined adventurer carried scars of the past and a promise for the future.'}

The quest was not rumor anymore—it was a storm on the horizon. ${input.questOutput || 'A dangerous objective emerged, with powerful enemies and little time to spare.'}

As thunder rolled across the floating ruins, every choice carved the line between ruin and renewal. The hero pressed onward through fear, steel, and spell, learning that victory would demand not only strength, but sacrifice.

When dawn finally touched the broken clouds, the world stood changed but unfinished. The immediate threat had fallen, yet ancient echoes stirred beneath the stones, hinting that this chapter was only the beginning.`;
  }

  if (type === 'campaign') {
    return `${baseHeader}

### Campaign Title
Shadows Over ${input.setting || 'the Forgotten Marches'}

### One-Paragraph Hook
A growing omen tied to **${input.theme || 'ancient powers'}** threatens nearby realms. The party is recruited to investigate strange signs, uncover old pacts, and decide who should control what awakens.

### Core Story Notes
- **Tone:** ${input.tone || 'Heroic fantasy'}
- **Difficulty:** ${input.difficulty || 'Medium'}
- **Suggested Length:** ${input.playLength || '4-8 sessions'}
- **Twist:** A trusted patron is secretly bound to the main threat.

### Session Starters
1. A public festival is interrupted by a supernatural event.
2. An NPC survivor reveals a map fragment and a warning.
3. Rival factions offer conflicting contracts to the party.`;
  }

  if (type === 'character') {
    return `${baseHeader}

### Character Concept
- **Class/Type:** ${input.characterType || 'Wandering adventurer'}
- **Level:** ${input.level || '1'}
- **Alignment:** ${input.alignment || 'Unaligned'}
- **Party Role:** ${input.partyRole || 'Flexible support'}

### Backstory
Once tied to a powerful household, this hero now walks a dangerous road after a defining betrayal. Their chosen path reflects **${input.backstoryStyle || 'a search for redemption'}**, balancing ambition with loyalty.

### Roleplay Hooks
1. Keeps a coded journal with names of unresolved enemies.
2. Refuses easy bargains from nobles and guildmasters.
3. Softens around common folk and street children.

### Growth Arc
Will this hero reclaim their old name, or forge a better one through sacrifice?`;
  }

  return `${baseHeader}

### Quest Title
The ${input.threatLevel || 'Rising'} Threat at ${input.location || 'the Old Ruins'}

### Objective
${input.objective || 'Investigate a local disturbance and resolve it before it spreads.'}

### Encounter Outline
1. **Opening:** Gather clues from frightened witnesses.
2. **Middle:** Face layered challenges (social, exploration, combat).
3. **Climax:** Confront the central danger under time pressure (${input.timePressure || 'unknown'}).

### Rewards
- **Primary Reward Style:** ${input.rewardStyle || 'Treasure + narrative influence'}
- **Bonus:** Ally favor, rare crafting component, and a hidden side lead.`;
}

function findTextInObject(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findTextInObject(item);
      if (found) {
        return found;
      }
    }
    return '';
  }

  if (typeof value === 'object') {
    const preferredKeys = ['content', 'story', 'result', 'output', 'text', 'message', 'response', 'data'];

    for (const key of preferredKeys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const found = findTextInObject(value[key]);
        if (found) {
          return found;
        }
      }
    }

    for (const nestedValue of Object.values(value)) {
      const found = findTextInObject(nestedValue);
      if (found) {
        return found;
      }
    }
  }

  return '';
}

function getOpenAiClient() {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error('OPENAI_API_KEY is not set in environment variables.');
    error.statusCode = 500;
    throw error;
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function extractOpenAiText(response) {
  if (response.output_text) {
    return response.output_text;
  }

  const text = response.output
    ?.flatMap((item) => item.content || [])
    .map((contentPart) => contentPart.text)
    .filter(Boolean)
    .join('\n');

  return text || 'No content returned from AI.';
}

async function createCompletion(prompt) {
  try {
    const client = getOpenAiClient();
    const response = await client.responses.create({
      model: OPENAI_MODEL,
      input: prompt,
      temperature: 0.95,
      max_output_tokens: 950
    });

    return extractOpenAiText(response).trim();
  } catch (error) {
    const wrapped = new Error(error.message || 'Failed to generate content from AI service.');
    wrapped.statusCode = error.status || 500;
    throw wrapped;
  }
}

async function callN8nWebhook({ type, prompt, input, sessionId }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(getWebhookUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type,
        prompt,
        input,
        sessionId,
        timestamp: new Date().toISOString()
      }),
      signal: controller.signal
    });

    const rawText = await response.text();

    if (!response.ok) {
      const error = new Error(`n8n webhook failed with status ${response.status}. ${rawText}`.trim());
      error.statusCode = 502;
      throw error;
    }

    let parsed;
    try {
      parsed = rawText ? JSON.parse(rawText) : {};
    } catch {
      parsed = rawText;
    }

    const extracted = findTextInObject(parsed) || findTextInObject(rawText);
    if (!extracted) {
      const error = new Error('n8n webhook responded without generated content.');
      error.statusCode = 502;
      throw error;
    }

    return extracted;
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('n8n webhook request timed out.');
      timeoutError.statusCode = 504;
      throw timeoutError;
    }

    if (error.code === 'ECONNREFUSED' || /fetch failed/i.test(error.message || '')) {
      const networkError = new Error('Cannot reach n8n webhook. Ensure n8n is running and webhook URL is correct.');
      networkError.statusCode = 502;
      throw networkError;
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function createAiContent({ type, prompt, input, sessionId }) {
  const provider = getProvider();
  const fallbackMode = getFallbackMode();

  if (provider === 'openai') {
    return createCompletion(prompt);
  }

  if (provider === 'local') {
    return buildLocalFallback({ type, input });
  }

  try {
    return await callN8nWebhook({ type, prompt, input, sessionId });
  } catch (error) {
    if (fallbackMode === 'openai' && hasOpenAiKey()) {
      return createCompletion(prompt);
    }

    if (fallbackMode === 'none') {
      throw error;
    }

    return buildLocalFallback({ type, input });
  }
}

async function handleGeneration(req, res, next, config) {
  try {
    ensureFields(req.body, config.requiredFields);

    const sessionId = getSessionId(req);
    const prompt = config.promptBuilder(req.body);
    const content = await createAiContent({
      type: config.type,
      prompt,
      input: req.body,
      sessionId
    });

    appendSessionEntry(sessionId, {
      type: config.type,
      input: req.body,
      output: content
    });

    res.json({ sessionId, content });
  } catch (error) {
    next(error);
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'D&D Assistant API' });
});

app.post('/api/generate-campaign', (req, res, next) => {
  handleGeneration(req, res, next, {
    type: 'campaign',
    requiredFields: ['theme', 'tone', 'difficulty'],
    promptBuilder: buildCampaignPrompt
  });
});

app.post('/api/generate-character', (req, res, next) => {
  handleGeneration(req, res, next, {
    type: 'character',
    requiredFields: ['characterType', 'level', 'backstoryStyle'],
    promptBuilder: buildCharacterPrompt
  });
});

app.post('/api/generate-quest', (req, res, next) => {
  handleGeneration(req, res, next, {
    type: 'quest',
    requiredFields: ['objective', 'location', 'threatLevel'],
    promptBuilder: buildQuestPrompt
  });
});

app.post('/api/generate-whole-story', (req, res, next) => {
  handleGeneration(req, res, next, {
    type: 'whole-story',
    requiredFields: ['campaignOutput', 'characterOutput', 'questOutput'],
    promptBuilder: buildWholeStoryPrompt
  });
});

const clientDir = path.join(__dirname, 'client');
app.use(express.static(clientDir));

app.get('/', (_req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

app.get('/favicon.ico', (_req, res) => {
  res.status(204).end();
});

app.use((req, _res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

app.use((error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    error: {
      message,
      statusCode
    }
  });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});