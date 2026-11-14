# UREC Crowd Map

A premium, mobile-first web app for James Madison University students to visualize simulated UREC gym crowds, explore a 3D floor map, and plan quieter workout times.

> All occupancy numbers are **simulated demo data** — not live JMU UREC headcounts.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- React Router
- React Three Fiber / Drei / Three.js
- Recharts
- Framer Motion
- Lucide React

## Getting started

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Features

- **Home** — overall simulated occupancy, busiest zones, hourly forecast
- **Map** — interactive 3D gym with six zones, time slider, floor filter, scenarios
- **Plan** — day + preference based recommendation with Save Plan
- **Saved** — persisted workout plans via `localStorage`

## Backend-ready API layer

Mock methods live in `src/services/api.ts` and can be swapped for FastAPI endpoints later:

- `getCurrentOccupancy()`
- `getForecast(date, scenario)`
- `getZoneDetails(zoneId)`
- `applyScenario(text)`
