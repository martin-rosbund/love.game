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

export type GameData = {
  categories: Category[];
  cards: MassageCard[];
  gameLengths: GameLength[];
  cardOptionCounts: CardOptionCount[];
};

export type ActiveCard = MassageCard & {
  giver: Player;
  receiver: Player;
};
