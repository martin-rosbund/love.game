export type Gender = "frau" | "mann" | "divers";

export type Player = {
  name: string;
  gender: Gender;
};

export type Category = {
  id: string;
  name: string;
  color: string;
  modes: string[];
};

export type MassageCard = {
  id: string;
  mode: string;
  category: string;
  time: string;
  finalCard: boolean;
  intensity: number;
  moods: string[];
  receiverGenders: Gender[];
  giverGenders: Gender[];
  task: string;
};

export type GameLength = {
  id: string;
  label: string;
  cards: number;
};

export type CardOptionCount = {
  id: string;
  label: string;
  cards: number;
};

export type Mood = {
  id: string;
  label: string;
  color: string;
};

export type Intensity = {
  level: number;
  label: string;
  color: string;
};

export type Theme = {
  id: string;
  label: string;
};

export type GameMode = {
  id: string;
  label: string;
  description: string;
  verb: string;
  color: string;
};

export type CardSet = {
  id: string;
  label: string;
  description: string;
  modeIds: string[];
  categoryIds: string[];
  moodIds: string[];
};

export type GameData = {
  gameModes: GameMode[];
  categories: Category[];
  cards: MassageCard[];
  cardSets: CardSet[];
  gameLengths: GameLength[];
  cardOptionCounts: CardOptionCount[];
  moods: Mood[];
  intensities: Intensity[];
  themes: Theme[];
};

export type ActiveCard = MassageCard & {
  giver: Player;
  receiver: Player;
};
