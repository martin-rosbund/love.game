import type { CardSet, GameData, Intensity, MassageCard } from "./types";

type ModeCount = {
  id: string;
  label: string;
  total: number;
};

type RankStats = Intensity & {
  total: number;
  finals: number;
  byMode: ModeCount[];
};

type CardSetStats = CardSet & {
  total: number;
  finals: number;
  byMode: ModeCount[];
  byRank: Array<{
    level: number;
    label: string;
    total: number;
  }>;
};

export type AdminCardStats = {
  total: number;
  finals: number;
  ranks: RankStats[];
  finalsByMode: ModeCount[];
  decks: CardSetStats[];
};

export type CardCategorySummary = {
  modeId: string;
  categoryId: string;
  total: number;
  finals: number;
};

export type AdminGameData = GameData & {
  cardSummaries: CardCategorySummary[];
  cardStats: AdminCardStats;
};

export async function fetchGameData(): Promise<GameData> {
  const response = await fetch("/api/game-data");

  if (!response.ok) {
    throw new Error("Spieldaten konnten nicht geladen werden.");
  }

  return response.json();
}

export async function fetchAdminGameData(): Promise<AdminGameData> {
  const response = await fetch("/api/admin/game-data");

  if (!response.ok) {
    throw new Error("Admin-Inhalte konnten nicht geladen werden.");
  }

  return response.json();
}

export async function fetchCardsByModeCategory(modeId: string, categoryId: string): Promise<MassageCard[]> {
  const response = await fetch(`/api/admin/cards/${encodeURIComponent(modeId)}/${encodeURIComponent(categoryId)}`);

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? "Karten konnten nicht geladen werden.");
  }

  return response.json();
}

export type EditableContentSection = "cards" | "categories" | "gameLengths" | "cardSets";

export async function saveContentSection(section: EditableContentSection, items: unknown[]): Promise<AdminGameData> {
  const response = await fetch(`/api/admin/${section}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(items)
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? "Inhalte konnten nicht gespeichert werden.");
  }

  return response.json();
}

export async function saveCardsByModeCategory(modeId: string, categoryId: string, items: MassageCard[]): Promise<AdminGameData> {
  const response = await fetch(`/api/admin/cards/${encodeURIComponent(modeId)}/${encodeURIComponent(categoryId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(items)
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? "Karten konnten nicht gespeichert werden.");
  }

  return response.json();
}
