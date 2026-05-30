import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, Check, Copy, Plus, RefreshCcw, Save, Trash2 } from "lucide-react";
import { fetchGameData, saveContentSection, type EditableContentSection } from "./api";
import type { CardSet, Category, GameData, GameLength, MassageCard } from "./types";

type AdminTab = EditableContentSection;

const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: "cards", label: "Karten" },
  { id: "categories", label: "Kategorien" },
  { id: "gameLengths", label: "Spiellängen" },
  { id: "cardSets", label: "Kartensets" }
];

const genderOptions = [
  { id: "mann", label: "Mann" },
  { id: "frau", label: "Frau" },
  { id: "divers", label: "Divers" }
];

function nextId(prefix: string, existingIds: string[]) {
  let index = 1;
  let candidate = `${prefix}-${String(index).padStart(2, "0")}`;

  while (existingIds.includes(candidate)) {
    index += 1;
    candidate = `${prefix}-${String(index).padStart(2, "0")}`;
  }

  return candidate;
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function CheckboxGroup({
  options,
  values,
  onChange
}: {
  options: Array<{ id: string; label: string }>;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="admin-check-grid">
      {options.map((option) => (
        <label key={option.id}>
          <input type="checkbox" checked={values.includes(option.id)} onChange={() => onChange(toggleValue(values, option.id))} />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}

function AdminField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function getCategoriesForMode(categories: Category[], modeId: string) {
  return categories.filter((category) => category.modes.includes(modeId));
}

export function AdminScreen() {
  const [draft, setDraft] = useState<GameData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState("");
  const [savingSection, setSavingSection] = useState<AdminTab | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("cards");
  const [cardModeFilter, setCardModeFilter] = useState("alle");
  const [cardSearch, setCardSearch] = useState("");

  function loadData() {
    setLoadError("");
    fetchGameData()
      .then((data) => {
        setDraft(data);
        setStatus("Inhalte geladen.");
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : "Inhalte konnten nicht geladen werden.");
      });
  }

  useEffect(() => {
    loadData();
  }, []);

  const moodOptions = useMemo(() => draft?.moods.map((mood) => ({ id: mood.id, label: mood.label })) ?? [], [draft]);
  const modeOptions = useMemo(() => draft?.gameModes.map((mode) => ({ id: mode.id, label: mode.label })) ?? [], [draft]);
  const categoryOptions = useMemo(() => draft?.categories.map((category) => ({ id: category.id, label: category.name })) ?? [], [draft]);

  const visibleCards = useMemo(() => {
    if (!draft) {
      return [];
    }

    const search = cardSearch.trim().toLocaleLowerCase("de-DE");

    return draft.cards
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => cardModeFilter === "alle" || card.mode === cardModeFilter)
      .filter(({ card }) => {
        if (!search) {
          return true;
        }

        return [card.id, card.category, card.task].some((value) => value.toLocaleLowerCase("de-DE").includes(search));
      });
  }, [cardModeFilter, cardSearch, draft]);

  function updateSection(section: AdminTab, items: GameData[AdminTab]) {
    setDraft((current) => (current ? { ...current, [section]: items } : current));
  }

  function updateCard(index: number, patch: Partial<MassageCard>) {
    if (!draft) {
      return;
    }

    const nextCards = draft.cards.map((card, cardIndex) => (cardIndex === index ? { ...card, ...patch } : card));
    updateSection("cards", nextCards);
  }

  function addCard() {
    if (!draft) {
      return;
    }

    const mode = draft.gameModes[0]?.id ?? "massage";
    const category = getCategoriesForMode(draft.categories, mode)[0]?.id ?? draft.categories[0]?.id ?? "";
    const card: MassageCard = {
      id: nextId(`${mode}-${category || "karte"}`, draft.cards.map((item) => item.id)),
      mode,
      category,
      time: "02:00",
      finalCard: false,
      intensity: 1,
      moods: [draft.moods[0]?.id ?? "entspannend"].filter(Boolean),
      receiverGenders: ["mann", "frau", "divers"],
      giverGenders: ["mann", "frau", "divers"],
      task: "Neue Aufgabe beschreiben."
    };

    updateSection("cards", [card, ...draft.cards]);
    setActiveTab("cards");
  }

  function duplicateCard(index: number) {
    if (!draft) {
      return;
    }

    const source = draft.cards[index];
    const card = {
      ...source,
      id: nextId(source.id.replace(/-\d+$/, ""), draft.cards.map((item) => item.id))
    };
    updateSection("cards", [card, ...draft.cards]);
  }

  function deleteCard(index: number) {
    if (!draft) {
      return;
    }

    updateSection(
      "cards",
      draft.cards.filter((_, cardIndex) => cardIndex !== index)
    );
  }

  function updateCategory(index: number, patch: Partial<Category>) {
    if (!draft) {
      return;
    }

    updateSection(
      "categories",
      draft.categories.map((category, categoryIndex) => (categoryIndex === index ? { ...category, ...patch } : category))
    );
  }

  function addCategory() {
    if (!draft) {
      return;
    }

    const category: Category = {
      id: nextId("kategorie", draft.categories.map((item) => item.id)),
      name: "Neue Kategorie",
      color: "#D1495B",
      modes: [draft.gameModes[0]?.id ?? "massage"].filter(Boolean)
    };

    updateSection("categories", [...draft.categories, category]);
  }

  function deleteCategory(index: number) {
    if (!draft) {
      return;
    }

    updateSection(
      "categories",
      draft.categories.filter((_, categoryIndex) => categoryIndex !== index)
    );
  }

  function updateGameLength(index: number, patch: Partial<GameLength>) {
    if (!draft) {
      return;
    }

    updateSection(
      "gameLengths",
      draft.gameLengths.map((length, lengthIndex) => (lengthIndex === index ? { ...length, ...patch } : length))
    );
  }

  function addGameLength() {
    if (!draft) {
      return;
    }

    updateSection("gameLengths", [
      ...draft.gameLengths,
      { id: nextId("laenge", draft.gameLengths.map((item) => item.id)), label: "Neu", cards: 15 }
    ]);
  }

  function deleteGameLength(index: number) {
    if (!draft) {
      return;
    }

    updateSection(
      "gameLengths",
      draft.gameLengths.filter((_, lengthIndex) => lengthIndex !== index)
    );
  }

  function updateCardSet(index: number, patch: Partial<CardSet>) {
    if (!draft) {
      return;
    }

    updateSection(
      "cardSets",
      draft.cardSets.map((cardSet, cardSetIndex) => (cardSetIndex === index ? { ...cardSet, ...patch } : cardSet))
    );
  }

  function addCardSet() {
    if (!draft) {
      return;
    }

    updateSection("cardSets", [
      ...draft.cardSets,
      {
        id: nextId("set", draft.cardSets.map((item) => item.id)),
        label: "Neues Set",
        description: "Kurze Beschreibung für den Startbildschirm.",
        modeIds: draft.gameModes.map((mode) => mode.id),
        categoryIds: [],
        moodIds: []
      }
    ]);
  }

  function deleteCardSet(index: number) {
    if (!draft) {
      return;
    }

    updateSection(
      "cardSets",
      draft.cardSets.filter((_, cardSetIndex) => cardSetIndex !== index)
    );
  }

  async function saveSection(section: AdminTab) {
    if (!draft) {
      return;
    }

    setSavingSection(section);
    setStatus("");

    try {
      const savedData = await saveContentSection(section, draft[section]);
      setDraft(savedData);
      setStatus(`${tabs.find((tab) => tab.id === section)?.label ?? "Inhalte"} gespeichert.`);
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
    } finally {
      setSavingSection(null);
    }
  }

  if (loadError) {
    return (
      <main className="admin-shell">
        <section className="admin-empty">
          <p className="eyebrow">Admin</p>
          <h1>{loadError}</h1>
          <button type="button" className="primary-action" onClick={loadData}>
            <RefreshCcw aria-hidden="true" size={18} strokeWidth={2.8} />
            Neu laden
          </button>
        </section>
      </main>
    );
  }

  if (!draft) {
    return (
      <main className="admin-shell">
        <section className="admin-empty">
          <p className="eyebrow">Admin</p>
          <h1>Editor wird geladen.</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <a href="/" className="admin-back">
          <ArrowLeft aria-hidden="true" size={18} strokeWidth={2.8} />
          Spiel
        </a>
        <div>
          <p className="eyebrow">Content-Verwaltung</p>
          <h1>Editor</h1>
        </div>
        <button type="button" className="admin-icon-button" onClick={loadData} aria-label="Neu laden">
          <RefreshCcw aria-hidden="true" size={18} strokeWidth={2.8} />
        </button>
      </header>

      <section className="admin-stats" aria-label="Inhaltsübersicht">
        <span>{draft.cards.length} Karten</span>
        <span>{draft.categories.length} Kategorien</span>
        <span>{draft.gameLengths.length} Spiellängen</span>
        <span>{draft.cardSets.length} Kartensets</span>
      </section>

      <section className="admin-layout">
        <nav className="admin-tabs" aria-label="Editorbereiche">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </nav>

        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>{tabs.find((tab) => tab.id === activeTab)?.label}</h2>
              {status && <p>{status}</p>}
            </div>
            <button type="button" className="admin-save-button" onClick={() => saveSection(activeTab)} disabled={savingSection === activeTab}>
              {savingSection === activeTab ? <RefreshCcw aria-hidden="true" size={17} /> : <Save aria-hidden="true" size={17} />}
              Speichern
            </button>
          </div>

          {activeTab === "cards" && (
            <div className="admin-stack">
              <div className="admin-toolbar">
                <button type="button" onClick={addCard}>
                  <Plus aria-hidden="true" size={17} />
                  Karte
                </button>
                <select value={cardModeFilter} onChange={(event) => setCardModeFilter(event.target.value)} aria-label="Modus filtern">
                  <option value="alle">Alle Modi</option>
                  {draft.gameModes.map((mode) => (
                    <option key={mode.id} value={mode.id}>
                      {mode.label}
                    </option>
                  ))}
                </select>
                <input value={cardSearch} onChange={(event) => setCardSearch(event.target.value)} placeholder="Karten suchen" />
              </div>

              <div className="admin-card-list">
                {visibleCards.map(({ card, index }) => {
                  const categoriesForMode = getCategoriesForMode(draft.categories, card.mode);

                  return (
                    <article key={`${card.id}-${index}`} className="admin-edit-card">
                      <div className="admin-card-title">
                        <strong>{card.id}</strong>
                        <div>
                          <button type="button" onClick={() => duplicateCard(index)} aria-label="Karte duplizieren">
                            <Copy aria-hidden="true" size={16} />
                          </button>
                          <button type="button" onClick={() => deleteCard(index)} aria-label="Karte löschen">
                            <Trash2 aria-hidden="true" size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="admin-form-grid">
                        <AdminField label="ID">
                          <input value={card.id} onChange={(event) => updateCard(index, { id: event.target.value })} />
                        </AdminField>
                        <AdminField label="Modus">
                          <select
                            value={card.mode}
                            onChange={(event) => {
                              const mode = event.target.value;
                              updateCard(index, {
                                mode,
                                category: getCategoriesForMode(draft.categories, mode)[0]?.id ?? card.category
                              });
                            }}
                          >
                            {draft.gameModes.map((mode) => (
                              <option key={mode.id} value={mode.id}>
                                {mode.label}
                              </option>
                            ))}
                          </select>
                        </AdminField>
                        <AdminField label="Kategorie">
                          <select value={card.category} onChange={(event) => updateCard(index, { category: event.target.value })}>
                            {categoriesForMode.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </AdminField>
                        <AdminField label="Zeit">
                          <input value={card.time} onChange={(event) => updateCard(index, { time: event.target.value })} />
                        </AdminField>
                        <AdminField label="Rang (1-4)">
                          <input
                            type="number"
                            min={1}
                            max={4}
                            value={card.intensity}
                            onChange={(event) => updateCard(index, { intensity: Number(event.target.value) })}
                          />
                        </AdminField>
                        <label className="admin-checkline">
                          <input
                            type="checkbox"
                            checked={card.finalCard}
                            onChange={(event) => updateCard(index, { finalCard: event.target.checked })}
                          />
                          <span>Finalkarte</span>
                        </label>
                      </div>

                      <AdminField label="Aufgabe">
                        <textarea value={card.task} onChange={(event) => updateCard(index, { task: event.target.value })} rows={3} />
                      </AdminField>

                      <div className="admin-subgrid">
                        <div>
                          <span className="admin-subtitle">Stimmungen</span>
                          <CheckboxGroup options={moodOptions} values={card.moods} onChange={(values) => updateCard(index, { moods: values })} />
                        </div>
                        <div>
                          <span className="admin-subtitle">Kann erhalten</span>
                          <CheckboxGroup
                            options={genderOptions}
                            values={card.receiverGenders}
                            onChange={(values) => updateCard(index, { receiverGenders: values as MassageCard["receiverGenders"] })}
                          />
                        </div>
                        <div>
                          <span className="admin-subtitle">Kann ausführen</span>
                          <CheckboxGroup
                            options={genderOptions}
                            values={card.giverGenders}
                            onChange={(values) => updateCard(index, { giverGenders: values as MassageCard["giverGenders"] })}
                          />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "categories" && (
            <div className="admin-stack">
              <div className="admin-toolbar">
                <button type="button" onClick={addCategory}>
                  <Plus aria-hidden="true" size={17} />
                  Kategorie
                </button>
              </div>
              <div className="admin-card-list compact">
                {draft.categories.map((category, index) => (
                  <article key={`${category.id}-${index}`} className="admin-edit-card">
                    <div className="admin-card-title">
                      <strong>{category.name}</strong>
                      <div>
                        <button type="button" onClick={() => deleteCategory(index)} aria-label="Kategorie löschen">
                          <Trash2 aria-hidden="true" size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="admin-form-grid">
                      <AdminField label="ID">
                        <input value={category.id} onChange={(event) => updateCategory(index, { id: event.target.value })} />
                      </AdminField>
                      <AdminField label="Name">
                        <input value={category.name} onChange={(event) => updateCategory(index, { name: event.target.value })} />
                      </AdminField>
                      <AdminField label="Farbe">
                        <input type="color" value={category.color} onChange={(event) => updateCategory(index, { color: event.target.value })} />
                      </AdminField>
                    </div>
                    <span className="admin-subtitle">Modi</span>
                    <CheckboxGroup options={modeOptions} values={category.modes} onChange={(values) => updateCategory(index, { modes: values })} />
                  </article>
                ))}
              </div>
            </div>
          )}

          {activeTab === "gameLengths" && (
            <div className="admin-stack">
              <div className="admin-toolbar">
                <button type="button" onClick={addGameLength}>
                  <Plus aria-hidden="true" size={17} />
                  Spiellänge
                </button>
              </div>
              <div className="admin-card-list compact">
                {draft.gameLengths.map((length, index) => (
                  <article key={`${length.id}-${index}`} className="admin-edit-card">
                    <div className="admin-card-title">
                      <strong>{length.label}</strong>
                      <div>
                        <button type="button" onClick={() => deleteGameLength(index)} aria-label="Spiellänge löschen">
                          <Trash2 aria-hidden="true" size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="admin-form-grid">
                      <AdminField label="ID">
                        <input value={length.id} onChange={(event) => updateGameLength(index, { id: event.target.value })} />
                      </AdminField>
                      <AdminField label="Label">
                        <input value={length.label} onChange={(event) => updateGameLength(index, { label: event.target.value })} />
                      </AdminField>
                      <AdminField label="Karten">
                        <input
                          type="number"
                          min={2}
                          value={length.cards}
                          onChange={(event) => updateGameLength(index, { cards: Number(event.target.value) })}
                        />
                      </AdminField>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {activeTab === "cardSets" && (
            <div className="admin-stack">
              <div className="admin-toolbar">
                <button type="button" onClick={addCardSet}>
                  <Plus aria-hidden="true" size={17} />
                  Kartenset
                </button>
              </div>
              <div className="admin-card-list compact">
                {draft.cardSets.map((cardSet, index) => (
                  <article key={`${cardSet.id}-${index}`} className="admin-edit-card">
                    <div className="admin-card-title">
                      <strong>{cardSet.label}</strong>
                      <div>
                        <button type="button" onClick={() => deleteCardSet(index)} aria-label="Kartenset löschen">
                          <Trash2 aria-hidden="true" size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="admin-form-grid">
                      <AdminField label="ID">
                        <input value={cardSet.id} onChange={(event) => updateCardSet(index, { id: event.target.value })} />
                      </AdminField>
                      <AdminField label="Label">
                        <input value={cardSet.label} onChange={(event) => updateCardSet(index, { label: event.target.value })} />
                      </AdminField>
                    </div>
                    <AdminField label="Beschreibung">
                      <textarea value={cardSet.description} onChange={(event) => updateCardSet(index, { description: event.target.value })} rows={2} />
                    </AdminField>
                    <div className="admin-subgrid">
                      <div>
                        <span className="admin-subtitle">Modi</span>
                        <CheckboxGroup options={modeOptions} values={cardSet.modeIds} onChange={(values) => updateCardSet(index, { modeIds: values })} />
                      </div>
                      <div>
                        <span className="admin-subtitle">Kategorien</span>
                        <CheckboxGroup
                          options={categoryOptions}
                          values={cardSet.categoryIds}
                          onChange={(values) => updateCardSet(index, { categoryIds: values })}
                        />
                      </div>
                      <div>
                        <span className="admin-subtitle">Stimmungen</span>
                        <CheckboxGroup options={moodOptions} values={cardSet.moodIds} onChange={(values) => updateCardSet(index, { moodIds: values })} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          <div className="admin-save-footer">
            <Check aria-hidden="true" size={17} />
            Änderungen werden erst nach Klick auf „Speichern“ in die JSON-Dateien geschrieben.
          </div>
        </section>
      </section>
    </main>
  );
}
