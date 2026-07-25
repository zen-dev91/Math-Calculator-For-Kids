# ⭐ Math Adventure

A fun, interactive math practice game designed for kids ages 5–10. Choose an operation, pick a difficulty, and solve colorful math challenges — all while earning XP, leveling up, unlocking badges, and keeping your streak alive!

---

## ✨ Features

### 🎮 Core Gameplay
- **Four Operations** — Addition, Subtraction, Multiplication, and Division
- **Random Mode** — Shuffles all four operations for a mixed challenge
- **Three Difficulty Levels** — Easy (0–5), Medium (0–10), Hard (0–20)
- **10-Question Rounds** — Complete a set of 10 questions, then view a round summary

### ⏱ Game Modes
| Mode | Description |
|------|-------------|
| **Timed** | 20-second countdown per question — solve fast or the clock runs out! |
| **Practice** | No timer — take your time and learn at your own pace |

### 🧠 Learning Support
- **Hints System** — Two-stage hints per question that guide reasoning instead of giving the answer away
- **3 Attempts Per Question** — Get up to 3 tries before the correct answer is revealed
- **Mascot Encouragement** — Einstein the mascot delivers motivational messages throughout the game

### 🏆 Progression & Rewards
- **XP & Leveling** — Earn XP for every correct answer with bonuses for first-try solves and streaks
- **Streak Tracking** — Build consecutive correct-answer streaks for bonus XP every 5 questions
- **9 Unlockable Badges** — Earn achievements like *First Steps*, *Hot Streak*, *Math Wizard*, *Perfectionist*, and more

### 🎨 Design & Accessibility
- **Dark Mode** — Toggle between a bright sky theme and a sleek dark theme
- **Responsive Layout** — Works on desktop, tablet, and mobile screens
- **Keyboard Accessible** — Full keyboard navigation with visible focus indicators
- **Reduced Motion Support** — Respects `prefers-reduced-motion` for users who need it
- **Sound Effects** — Cheerful Web Audio chimes (no external audio files required)
- **Confetti Celebrations** — Canvas-based confetti animation on correct answers

---

## 📁 Project Structure

```
Math Calculator/
├── index.html     # Main HTML — game layout, UI structure
├── style.css      # All styling — themes, animations, responsive design
├── java.js        # Game logic — state, scoring, timer, badges, hints
├── logo.png       # Einstein mascot image
└── README.md
```

---

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/zen-dev91/Math-Calculator-For-Kids.git
   ```
2. **Open the game**
   - Open `index.html` in any modern browser — no build step or server required.

3. **Play!**
   - Choose your operation, difficulty, and mode
   - Click **🎲 Generate Question** to start
   - Type your answer and hit **Enter** or click **✅ Check Answer**

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| **HTML5** | Semantic page structure |
| **CSS3** | Custom properties, animations, responsive grid, dark mode |
| **Vanilla JavaScript** | Game state management, DOM manipulation, event handling |
| **Web Audio API** | Procedural sound effects (no audio files) |
| **Canvas API** | Confetti particle animation |
| **Google Fonts** | Baloo 2 & Nunito typefaces |
| **localStorage** | Persistent best scores, streaks, and unlocked badges |

> No frameworks, no dependencies, no build tools — just open and play.

---

## 🏅 Achievements

| Badge | Name | How to Unlock |
|-------|------|---------------|
| 🌟 | First Steps | Get your first correct answer |
| 🔥 | Hot Streak | Reach a 5-question streak |
| 🚀 | On Fire | Reach a 10-question streak |
| ⚡ | Unstoppable | Reach a 25-question streak |
| 🎓 | Rising Star | Reach Level 5 |
| 🧙 | Math Wizard | Reach Level 10 |
| 💯 | Perfectionist | Complete a round with zero mistakes |
| 🏛️ | Century Club | Answer 100 questions correctly (lifetime) |
| 💨 | Speedster | Answer correctly within 5 seconds in Timed mode |

---

## 📸 Screenshots

> Open `index.html` in your browser to see the game in action!

---

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests for:
- New operations or question types
- Additional achievements
- UI/UX improvements
- Accessibility enhancements
- Translations / localization

---

## 📄 License

This project is open source. Feel free to use, modify, and distribute.

---

<p align="center">Made with 💜 for curious young mathematicians</p>
