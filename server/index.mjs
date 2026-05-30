import express from "express";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const contentDir = path.join(root, "content");
const distDir = path.join(root, "dist");
const port = Number(process.env.PORT ?? 5174);
const allowedGenders = new Set(["mann", "frau", "divers"]);
const editableSections = new Map([
  ["cards", "cards.json"],
  ["categories", "categories.json"],
  ["gameLengths", "gameLengths.json"],
  ["cardSets", "cardSets.json"]
]);

const app = express();
app.use(express.json({ limit: "4mb" }));

async function readJson(fileName) {
  const filePath = path.join(contentDir, fileName);
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function writeJson(fileName, data) {
  const filePath = path.join(contentDir, fileName);
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function isTime(value) {
  return typeof value === "string" && /^\d{1,2}:[0-5]\d$/.test(value);
}

function validateGenderList(card, fieldName) {
  if (!Array.isArray(card[fieldName]) || card[fieldName].length === 0) {
    throw new Error(`Card "${card.id}" needs a non-empty ${fieldName} list.`);
  }

  for (const gender of card[fieldName]) {
    if (!allowedGenders.has(gender)) {
      throw new Error(`Card "${card.id}" has invalid ${fieldName} entry "${gender}".`);
    }
  }
}

function validateGameModes(gameModes) {
  if (!Array.isArray(gameModes)) {
    throw new Error("gameModes.json must contain an array.");
  }

  for (const mode of gameModes) {
    if (!mode.id || !mode.label || !mode.description || !mode.verb || !mode.color) {
      throw new Error("Each game mode needs id, label, description, verb and color.");
    }
  }
}

function validateCategories(categories, modeIds) {
  if (!Array.isArray(categories)) {
    throw new Error("categories.json must contain an array.");
  }

  for (const category of categories) {
    if (!category.id || !category.name || !category.color) {
      throw new Error("Each category needs id, name and color.");
    }

    if (!Array.isArray(category.modes) || category.modes.length === 0) {
      throw new Error(`Category "${category.id}" needs at least one mode.`);
    }

    for (const mode of category.modes) {
      if (!modeIds.has(mode)) {
        throw new Error(`Category "${category.id}" references unknown mode "${mode}".`);
      }
    }
  }
}

function validateCards(cards, categoryById, moodIds, modeIds) {
  if (!Array.isArray(cards)) {
    throw new Error("cards.json must contain an array.");
  }

  for (const card of cards) {
    if (!card.id || !card.task || typeof card.finalCard !== "boolean") {
      throw new Error("Each card needs id, task and finalCard.");
    }

    if (!modeIds.has(card.mode)) {
      throw new Error(`Card "${card.id}" references unknown mode "${card.mode}".`);
    }

    const category = categoryById.get(card.category);

    if (!category) {
      throw new Error(`Card "${card.id}" references unknown category "${card.category}".`);
    }

    if (!category.modes.includes(card.mode)) {
      throw new Error(`Card "${card.id}" uses category "${card.category}" outside mode "${card.mode}".`);
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

    validateGenderList(card, "receiverGenders");
    validateGenderList(card, "giverGenders");

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

function validateReferenceList(owner, values, fieldName, allowedValues, label) {
  if (!Array.isArray(values)) {
    throw new Error(`${owner} needs ${fieldName} as an array.`);
  }

  for (const value of values) {
    if (!allowedValues.has(value)) {
      throw new Error(`${owner} references unknown ${label} "${value}".`);
    }
  }
}

function validateCardSets(cardSets, categoryById, moodIds, modeIds) {
  if (!Array.isArray(cardSets)) {
    throw new Error("cardSets.json must contain an array.");
  }

  for (const cardSet of cardSets) {
    if (!cardSet.id || !cardSet.label || typeof cardSet.description !== "string") {
      throw new Error("Each card set needs id, label and description.");
    }

    validateReferenceList(`Card set "${cardSet.id}"`, cardSet.modeIds, "modeIds", modeIds, "mode");
    validateReferenceList(`Card set "${cardSet.id}"`, cardSet.categoryIds, "categoryIds", new Set(categoryById.keys()), "category");
    validateReferenceList(`Card set "${cardSet.id}"`, cardSet.moodIds, "moodIds", moodIds, "mood");

    for (const categoryId of cardSet.categoryIds) {
      const category = categoryById.get(categoryId);
      const canUseCategory = cardSet.modeIds.length === 0 || category.modes.some((mode) => cardSet.modeIds.includes(mode));

      if (!canUseCategory) {
        throw new Error(`Card set "${cardSet.id}" uses category "${categoryId}" outside its modes.`);
      }
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

async function loadRawGameData() {
  const [gameModes, categories, cards, cardSets, gameLengths, cardOptionCounts, moods, intensities, themes] = await Promise.all([
    readJson("gameModes.json"),
    readJson("categories.json"),
    readJson("cards.json"),
    readJson("cardSets.json"),
    readJson("gameLengths.json"),
    readJson("cardOptionCounts.json"),
    readJson("moods.json"),
    readJson("intensities.json"),
    readJson("themes.json")
  ]);

  return { gameModes, categories, cards, cardSets, gameLengths, cardOptionCounts, moods, intensities, themes };
}

function validateGameData(data) {
  const modeIds = new Set(data.gameModes.map((mode) => mode.id));
  const moodIds = new Set(data.moods.map((mood) => mood.id));
  const categoryById = new Map(data.categories.map((category) => [category.id, category]));

  validateGameModes(data.gameModes);
  validateCategories(data.categories, modeIds);
  validateMoods(data.moods);
  validateCards(
    data.cards,
    categoryById,
    moodIds,
    modeIds
  );
  validateCardSets(data.cardSets, categoryById, moodIds, modeIds);
  validateGameLengths(data.gameLengths);
  validateCardOptionCounts(data.cardOptionCounts);
  validateIntensities(data.intensities);
  validateThemes(data.themes);

  return data;
}

async function loadGameData() {
  return validateGameData(await loadRawGameData());
}

app.get("/api/game-modes", async (_request, response, next) => {
  try {
    const { gameModes } = await loadGameData();
    response.json(gameModes);
  } catch (error) {
    next(error);
  }
});

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

app.get("/api/card-sets", async (_request, response, next) => {
  try {
    const { cardSets } = await loadGameData();
    response.json(cardSets);
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

app.put("/api/admin/:section", async (request, response, next) => {
  try {
    const section = request.params.section;
    const fileName = editableSections.get(section);

    if (!fileName) {
      response.status(404).json({ message: `Unknown editable section "${section}".` });
      return;
    }

    if (!Array.isArray(request.body)) {
      response.status(400).json({ message: `Section "${section}" must be saved as an array.` });
      return;
    }

    const nextData = await loadRawGameData();
    nextData[section] = request.body;
    validateGameData(nextData);
    await writeJson(fileName, request.body);
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
