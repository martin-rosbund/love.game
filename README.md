# Massagekarten

Ein kleines Browsergame fuer Paare mit animierten Massagekarten.

## Stack

- Frontend: React + TypeScript + Vite
- Server: Node.js + Express
- Inhalte: JSON-Dateien im Ordner `content/`

## Entwicklung

```bash
npm install
npm run dev
```

Die App laeuft dann unter `http://127.0.0.1:5173`. Die API laeuft unter `http://127.0.0.1:5174`.

## Inhalte bearbeiten

- `content/categories.json`: Kategorien mit Name und Kartenfarbe
- `content/gameLengths.json`: Spiellaengen mit Kartenanzahl
- `content/cardOptionCounts.json`: Anzahl der verdeckten Auswahlkarten pro Runde
- `content/cards.json`: Karten mit Aufgabe, Zeit, Finalkarten-Flag und Kategorie

Kartenschema:

```json
{
  "id": "ruecken-01",
  "category": "ruecken",
  "time": "02:00",
  "finalCard": false,
  "task": "Massiere den oberen Ruecken mit langsamen Kreisbewegungen."
}
```

Die `category` muss einer ID aus `categories.json` entsprechen. Die Zeit wird im Format `mm:ss` gepflegt.
