# 📋 Quizlet-Style Flashcards Web App Generator Prompt

> **Qo‘llanma:** Har safar yangi dars yoki yangi mavzu bo‘yicha shunday vebsayt yaratmoqchi bo‘lsangiz, quyidagi tayyor promptdan foydalaning.
> Faqat **`[MAVZU_NOMI]`** va **`[JSON_LUGAT_MA'LUMOTLARI]`** joylariga o‘zingizning yangi ma'lumotlaringizni qo‘yib, AI ga (Gemini, ChatGPT, Claude va h.k.) yuborasiz.

---

### 📝 AI ga yuboriladigan tayyor prompt matni:

```markdown
Act as an expert frontend developer. Create a production-ready, single-file HTML, CSS, and vanilla JavaScript web application inspired by Quizlet. The web app must run entirely in a single `.html` file with zero external dependencies, libraries, or build steps.

### 🎯 Requirements & Architecture

#### 1. Header Banner & Topic
- Clean top header with a modern "Q" logo badge.
- Title: Display the topic name: "[MAVZU_NOMI]"
- Dynamic counter badge showing total words: "[N] Words"
- Subtitle: "Words, Synonyms & Definitions"

#### 2. Navigation Tabs (Quizlet Modes)
The application must feature 4 interactive modes switchable via a modern pill tab bar:
1. **Kartochkalar (Flashcards)**
2. **Test / Learn (Quiz mode)**
3. **Match Game (Moslashtirish o'yini)**
4. **Lug‘at (Searchable Dictionary)**

---

#### 3. Detailed Mode Specifications

##### Mode 1: Kartochkalar (Flashcards)
- **Top Sub-bar**:
  - Live progress counter: `[Joriy] / [Jami]` (e.g. `1 / 52`)
  - Gradient animated progress bar showing completion percentage.
  - "Aralashtirish" (Shuffle) button powered by the Fisher-Yates algorithm with toast notification.
  - "Barchasi" (Reset Order) button to restore the original sequence.
- **3D Interactive Card**:
  - Smooth 3D perspective flip (`transform-style: preserve-3d`, `transition: transform 0.6s cubic-bezier(0.34, 1.4, 0.64, 1)`).
  - **Front Face**: Displays the "word" (large bold typography), a "So‘z / Term" badge, audio pronunciation button (Web Speech API), and flip prompt.
  - **Back Face**: Displays the "synonym" inside a green pill tag, the "definition" text, "Ta'rif & Sinonim" badge, audio pronunciation button, and flip back prompt.
  - Automatically resets to the front face whenever the user navigates to another card.
- **Bottom Navigation Controls**:
  - "Oldingisi" (Previous) button (disabled on first card).
  - "Aylantirish (Flip)" center action button.
  - "Keyingisi" (Next) button (disabled on last card).
- **Navigation Shortcuts & Gestures**:
  - Keyboard: `Space` to flip, `ArrowLeft` for previous, `ArrowRight` for next.
  - Mobile Touch: Touch swipe left for next card, touch swipe right for previous card, with subtle elastic drag visual effect.

##### Mode 2: Test / Learn
- Interactive multiple-choice quiz engine.
- Generates 1 question per card from the dataset: displays the definition, with 4 shuffled options (1 correct word + 3 distractors).
- Real-time score counter: "To‘g‘ri: X" (green badge) and "Xato: Y" (red badge).
- Live progress bar across questions.
- Instant feedback: selected button turns green if correct, or red with the correct option highlighted if incorrect.
- "Keyingi savol →" button advances to the next question.
- Final summary screen displaying total score, percentage accuracy, and "Qaytadan boshlash" restart button.

##### Mode 3: Match Game (Moslashtirish o‘yini)
- Timed tile-matching game (Quizlet Match mode).
- Selects 6 random pairs (12 tiles: 6 words and 6 definitions/synonyms) per round.
- Millisecond-precision stopwatch timer (`00:00.0`).
- Card selection states: active highlight on click, error shake animation on mismatch, and smooth fade-out when correctly matched.
- Remaining pairs counter (`Qoldi: X ta juftlik`).
- Victory celebration screen displaying the completion time with a "Qaytadan o'ynash" replay button.

##### Mode 4: Lug‘at (Full Dictionary)
- Live instant search input filtering by word, synonym, or definition.
- Displays matching item count badge (e.g. `X ta so'z`).
- Clean list of cards showing word, synonym badge, and definition.
- Individual audio pronunciation button next to every word.

---

#### 4. UI Design & Mobile Responsiveness
- Modern Quizlet-inspired aesthetic:
  - Color palette: Indigo/Blue (`#4255ff`), crisp white surfaces, soft borders (`#e6e8ec`), ambient background glow, and soft drop shadows.
  - Typography: Plus Jakarta Sans via Google Fonts.
  - Fully mobile-responsive:
    - Safe-area insets (`safe-area-inset-bottom`) for modern smartphones (iPhone / Android).
    - Touch targets minimum 44px with `-webkit-tap-highlight-color: transparent`.
    - Horizontal scrollable tabs with hidden scrollbars on mobile.
    - Responsive font sizes using CSS `clamp()`.
    - 1-column layout for Test/Learn on mobile.
    - 2-column grid for Match Game on mobile.
    - Internal scroll for long definitions so content never overflows.

---

#### 5. Data Input

Use the following topic and JSON dataset:

Topic Name: [MAVZU_NOMI]

JSON Data:
```json
[
  {
    "word": "...",
    "synonym": "...",
    "definition": "..."
  }
]
```

Output the complete, production-ready, fully styled HTML code inside a single block. Do not use placeholders or omit code.
```

---

### 💡 Foydalanish bo‘yicha oddiy qadamlar:

1. Yuqoridagi kod blokidagi matndan nusxa oling (**Copy**).
2. **`[MAVZU_NOMI]`** o‘rniga yangi dars mavzusini yozing (masalan: *IELTS Academic Vocabulary Unit 1* yoki *Medical English Terms*).
3. **`[JSON Data]`** bo‘limiga yangi so‘zlar ro‘yxatini JSON formatida qo‘ying.
4. AI ga yuboring — natijada tayyor bitta `index.html` fayl olasiz!
