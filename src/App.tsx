import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Flame, Palette, Pause, Play, RefreshCcw, Sparkles } from "lucide-react";
import { fetchGameData } from "./api";
import { AdminScreen } from "./AdminScreen";
import type { ActiveCard, CardSet, Category, GameData, GameMode, Gender, Intensity, MassageCard, Player } from "./types";

const genderOptions: Array<{ id: Gender; label: string }> = [
  { id: "frau", label: "Frau" },
  { id: "mann", label: "Mann" },
  { id: "divers", label: "Divers" }
];

function parseTime(time: string) {
  const [minutes, seconds] = time.split(":").map(Number);
  return minutes * 60 + seconds;
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function shuffle<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function buildRoundGiverIndexes(totalRounds: number): Array<0 | 1> {
  const baseRoundsPerPlayer = Math.floor(totalRounds / 2);
  const extraRoundPlayer = Math.floor(Math.random() * 2) as 0 | 1;
  const playerRounds: [number, number] = [baseRoundsPerPlayer, baseRoundsPerPlayer];

  if (totalRounds % 2 === 1) {
    playerRounds[extraRoundPlayer] += 1;
  }

  return shuffle([
    ...Array<0>(playerRounds[0]).fill(0),
    ...Array<1>(playerRounds[1]).fill(1)
  ]);
}

function desiredIntensityForRound(roundIndex: number, totalRounds: number) {
  if (roundIndex >= totalRounds - 1) {
    return 4;
  }

  const progress = totalRounds <= 1 ? 1 : roundIndex / Math.max(1, totalRounds - 2);
  return Math.min(4, Math.max(1, Math.floor(progress * 4) + 1));
}

function pickCardOptions(pool: MassageCard[], fallbackPool: MassageCard[], count: number) {
  const primary = shuffle(pool);

  if (primary.length >= count) {
    return primary.slice(0, count);
  }

  const primaryIds = new Set(primary.map((card) => card.id));
  const fallback = shuffle(fallbackPool.filter((card) => !primaryIds.has(card.id)));
  return [...primary, ...fallback].slice(0, count);
}

function canUseCard(card: MassageCard, giverGender: Gender, receiverGender: Gender) {
  return card.giverGenders.includes(giverGender) && card.receiverGenders.includes(receiverGender);
}

function cardMatchesSet(card: MassageCard, cardSet?: CardSet) {
  if (!cardSet) {
    return true;
  }

  const matchesMode = cardSet.modeIds.length === 0 || cardSet.modeIds.includes(card.mode);
  const matchesCategory = cardSet.categoryIds.length === 0 || cardSet.categoryIds.includes(card.category);
  const matchesMood = cardSet.moodIds.length === 0 || card.moods.some((mood) => cardSet.moodIds.includes(mood));

  return matchesMode && matchesCategory && matchesMood;
}

function filterCardsForSet(cards: MassageCard[], cardSet?: CardSet) {
  const filteredCards = cards.filter((card) => cardMatchesSet(card, cardSet));
  return filteredCards.length > 0 ? filteredCards : cards;
}

function buildRoundOptions(
  cards: MassageCard[],
  availableCards: MassageCard[],
  roundIndex: number,
  totalRounds: number,
  count: number,
  giverGender: Gender,
  receiverGender: Gender
) {
  const regularCards = cards.filter((card) => !card.finalCard);
  const eligibleRegularCards = regularCards.filter((card) => canUseCard(card, giverGender, receiverGender));
  const eligibleAvailableCards = availableCards.filter((card) => canUseCard(card, giverGender, receiverGender));
  const finalCards = cards.filter((card) => card.finalCard);
  const eligibleFinalCards = finalCards.filter((card) => canUseCard(card, giverGender, receiverGender));
  const isFinalRound = roundIndex === totalRounds - 1;
  const targetIntensity = desiredIntensityForRound(roundIndex, totalRounds);

  if (isFinalRound && eligibleFinalCards.length > 0) {
    return pickCardOptions(eligibleFinalCards, eligibleFinalCards, count);
  }

  const selectionPool = eligibleAvailableCards.length > 0 ? eligibleAvailableCards : eligibleRegularCards;
  const regularFallbackPool = eligibleRegularCards;
  const exactAnyMoodCards = selectionPool.filter((card) => card.intensity === targetIntensity);
  const relaxedAnyMoodCards = selectionPool.filter((card) => card.intensity <= targetIntensity);

  return pickCardOptions(
    exactAnyMoodCards.length > 0
      ? exactAnyMoodCards
      : relaxedAnyMoodCards.length > 0
        ? relaxedAnyMoodCards
        : selectionPool,
    regularFallbackPool,
    count
  );
}

function personalizeTask(task: string, activeCard: ActiveCard) {
  const giver = activeCard.giver.name.trim();
  const receiver = activeCard.receiver.name.trim();

  if (task.includes("{giver}") || task.includes("{receiver}")) {
    return task.replaceAll("{giver}", giver).replaceAll("{receiver}", receiver);
  }

  return task;
}

function triggerHaptic(pattern: number | number[]) {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function colorWithAlpha(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function PlayerForm({
  label,
  player,
  onChange
}: {
  label: string;
  player: Player;
  onChange: (player: Player) => void;
}) {
  return (
    <fieldset className="player-panel">
      <legend>{label}</legend>
      <label className="input-label">
        Name
        <input
          value={player.name}
          onChange={(event) => onChange({ ...player, name: event.target.value })}
          placeholder={label}
        />
      </label>
      <div className="segmented-control" role="radiogroup" aria-label={`${label} Geschlecht`}>
        {genderOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={player.gender === option.id ? "active" : ""}
            onClick={() => onChange({ ...player, gender: option.id })}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function SetupScreen({
  data,
  onStart
}: {
  data: GameData;
  onStart: (
    players: [Player, Player],
    gameModeId: string,
    cardSetId: string,
    gameLengthId: string,
    optionCountId: string,
    themeId: string
  ) => void;
}) {
  const [playerOne, setPlayerOne] = useState<Player>({ name: "Christine", gender: "frau" });
  const [playerTwo, setPlayerTwo] = useState<Player>({ name: "Martin", gender: "mann" });
  const [selectedMode, setSelectedMode] = useState(data.gameModes[1]?.id ?? "liebesspiel");
  const [selectedCardSet, setSelectedCardSet] = useState(data.cardSets[2]?.id ?? "");
  const [selectedLength, setSelectedLength] = useState(data.gameLengths[1]?.id ?? data.gameLengths[0]?.id ?? "");
  const [selectedOptionCount, setSelectedOptionCount] = useState(
    data.cardOptionCounts[1]?.id ?? data.cardOptionCounts[0]?.id ?? ""
  );
  const [selectedTheme, setSelectedTheme] = useState(data.themes[3]?.id ?? "luxurioes");

  const canStart =
    playerOne.name.trim().length > 0 &&
    playerTwo.name.trim().length > 0 &&
    selectedMode &&
    selectedCardSet &&
    selectedLength &&
    selectedOptionCount &&
    selectedTheme;
  const selectedGameMode = data.gameModes.find((mode) => mode.id === selectedMode) ?? data.gameModes[0];
  const visibleCategories = data.categories.filter((category) => category.modes.includes(selectedMode));
  const visibleCardSets = data.cardSets.filter((cardSet) => cardSet.modeIds.length === 0 || cardSet.modeIds.includes(selectedMode));

  useEffect(() => {
    if (!visibleCardSets.some((cardSet) => cardSet.id === selectedCardSet)) {
      setSelectedCardSet(visibleCardSets[0]?.id ?? "");
    }
  }, [selectedCardSet, visibleCardSets]);

  return (
    <main className="app-shell setup-layout" data-theme={selectedTheme}>
      <section className="setup-copy" aria-labelledby="app-title">
        <p className="eyebrow">{selectedGameMode?.label ?? "Kartenspiel"}</p>
        <h1 id="app-title">Ein ruhiges Kartenspiel für zwei</h1>
        <div className="category-ribbon" aria-label="Kategorien">
          {visibleCategories.map((category) => (
            <span key={category.id} style={{ "--accent": category.color } as React.CSSProperties}>
              {category.name}
            </span>
          ))}
        </div>
      </section>

      <section className="setup-form" aria-label="Spiel vorbereiten">
        <div className="players-grid">
          <PlayerForm label="Person 1" player={playerOne} onChange={setPlayerOne} />
          <PlayerForm label="Person 2" player={playerTwo} onChange={setPlayerTwo} />
        </div>

        <fieldset className="settings-panel">
          <legend>Einstellungen</legend>
          <div className="settings-grid">
            <div className="setting-group setting-group-wide">
              <span className="setting-heading">Spielmodus</span>
              <div className="mode-grid compact-mode-grid">
                {data.gameModes.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    className={selectedMode === mode.id ? "active" : ""}
                    onClick={() => setSelectedMode(mode.id)}
                    style={{ "--option-accent": mode.color } as React.CSSProperties}
                  >
                    <span>{mode.label}</span>
                    <small>{mode.description}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-group">
              <span className="setting-heading">Spiellänge</span>
              <div className="length-grid compact-length-grid">
                {data.gameLengths.map((length) => (
                  <button
                    key={length.id}
                    type="button"
                    className={selectedLength === length.id ? "active" : ""}
                    onClick={() => setSelectedLength(length.id)}
                  >
                    <span>{length.label}</span>
                    <strong>{length.cards}</strong>
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-group">
              <span className="setting-heading">Auswahlkarten</span>
              <div className="length-grid compact-length-grid">
                {data.cardOptionCounts.map((optionCount) => (
                  <button
                    key={optionCount.id}
                    type="button"
                    className={selectedOptionCount === optionCount.id ? "active" : ""}
                    onClick={() => setSelectedOptionCount(optionCount.id)}
                  >
                    <span>{optionCount.label}</span>
                    <strong>{optionCount.cards}</strong>
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-group setting-group-wide">
              <span className="setting-heading">Kartenset</span>
              <div className="mode-grid compact-cardset-grid">
                {visibleCardSets.map((cardSet) => (
                  <button
                    key={cardSet.id}
                    type="button"
                    className={selectedCardSet === cardSet.id ? "active" : ""}
                    onClick={() => setSelectedCardSet(cardSet.id)}
                  >
                    <span>{cardSet.label}</span>
                    <small>{cardSet.description}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-group setting-group-wide">
              <span className="setting-heading">Theme</span>
              <div className="option-grid option-grid-four compact-theme-grid">
                {data.themes.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    className={selectedTheme === theme.id ? "active" : ""}
                    onClick={() => setSelectedTheme(theme.id)}
                  >
                    <Palette aria-hidden="true" size={17} strokeWidth={2.8} />
                    <span>{theme.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </fieldset>

        <button
          type="button"
          className="primary-action"
          disabled={!canStart}
          onClick={() =>
            onStart([playerOne, playerTwo], selectedMode, selectedCardSet, selectedLength, selectedOptionCount, selectedTheme)
          }
        >
          <Play aria-hidden="true" size={18} strokeWidth={2.8} />
          Spiel starten
        </button>
      </section>
    </main>
  );
}

function Timer({
  totalSeconds,
  remainingSeconds,
  accentColor
}: {
  totalSeconds: number;
  remainingSeconds: number;
  accentColor: string;
}) {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSeconds === 0 ? 0 : remainingSeconds / totalSeconds;
  const offset = circumference * (1 - progress);

  return (
    <div className="timer" style={{ "--accent": accentColor } as React.CSSProperties}>
      <svg viewBox="0 0 140 140" aria-hidden="true">
        <circle className="timer-track" cx="70" cy="70" r={radius} />
        <circle
          className="timer-progress"
          cx="70"
          cy="70"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <strong>{formatTime(remainingSeconds)}</strong>
    </div>
  );
}

function MassageOptionsView({
  activeCard,
  currentGiver,
  cardOptions,
  categoryById,
  fallbackCategory,
  gameMode,
  cardSet,
  intensityByLevel,
  intensity,
  themeId,
  selectedCardId,
  index,
  total,
  isRevealed,
  remainingSeconds,
  isRunning,
  onSelectCard,
  onToggleTimer,
  onResetTimer,
  onNext
}: {
  activeCard: ActiveCard | null;
  currentGiver: Player;
  cardOptions: MassageCard[];
  categoryById: Map<string, Category>;
  fallbackCategory: Category;
  gameMode: GameMode;
  cardSet: CardSet;
  intensityByLevel: Map<number, Intensity>;
  intensity: Intensity;
  themeId: string;
  selectedCardId: string | null;
  index: number;
  total: number;
  isRevealed: boolean;
  remainingSeconds: number;
  isRunning: boolean;
  onSelectCard: (card: MassageCard) => void;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onNext: () => void;
}) {
  const selectedCategory = activeCard
    ? categoryById.get(activeCard.category) ?? fallbackCategory
    : categoryById.get(cardOptions[0]?.category ?? "") ?? fallbackCategory;
  const totalSeconds = activeCard ? parseTime(activeCard.time) : 0;
  const isDone = remainingSeconds === 0;
  const accentColor = selectedCategory.color;
  const taskText = activeCard ? personalizeTask(activeCard.task, activeCard) : "";
  const selectedIndex = cardOptions.findIndex((card) => card.id === selectedCardId);
  const optionOffsets =
    cardOptions.length === 1
      ? ["0px"]
      : cardOptions.length === 2
        ? ["clamp(-150px, -18vw, -92px)", "clamp(92px, 18vw, 150px)"]
        : ["clamp(-260px, -28vw, -126px)", "0px", "clamp(126px, 28vw, 260px)"];
  const optionTilts =
    cardOptions.length === 1 ? ["0deg"] : cardOptions.length === 2 ? ["-5deg", "5deg"] : ["-7deg", "0deg", "7deg"];
  const style = {
    "--accent": accentColor,
    "--accent-soft": colorWithAlpha(accentColor, 0.16),
    "--accent-mist": colorWithAlpha(accentColor, 0.08)
  } as React.CSSProperties;

  return (
    <main className="app-shell game-layout" data-theme={themeId} style={style}>
      <nav className="game-topbar" aria-label="Spielstatus">
        <button type="button" className="ghost-button" onClick={() => window.location.reload()}>
          <RefreshCcw aria-hidden="true" size={16} strokeWidth={2.8} />
          Neu
        </button>
        <div className="progress-copy">
          <span>
            Karte {index + 1} von {total}
          </span>
          <div className="progress-line">
            <span style={{ width: `${((index + 1) / total) * 100}%` }} />
          </div>
        </div>
      </nav>

      <div className="round-meta" aria-label="Rundenmodus">
        <span style={{ "--meta-accent": intensity.color } as React.CSSProperties}>
          <Flame aria-hidden="true" size={15} strokeWidth={2.8} />
          {intensity.label}
        </span>
        <span>
          <Sparkles aria-hidden="true" size={15} strokeWidth={2.8} />
          {gameMode.label}
        </span>
        <span>
          <Sparkles aria-hidden="true" size={15} strokeWidth={2.8} />
          {cardSet.label}
        </span>
        <span>
          <RefreshCcw aria-hidden="true" size={15} strokeWidth={2.8} />
          Gemischt
        </span>
      </div>

      <section className="table-scene" aria-live="polite">
        <div
          className={`choice-stage choices-${cardOptions.length} ${selectedCardId ? "has-selection" : ""} ${
            isRevealed ? "is-revealed" : ""
          }`}
        >
          <div className={`draw-banner ${selectedCardId ? "is-hidden" : ""}`}>
            <Sparkles aria-hidden="true" size={18} strokeWidth={2.8} />
            <strong>{currentGiver.name.trim()}</strong>
          </div>

          <div className={`deck-stack ${selectedCardId ? "is-hidden" : ""}`} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          {cardOptions.map((card, optionIndex) => {
            const category = categoryById.get(card.category) ?? fallbackCategory;
            const cardRarity = intensityByLevel.get(card.intensity) ?? intensity;
            const isSelected = card.id === selectedCardId;
            const isDismissed = Boolean(selectedCardId && !isSelected);
            const flyDirection = selectedIndex >= 0 && optionIndex < selectedIndex ? -1 : 1;
            const optionStyle = {
              "--accent": category.color,
              "--accent-mist": colorWithAlpha(category.color, 0.08),
              "--offset": optionOffsets[optionIndex] ?? "0px",
              "--tilt": optionTilts[optionIndex] ?? "0deg",
              "--fly-x": flyDirection < 0 ? "-78vw" : "78vw",
              "--fly-y": optionIndex % 2 === 0 ? "-46px" : "42px",
              "--fly-rotate": `${flyDirection * (18 + optionIndex * 4)}deg`,
              "--deal-delay": `${optionIndex * 90}ms`
            } as React.CSSProperties;

            return (
              <article
                key={card.id}
                className={`choice-card ${isSelected ? "is-selected" : ""} ${isDismissed ? "is-dismissed" : ""}`}
                data-rarity={card.intensity}
                style={optionStyle}
                aria-label={isSelected && activeCard ? activeCard.task : `Verdeckte Karte ${category.name}`}
              >
                <div className="choice-card-inner">
                  <button
                    type="button"
                    className="card-face card-back choice-card-back"
                    disabled={Boolean(selectedCardId)}
                    onClick={() => onSelectCard(card)}
                    aria-label={`${category.name} wählen`}
                  >
                    <span className="back-category-pill">{category.name}</span>
                    {card.finalCard && <span className="back-final-pill">Finale</span>}
                    <span className="back-intensity-pill">{cardRarity.label}</span>
                    <div className="deck-mark">M</div>
                    <span className="choice-hint">Auswählen</span>
                  </button>

                  <div className="card-face card-front">
                    {isSelected && activeCard && (
                      <>
                        <header className="card-header">
                          <span className="category-pill">{category.name}</span>
                          <span className="intensity-pill">{intensity.label}</span>
                          {activeCard.finalCard && <span className="final-pill">Finale</span>}
                        </header>

                        <div className="role-strip">
                          <span>{activeCard.giver.name.trim()}</span>
                          <small>{gameMode.verb}</small>
                          <span>{activeCard.receiver.name.trim()}</span>
                        </div>

                        <p className="task-text">{taskText}</p>

                        <Timer totalSeconds={totalSeconds} remainingSeconds={remainingSeconds} accentColor={accentColor} />

                        <div className="card-actions">
                          <button type="button" onClick={onToggleTimer}>
                            {isRunning ? (
                              <Pause aria-hidden="true" size={18} strokeWidth={2.8} />
                            ) : isDone ? (
                              <RefreshCcw aria-hidden="true" size={18} strokeWidth={2.8} />
                            ) : (
                              <Play aria-hidden="true" size={18} strokeWidth={2.8} />
                            )}
                            {isRunning ? "Pause" : isDone ? "Nochmal" : "Start"}
                          </button>
                          <button type="button" onClick={onResetTimer}>
                            <RefreshCcw aria-hidden="true" size={18} strokeWidth={2.8} />
                            Reset
                          </button>
                          <button type="button" className="next-button" onClick={onNext}>
                            <ArrowRight aria-hidden="true" size={18} strokeWidth={2.8} />
                            {index + 1 === total ? "Abschluss" : "Nächste"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function FinishedScreen({ onRestart, themeId = "warm" }: { onRestart: () => void; themeId?: string }) {
  return (
    <main className="app-shell finish-layout" data-theme={themeId}>
      <section className="finish-panel">
        <p className="eyebrow">Fertig</p>
        <h1>Das Spiel ist rund ausgestrichen.</h1>
        <button type="button" className="primary-action" onClick={onRestart}>
          <RefreshCcw aria-hidden="true" size={18} strokeWidth={2.8} />
          Neues Spiel
        </button>
      </section>
    </main>
  );
}

export default function App() {
  if (window.location.pathname.startsWith("/admin")) {
    return <AdminScreen />;
  }

  const [data, setData] = useState<GameData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [players, setPlayers] = useState<[Player, Player] | null>(null);
  const [cardOptions, setCardOptions] = useState<MassageCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<MassageCard | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [availableCards, setAvailableCards] = useState<MassageCard[]>([]);
  const [optionCount, setOptionCount] = useState(3);
  const [totalRounds, setTotalRounds] = useState(0);
  const [activeGameModeId, setActiveGameModeId] = useState("massage");
  const [activeCardSetId, setActiveCardSetId] = useState("ganzkoerper");
  const [activeThemeId, setActiveThemeId] = useState("warm");
  const [roundGiverIndexes, setRoundGiverIndexes] = useState<Array<0 | 1>>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    fetchGameData()
      .then(setData)
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : "Spieldaten konnten nicht geladen werden.");
      });
  }, []);

  const categoryById = useMemo(() => {
    return new Map(data?.categories.map((category) => [category.id, category]) ?? []);
  }, [data]);

  const gameModeById = useMemo(() => {
    return new Map(data?.gameModes.map((mode) => [mode.id, mode]) ?? []);
  }, [data]);

  const cardSetById = useMemo(() => {
    return new Map(data?.cardSets.map((cardSet) => [cardSet.id, cardSet]) ?? []);
  }, [data]);

  const intensityByLevel = useMemo(() => {
    return new Map(data?.intensities.map((intensity) => [intensity.level, intensity]) ?? []);
  }, [data]);

  const activeCard = useMemo<ActiveCard | null>(() => {
    if (!selectedCard || !players) {
      return null;
    }

    const giverIndex = roundGiverIndexes[cardIndex] ?? 0;
    const receiverIndex = giverIndex === 0 ? 1 : 0;
    const giver = players[giverIndex];
    const receiver = players[receiverIndex];
    return { ...selectedCard, giver, receiver };
  }, [cardIndex, roundGiverIndexes, selectedCard, players]);

  useEffect(() => {
    if (!selectedCard) {
      return;
    }

    setRemainingSeconds(parseTime(selectedCard.time));
    setIsRunning(false);
    setIsRevealed(false);
  }, [selectedCard]);

  useEffect(() => {
    if (!selectedCardId || isRevealed) {
      return;
    }

    const revealTimeout = window.setTimeout(() => {
      setIsRevealed(true);
      setIsRunning(true);
      triggerHaptic([14, 30, 18]);
    }, 520);

    return () => window.clearTimeout(revealTimeout);
  }, [isRevealed, selectedCardId]);

  useEffect(() => {
    if (!isRunning || remainingSeconds <= 0 || !isRevealed) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isRunning, isRevealed, remainingSeconds]);

  useEffect(() => {
    if (remainingSeconds === 0) {
      setIsRunning(false);

      if (selectedCard && isRevealed) {
        triggerHaptic([30, 40, 30]);
      }
    }
  }, [isRevealed, remainingSeconds, selectedCard]);

  function startGame(
    nextPlayers: [Player, Player],
    gameModeId: string,
    cardSetId: string,
    gameLengthId: string,
    optionCountId: string,
    themeId: string
  ) {
    if (!data) {
      return;
    }

    const selectedLength = data.gameLengths.find((length) => length.id === gameLengthId);
    const selectedOptionCount = data.cardOptionCounts.find((count) => count.id === optionCountId);
    const selectedCardSet = data.cardSets.find((cardSet) => cardSet.id === cardSetId);
    const nextTotalRounds = selectedLength?.cards ?? 10;
    const nextOptionCount = selectedOptionCount?.cards ?? 3;
    const modeCards = filterCardsForSet(
      data.cards.filter((card) => card.mode === gameModeId),
      selectedCardSet
    );
    const nextAvailableCards = shuffle(modeCards.filter((card) => !card.finalCard));
    const nextRoundGiverIndexes = buildRoundGiverIndexes(nextTotalRounds);
    const firstGiverIndex = nextRoundGiverIndexes[0] ?? 0;
    const firstReceiverIndex = firstGiverIndex === 0 ? 1 : 0;
    const firstGiver = nextPlayers[firstGiverIndex];
    const firstReceiver = nextPlayers[firstReceiverIndex];
    setPlayers(nextPlayers);
    setRoundGiverIndexes(nextRoundGiverIndexes);
    setAvailableCards(nextAvailableCards);
    setCardOptions(
      buildRoundOptions(
        modeCards,
        nextAvailableCards,
        0,
        nextTotalRounds,
        nextOptionCount,
        firstGiver.gender,
        firstReceiver.gender
      )
    );
    setSelectedCard(null);
    setSelectedCardId(null);
    setOptionCount(nextOptionCount);
    setTotalRounds(nextTotalRounds);
    setActiveGameModeId(gameModeId);
    setActiveCardSetId(cardSetId);
    setActiveThemeId(themeId);
    setCardIndex(0);
    setIsFinished(false);
  }

  function selectCard(card: MassageCard) {
    if (selectedCardId) {
      return;
    }

    triggerHaptic(18);
    setSelectedCard(card);
    setSelectedCardId(card.id);
  }

  function toggleTimer() {
    if (remainingSeconds === 0 && selectedCard) {
      setRemainingSeconds(parseTime(selectedCard.time));
      setIsRunning(true);
      return;
    }

    setIsRunning((running) => !running);
  }

  function resetTimer() {
    if (!selectedCard) {
      return;
    }

    setRemainingSeconds(parseTime(selectedCard.time));
    setIsRunning(false);
  }

  function goNext() {
    if (!data || !selectedCard || !players) {
      return;
    }

    if (cardIndex + 1 >= totalRounds) {
      setCardOptions([]);
      setPlayers(null);
      setRoundGiverIndexes([]);
      setSelectedCard(null);
      setSelectedCardId(null);
      setIsFinished(true);
      return;
    }

    const nextIndex = cardIndex + 1;
    const nextAvailableCards = selectedCard.finalCard
      ? availableCards
      : availableCards.filter((card) => card.id !== selectedCard.id);
    const activeCardSet = cardSetById.get(activeCardSetId);
    const modeCards = filterCardsForSet(
      data.cards.filter((card) => card.mode === activeGameModeId),
      activeCardSet
    );
    const nextGiverIndex = roundGiverIndexes[nextIndex] ?? 0;
    const nextReceiverIndex = nextGiverIndex === 0 ? 1 : 0;
    const nextGiver = players[nextGiverIndex];
    const nextReceiver = players[nextReceiverIndex];
    setAvailableCards(nextAvailableCards);
    setCardOptions(
      buildRoundOptions(
        modeCards,
        nextAvailableCards,
        nextIndex,
        totalRounds,
        optionCount,
        nextGiver.gender,
        nextReceiver.gender
      )
    );
    setSelectedCard(null);
    setSelectedCardId(null);
    setIsRevealed(false);
    setIsRunning(false);
    setCardIndex(nextIndex);
  }

  if (loadError) {
    return (
      <main className="app-shell finish-layout">
        <section className="finish-panel">
          <p className="eyebrow">Fehler</p>
          <h1>{loadError}</h1>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="app-shell finish-layout">
        <section className="finish-panel">
          <p className="eyebrow">Laden</p>
          <h1>Die Karten werden gemischt.</h1>
        </section>
      </main>
    );
  }

  if (isFinished) {
    return <FinishedScreen themeId={activeThemeId} onRestart={() => setIsFinished(false)} />;
  }

  if (!players || totalRounds === 0 || cardOptions.length === 0) {
    return <SetupScreen data={data} onStart={startGame} />;
  }

  const activeGameMode = gameModeById.get(activeGameModeId) ?? data.gameModes[0];
  const activeCardSet = cardSetById.get(activeCardSetId) ?? data.cardSets[0];
  const currentGiver = players[roundGiverIndexes[cardIndex] ?? 0];
  const roundIntensity =
    intensityByLevel.get(activeCard?.intensity ?? desiredIntensityForRound(cardIndex, totalRounds)) ?? data.intensities[0];
  const fallbackCategory =
    data.categories.find((category) => category.modes.includes(activeGameModeId)) ?? data.categories[0];

  return (
    <MassageOptionsView
      activeCard={activeCard}
      currentGiver={currentGiver}
      cardOptions={cardOptions}
      categoryById={categoryById}
      fallbackCategory={fallbackCategory}
      gameMode={activeGameMode}
      cardSet={activeCardSet}
      intensityByLevel={intensityByLevel}
      intensity={roundIntensity}
      themeId={activeThemeId}
      selectedCardId={selectedCardId}
      index={cardIndex}
      total={totalRounds}
      isRevealed={isRevealed}
      remainingSeconds={remainingSeconds}
      isRunning={isRunning}
      onSelectCard={selectCard}
      onToggleTimer={toggleTimer}
      onResetTimer={resetTimer}
      onNext={goNext}
    />
  );
}
