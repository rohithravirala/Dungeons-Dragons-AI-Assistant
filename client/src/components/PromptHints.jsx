const samplePrompts = {
  campaign: [
    'Theme: Eldritch ocean mystery, Tone: dark heroic, Difficulty: hard',
    'Theme: Sky-pirate rebellion, Tone: swashbuckling, Difficulty: medium'
  ],
  character: [
    'Character type: Arcane Trickster, Level: 5, Backstory style: tragic redemption',
    'Character type: Circle of Stars Druid, Level: 3, Backstory style: wonder-driven explorer'
  ],
  quest: [
    'Objective: rescue missing diplomat, Location: volcanic monastery, Threat: high',
    'Objective: recover cursed relic, Location: feywild ruins, Threat: medium'
  ]
};

export default function PromptHints() {
  return (
    <aside className="prompt-hints">
      <h3>Sample Prompt Ideas</h3>
      <div className="prompt-grid">
        <div>
          <h4>Campaign</h4>
          <ul>
            {samplePrompts.campaign.map((prompt) => (
              <li key={prompt}>{prompt}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Character</h4>
          <ul>
            {samplePrompts.character.map((prompt) => (
              <li key={prompt}>{prompt}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Quest</h4>
          <ul>
            {samplePrompts.quest.map((prompt) => (
              <li key={prompt}>{prompt}</li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
