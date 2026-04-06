function sharedStyleInstructions() {
  return `
Write output in clear markdown with headings and bullet points.
Make it imaginative, detailed, and immediately usable for tabletop play.
Include sensory details, NPC hooks, and 2-3 optional twists.
Keep structure easy to scan for game masters and players.
`;
}

export function buildCampaignPrompt({ theme, tone, difficulty, setting, playLength }) {
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

export function buildCharacterPrompt({ characterType, level, backstoryStyle, alignment, partyRole }) {
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

export function buildQuestPrompt({ objective, location, threatLevel, rewardStyle, timePressure }) {
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
