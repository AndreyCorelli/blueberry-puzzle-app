## Testing on Google Play 🙏

This app is currently in Google Play closed testing.

If you would like to help by testing the app:
- you only need an Android device
- no feedback is required
- please keep the app installed for 14 days

To join the test, open an issue in this repository or contact the developer via GitHub.

# Blueberry Puzzle – Android Puzzle App (Expo + React Native)

This project is an independent implementation inspired by the [Blueberry Trio](https://circle9puzzle.com/bbtrio/) logic puzzle.

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
```

#### Windows – via nvm-windows or installer

Download and install nvm-windows from its GitHub releases
or install Node 20+ directly from nodejs.org.

In PowerShell / cmd:

```shell
node -v   # ensure v20.x.x or newer
```

### Expo CLI & EAS CLI (optional but convenient)

These can be installed globally or used via npx.

```shell
npm install -g expo
npm install -g eas-cli
```


You can skip global installs and call them with npx expo / npx eas-cli if you prefer.

## 2. Cloning the project

```shell
git clone https://github.com/AndreyCorelli/blueberry-trio-app.git blueberry-puzzle-app
cd blueberry-puzzle-app
```

## 3. Installing dependencies

```shell
npm install
```

## 4. macOS TEMP directory note (if you see EACCES errors)

On some managed/company macOS machines, Expo/Metro may not be allowed to write to the system temp dir and you’ll see errors like:

> EACCES: permission denied, open '/var/folders/.../metro-cache/...'

Workaround: run Expo with a custom temp dir you own.

```shell
mkdir -p "$HOME/tmp/expo"
export TMPDIR="$HOME/tmp/expo"
```


Run npm run start in the same terminal after setting TMPDIR.

You can add the export TMPDIR=... line to your shell profile (`~/.zshrc` or `~/.bashrc`) if you want it to be automatic.

## 5. Running the app (development)

### Linux / macOS

*(Optional, macOS only – see note above)
```bash
export TMPDIR="$HOME/tmp/expo"
```

```bash
npm install
npm run start
```


This starts the Expo dev server and prints a QR code.
Press w in the terminal to open Dev Tools in your browser.
You should see the same QR code there as well.

### Windows

In PowerShell:

```shell
npm install
npm run start
```


The Expo CLI will start the dev server and show a QR code in the terminal / dev tools.

## 6. Running on your Android phone with Expo Go

Install Expo Go from the Google Play Store on your Android device.
Make sure your phone and computer are on the same network (Wi-Fi).
With npm run start running:
Open Dev Tools in the browser (press w in the terminal if needed).
Scan the QR code with Expo Go.
The app should load and you should see:

> Title: Blueberry Trio
> Subtitle: “3 berries per row, column & block”
> A button: Generate puzzle

Tap Generate puzzle to create a puzzle.

If you have tricky network conditions (corporate Wi-Fi, firewalls), you can start Expo with a tunnel:

```shell
npx expo start --tunnel
```


Then connect via Expo Go using the tunnel URL.

## 7. Gameplay

Tap on non-clue cells to cycle:

- Blank → ● blueberry
- ● blueberry → × marked empty
- × marked empty → blank

#### New puzzle / Generate puzzle
Creates a new random puzzle with a unique solution.

#### Check
Compares your current marks with the (hidden) solution:

- If all berries match the solution positions → ✅ “Correct! Puzzle solved.”
- Otherwise → ❌ “Not solved yet.”

#### Show solution / Hide solution
Toggles displaying the entire solution grid (berries and clues).

## 8. Building an Android APK / AAB with EAS (optional)

When you want an installable build:
Make sure you’re logged into Expo:

```shell
eas login
```


#### Initialize EAS in the project:

```shell
eas build:configure
```

#### Create a preview build for Android:

```shell
eas build -p android --profile preview
```

Once the build finishes, Expo will give you a link to download the .apk or .aab.
You can sideload the .apk onto your Android device for testing.

## 9. Project structure (simplified)

```
blueberry-trio-app/
  App.tsx                   # React Native UI (grid, buttons, interactions)
  src/
    core/
      blueberryCore.ts      # Puzzle generation + solver + uniqueness logic
  package.json
  app.json
  tsconfig.json
  .gitignore
```

The puzzle rules and generation logic are all encapsulated in src/core/blueberryCore.ts, making it easy to reuse or test independently.
