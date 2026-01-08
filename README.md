# Bananhopparen 3000

Ett enkelt dataspel byggt med React och TypeScript där du hoppar över bananer och samlar godis!

## Spelregler

- 🏃 Använd **vänster/höger piltangenter** för att röra dig
- ⬆️ Använd **mellanslag** för att hoppa
- 🍬 Samla godis för att få poäng (+10 per godis)
- 🍌 Undvik bananer - träffa 3 bananer så förlorar du!

## Utveckling

Projektet använder Vite + React + TypeScript.

### Installation

```bash
npm install
```

### Starta utvecklingsserver

```bash
npm run dev
```

Öppna sedan http://localhost:5173 i din webbläsare.

### Bygga för produktion

```bash
npm run build
```

### Linting

```bash
npm run lint
```

## Teknisk implementation

- React 19 med TypeScript
- Vite för build tooling
- Game loop med requestAnimationFrame
- State management med React hooks
- Fysikmotor med gravitation och hopp
- Kollisionsdetektion
- Responsive spelyta med gradient-bakgrund
- CSS-animationer för visuella effekter
