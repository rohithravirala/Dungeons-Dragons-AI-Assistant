import OpenAI from 'openai';

const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error('OPENAI_API_KEY is not set in environment variables.');
    error.statusCode = 500;
    throw error;
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function extractText(response) {
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

export async function createCompletion(prompt) {
  try {
    const client = getClient();
    const response = await client.responses.create({
      model,
      input: prompt,
      temperature: 0.95,
      max_output_tokens: 950
    });

    return extractText(response).trim();
  } catch (error) {
    const wrapped = new Error(error.message || 'Failed to generate content from AI service.');
    wrapped.statusCode = error.status || 500;
    throw wrapped;
  }
}
