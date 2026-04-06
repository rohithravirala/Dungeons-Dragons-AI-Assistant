import { createCompletion } from './openaiService.js';

const DEFAULT_WEBHOOK_URL = 'http://localhost:5678/webhook/generate-story';
const DEFAULT_TIMEOUT_MS = 120000;

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

function buildLocalFallback({ type, input }) {
  const baseHeader = '## Offline Story Forge';

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

export async function createAiContent({ type, prompt, input, sessionId }) {
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
