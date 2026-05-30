import express from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const contentDir = path.join(root, "content");
const distDir = path.join(root, "dist");
const port = Number(process.env.PORT ?? 5174);

const app = express();

async function readJson(fileName) {
  const filePath = path.join(contentDir, fileName);
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function isTime(value) {
  return typeof value === "string" && /^\d{1,2}:[0-5]\d$/.test(value);
}

function validateCategories(categories) {
  if (!Array.isArray(categories)) {
    throw new Error("categories.json must contain an array.");
  }

  for (const category of categories) {
    if (!category.id || !category.name || !category.color) {
      throw new Error("Each category needs id, name and color.");
    }
  }
}

function validateCards(cards, categoryIds, moodIds) {
  if (!Array.isArray(cards)) {
    throw new Error("cards.json must contain an array.");
  }

  for (const card of cards) {
    if (!card.id || !card.task || typeof card.finalCard !== "boolean") {
      throw new Error("Each card needs id, task and finalCard.");
    }

    if (!categoryIds.has(card.category)) {
      throw new Error(`Card "${card.id}" references unknown category "${card.category}".`);
    }

    if (!isTime(card.time)) {
      throw new Error(`Card "${card.id}" has invalid time "${card.time}". Use mm:ss.`);
    }

    if (!Number.isInteger(card.intensity) || card.intensity < 1 || card.intensity > 4) {
      throw new Error(`Card "${card.id}" needs intensity between 1 and 4.`);
    }

    if (!Array.isArray(card.moods) || card.moods.length === 0) {
      throw new Error(`Card "${card.id}" needs at least one mood.`);
    }

    for (const mood of card.moods) {
      if (!moodIds.has(mood)) {
        throw new Error(`Card "${card.id}" references unknown mood "${mood}".`);
      }
    }
  }
}

function validateGameLengths(lengths) {
  if (!Array.isArray(lengths)) {
    throw new Error("gameLengths.json must contain an array.");
  }

  for (const length of lengths) {
    if (!length.id || !length.label || !Number.isInteger(length.cards) || length.cards < 2) {
      throw new Error("Each game length needs id, label and cards >= 2.");
    }
  }
}

function validateCardOptionCounts(optionCounts) {
  if (!Array.isArray(optionCounts)) {
    throw new Error("cardOptionCounts.json must contain an array.");
  }

  for (const optionCount of optionCounts) {
    if (
      !optionCount.id ||
      !optionCount.label ||
      !Number.isInteger(optionCount.cards) ||
      optionCount.cards < 1 ||
      optionCount.cards > 3
    ) {
      throw new Error("Each card option count needs id, label and cards between 1 and 3.");
    }
  }
}

function validateMoods(moods) {
  if (!Array.isArray(moods)) {
    throw new Error("moods.json must contain an array.");
  }

  for (const mood of moods) {
    if (!mood.id || !mood.label || !mood.color) {
      throw new Error("Each mood needs id, label and color.");
    }
  }
}

function validateIntensities(intensities) {
  if (!Array.isArray(intensities)) {
    throw new Error("intensities.json must contain an array.");
  }

  for (const intensity of intensities) {
    if (!Number.isInteger(intensity.level) || intensity.level < 1 || intensity.level > 4 || !intensity.label || !intensity.color) {
      throw new Error("Each intensity needs level between 1 and 4, label and color.");
    }
  }
}

function validateThemes(themes) {
  if (!Array.isArray(themes)) {
    throw new Error("themes.json must contain an array.");
  }

  for (const theme of themes) {
    if (!theme.id || !theme.label) {
      throw new Error("Each theme needs id and label.");
    }
  }
}

async function loadGameData() {
  const [categories, cards, gameLengths, cardOptionCounts, moods, intensities, themes] = await Promise.all([
    readJson("categories.json"),
    readJson("cards.json"),
    readJson("gameLengths.json"),
    readJson("cardOptionCounts.json"),
    readJson("moods.json"),
    readJson("intensities.json"),
    readJson("themes.json")
  ]);

  validateCategories(categories);
  validateMoods(moods);
  validateCards(cards, new Set(categories.map((category) => category.id)), new Set(moods.map((mood) => mood.id)));
  validateGameLengths(gameLengths);
  validateCardOptionCounts(cardOptionCounts);
  validateIntensities(intensities);
  validateThemes(themes);

  return { categories, cards, gameLengths, cardOptionCounts, moods, intensities, themes };
}

app.get("/api/categories", async (_request, response, next) => {
  try {
    const { categories } = await loadGameData();
    response.json(categories);
  } catch (error) {
    next(error);
  }
});

app.get("/api/cards", async (_request, response, next) => {
  try {
    const { cards } = await loadGameData();
    response.json(cards);
  } catch (error) {
    next(error);
  }
});

app.get("/api/game-lengths", async (_request, response, next) => {
  try {
    const { gameLengths } = await loadGameData();
    response.json(gameLengths);
  } catch (error) {
    next(error);
  }
});

app.get("/api/card-option-counts", async (_request, response, next) => {
  try {
    const { cardOptionCounts } = await loadGameData();
    response.json(cardOptionCounts);
  } catch (error) {
    next(error);
  }
});

app.get("/api/moods", async (_request, response, next) => {
  try {
    const { moods } = await loadGameData();
    response.json(moods);
  } catch (error) {
    next(error);
  }
});

app.get("/api/intensities", async (_request, response, next) => {
  try {
    const { intensities } = await loadGameData();
    response.json(intensities);
  } catch (error) {
    next(error);
  }
});

app.get("/api/themes", async (_request, response, next) => {
  try {
    const { themes } = await loadGameData();
    response.json(themes);
  } catch (error) {
    next(error);
  }
});

app.get("/api/game-data", async (_request, response, next) => {
  try {
    response.json(await loadGameData());
  } catch (error) {
    next(error);
  }
});

app.use(express.static(distDir));

app.get("/{*splat}", (_request, response) => {
  response.sendFile(path.join(distDir, "index.html"));
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({
    message: error instanceof Error ? error.message : "Unexpected server error."
  });
});

app.listen(port, "127.0.0.1", () => {
  console.log(`Massagekarten server listening on http://127.0.0.1:${port}`);
});
