import type { GameId } from '@/shared/types';
import type { IconName } from '@/ui/icons';

export interface SimpleSurface {
  role: string;
  title: string;
  caption: string;
  icon: IconName;
  accent: string;
}

export interface ShowcaseSpec {
  seed: number;
  gradient: string;
  accent: string;
  secondary: string;
  rating: string;
  players: string;
  badge: string;
  category: string;
  highlight: string;
  pitch: string;
  overview: string;
  steps: [string, string, string];
  sceneLabels: [string, string, string];
  surfaces: [SimpleSurface, SimpleSurface, SimpleSurface];
  hostNotes: [string, string];
}

export const GAME_SHOWCASE: Record<GameId, ShowcaseSpec> = {
  'spot-the-wolf': {
    seed: 101,
    gradient: 'linear-gradient(165deg, #FF665A 0%, #D42C36 100%)',
    accent: '#FF5C6C',
    secondary: '#FFD026',
    rating: '4.9',
    players: '4-10',
    badge: 'Find the Wolf',
    category: 'Hide & Guess',
    highlight: 'Wolf!',
    pitch: 'Sheep see the secret Bible word. The Wolf gets NO word at all and must listen, guess, and blend in!',
    overview: 'Sheep see the secret Bible word on their phones, while the Wolf gets NO word at all!',
    steps: [
      'Hold your finger on your phone screen to peek at your card.',
      'Type or say 1 clue word. Wolves have NO word, so they listen and play along!',
      'Vote for the Wolf! A caught Wolf gets 1 try to guess the secret word.',
    ],
    sceneLabels: ['1. Peek Card', '2. One Clue', '3. Vote & Steal'],
    surfaces: [
      {
        role: 'Big TV Screen',
        title: 'See Clues & Votes',
        caption: 'Shows every clue word and reveals who gets voted out.',
        icon: 'tv',
        accent: '#FF5C6C',
      },
      {
        role: 'Your Phone',
        title: 'Hold to Peek',
        caption: 'Hold to see your card, give 1 clue word, and tap who you think is the Wolf.',
        icon: 'phone',
        accent: '#FFD026',
      },
      {
        role: 'Game Host',
        title: 'Pick 4 to 10 Players',
        caption: 'Pick 4 to 10 stage players or tap a button to pick them at random.',
        icon: 'sliders',
        accent: '#29C5FF',
      },
    ],
    hostNotes: [
      'By default, Wolves get NO word at all. Turn on Look-Alike Mode if you want Wolves to get a close trick word instead.',
      'Friends sitting down can watch the clues on the TV and try to spot the Wolf too!',
    ],
  },
  'fake-verse': {
    seed: 202,
    gradient: 'linear-gradient(165deg, #35C4FF 0%, #156EE8 100%)',
    accent: '#29C5FF',
    secondary: '#38EC82',
    rating: '4.8',
    players: '300',
    badge: 'Make Up a Trick',
    category: 'Fill in the Blank',
    highlight: 'Truth!',
    pitch: 'Write a funny trick answer to a real Bible sentence, fool your friends, and spot the true one!',
    overview: 'Type a made-up answer on your phone, then try to spot the real Bible answer on the TV!',
    steps: [
      'Look at the Bible sentence on the TV with a missing part.',
      'Type a funny trick answer on your phone (+250 points for every friend you fool!).',
      'Tap the real Bible answer to win +500 points!',
    ],
    sceneLabels: ['1. Type a Trick', '2. Mix Answers', '3. Win +500 Pts'],
    surfaces: [
      {
        role: 'Big TV Screen',
        title: 'All Answers Together',
        caption: "Mixes everyone's trick answers with the real Bible answer on the big screen.",
        icon: 'tv',
        accent: '#29C5FF',
      },
      {
        role: 'Your Phone',
        title: 'Type & Pick',
        caption: 'Type your trick answer first, then tap which answer you think is really true.',
        icon: 'phone',
        accent: '#38EC82',
      },
      {
        role: 'Game Host',
        title: 'Keep It Clean',
        caption: 'Hide any silly answer with one tap before it shows up on the TV.',
        icon: 'sliders',
        accent: '#FFD026',
      },
    ],
    hostNotes: [
      'Finding the real answer gives +500 points, and every friend who picks your trick gives you +250 points!',
      'The last 2 rounds (Rounds 5 and 6) give DOUBLE points (2x)!',
    ],
  },
  'what-came-first': {
    seed: 303,
    gradient: 'linear-gradient(165deg, #32EB8E 0%, #0EA068 100%)',
    accent: '#38EC82',
    secondary: '#29C5FF',
    rating: '4.9',
    players: '300',
    badge: 'Story Order',
    category: '1-to-5 Puzzle',
    highlight: 'Order!',
    pitch: 'Five Bible stories are mixed up! Tap them in order from 1 to 5 before time runs out.',
    overview: 'Five Bible stories appear mixed up on your phone. Tap them in order from first (1) to last (5)!',
    steps: [
      'Look at the 5 mixed-up Bible stories on your phone.',
      'Tap them in order from 1 to 5, from earliest to latest.',
      'Tap Lock In fast to score up to 1,000 points!',
    ],
    sceneLabels: ['1. 5 Mixed Stories', '2. Tap 1 to 5', '3. Up to 1,000 Pts'],
    surfaces: [
      {
        role: 'Big TV Screen',
        title: 'See the True Order',
        caption: 'Shows all 5 Bible stories in the right 1-2-3-4-5 order after everyone locks in.',
        icon: 'tv',
        accent: '#38EC82',
      },
      {
        role: 'Your Phone',
        title: 'Tap 1, 2, 3, 4, 5',
        caption: 'Tap each story card in order. Tap Undo to fix a mistake, then hit Lock In!',
        icon: 'phone',
        accent: '#29C5FF',
      },
      {
        role: 'Game Host',
        title: 'Pick Age Group',
        caption: 'Choose Kids, Youth, or Adults story packs before starting the game.',
        icon: 'sliders',
        accent: '#FFD026',
      },
    ],
    hostNotes: [
      'Each card in the right spot gives 160 points (800 for all 5), plus up to 200 bonus points for speed!',
      'Even if you only get 1 or 2 cards in the right spot, you still score points.',
    ],
  },
  'gideons-300': {
    seed: 404,
    gradient: 'linear-gradient(165deg, #FFB82E 0%, #DF5F12 100%)',
    accent: '#FFD026',
    secondary: '#FF5C6C',
    rating: '4.8',
    players: '300',
    badge: 'Last One Standing',
    category: 'Fast Survival Quiz',
    highlight: 'Royale!',
    pitch: 'Answer Bible questions fast through 2 cut rounds until the top players race for the crown!',
    overview: 'Answer fast to stay in the arena! If you are out, you cheer and pick who wins in the final showdown.',
    steps: [
      'Answer 2 rounds of fast Bible questions to stay in the race.',
      'Cheer on the top players as the crowd narrows down to the final showdown.',
      'Top players race to tap first! Careful: a wrong tap freezes you for that question.',
    ],
    sceneLabels: ['1. 2 Survival Rounds', '2. Crowd Narrows', '3. Final Buzzer Race'],
    surfaces: [
      {
        role: 'Big TV Screen',
        title: 'Survivor Count & Final Race',
        caption: 'Shows how many players stay in the race after each cut and spotlights the final showdown.',
        icon: 'tv',
        accent: '#FFD026',
      },
      {
        role: 'Your Phone',
        title: 'Fast Answers & Picks',
        caption: 'Tap answers fast to survive, or pick which top player will win the next point!',
        icon: 'phone',
        accent: '#FF9A3D',
      },
      {
        role: 'Game Host',
        title: 'Replay Question',
        caption: 'Tap Re-ask if you want to replay a final-race question fairly.',
        icon: 'sliders',
        accent: '#FF5C6C',
      },
    ],
    hostNotes: [
      'Nobody ever sits out! Players outside the final race become Watchmen and win +50 points every time they pick the point winner.',
      'In the final race, the first right tap scores +100 points, and the first player to 5 points wins +500 and the crown!',
    ],
  },
  'who-am-i': {
    seed: 505,
    gradient: 'linear-gradient(165deg, #8F6EFF 0%, #5032DF 100%)',
    accent: '#B56BFF',
    secondary: '#29C5FF',
    rating: '4.7',
    players: '300',
    badge: '5-Clue Mystery',
    category: 'Guess the Bible Hero',
    highlight: 'Mystery!',
    pitch: 'Five clues reveal a Bible hero. Guess on Clue 1 for 500 points, or wait for easier clues!',
    overview: 'Clue 1 is worth 500 points! Every 10 seconds an easier clue pops up for 400, 300, 200, and 100 points.',
    steps: [
      'Read Clue 1 on the screen for a big 500-point prize!',
      'Wait 10 seconds for an easier clue (400, 300, 200, or 100 points).',
      'Tap the Bible hero name! You get 1 try per round, and a wrong tap costs 50 points.',
    ],
    sceneLabels: ['1. Clue 1 (500 pts)', '2. Easier Clues', '3. Tap Hero (1 Try)'],
    surfaces: [
      {
        role: 'Big TV Screen',
        title: '5 Clues One by One',
        caption: 'Shows a new clue every 10 seconds as the prize steps from 500 down to 100 points.',
        icon: 'tv',
        accent: '#B56BFF',
      },
      {
        role: 'Your Phone',
        title: 'Tap the Hero Name',
        caption: 'Tap the right Bible hero whenever you know it. Kids mode shows 4 easy choices!',
        icon: 'phone',
        accent: '#29C5FF',
      },
      {
        role: 'Game Host',
        title: 'Add Extra Time',
        caption: 'Tap +15s if kids want a little more time to think before the next clue.',
        icon: 'sliders',
        accent: '#38EC82',
      },
    ],
    hostNotes: [
      'Kids mode automatically gives 4 simple hero buttons on every phone!',
      'Guessing early wins up to 500 points, while a wrong guess locks your phone for that round and subtracts 50 points.',
    ],
  },
};
