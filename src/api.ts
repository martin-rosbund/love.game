import type { GameData } from "./types";

export async function fetchGameData(): Promise<GameData> {
  const response = await fetch("/api/game-data");

  if (!response.ok) {
    throw new Error("Spieldaten konnten nicht geladen werden.");
  }

  return response.json();
}

export type EditableContentSection = "cards" | "categories" | "gameLengths" | "cardSets";

export async function saveContentSection(section: EditableContentSection, items: unknown[]): Promise<GameData> {
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
