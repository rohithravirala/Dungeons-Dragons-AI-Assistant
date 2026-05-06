/**
 * Chatbot Helper Button Module 
 * Provides a UI to generate suggested values for all D&D parameters using Gemini.
 */

class ChatbotHelper {
  constructor() {
    this.isOpen = false;
    this.init();
  }

  init() {
    this.createStyles();
    this.createUI();
    this.attachEvents();
  }

  createStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .chatbot-btn {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: var(--primary, #6366f1);
        color: white;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        z-index: 9999;
        transition: transform 0.2s;
      }
      .chatbot-btn:hover { transform: scale(1.1); }
      
      .chatbot-window {
        position: fixed;
        bottom: 5.5rem;
        right: 2rem;
        width: 350px;
        max-height: 80vh;
        background: #1e1e2e;
        border: 1px solid #313244;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        display: none;
        flex-direction: column;
        z-index: 9998;
        overflow: hidden;
        color: #cdd6f4;
      }
      .chatbot-window.open { display: flex; }
      
      .chatbot-header {
        padding: 1rem;
        background: #313244;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .chatbot-body {
        padding: 1rem;
        overflow-y: auto;
        flex: 1;
      }
      
      .chatbot-footer {
        padding: 1rem;
        border-top: 1px solid #313244;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .chatbot-field {
        margin-bottom: 0.75rem;
      }
      .chatbot-field label {
        display: block;
        font-size: 0.8rem;
        margin-bottom: 0.25rem;
        color: #a6adc8;
      }
      .chatbot-field input {
        width: 100%;
        padding: 0.5rem;
        background: #313244;
        border: 1px solid #45475a;
        color: white;
        border-radius: 4px;
      }

      .btn-chatbot-action {
        width: 100%;
        padding: 0.75rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        transition: background 0.2s, transform 0.1s;
      }
      .btn-gen-all { background: #cba6f7; color: #11111b; }
      .btn-gen-all:hover {
        background: #b4befe;
        transform: translateY(-1px);
      }
      .btn-use-val { background: #94e2d5; color: #11111b; }
      .btn-chatbot-action:disabled { opacity: 0.5; cursor: not-allowed; }
    `;
    document.head.appendChild(style);
  }

  createUI() {
    // Hidden Fields List for suggestion generation
    this.fields = [
      { id: 'cb-theme', label: 'Theme', target: 'theme', placeholder: 'E.g. Eldritch Horror' },
      { id: 'cb-tone', label: 'Tone', target: 'tone', placeholder: 'E.g. Gritty' },
      { id: 'cb-difficulty', label: 'Difficulty', target: 'difficulty', placeholder: 'E.g. Lethal' },
      { id: 'cb-setting', label: 'Setting', target: 'setting', placeholder: 'E.g. Void City' },
      { id: 'cb-playLength', label: 'Play Length', target: 'playLength', placeholder: 'E.g. 5 Sessions' },
      { id: 'cb-charType', label: 'Character Type', target: 'characterType', placeholder: 'E.g. Rogue' },
      { id: 'cb-level', label: 'Level', target: 'level', placeholder: 'E.g. 10' },
      { id: 'cb-backstory', label: 'Backstory Style', target: 'backstoryStyle', placeholder: 'E.g. Tragic' },
      { id: 'cb-alignment', label: 'Alignment', target: 'alignment', placeholder: 'E.g. Chaotic Good' },
      { id: 'cb-role', label: 'Party Role', target: 'partyRole', placeholder: 'E.g. Tank' },
      { id: 'cb-objective', label: 'Objective', target: 'objective', placeholder: 'E.g. Slay a God' },
      { id: 'cb-location', label: 'Location', target: 'location', placeholder: 'E.g. Celestial Forge' },
      { id: 'cb-threat', label: 'Threat Level', target: 'threatLevel', placeholder: 'E.g. High' },
      { id: 'cb-reward', label: 'Reward Style', target: 'rewardStyle', placeholder: 'E.g. Artifact' },
      { id: 'cb-time', label: 'Time Pressure', target: 'timePressure', placeholder: 'E.g. 24 Hours' }
    ];

    const btn = document.createElement('button');
    btn.className = 'chatbot-btn';
    btn.innerHTML = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`;
    btn.title = 'Lore Assistant';
    document.body.appendChild(btn);

    const win = document.createElement('div');
    win.className = 'chatbot-window';
    win.innerHTML = `
      <div class="chatbot-header">
        <strong>Lore Assistant</strong>
        <button id="chatbot-close" style="background:none; border:none; color:white; cursor:pointer;">✕</button>
      </div>
      <div class="chatbot-body">
        <button class="btn-chatbot-action btn-gen-all" id="chatbot-gen-all">Generate All Suggestions</button>
        <div style="margin-top: 1rem;">
          ${this.fields.map(f => `
            <div class="chatbot-field">
              <label>${f.label}</label>
              <input type="text" id="${f.id}" placeholder="${f.placeholder}">
            </div>
          `).join('')}
        </div>
      </div>
      <div class="chatbot-footer">
        <button class="btn-chatbot-action btn-use-val" id="chatbot-use-val">Use Current Values</button>
      </div>
    `;
    document.body.appendChild(win);

    this.btn = btn;
    this.win = win;
  }

  attachEvents() {
    this.btn.addEventListener('click', () => {
      this.isOpen = !this.isOpen;
      this.win.classList.toggle('open', this.isOpen);
    });

    document.getElementById('chatbot-close').addEventListener('click', () => {
      this.isOpen = false;
      this.win.classList.remove('open');
    });

    document.getElementById('chatbot-gen-all').addEventListener('click', () => this.generateAllSuggestions());
    document.getElementById('chatbot-use-val').addEventListener('click', () => this.useValues());
  }

  async generateAllSuggestions() {
    const genBtn = document.getElementById('chatbot-gen-all');
    const originalText = genBtn.textContent;
    genBtn.disabled = true;
    genBtn.textContent = 'Consulting the weave...';

    try {
      const response = await fetch('/api/helper-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Helper failed');
      const data = await response.json();
      
      // Assume server returns a JSON object with keys matching field.target
      this.fields.forEach(f => {
        const input = document.getElementById(f.id);
        if (data[f.target]) {
          input.value = data[f.target];
        }
      });
    } catch (err) {
      alert('Failed to get suggestions: ' + err.message);
    } finally {
      genBtn.disabled = false;
      genBtn.textContent = originalText;
    }
  }

  useValues() {
    this.fields.forEach(f => {
      const val = document.getElementById(f.id).value;
      if (!val) return;

      // Find all inputs in the main page that match the target name
      const mainInputs = document.querySelectorAll(`input[name="${f.target}"], textarea[name="${f.target}"]`);
      mainInputs.forEach(input => {
        input.value = val;
      });
    });
    
    this.isOpen = false;
    this.win.classList.remove('open');
    // Scroll to top to show where values landed
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Initialize when module loads
new ChatbotHelper();
