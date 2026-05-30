export type Gender = "frau" | "mann" | "divers";

export type Player = {
  name: string;
  gender: Gender;
};

export type Category = {
  id: string;
  name: string;
  color: string;
};

export type MassageCard = {
  id: string;
  category: string;
  time: string;
  finalCard: boolean;
  intensity: number;
  moods: string[];
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

export type GameData = {
  categories: Category[];
  cards: MassageCard[];
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
