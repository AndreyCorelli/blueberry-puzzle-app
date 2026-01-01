# Blueberry Trio – Android Puzzle App (Expo + React Native)

Blueberry Trio is a logic puzzle game inspired by Minesweeper and Sudoku-like block rules.

Each puzzle has a **unique solution** and must satisfy:

- exactly **3 blueberries per row**
- exactly **3 blueberries per column**
- exactly **3 blueberries per 3×3 block**
- number clues (like Minesweeper) show how many blueberries surround that clue cell (including diagonals)

The app lets you:

- tap cells to cycle through:
  - **blank → blueberry → marked empty → blank**
- generate new random puzzles
- check your solution against the unique answer
- optionally show the full solution on the board

The project is built with:

- **React Native**
- **Expo**
- **TypeScript**
- shared puzzle core logic in `src/core/blueberryCore.ts`


---

## 1. Prerequisites

### Node.js

You need **Node 20+** (because Metro / Expo use newer JS features like `Array.prototype.toReversed`).

#### Linux (Ubuntu) / macOS – via `nvm` (recommended)

```bash
# Install nvm (if you don't have it yet)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# Load nvm in current shell
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install and use Node 20
nvm install 20
nvm use 20

node -v    # should print v20.x.x
