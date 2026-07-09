export class Cell {
  constructor(row, col) {
    this.row = row;
    this.col = col;
    this.isMine = false;
    this.isRevealed = false;
    this.isFlagged = false;
    this.adjacentMines = 0;
  }

  reveal() {
    if (this.isFlagged || this.isRevealed) return false;
    this.isRevealed = true;
    return true;
  }

  toggleFlag() {
    if (this.isRevealed) return this.isFlagged;
    this.isFlagged = !this.isFlagged;
    return this.isFlagged;
  }

  get isEmpty() {
    return !this.isMine && this.adjacentMines === 0;
  }
}
