import type { DialogueLine } from '../types/game';

export interface BossDialogueEntry {
  lines: DialogueLine[];
}

export interface BossDialogueTree {
  encounters: BossDialogueEntry[];
  generic: DialogueLine[][];
}

export interface BossDialogueData {
  preBeaten: BossDialogueTree;
  postBeaten: BossDialogueTree;
}

const BASE = import.meta.env.BASE_URL;

// ─── Gar Gar Gorilla ────────────────────────────────────────────────────────
// Pre-beaten: Gar Gar holds the Sorceress captive in his jungle lair
// Post-beaten: Sorceress is freed; Gar Gar is humbled and learns about friendship

const garGarPreBeaten: BossDialogueTree = {
  encounters: [
    {
      lines: [
        { speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'GRRR! You dare enter Gar Gar jungle? The shiny mage is MINE!' },
        { speaker: 'Sorceress', portrait: BASE + 'sorceress.png', text: 'Help! He captured me three moons ago! Something about my "sparkly hands"!' }
      ]
    },
    {
      lines: [
        { speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'Pretty mage makes colorful lights! Gar Gar watches lights! Mage STAYS!' },
        { speaker: 'Sorceress', portrait: BASE + 'sorceress.png', text: 'I am NOT a pet! I am a scholar of the arcane arts! Release me at once!' }
      ]
    },
    {
      lines: [
        { speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'Gar Gar found mage alone in cave. She glows warm. Gar Gar likes warm.' },
        { speaker: 'Sorceress', portrait: BASE + 'sorceress.png', text: 'He thinks my magical aura is a "pretty light show." I have tried reasoning with him...' }
      ]
    },
    {
      lines: [
        { speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'You break Gar Gar\'s toys? Gar Gar BREAK YOU!' },
        { speaker: 'Sorceress', portrait: BASE + 'sorceress.png', text: 'Please, just distract him! If I can cast one spell, I can free us all!' }
      ]
    },
    {
      lines: [
        { speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'Mage is Gar Gar\'s friend now. You can\'t have!' },
        { speaker: 'Sorceress', portrait: BASE + 'sorceress.png', text: 'I have been trying to befriend him, but he only understands strength!' }
      ]
    },
    {
      lines: [
        { speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'Gar Gar protected mage from big scary monsters! Mage should THANK Gar Gar!' },
        { speaker: 'Sorceress', portrait: BASE + 'sorceress.png', text: 'He "rescued" me from a perfectly normal dungeon crawl and now refuses to let me leave!' }
      ]
    },
    {
      lines: [
        { speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'You look strong! Maybe you be Gar Gar\'s friend too! But mage STAYS!' },
        { speaker: 'Sorceress', portrait: BASE + 'sorceress.png', text: 'He is starting to see you as a threat. Be careful — he is stronger than he looks!' }
      ]
    },
    {
      lines: [
        { speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'Gar Gar tired of mage complaining. Maybe Gar Gar... eat mage...' },
        { speaker: 'Sorceress', portrait: BASE + 'sorceress.png', text: 'OKAY, NOW I am actually terrified! Please hurry! He is getting impatient!' }
      ]
    },
    {
      lines: [
        { speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'Gar Gar feel funny... head hurt... everything spin...' },
        { speaker: 'Sorceress', portrait: BASE + 'sorceress.png', text: 'His grip is weakening! I think he is exhausted from keeping me prisoner! NOW is our chance!' }
      ]
    },
    {
      lines: [
        { speaker: 'Sorceress', portrait: BASE + 'sorceress.png', text: 'Heroes! You found me! Gar Gar has been guarding me like a prized treasure for weeks!' },
        { speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'No take mage! Gar Gar will fight! Gar Gar STRONG!' }
      ]
    }
  ],
  generic: [
    [{ speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'Shiny mage still makes pretty lights for Gar Gar! You no take!' }],
    [{ speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'Gar Gar no like your face! You leave now or Gar Gar SMASH!' }],
    [{ speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'Gar Gar heard loud noises in jungle! Was that you? Gar Gar investigate!' }],
    [{ speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'Mage says you are "heroes." Gar Gar think you look like trouble!' }],
    [{ speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'Gar Gar found new shiny rock today! Want to see? ...Actually, no. Gar Gar keep!' }]
  ]
};

const garGarPostBeaten: BossDialogueTree = {
  encounters: [
    {
      lines: [
        { speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'Ugh... Gar Gar head hurt... why you hit Gar Gar so hard?' },
        { speaker: 'Sorceress', portrait: BASE + 'sorceress.png', text: 'You held me captive for WEEKS! You are lucky we showed mercy!' }
      ]
    },
    {
      lines: [
        { speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'Gar Gar sorry... Gar Gar just lonely. No friends in jungle. Only trees.' },
        { speaker: 'Sorceress', portrait: BASE + 'sorceress.png', text: 'I suppose isolation can make anyone desperate. Even a giant gorilla.' }
      ]
    },
    {
      lines: [
        { speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'You strong! Maybe you teach Gar Gar to be strong like you?' },
        { speaker: 'Sorceress', portrait: BASE + 'sorceress.png', text: 'He is asking for training? After everything he put me through? ...I suppose growth is possible.' }
      ]
    },
    {
      lines: [
        { speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'Gar Gar see shiny lights in cave now. Pretty! Gar Gar like!' },
        { speaker: 'Sorceress', portrait: BASE + 'sorceress.png', text: 'He is drawn to the magical residual energy in the dungeon. Interesting...' }
      ]
    },
    {
      lines: [
        { speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'Gar Gar protect you from bad monsters! Gar Gar GOOD BOY!' },
        { speaker: 'Sorceress', portrait: BASE + 'sorceress.png', text: 'He is trying to prove himself. I almost feel sorry for him.' }
      ]
    },
    {
      lines: [
        { speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'Gar Gar learn new word today: "friend." What friend mean?' },
        { speaker: 'Sorceress', portrait: BASE + 'sorceress.png', text: 'He is asking me what friendship means. This is... genuinely unexpected.' }
      ]
    },
    {
      lines: [
        { speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'Gar Gar bring you shiny rock! FRIENDS give shiny things!' },
        { speaker: 'Sorceress', portrait: BASE + 'sorceress.png', text: 'He brought me a rock. A very ugly rock. But... the gesture is oddly sweet.' }
      ]
    },
    {
      lines: [
        { speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'Gar Gar miss mage when mage gone. Gar Gar... sad.' },
        { speaker: 'Sorceress', portrait: BASE + 'sorceress.png', text: 'He gets lonely when we leave. I never thought I would feel sympathy for him.' }
      ]
    },
    {
      lines: [
        { speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'Gar Gar try to be good now. No more capturing!' },
        { speaker: 'Sorceress', portrait: BASE + 'sorceress.png', text: 'He is actually trying to change. Maybe there is hope for him yet.' }
      ]
    },
    {
      lines: [
        { speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'Gar Gar... Gar Gar LOVE friends. Friends important.' },
        { speaker: 'Sorceress', portrait: BASE + 'sorceress.png', text: 'He finally understands. I think we have truly reached him.' }
      ]
    }
  ],
  generic: [
    [{ speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'Gar Gar still learning new words! Today word is "SMASH"! ...Gar Gar think that one already known.' }],
    [{ speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'You come back! Gar Gar HAPPY to see you!' }],
    [{ speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'Gar Gar found new shiny thing in jungle! Want to see? ...Nah, Gar Gar keep.' }],
    [{ speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'Gar Gar getting better at being friend. Maybe.' }],
    [{ speaker: 'Gar Gar Gorilla', portrait: BASE + 'gar_gar_gorilla.png', text: 'Gar Gar head still hurt from last time. You hit really REALLY hard!' }]
  ]
};

// ─── Gorgon Overlord ────────────────────────────────────────────────────────
// Pre-beaten: An ancient, tyrannical ruler who petrifies all who enter
// Post-beaten: Defeated, begrudging respect and warnings of deeper horrors

const gorgonPreBeaten: BossDialogueTree = {
  encounters: [
    {
      lines: [
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'Foolish mortals. You tread upon sacred ground. Your stone forms shall adorn my hall.' },
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'I have petrified a thousand warriors. You shall be a thousand and one.' }
      ]
    },
    {
      lines: [
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'The Gorgon Overlord does not negotiate. You exist only to serve.' },
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'Your flesh will crumble. Your bones will dust. Only my will endures.' }
      ]
    },
    {
      lines: [
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'Each hero who enters my domain adds to my collection. Welcome to yours.' },
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'I have been watching you. Your little "guild" amuses me.' }
      ]
    },
    {
      lines: [
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'You think your petty weapons can harm me? I am eternal. I am stone.' },
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'Let me show you why the ancient world feared my gaze.' }
      ]
    },
    {
      lines: [
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'The dungeon speaks to me. It whispers of your coming. It begs for your silence.' },
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'Every step you take brings you closer to your petrified grave.' }
      ]
    },
    {
      lines: [
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'I was old when this dungeon was young. I shall be old when it crumbles.' },
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'Your heroism is a fleeting spark in an eternity of darkness.' }
      ]
    },
    {
      lines: [
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'Why do you fight? The outcome is predetermined. Stone awaits all.' },
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'Surrender now, and I shall make your petrification... painless.' }
      ]
    },
    {
      lines: [
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'I sense something... a power in you that is not of this world. Curious.' },
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'Perhaps you are more than mere mortals after all. How... disappointing.' }
      ]
    },
    {
      lines: [
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'The deeper chambers call to me. I must attend to more pressing matters.' },
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'Do not mistake my departure for fear. I simply have larger prey to hunt.' }
      ]
    },
    {
      lines: [
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'You have proven... persistent. But persistence is not the same as power.' },
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'Very well. Let us settle this once and for all.' }
      ]
    }
  ],
  generic: [
    [{ speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'You return. Your persistence borders on obsession.' }],
    [{ speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'The dungeon reshapes itself around your presence. Fascinating.' }],
    [{ speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'I sense growth in you. The trials are sharpening your edge.' }],
    [{ speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'The stone remembers. Every battle leaves its mark.' }],
    [{ speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'We meet again. Let us see if fortune favors you this time.' }]
  ]
};

const gorgonPostBeaten: BossDialogueTree = {
  encounters: [
    {
      lines: [
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'Impossible... I, the Overlord, brought low by mere mortals...' },
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'Perhaps I underestimated you. A rare miscalculation.' }
      ]
    },
    {
      lines: [
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'You wield a strength that defies the natural order. I am... impressed.' },
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'The stone shell cracks, but the core remains. Remember that.' }
      ]
    },
    {
      lines: [
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'I have observed your kind for millennia. Never have I seen such tenacity.' },
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'Perhaps there is more to this "guild" than I assumed.' }
      ]
    },
    {
      lines: [
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'You fight with honor. A quality I once possessed, before the dungeon consumed me.' },
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'Take my counsel: the darkness below grows restless. You will need more than courage.' }
      ]
    },
    {
      lines: [
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'I was a guardian once, before corruption twisted my purpose. Do not let it twist yours.' },
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'The dungeon tests all who enter. You have passed... for now.' }
      ]
    },
    {
      lines: [
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'Your victory is... notable. But the true horror lies deeper still.' },
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'I sense a gathering storm. The deeper bosses stir from their ancient slumber.' }
      ]
    },
    {
      lines: [
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'I have no love for you, but I respect your strength. That is more than I gave others.' },
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'Do not squander this victory. Prepare yourselves for what comes next.' }
      ]
    },
    {
      lines: [
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'The petrified ones in my hall... they were once heroes like you. Do not forget that.' },
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'Every hero falls eventually. The question is: what do they leave behind?' }
      ]
    },
    {
      lines: [
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'I will recover. I always do. But I will remember your names.' },
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'Consider this a warning, not a surrender. The dungeon does not forgive.' }
      ]
    },
    {
      lines: [
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'Go then. Leave this chamber. But know that I will be watching... always.' },
        { speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'Until we meet again, heroes. May your resolve remain unbroken.' }
      ]
    }
  ],
  generic: [
    [{ speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'You return once more. The dungeon welcomes its favorite prey.' }],
    [{ speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'I sense the weight of your victories. They grow heavier with each step.' }],
    [{ speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'The stone whispers your name. It has learned to fear you.' }],
    [{ speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'Another trial. Another chance to prove your worth. Do not disappoint me.' }],
    [{ speaker: 'Gorgon Overlord', portrait: BASE + 'enemy_boss.png', text: 'We are bound by fate, you and I. Until one of us breaks.' }]
  ]
};

// ─── Boss Dialogue Registry ─────────────────────────────────────────────────

export const BOSS_DIALOGUES: Record<string, BossDialogueData> = {
  'Gar Gar Gorilla': {
    preBeaten: garGarPreBeaten,
    postBeaten: garGarPostBeaten
  },
  'Gorgon Overlord': {
    preBeaten: gorgonPreBeaten,
    postBeaten: gorgonPostBeaten
  }
};

/**
 * Get the dialogue to show for a boss encounter.
 * @param bossName - The name of the boss
 * @param hasBeenBeaten - Whether this boss has been beaten at least once
 * @param encounterNumber - The 0-indexed encounter number for this boss
 */
export function getBossDialogue(
  bossName: string,
  hasBeenBeaten: boolean,
  encounterNumber: number
): DialogueLine[] | null {
  const data = BOSS_DIALOGUES[bossName];
  if (!data) return null;

  const tree = hasBeenBeaten ? data.postBeaten : data.preBeaten;
  const randomGeneric = tree.generic[Math.floor(Math.random() * tree.generic.length)];

  if (encounterNumber < tree.encounters.length) {
    return tree.encounters[encounterNumber].lines;
  }

  return randomGeneric;
}
