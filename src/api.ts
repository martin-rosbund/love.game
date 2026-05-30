import type { GameData } from "./types";

export async function fetchGameData(): Promise<GameData> {
  const response = await fetch("/api/game-data");

  if (!response.ok) {
    throw new Error("Spieldaten konnten nicht geladen werden.");
  }

  return response.json();
}
