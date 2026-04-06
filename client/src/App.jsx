import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import SectionCard from './components/SectionCard.jsx';
import GeneratorForm from './components/GeneratorForm.jsx';
import ResultDisplay from './components/ResultDisplay.jsx';
import PromptHints from './components/PromptHints.jsx';

const initialCampaign = {
  theme: '',
  tone: '',
  difficulty: '',
  setting: '',
  playLength: ''
};

const initialCharacter = {
  characterType: '',
  level: '',
  backstoryStyle: '',
  alignment: '',
  partyRole: ''
};

const initialQuest = {
  objective: '',
  location: '',
  threatLevel: '',
  rewardStyle: '',
  timePressure: ''
};

export default function App() {
  const [sessionId, setSessionId] = useState('');

  const [campaignInput, setCampaignInput] = useState(initialCampaign);
  const [characterInput, setCharacterInput] = useState(initialCharacter);
  const [questInput, setQuestInput] = useState(initialQuest);

  const [campaignOutput, setCampaignOutput] = useState('');
  const [characterOutput, setCharacterOutput] = useState('');
  const [questOutput, setQuestOutput] = useState('');

  const [campaignLoading, setCampaignLoading] = useState(false);
  const [characterLoading, setCharacterLoading] = useState(false);
  const [questLoading, setQuestLoading] = useState(false);

  const [campaignError, setCampaignError] = useState('');
  const [characterError, setCharacterError] = useState('');
  const [questError, setQuestError] = useState('');

  useEffect(() => {
    const storedSessionId = localStorage.getItem('dnd-session-id');
    if (storedSessionId) {
      setSessionId(storedSessionId);
    }
  }, []);

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('dnd-session-id', sessionId);
    }
  }, [sessionId]);

  const campaignFields = useMemo(
    () => [
      { name: 'theme', label: 'Theme', placeholder: 'E.g. Forgotten gods awakening', required: true },
      { name: 'tone', label: 'Tone', placeholder: 'E.g. Grim heroic fantasy', required: true },
      { name: 'difficulty', label: 'Difficulty', placeholder: 'E.g. Hard', required: true },
      { name: 'setting', label: 'Setting', placeholder: 'E.g. Floating archipelago city-states', required: false },
      { name: 'playLength', label: 'Play Length', placeholder: 'E.g. 6 sessions', required: false }
    ],
    []
  );

  const characterFields = useMemo(
    () => [
      { name: 'characterType', label: 'Character Type', placeholder: 'E.g. Hexblade warlock', required: true },
      { name: 'level', label: 'Level', placeholder: 'E.g. 4', required: true },
      { name: 'backstoryStyle', label: 'Backstory Style', placeholder: 'E.g. Noble fall from grace', required: true },
      { name: 'alignment', label: 'Alignment', placeholder: 'E.g. Chaotic Good', required: false },
      { name: 'partyRole', label: 'Party Role', placeholder: 'E.g. Frontline controller', required: false }
    ],
    []
  );

  const questFields = useMemo(
    () => [
      { name: 'objective', label: 'Objective', placeholder: 'E.g. Retrieve moonstone idol', required: true },
      { name: 'location', label: 'Location', placeholder: 'E.g. Ruined observatory', required: true },
      { name: 'threatLevel', label: 'Threat Level', placeholder: 'E.g. Medium', required: true },
      { name: 'rewardStyle', label: 'Reward Style', placeholder: 'E.g. Legendary relic', required: false },
      { name: 'timePressure', label: 'Time Pressure', placeholder: 'E.g. Eclipse in 3 days', required: false }
    ],
    []
  );

  const updateField = (setter) => (name, value) => {
    setter((previous) => ({ ...previous, [name]: value }));
  };

  async function handleGenerateCampaign(event) {
    event.preventDefault();
    setCampaignLoading(true);
    setCampaignError('');
    try {
      const data = await api.generateCampaign({ ...campaignInput, sessionId });
      setSessionId(data.sessionId);
      setCampaignOutput(data.content);
    } catch (error) {
      setCampaignError(error.message);
    } finally {
      setCampaignLoading(false);
    }
  }

  async function handleGenerateCharacter(event) {
    event.preventDefault();
    setCharacterLoading(true);
    setCharacterError('');
    try {
      const data = await api.generateCharacter({ ...characterInput, sessionId });
      setSessionId(data.sessionId);
      setCharacterOutput(data.content);
    } catch (error) {
      setCharacterError(error.message);
    } finally {
      setCharacterLoading(false);
    }
  }

  async function handleGenerateQuest(event) {
    event.preventDefault();
    setQuestLoading(true);
    setQuestError('');
    try {
      const data = await api.generateQuest({ ...questInput, sessionId });
      setSessionId(data.sessionId);
      setQuestOutput(data.content);
    } catch (error) {
      setQuestError(error.message);
    } finally {
      setQuestLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <h1>🛡️ AI Dungeons & Dragons Assistant</h1>
        <p>Create campaign worlds, heroes, and quests with a single click.</p>
      </header>

      <PromptHints />

      <div className="grid-layout">
        <SectionCard
          title="Generate Campaign"
          subtitle="Craft immersive campaign arcs with tone, setting, and challenge level."
        >
          <GeneratorForm
            fields={campaignFields}
            values={campaignInput}
            onChange={updateField(setCampaignInput)}
            onSubmit={handleGenerateCampaign}
            buttonLabel="Generate Campaign"
            loading={campaignLoading}
          />
          <ResultDisplay
            title="Campaign Output"
            content={campaignOutput}
            loading={campaignLoading}
            error={campaignError}
          />
        </SectionCard>

        <SectionCard
          title="Create Character"
          subtitle="Build memorable adventurers with strong roleplay hooks."
        >
          <GeneratorForm
            fields={characterFields}
            values={characterInput}
            onChange={updateField(setCharacterInput)}
            onSubmit={handleGenerateCharacter}
            buttonLabel="Generate Character"
            loading={characterLoading}
          />
          <ResultDisplay
            title="Character Output"
            content={characterOutput}
            loading={characterLoading}
            error={characterError}
          />
        </SectionCard>

        <SectionCard
          title="Quest Builder"
          subtitle="Design action-ready quests with encounters and rewards."
        >
          <GeneratorForm
            fields={questFields}
            values={questInput}
            onChange={updateField(setQuestInput)}
            onSubmit={handleGenerateQuest}
            buttonLabel="Generate Quest"
            loading={questLoading}
          />
          <ResultDisplay
            title="Quest Output"
            content={questOutput}
            loading={questLoading}
            error={questError}
          />
        </SectionCard>
      </div>
    </main>
  );
}
