import {
  buildCampaignPrompt,
  buildCharacterPrompt,
  buildQuestPrompt
} from '../utils/promptTemplates.js';
import { createAiContent } from '../services/aiService.js';
import { appendSessionEntry, createSessionId } from '../store/sessionStore.js';

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

export async function generateCampaign(req, res, next) {
  try {
    ensureFields(req.body, ['theme', 'tone', 'difficulty']);

    const sessionId = getSessionId(req);
    const prompt = buildCampaignPrompt(req.body);
    const content = await createAiContent({
      type: 'campaign',
      prompt,
      input: req.body,
      sessionId
    });

    appendSessionEntry(sessionId, {
      type: 'campaign',
      input: req.body,
      output: content
    });

    res.json({ sessionId, content });
  } catch (error) {
    next(error);
  }
}

export async function generateCharacter(req, res, next) {
  try {
    ensureFields(req.body, ['characterType', 'level', 'backstoryStyle']);

    const sessionId = getSessionId(req);
    const prompt = buildCharacterPrompt(req.body);
    const content = await createAiContent({
      type: 'character',
      prompt,
      input: req.body,
      sessionId
    });

    appendSessionEntry(sessionId, {
      type: 'character',
      input: req.body,
      output: content
    });

    res.json({ sessionId, content });
  } catch (error) {
    next(error);
  }
}

export async function generateQuest(req, res, next) {
  try {
    ensureFields(req.body, ['objective', 'location', 'threatLevel']);

    const sessionId = getSessionId(req);
    const prompt = buildQuestPrompt(req.body);
    const content = await createAiContent({
      type: 'quest',
      prompt,
      input: req.body,
      sessionId
    });

    appendSessionEntry(sessionId, {
      type: 'quest',
      input: req.body,
      output: content
    });

    res.json({ sessionId, content });
  } catch (error) {
    next(error);
  }
}