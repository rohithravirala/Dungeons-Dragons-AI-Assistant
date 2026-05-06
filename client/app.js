const API_ROUTES = {
  campaign: '/api/generate-campaign',
  character: '/api/generate-character',
  quest: '/api/generate-quest',
  'whole-story': '/api/generate-whole-story'
};

const SESSION_KEY = 'dndSessionId';
let sessionId = localStorage.getItem(SESSION_KEY) || '';

function setState(container, state, message, content = '') {
  container.innerHTML = '';

  if (state) {
    const status = document.createElement('p');
    status.className = `state ${state}`;
    status.textContent = message || '';
    container.appendChild(status);
    return;
  }

  const contentHtml = content || message || '';
  if (typeof marked !== 'undefined') {
    container.innerHTML = marked.parse(contentHtml);
  } else {
    const paragraph = document.createElement('p');
    paragraph.textContent = contentHtml;
    container.appendChild(paragraph);
  }
}

function getOutputContainer(kind) {
  return document.querySelector(`.output-slot[data-output-kind="${kind}"]`);
}

function setCopyEnabled(kind, enabled) {
  const button = document.querySelector(`.btn-copy[data-copy-for="${kind}"]`);
  if (button) {
    button.disabled = !enabled;
  }
}

async function postJSON(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const rawText = await response.text();
    throw new Error(rawText || `Request failed with status ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

function getFormValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function getRequiredMissing(values, required) {
  return required.filter((field) => !values[field] || String(values[field]).trim() === '');
}

async function handleGeneratorSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const kind = form.dataset.kind;
  const outputContainer = getOutputContainer(kind);
  const button = form.querySelector('button[type="submit"]');
  const baseLabel = button.dataset.label || button.textContent;
  const payload = getFormValues(form);

  button.dataset.label = baseLabel;
  button.disabled = true;
  button.textContent = 'Generating...';

  setState(outputContainer, 'loading', 'Summoning your content...');

  try {
    const data = await postJSON(API_ROUTES[kind], { ...payload, sessionId });
    sessionId = data.sessionId || sessionId;
    if (sessionId) {
      localStorage.setItem(SESSION_KEY, sessionId);
    }

    setState(outputContainer, '', '', data.content || 'No content returned.');
    setCopyEnabled(kind, Boolean(data.content));
  } catch (error) {
    setState(outputContainer, 'error', error.message || 'Failed to generate content.');
    setCopyEnabled(kind, false);
  } finally {
    button.disabled = false;
    button.textContent = baseLabel;
  }
}

async function handleStorySubmit(event) {
  event.preventDefault();

  const outputContainer = getOutputContainer('whole-story');
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const baseLabel = button.dataset.label || button.textContent;
  
  const payload = getFormValues(form);
  const missing = getRequiredMissing(payload, ['campaignOutput', 'characterOutput', 'questOutput']);

  if (missing.length) {
    setState(outputContainer, 'error', `Please provide: ${missing.join(', ')}`);
    return;
  }

  button.dataset.label = baseLabel;
  button.disabled = true;
  button.textContent = 'Generating...';
  setState(outputContainer, 'loading', 'Weaving a cinematic story with failover...');

  try {
    const result = await postJSON(API_ROUTES['whole-story'], { ...payload, sessionId });
    sessionId = result.sessionId || sessionId;
    if (sessionId) {
      localStorage.setItem(SESSION_KEY, sessionId);
    }

    setState(outputContainer, '', '', result.content || 'No story returned.');
    setCopyEnabled('whole-story', Boolean(result.content));
  } catch (error) {
    setState(outputContainer, 'error', error.message || 'Failed to generate story.');
    setCopyEnabled('whole-story', false);
  } finally {
    button.disabled = false;
    button.textContent = baseLabel;
  }
}

function handleCopy(event) {
  const button = event.currentTarget;
  const kind = button.dataset.copyFor;
  const container = getOutputContainer(kind);
  const text = container?.innerText?.trim();

  if (!text) {
    return;
  }

  navigator.clipboard.writeText(text).then(() => {
    const original = button.textContent;
    button.textContent = 'Copied!';
    setTimeout(() => {
      button.textContent = original;
    }, 1200);
  });
}

const fillFromOutputsButton = document.querySelector('#fill-from-outputs');
if (fillFromOutputsButton) {
  fillFromOutputsButton.addEventListener('click', () => {
    const storyForm = document.querySelector('#whole-story-form');
    if (!storyForm) return;

    storyForm.elements.campaignOutput.value = getOutputContainer('campaign')?.innerText?.trim() || '';
    storyForm.elements.characterOutput.value = getOutputContainer('character')?.innerText?.trim() || '';
    storyForm.elements.questOutput.value = getOutputContainer('quest')?.innerText?.trim() || '';

    // If these are empty, we can also try to find the raw text if marked hasn't rendered yet
    if (!storyForm.elements.campaignOutput.value) {
      storyForm.elements.campaignOutput.value = getOutputContainer('campaign')?.querySelector('.state.idle') ? '' : getOutputContainer('campaign')?.textContent?.trim();
    }
  });
}

document.querySelectorAll('.generator-form[data-kind]').forEach((form) => {
  form.addEventListener('submit', handleGeneratorSubmit);
});

const storyForm = document.querySelector('#whole-story-form');
if (storyForm) {
  storyForm.addEventListener('submit', handleStorySubmit);
}

document.querySelectorAll('.btn-copy').forEach((button) => {
  button.addEventListener('click', handleCopy);
});
