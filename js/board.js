import { Cell } from './cell.js';

const NEIGHBOR_OFFSETS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Board {
  constructor(rows, cols, mineCount, seed = null) {
    this.rows = rows;
    this.cols = cols;
    this.mineCount = Math.min(mineCount, rows * cols - 9);
    this.seed = seed ?? Math.floor(Math.random() * 2 ** 31);
    this.rng = mulberry32(this.seed);
    this.cells = [];
    this.minesPlaced = false;
    this.revealedCount = 0;
    this.flagsPlaced = 0;

    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) row.push(new Cell(r, c));
      this.cells.push(row);
    }
  }

  inBounds(r, c) {
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
  }

  getNeighbors(r, c) {
    const result = [];
    for (const [dr, dc] of NEIGHBOR_OFFSETS) {
      const nr = r + dr;
      const nc = c + dc;
      if (this.inBounds(nr, nc)) result.push(this.cells[nr][nc]);
    }
    return result;
  }

  placeMines(safeRow, safeCol) {
    const forbidden = new Set();
    forbidden.add(`${safeRow},${safeCol}`);
    for (const n of this.getNeighbors(safeRow, safeCol)) forbidden.add(`${n.row},${n.col}`);

    let placed = 0;
    while (placed < this.mineCount) {
      const r = Math.floor(this.rng() * this.rows);
      const c = Math.floor(this.rng() * this.cols);
      const key = `${r},${c}`;
      if (forbidden.has(key)) continue;
      const cell = this.cells[r][c];
      if (cell.isMine) continue;
      cell.isMine = true;
      placed++;
    }

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.cells[r][c].adjacentMines = this.countAdjacent(r, c);
      }
    }

    this.minesPlaced = true;
  }

  countAdjacent(r, c) {
    return this.getNeighbors(r, c).filter((n) => n.isMine).length;
  }

  reveal(row, col) {
    if (!this.minesPlaced) this.placeMines(row, col);

    const changed = [];
    const start = this.cells[row][col];
    if (start.isFlagged || start.isRevealed) return changed;

    const stack = [start];
    const seen = new Set();

    while (stack.length) {
      const cell = stack.pop();
      const key = `${cell.row},${cell.col}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (cell.isFlagged || cell.isRevealed) continue;
      cell.reveal();
      this.revealedCount++;
      changed.push(cell);

      if (cell.isMine) continue;

      if (cell.adjacentMines === 0) {
        for (const n of this.getNeighbors(cell.row, cell.col)) {
          if (!n.isRevealed && !n.isFlagged) stack.push(n);
        }
      }
    }

    return changed;
  }

  revealNeighbors(row, col) {
    const cell = this.cells[row][col];
    if (!cell.isRevealed || cell.isMine) return [];
    const neighbors = this.getNeighbors(row, col);
    const flaggedCount = neighbors.filter((n) => n.isFlagged).length;
    if (flaggedCount !== cell.adjacentMines) return [];

    let changed = [];
    for (const n of neighbors) {
      if (!n.isRevealed && !n.isFlagged) {
        changed = changed.concat(this.reveal(n.row, n.col));
      }
    }
    return changed;
  }

  toggleFlag(row, col) {
    const cell = this.cells[row][col];
    if (cell.isRevealed) return null;
    const flagged = cell.toggleFlag();
    this.flagsPlaced += flagged ? 1 : -1;
    return flagged;
  }

  revealAllMines() {
    const changed = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c];
        if (cell.isMine && !cell.isRevealed) {
          cell.isRevealed = true;
          changed.push(cell);
        }
      }
    }
    return changed;
  }

  checkVictory() {
    const totalCells = this.rows * this.cols;
    return this.revealedCount === totalCells - this.mineCount;
  }

  findHint() {
    const candidates = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c];
        if (!cell.isRevealed && !cell.isFlagged && !cell.isMine) candidates.push(cell);
      }
    }
    if (!candidates.length) return null;
    return candidates[Math.floor(this.rng() * candidates.length)];
  }

  forEachCell(fn) {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) fn(this.cells[r][c]);
    }
  }
}
