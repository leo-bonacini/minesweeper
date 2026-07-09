import { Board } from './board.js';
import { Timer } from './timer.js';
import { UI, DIFFICULTIES } from './ui.js';
import { Storage } from './storage.js';
import { Sound } from './sound.js';
import { explosionAt, confettiBurst, sparkleAt, shakeBoard, screenFlash } from './animations.js';

const STATES = {
  IDLE: 'idle',
  PLAYING: 'playing',
  PAUSED: 'paused',
  VICTORY: 'victory',
  GAMEOVER: 'gameover',
};

class Game {
  constructor() {
    this.settings = Storage.loadSettings();
    this.sound = new Sound(this.settings.soundEnabled);
    this.timer = new Timer((seconds) => this.onTick(seconds));
    this.ui = new UI(this.buildCallbacks());

    this.difficulty = this.settings.difficulty || 'easy';
    this.board = null;
    this.state = STATES.IDLE;

    this.applySettingsToUI();
    this.ui.setDifficultySelectValue(this.difficulty === 'custom' ? 'custom' : this.difficulty);
    this.startNewGame(this.difficulty);
    this.refreshStats();
  }

  buildCallbacks() {
    return {
      onDifficultyChange: (value) => this.handleDifficultyChange(value),
      onRestart: () => this.startNewGame(this.difficulty, this.customConfig),
      onPauseToggle: () => this.togglePause(),
      onCellReveal: (r, c) => this.handleReveal(r, c),
      onCellFlag: (r, c) => this.handleFlag(r, c),
      onCellChord: (r, c) => this.handleChord(r, c),
      onHint: () => this.handleHint(),
      onMuteToggle: () => this.handleMuteToggle(),
      onCustomApply: (config) => this.handleCustomApply(config),
      onThemeChange: (theme) => this.handleThemeChange(theme),
      onSoundToggle: (enabled) => this.handleSoundToggle(enabled),
      onReducedMotionToggle: (enabled) => this.handleReducedMotionToggle(enabled),
      onHighContrastToggle: (enabled) => this.handleHighContrastToggle(enabled),
      onAnimationSpeedChange: (speed) => this.handleAnimationSpeedChange(speed),
      onCellSizeChange: (size) => this.handleCellSizeChange(size),
      onResetStats: () => this.handleResetStats(),
    };
  }

  applySettingsToUI() {
    this.ui.setTheme(this.settings.theme);
    this.ui.setReducedMotion(this.settings.reducedMotion);
    this.ui.setHighContrast(this.settings.highContrast);
    this.ui.setAnimationSpeed(this.settings.animationSpeed);
    this.ui.setCellSize(this.settings.cellSize);
    this.ui.setMuted(!this.settings.soundEnabled);
    this.ui.syncSettingsForm(this.settings);
  }

  persistSettings() {
    Storage.saveSettings(this.settings);
  }

  get reducedMotion() {
    return this.settings.reducedMotion;
  }

  startNewGame(difficulty, customConfig = null) {
    this.difficulty = difficulty;
    this.customConfig = customConfig || (difficulty === 'custom' ? this.settings.custom : null);
    const config = difficulty === 'custom' ? this.customConfig : DIFFICULTIES[difficulty];

    this.board = new Board(config.rows, config.cols, config.mines);
    this.state = STATES.IDLE;
    this.timer.reset();
    this.ui.renderBoard(this.board);
    this.ui.updateHUD(this.board.mineCount, 0);
    this.ui.setFace('idle');
    this.ui.setPauseButtonState(false);
    this.ui.hidePauseOverlay();
    this.ui.hideResult();
    this.ui.focusCell(0, 0);

    this.settings.difficulty = difficulty;
    this.persistSettings();
  }

  handleDifficultyChange(value) {
    if (value === 'custom') {
      this.ui.openSettings();
      return;
    }
    this.startNewGame(value);
  }

  handleCustomApply({ rows, cols, mines }) {
    this.settings.custom = { rows, cols, mines };
    this.persistSettings();
    this.ui.setDifficultySelectValue('custom');
    this.ui.closeSettings();
    this.startNewGame('custom', { rows, cols, mines });
  }

  ensureGameStarted() {
    if (this.state === STATES.IDLE) {
      this.state = STATES.PLAYING;
      this.timer.start();
      Storage.recordGameStart();
    }
  }

  handleReveal(row, col) {
    if (this.state === STATES.PAUSED || this.state === STATES.VICTORY || this.state === STATES.GAMEOVER) return;
    const cell = this.board.cells[row][col];
    if (cell.isFlagged || cell.isRevealed) return;

    this.ensureGameStarted();
    this.ui.focusCell(row, col);

    const changed = this.board.reveal(row, col);
    if (!changed.length) return;

    this.applyChanges(changed);
    Storage.recordReveal(changed.length);

    const hitMine = changed.some((c) => c.isMine);
    if (hitMine) {
      this.loseGame(cell);
      return;
    }

    this.sound.reveal();
    if (this.board.checkVictory()) this.winGame();
  }

  handleFlag(row, col) {
    if (this.state === STATES.PAUSED || this.state === STATES.VICTORY || this.state === STATES.GAMEOVER) return;
    const cell = this.board.cells[row][col];
    if (cell.isRevealed) return;

    this.ensureGameStarted();
    this.ui.focusCell(row, col);

    const flagged = this.board.toggleFlag(row, col);
    if (flagged === null) return;
    this.ui.updateCell(cell);
    this.ui.updateHUD(this.board.mineCount - this.board.flagsPlaced, this.timer.elapsedSeconds);
    Storage.recordFlag(flagged ? 1 : -1);
    flagged ? this.sound.flag() : this.sound.unflag();
  }

  handleChord(row, col) {
    if (this.state !== STATES.PLAYING) return;
    const changed = this.board.revealNeighbors(row, col);
    if (!changed.length) return;

    this.applyChanges(changed);
    Storage.recordReveal(changed.length);

    const hitMine = changed.some((c) => c.isMine);
    if (hitMine) {
      this.loseGame(changed.find((c) => c.isMine));
      return;
    }

    this.sound.reveal();
    if (this.board.checkVictory()) this.winGame();
  }

  applyChanges(changed) {
    for (const cell of changed) {
      this.ui.updateCell(cell);
      this.ui.playRevealAnimation(cell);
    }
    this.ui.updateHUD(this.board.mineCount - this.board.flagsPlaced, this.timer.elapsedSeconds);
  }

  handleHint() {
    if (this.state === STATES.PAUSED || this.state === STATES.VICTORY || this.state === STATES.GAMEOVER) return;
    if (!this.board.minesPlaced) return;
    const hintCell = this.board.findHint();
    if (!hintCell) return;
    const el = this.ui.getCellEl(hintCell.row, hintCell.col);
    sparkleAt(el, this.reducedMotion);
    el?.classList.add('hint-pulse');
    setTimeout(() => el?.classList.remove('hint-pulse'), 1200);
    this.ui.focusCell(hintCell.row, hintCell.col);
  }

  togglePause() {
    if (this.state === STATES.PLAYING) {
      this.state = STATES.PAUSED;
      this.timer.stop();
      this.ui.setFace('paused');
      this.ui.setPauseButtonState(true);
      this.ui.showPauseOverlay();
    } else if (this.state === STATES.PAUSED) {
      this.state = STATES.PLAYING;
      this.timer.start();
      this.ui.setFace('playing');
      this.ui.setPauseButtonState(false);
      this.ui.hidePauseOverlay();
    }
  }

  onTick(seconds) {
    this.ui.updateHUD(this.board.mineCount - this.board.flagsPlaced, seconds);
  }

  winGame() {
    this.state = STATES.VICTORY;
    this.timer.stop();
    this.ui.setFace('victory');
    this.sound.win();
    confettiBurst(this.reducedMotion);
    screenFlash(this.reducedMotion);

    const seconds = this.timer.elapsedSeconds;
    const stats = Storage.recordResult({ won: true, difficulty: this.difficulty, seconds });
    this.ui.renderStats(stats);
    this.ui.showResult({ won: true, seconds });
  }

  loseGame(triggerCell) {
    this.state = STATES.GAMEOVER;
    this.timer.stop();
    this.ui.setFace('gameover');
    this.sound.explosion();

    const revealedMines = this.board.revealAllMines();
    for (const cell of revealedMines) this.ui.updateCell(cell);

    const triggerEl = this.ui.getCellEl(triggerCell.row, triggerCell.col);
    this.ui.markCellExploded(triggerCell);
    explosionAt(triggerEl, this.reducedMotion);
    shakeBoard(this.ui.boardEl, this.reducedMotion);

    this.board.forEachCell((cell) => {
      if (cell.isFlagged && !cell.isMine) this.ui.markCellWrongFlag(cell);
    });

    const seconds = this.timer.elapsedSeconds;
    const stats = Storage.recordResult({ won: false, difficulty: this.difficulty, seconds });
    this.ui.renderStats(stats);
    this.ui.showResult({ won: false, seconds });
  }

  handleMuteToggle() {
    this.settings.soundEnabled = !this.settings.soundEnabled;
    this.sound.setEnabled(this.settings.soundEnabled);
    this.ui.setMuted(!this.settings.soundEnabled);
    document.getElementById('setting-sound').checked = this.settings.soundEnabled;
    this.persistSettings();
  }

  handleThemeChange(theme) {
    this.settings.theme = theme;
    this.ui.setTheme(theme);
    this.persistSettings();
  }

  handleSoundToggle(enabled) {
    this.settings.soundEnabled = enabled;
    this.sound.setEnabled(enabled);
    this.ui.setMuted(!enabled);
    this.persistSettings();
  }

  handleReducedMotionToggle(enabled) {
    this.settings.reducedMotion = enabled;
    this.ui.setReducedMotion(enabled);
    this.persistSettings();
  }

  handleHighContrastToggle(enabled) {
    this.settings.highContrast = enabled;
    this.ui.setHighContrast(enabled);
    this.persistSettings();
  }

  handleAnimationSpeedChange(speed) {
    this.settings.animationSpeed = speed;
    this.ui.setAnimationSpeed(speed);
    this.persistSettings();
  }

  handleCellSizeChange(size) {
    this.settings.cellSize = size;
    this.ui.setCellSize(size);
    this.persistSettings();
  }

  handleResetStats() {
    const stats = Storage.resetStats();
    this.ui.renderStats(stats);
  }

  refreshStats() {
    this.ui.renderStats(Storage.loadStats());
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const game = new Game();
  if (prefersReducedMotion && !localStorage.getItem('minesweeper.settings.v1')) {
    game.handleReducedMotionToggle(true);
    document.getElementById('setting-reduced-motion').checked = true;
  }
  window.__minesweeperGame = game;
});
