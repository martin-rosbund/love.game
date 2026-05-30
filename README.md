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
- `content/gameModes.json`: Spielmodi wie Massage oder Liebesspiel
- `content/gameLengths.json`: Spiellaengen mit Kartenanzahl
- `content/cardOptionCounts.json`: Anzahl der verdeckten Auswahlkarten pro Runde
- `content/moods.json`: Spielstimmungen, nach denen Karten gefiltert werden
- `content/intensities.json`: Intensitaetsstufen fuer die Fortschrittskurve
- `content/themes.json`: auswählbare Oberflaechenthemes
- `content/cards.json`: Karten mit Aufgabe, Zeit, Finalkarten-Flag, Kategorie und Rollen-Einschraenkungen

Der Modus `massage` enthaelt 50 Karten fuer Ruecken, Nacken, Kopf, Brust, Beine und Fuesse.
Der Modus `liebespiel` enthaelt 50 Karten fuer Ruecken, Beine, Fuesse, Brueste, Koerper und Mund.

Kartenschema:

```json
{
  "id": "ruecken-01",
  "mode": "massage",
  "category": "ruecken",
  "time": "02:00",
  "finalCard": false,
  "intensity": 1,
  "moods": ["entspannend", "romantisch"],
  "receiverGenders": ["mann", "frau", "divers"],
  "giverGenders": ["mann", "frau", "divers"],
  "task": "Massiere den oberen Ruecken mit langsamen Kreisbewegungen."
}
```

Die `category` muss einer ID aus `categories.json` entsprechen. Die Zeit wird im Format `mm:ss` gepflegt.
`receiverGenders` beschreibt, wer die Karte erhalten kann. `giverGenders` beschreibt, wer sie ausfuehren kann. Erlaubt sind `mann`, `frau` und `divers`.
In Aufgaben koennen `{giver}` und `{receiver}` als Namensplatzhalter verwendet werden. Wenn keine Platzhalter gesetzt sind, fuegt die App die Namen automatisch vor die Aufgabe.
