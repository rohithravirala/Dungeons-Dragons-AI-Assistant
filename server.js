import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.join(__dirname, 'server/.env') });

const DEFAULT_WEBHOOK_URL = 'https://demouser001.app.n8n.cloud/webhook/generate-character';
const DEFAULT_TIMEOUT_MS = 120000;
const N8N_STORY_TIMEOUT_MS = 5000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-2.0-flash,gemini-2.5-flash-lit')
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);
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
You are a master fantasy novelist and Dungeons & Dragons lorekeeper.

Your task is to weave the provided campaign world, character history, and specific quest into one MASSIVE, cinematic narrative.

Length Requirement: Aim for approximately ${storyLength || '5000'} words. Be extremely descriptive.

Inputs:
- Campaign Setting & Context:\n${campaignOutput}
- Protagonist Backstory & Role:\n${characterOutput}
- The Current Quest & Objective:\n${questOutput}

Additional style guide:
- Tone: ${storyTone || 'Cinematic, epic, and emotionally resonant'}
- Structure: 
  * Prologue: Set the stage of the world.
  * Chapter 1: The Hero's Journey begins, connecting backstory to the world.
  * Chapter 2: The Rising Tension—the quest's objective becomes personal.
  * Chapter 3: The Climax—a detailed, high-stakes confrontation.
  * Epilogue: Resolution and a hook for the future.

Requirements:
1. Maintain total consistency between all inputs.
2. Use lush imagery and sensory descriptions (smell of ozone, weight of the air, internal monologues).
3. Do not rush. Expand on character feelings and the environment.
4. Return the content formatted as Markdown.

Output:
- Return only the story text.
- Use Markdown for headings and emphasis.
`;
}

function buildStoryPrompt({ campaign, character, quest, storyControl }) {
  const tone = storyControl?.tone || storyControl?.storyTone || 'cinematic fantasy';
  const length = storyControl?.wordCount || storyControl?.words || storyControl?.storyLength || 400;

  return `Generate a cinematic fantasy story using:

- Campaign (theme, tone, setting, difficulty, play length)
- Character (type, level, backstory, alignment, role)
- Quest (objective, location, threat, reward, time)

Rules:
- Output must be ONE paragraph only
- Use simple English
- Smooth cinematic narration
- Connect world + hero + mission
- Story length: ${length} words
- Tone: ${tone}

Inputs:
Campaign: ${JSON.stringify(campaign || {}, null, 2)}
Character: ${JSON.stringify(character || {}, null, 2)}
Quest: ${JSON.stringify(quest || {}, null, 2)}
Story Control: ${JSON.stringify(storyControl || {}, null, 2)}
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
        ...input,
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
    let isJson = false;
    try {
      parsed = rawText ? JSON.parse(rawText) : {};
      isJson = true;
    } catch {
      parsed = rawText;
    }

    let extracted = findTextInObject(parsed);
    if (!extracted && !isJson) {
      extracted = rawText;
    }

    if (!extracted || extracted.trim() === '' || extracted.replace(/\s/g, '').includes('{"story":""}')) {
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

async function callN8N(data) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), N8N_STORY_TIMEOUT_MS);

  try {
    const prompt = buildStoryPrompt(data);
    const response = await fetch(getWebhookUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'whole-story',
        prompt,
        ...data,
        input: data,
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
    let isJson = false;
    try {
      parsed = rawText ? JSON.parse(rawText) : {};
      isJson = true;
    } catch {
      parsed = rawText;
    }

    let extracted = findTextInObject(parsed);
    if (!extracted && !isJson) {
      extracted = rawText;
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

function isValidStory(response) {
  if (!response || typeof response !== 'string') return false;
  const noSpaces = response.replace(/\s/g, '');
  if (noSpaces.includes('{"story":""}')) return false;
  return response.trim().length > 20;
}

function getGeminiApiKey() {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error('GEMINI_API_KEY is not set in environment variables.');
    error.statusCode = 500;
    throw error;
  }
  return process.env.GEMINI_API_KEY;
}

async function callGeminiModel({ model, prompt }) {
  const apiKey = getGeminiApiKey();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          topP: 0.9,
          maxOutputTokens: 8192
        }
      })
    }
  );

  const json = await response.json();

  if (!response.ok) {
    const error = new Error(json?.error?.message || `Gemini request failed with status ${response.status}`);
    error.statusCode = response.status;
    throw error;
  }

  const text = json?.candidates?.[0]?.content?.parts?.map((part) => part?.text).filter(Boolean).join('');
  if (!text) {
    const error = new Error('Gemini returned an empty response.');
    error.statusCode = 502;
    throw error;
  }

  return text.trim();
}

async function executeGeminiWithRetry(prompt) {
  const models = [GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS.filter((model) => model !== GEMINI_MODEL)];

  let lastError;
  for (const model of models) {
    try {
      const result = await callGeminiModel({ model, prompt });
      console.log(`Generated with Gemini model: ${model}`);
      return result;
    } catch (error) {
      lastError = error;
    }
  }

  const finalError = new Error(lastError?.message || 'All Gemini models failed.');
  finalError.statusCode = lastError?.statusCode || 502;
  throw finalError;
}

async function generateWithGemini(data) {
  const prompt = buildStoryPrompt(data);
  return executeGeminiWithRetry(prompt);
}

async function generateStory(data) {
  try {
    const n8nResponse = await callN8N(data);
    if (isValidStory(n8nResponse)) {
      console.log('Story generated using n8n webhook.');
      return n8nResponse.trim();
    }
  } catch (error) {
    console.log('n8n failed, switching to Gemini...');
  }

  const story = await generateWithGemini(data);
  return story;
}

async function createAiContent({ type, prompt, input, sessionId }) {
  const provider = getProvider();
  const fallbackMode = getFallbackMode();

  if (provider === 'local') {
    return buildLocalFallback({ type, input });
  }

  try {
    return await callN8nWebhook({ type, prompt, input, sessionId });
  } catch (error) {
    if (fallbackMode === 'gemini' && process.env.GEMINI_API_KEY) {
      console.log(`n8n failed for ${type}, falling back to Gemini...`);
      return executeGeminiWithRetry(prompt);
    }

    if (fallbackMode === 'none') {
      throw error;
    }

    console.log(`n8n failed for ${type}, using local fallback...`);
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

app.post('/api/generate-story', async (req, res, next) => {
  try {
    ensureFields(req.body, ['campaign', 'character', 'quest']);
    const sessionId = getSessionId(req);
    const story = await generateStory({
      campaign: req.body.campaign,
      character: req.body.character,
      quest: req.body.quest,
      storyControl: req.body.storyControl || {}
    });

    appendSessionEntry(sessionId, {
      type: 'story',
      input: req.body,
      output: story
    });

    res.send(story);
  } catch (error) {
    next(error);
  }
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