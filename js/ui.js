const NUMBER_CLASS = ['n0', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8'];
const LONG_PRESS_MS = 450;

export const DIFFICULTIES = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 30, cols: 16, mines: 99 },
  expert: { rows: 40, cols: 20, mines: 160 },
};

export class UI {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.boardEl = document.getElementById('board');
    this.boardWrapperEl = document.getElementById('board-wrapper');
    this.mineCountEl = document.getElementById('mine-count-value');
    this.timerEl = document.getElementById('timer-value');
    this.faceIcon = document.getElementById('face-icon');
    this.faceButton = document.getElementById('face-button');
    this.difficultySelect = document.getElementById('difficulty-select');
    this.pauseButton = document.getElementById('pause-button');
    this.settingsButton = document.getElementById('settings-button');
    this.settingsPanel = document.getElementById('settings-panel');
    this.settingsCloseButton = document.getElementById('settings-close-button');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.resumeButton = document.getElementById('resume-button');
    this.resultOverlay = document.getElementById('result-overlay');
    this.resultTitle = document.getElementById('result-title');
    this.resultSubtitle = document.getElementById('result-subtitle');
    this.resultRestartButton = document.getElementById('result-restart-button');
    this.resultCloseButton = document.getElementById('result-close-button');
    this.hintButton = document.getElementById('hint-button');
    this.flagModeButton = document.getElementById('flag-mode-button');
    this.muteButton = document.getElementById('mute-button');
    this.customApplyButton = document.getElementById('custom-apply-button');
    this.customError = document.getElementById('custom-error');
    this.themeGrid = document.getElementById('theme-grid');
    this.statsStrip = {
      played: document.getElementById('stat-played'),
      winpct: document.getElementById('stat-winpct'),
      streak: document.getElementById('stat-streak'),
      best: document.getElementById('stat-best'),
    };
    this.statsGridFull = document.getElementById('stats-grid-full');

    this.cellEls = [];
    this.rows = 0;
    this.cols = 0;
    this.flagModeActive = false;
    this.focusedCell = { row: 0, col: 0 };

    this.longPressTimer = null;
    this.longPressFired = false;

    this.bindStaticEvents();
  }

  bindStaticEvents() {
    this.difficultySelect.addEventListener('change', () => {
      this.callbacks.onDifficultyChange(this.difficultySelect.value);
    });

    this.faceButton.addEventListener('click', () => this.callbacks.onRestart());
    this.pauseButton.addEventListener('click', () => this.callbacks.onPauseToggle());
    this.resumeButton.addEventListener('click', () => this.callbacks.onPauseToggle());

    this.settingsButton.addEventListener('click', () => this.openSettings());
    this.settingsCloseButton.addEventListener('click', () => this.closeSettings());
    this.settingsPanel.addEventListener('click', (e) => {
      if (e.target === this.settingsPanel) this.closeSettings();
    });

    this.resultRestartButton.addEventListener('click', () => {
      this.hideResult();
      this.callbacks.onRestart();
    });
    this.resultCloseButton.addEventListener('click', () => this.hideResult());

    this.hintButton.addEventListener('click', () => this.callbacks.onHint());
    this.muteButton.addEventListener('click', () => this.callbacks.onMuteToggle());
    this.flagModeButton.addEventListener('click', () => {
      this.flagModeActive = !this.flagModeActive;
      this.flagModeButton.setAttribute('aria-pressed', String(this.flagModeActive));
      this.flagModeButton.classList.toggle('active', this.flagModeActive);
    });

    this.customApplyButton.addEventListener('click', () => {
      const rows = parseInt(document.getElementById('custom-rows').value, 10);
      const cols = parseInt(document.getElementById('custom-cols').value, 10);
      const mines = parseInt(document.getElementById('custom-mines').value, 10);
      const error = this.validateCustom(rows, cols, mines);
      if (error) {
        this.customError.textContent = error;
        return;
      }
      this.customError.textContent = '';
      this.callbacks.onCustomApply({ rows, cols, mines });
    });

    this.themeGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.theme-swatch');
      if (!btn) return;
      this.callbacks.onThemeChange(btn.dataset.theme);
    });

    document.getElementById('setting-sound').addEventListener('change', (e) => {
      this.callbacks.onSoundToggle(e.target.checked);
    });
    document.getElementById('setting-reduced-motion').addEventListener('change', (e) => {
      this.callbacks.onReducedMotionToggle(e.target.checked);
    });
    document.getElementById('setting-high-contrast').addEventListener('change', (e) => {
      this.callbacks.onHighContrastToggle(e.target.checked);
    });
    document.getElementById('setting-animation-speed').addEventListener('change', (e) => {
      this.callbacks.onAnimationSpeedChange(e.target.value);
    });
    document.getElementById('setting-cell-size').addEventListener('change', (e) => {
      this.callbacks.onCellSizeChange(e.target.value);
    });

    document.getElementById('reset-stats-button').addEventListener('click', () => {
      this.callbacks.onResetStats();
    });

    this.boardEl.addEventListener('contextmenu', (e) => e.preventDefault());
    this.boardEl.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.boardEl.addEventListener('dblclick', (e) => this.handleChordEvent(e));
    this.boardEl.addEventListener('keydown', (e) => this.handleKeyDown(e));

    this.boardEl.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
    this.boardEl.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    this.boardEl.addEventListener('touchmove', () => this.cancelLongPress(), { passive: true });
  }

  validateCustom(rows, cols, mines) {
    if (!Number.isFinite(rows) || rows < 5 || rows > 40) return 'Rows must be between 5 and 40.';
    if (!Number.isFinite(cols) || cols < 5 || cols > 60) return 'Columns must be between 5 and 60.';
    if (!Number.isFinite(mines) || mines < 1) return 'Mines must be at least 1.';
    if (mines > rows * cols - 9) return 'Too many mines for this board size.';
    return null;
  }

  cellFromEvent(e) {
    const target = e.target.closest('.cell');
    if (!target) return null;
    return { row: parseInt(target.dataset.row, 10), col: parseInt(target.dataset.col, 10) };
  }

  handleMouseDown(e) {
    const pos = this.cellFromEvent(e);
    if (!pos) return;
    if (e.button === 0) {
      this.callbacks.onCellReveal(pos.row, pos.col);
    } else if (e.button === 2) {
      this.callbacks.onCellFlag(pos.row, pos.col);
    } else if (e.button === 1) {
      e.preventDefault();
      this.callbacks.onCellChord(pos.row, pos.col);
    }
  }

  handleChordEvent(e) {
    const pos = this.cellFromEvent(e);
    if (!pos) return;
    this.callbacks.onCellChord(pos.row, pos.col);
  }

  handleTouchStart(e) {
    const pos = this.cellFromEvent(e);
    if (!pos) return;
    this.longPressFired = false;
    this.longPressTimer = setTimeout(() => {
      this.longPressFired = true;
      this.callbacks.onCellFlag(pos.row, pos.col);
      if (navigator.vibrate) navigator.vibrate(15);
    }, LONG_PRESS_MS);
  }

  handleTouchEnd(e) {
    const pos = this.cellFromEvent(e);
    this.cancelLongPress();
    if (!pos || this.longPressFired) return;
    if (this.flagModeActive) {
      this.callbacks.onCellFlag(pos.row, pos.col);
    } else {
      this.callbacks.onCellReveal(pos.row, pos.col);
    }
  }

  cancelLongPress() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  handleKeyDown(e) {
    const { row, col } = this.focusedCell;
    let nr = row;
    let nc = col;
    switch (e.key) {
      case 'ArrowUp': nr = Math.max(0, row - 1); break;
      case 'ArrowDown': nr = Math.min(this.rows - 1, row + 1); break;
      case 'ArrowLeft': nc = Math.max(0, col - 1); break;
      case 'ArrowRight': nc = Math.min(this.cols - 1, col + 1); break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        this.callbacks.onCellReveal(row, col);
        return;
      case 'f':
      case 'F':
        e.preventDefault();
        this.callbacks.onCellFlag(row, col);
        return;
      default:
        return;
    }
    e.preventDefault();
    this.focusCell(nr, nc);
  }

  focusCell(row, col) {
    this.focusedCell = { row, col };
    const el = this.cellEls[row]?.[col];
    if (el) el.focus();
  }

  renderBoard(board) {
    this.rows = board.rows;
    this.cols = board.cols;
    this.boardEl.innerHTML = '';
    this.boardEl.style.setProperty('--cols', board.cols);
    this.boardEl.style.setProperty('--rows', board.rows);
    this.boardEl.setAttribute('aria-rowcount', String(board.rows));
    this.boardEl.setAttribute('aria-colcount', String(board.cols));
    this.cellEls = [];

    for (let r = 0; r < board.rows; r++) {
      const rowEls = [];
      for (let c = 0; c < board.cols; c++) {
        const cellEl = document.createElement('div');
        cellEl.className = 'cell hidden-cell';
        cellEl.dataset.row = String(r);
        cellEl.dataset.col = String(c);
        cellEl.setAttribute('role', 'gridcell');
        cellEl.setAttribute('tabindex', r === 0 && c === 0 ? '0' : '-1');
        cellEl.setAttribute('aria-label', `Row ${r + 1}, column ${c + 1}, hidden`);
        this.boardEl.appendChild(cellEl);
        rowEls.push(cellEl);
      }
      this.cellEls.push(rowEls);
    }
    this.focusedCell = { row: 0, col: 0 };
  }

  updateCell(cell) {
    const el = this.cellEls[cell.row]?.[cell.col];
    if (!el) return;

    el.className = 'cell';
    if (cell.isRevealed) {
      el.classList.add('revealed');
      if (cell.isMine) {
        el.classList.add('mine');
        el.textContent = '💣';
        el.setAttribute('aria-label', `Row ${cell.row + 1}, column ${cell.col + 1}, mine`);
      } else if (cell.adjacentMines > 0) {
        el.classList.add(NUMBER_CLASS[cell.adjacentMines]);
        el.textContent = String(cell.adjacentMines);
        el.setAttribute('aria-label', `Row ${cell.row + 1}, column ${cell.col + 1}, ${cell.adjacentMines} adjacent mines`);
      } else {
        el.textContent = '';
        el.setAttribute('aria-label', `Row ${cell.row + 1}, column ${cell.col + 1}, empty`);
      }
    } else if (cell.isFlagged) {
      el.classList.add('hidden-cell', 'flagged');
      el.textContent = '🚩';
      el.setAttribute('aria-label', `Row ${cell.row + 1}, column ${cell.col + 1}, flagged`);
    } else {
      el.classList.add('hidden-cell');
      el.textContent = '';
      el.setAttribute('aria-label', `Row ${cell.row + 1}, column ${cell.col + 1}, hidden`);
    }
  }

  markCellExploded(cell) {
    const el = this.cellEls[cell.row]?.[cell.col];
    if (el) el.classList.add('exploded');
  }

  markCellWrongFlag(cell) {
    const el = this.cellEls[cell.row]?.[cell.col];
    if (el) el.classList.add('wrong-flag');
  }

  playRevealAnimation(cell) {
    const el = this.cellEls[cell.row]?.[cell.col];
    if (!el) return;
    el.classList.add('pop-in');
    el.addEventListener('animationend', () => el.classList.remove('pop-in'), { once: true });
  }

  getCellEl(row, col) {
    return this.cellEls[row]?.[col] || null;
  }

  updateHUD(mineCount, seconds) {
    this.mineCountEl.textContent = String(Math.max(mineCount, -99)).padStart(mineCount < 0 ? 3 : 2, '0');
    this.timerEl.textContent = String(Math.min(seconds, 999)).padStart(3, '0');
  }

  setFace(state) {
    const icons = { idle: '🙂', playing: '🙂', paused: '😐', victory: '😎', gameover: '💀', pressed: '😮' };
    this.faceIcon.textContent = icons[state] || '🙂';
  }

  setPauseButtonState(isPaused) {
    this.pauseButton.textContent = isPaused ? '▶' : '⏸';
    this.pauseButton.setAttribute('aria-label', isPaused ? 'Resume game' : 'Pause game');
  }

  showPauseOverlay() {
    this.pauseOverlay.classList.remove('hidden');
  }

  hidePauseOverlay() {
    this.pauseOverlay.classList.add('hidden');
  }

  showResult({ won, seconds }) {
    this.resultTitle.textContent = won ? 'You Win!' : 'Game Over';
    this.resultSubtitle.textContent = won
      ? `Cleared in ${seconds}s`
      : 'Better luck next time.';
    this.resultOverlay.classList.remove('hidden');
    this.resultOverlay.classList.toggle('victory', won);
    this.resultOverlay.classList.toggle('defeat', !won);
  }

  hideResult() {
    this.resultOverlay.classList.add('hidden');
  }

  openSettings() {
    this.settingsPanel.classList.remove('hidden');
  }

  closeSettings() {
    this.settingsPanel.classList.add('hidden');
  }

  setTheme(theme) {
    document.body.dataset.theme = theme;
    this.themeGrid.querySelectorAll('.theme-swatch').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });
  }

  setDifficultySelectValue(value) {
    this.difficultySelect.value = value;
  }

  setReducedMotion(enabled) {
    document.body.classList.toggle('reduced-motion', enabled);
  }

  setHighContrast(enabled) {
    document.body.classList.toggle('high-contrast', enabled);
  }

  setAnimationSpeed(speed) {
    document.body.dataset.animSpeed = speed;
  }

  setCellSize(size) {
    document.body.dataset.cellSize = size;
  }

  setMuted(muted) {
    this.muteButton.textContent = muted ? '🔇' : '🔊';
    this.muteButton.setAttribute('aria-pressed', String(muted));
  }

  syncSettingsForm(settings) {
    document.getElementById('setting-sound').checked = settings.soundEnabled;
    document.getElementById('setting-reduced-motion').checked = settings.reducedMotion;
    document.getElementById('setting-high-contrast').checked = settings.highContrast;
    document.getElementById('setting-animation-speed').value = settings.animationSpeed;
    document.getElementById('setting-cell-size').value = settings.cellSize;
    document.getElementById('custom-rows').value = settings.custom.rows;
    document.getElementById('custom-cols').value = settings.custom.cols;
    document.getElementById('custom-mines').value = settings.custom.mines;
  }

  renderStats(stats) {
    const winPct = stats.gamesPlayed ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
    const bestTimes = stats.bestTimes || {};
    const bestOverall = Object.values(bestTimes).filter((v) => v !== null && v !== undefined);
    const best = bestOverall.length ? Math.min(...bestOverall) : null;

    this.statsStrip.played.textContent = String(stats.gamesPlayed);
    this.statsStrip.winpct.textContent = `${winPct}%`;
    this.statsStrip.streak.textContent = String(stats.currentStreak);
    this.statsStrip.best.textContent = best !== null ? `${best}s` : '--';

    const avg = stats.completedGames
      ? Math.round(stats.totalCompletionSeconds / stats.completedGames)
      : 0;

    const rows = [
      ['Games Played', stats.gamesPlayed],
      ['Wins', stats.wins],
      ['Losses', stats.losses],
      ['Win %', `${winPct}%`],
      ['Current Streak', stats.currentStreak],
      ['Longest Streak', stats.longestStreak],
      ['Best Easy', bestTimes.easy !== null ? `${bestTimes.easy}s` : '--'],
      ['Best Medium', bestTimes.medium !== null ? `${bestTimes.medium}s` : '--'],
      ['Best Hard', bestTimes.hard !== null ? `${bestTimes.hard}s` : '--'],
      ['Best Expert', bestTimes.expert !== null ? `${bestTimes.expert}s` : '--'],
      ['Avg Completion', avg ? `${avg}s` : '--'],
      ['Flags Placed', stats.flagsPlaced],
      ['Cells Revealed', stats.cellsRevealed],
    ];

    this.statsGridFull.innerHTML = rows
      .map(([label, value]) => `<div class="stat-tile"><span class="stat-value">${value}</span><span class="stat-label">${label}</span></div>`)
      .join('');
  }
}
