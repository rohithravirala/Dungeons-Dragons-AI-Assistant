const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  const text = await response.text();
  return text || null;
}

function getErrorMessage(response, data) {
  if (data && typeof data === 'object') {
    return data?.error?.message || data?.message || `Request failed with status ${response.status}.`;
  }

  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  return `Request failed with status ${response.status}.`;
}

async function postJSON(endpoint, body) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  } catch {
    throw new Error(`Cannot reach backend API at ${API_BASE_URL}. Ensure server is running on port 5001.`);
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(response, data));
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Backend returned an unexpected response format.');
  }

  return data;
}

export const api = {
  generateCampaign: (payload) => postJSON('/generate-campaign', payload),
  generateCharacter: (payload) => postJSON('/generate-character', payload),
  generateQuest: (payload) => postJSON('/generate-quest', payload)
};
