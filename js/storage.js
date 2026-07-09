const STATS_KEY = 'minesweeper.stats.v1';
const SETTINGS_KEY = 'minesweeper.settings.v1';

const DEFAULT_STATS = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  currentStreak: 0,
  longestStreak: 0,
  bestTimes: { easy: null, medium: null, hard: null, expert: null },
  totalCompletionSeconds: 0,
  completedGames: 0,
  flagsPlaced: 0,
  cellsRevealed: 0,
};

const DEFAULT_SETTINGS = {
  theme: 'dark',
  soundEnabled: true,
  reducedMotion: false,
  highContrast: false,
  animationSpeed: 'normal',
  cellSize: 'normal',
  difficulty: 'easy',
  language: 'en',
  custom: { rows: 9, cols: 9, mines: 10 },
};

function safeParse(raw, fallback) {
  if (!raw) return { ...fallback };
  try {
    const parsed = JSON.parse(raw);
    return { ...fallback, ...parsed };
  } catch {
    return { ...fallback };
  }
}

export class Storage {
  static loadStats() {
    const raw = localStorage.getItem(STATS_KEY);
    const stats = safeParse(raw, DEFAULT_STATS);
    stats.bestTimes = { ...DEFAULT_STATS.bestTimes, ...(stats.bestTimes || {}) };
    return stats;
  }

  static saveStats(stats) {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }

  static resetStats() {
    localStorage.removeItem(STATS_KEY);
    return { ...DEFAULT_STATS, bestTimes: { ...DEFAULT_STATS.bestTimes } };
  }

  static recordGameStart() {
    const stats = Storage.loadStats();
    stats.gamesPlayed += 1;
    Storage.saveStats(stats);
    return stats;
  }

  static recordFlag(delta) {
    const stats = Storage.loadStats();
    if (delta > 0) stats.flagsPlaced += 1;
    Storage.saveStats(stats);
    return stats;
  }

  static recordReveal(count) {
    const stats = Storage.loadStats();
    stats.cellsRevealed += count;
    Storage.saveStats(stats);
    return stats;
  }

  static recordResult({ won, difficulty, seconds }) {
    const stats = Storage.loadStats();
    if (won) {
      stats.wins += 1;
      stats.currentStreak += 1;
      stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
      stats.totalCompletionSeconds += seconds;
      stats.completedGames += 1;
      if (difficulty in stats.bestTimes) {
        const prev = stats.bestTimes[difficulty];
        if (prev === null || seconds < prev) stats.bestTimes[difficulty] = seconds;
      }
    } else {
      stats.losses += 1;
      stats.currentStreak = 0;
    }
    Storage.saveStats(stats);
    return stats;
  }

  static loadSettings() {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const settings = safeParse(raw, DEFAULT_SETTINGS);
    settings.custom = { ...DEFAULT_SETTINGS.custom, ...(settings.custom || {}) };
    return settings;
  }

  static saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
}
