# TripVote ✈️🗳️

> **Collaborative real-time group travel decision engine. Create an instant room, vote on destinations, activities, budgets, and dates with friends, and discover your group's consensus itinerary.**

[![React 18](https://img.shields.io/badge/React-18.3-61DAFB.svg?logo=react&logoColor=black)](#tech-stack)
[![Vite](https://img.shields.io/badge/Bundler-Vite%205-646CFF.svg?logo=vite&logoColor=white)](#tech-stack)
[![Backend](https://img.shields.io/badge/Backend-Supabase%20(Realtime%20%2B%20Postgres)-3ECF8E.svg?logo=supabase&logoColor=white)](#tech-stack)
[![Deployment](https://img.shields.io/badge/Hosting-Vercel%20%2F%20Netlify%20Ready-black.svg)](#deployment)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

---

## Overview

Planning trips with groups is notoriously chaotic—endless WhatsApp debates over destinations, conflicting budgets, mismatched vacation days, and indecision.

**TripVote** simplifies group travel coordination into a frictionless voting room. Share a 6-character link with your travel group, vote on preferences asynchronously or live, and view instantaneous aggregated consensus charts.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TRIPVOTE WORKFLOW                               │
├────────────────────────────────┬───────────────────────────────────────┤
│  [🏠] Instant Room Creation    │  [🗳️] Preference Dimensions          │
│  · 6-character unique code     │  · Destinations (Beach, Mountain...)  │
│  · Shareable hash URL link     │  · Duration (3d, 5d, 7d, 10d)         │
│  · Zero mandatory signup       │  · Budget brackets (€ to €€€€)        │
│  · Attendee display names      │  · Ideal travel calendar months       │
├────────────────────────────────┴───────────────────────────────────────┤
│                   [⚡] Real-Time Supabase Synchronization               │
│  PostgreSQL Database ──▶ Row-Level Security ──▶ Realtime Broadcast     │
├────────────────────────────────┬───────────────────────────────────────┤
│  [📊] Live Consensus Tally     │  [🎯] Winning Itinerary Synthesis     │
│  · Destination rank bars       │  · Group average budget calculation   │
│  · Activity preference scores  │  · Month overlap consensus            │
└────────────────────────────────┴───────────────────────────────────────┘
```

---

## Core Features

- **Instant Zero-Auth Rooms**: Generate an ephemeral room with a 6-character code (*e.g., `#room=ABC123`*). No passwords or sign-up walls required.
- **Multi-Dimensional Voting**:
  - **Destinations**: Beach, City, Mountain, Theme Park, Festival, Road Trip.
  - **Activities**: Water sports, hiking, nightlife & bars, local gastronomy, museums, shopping, spa & wellness, extreme adventures, photography.
  - **Durations**: Quick weekend (3 days), classic getaway (5 days), full week (7 days), or extended trip (10 days).
  - **Budget Brackets**: Budget (<€300), Moderate (€300–€600), Premium (€600–€1000), or Unlimited (>€1000).
  - **Travel Season**: Flexible month picker to find schedule overlaps across the year.
- **Live Consensus Scoring**: Tallies votes dynamically as participants submit their preferences.
- **Smart Budget Aggregator**: Computes the optimal median budget that satisfies the maximum number of group members.

---

## Tech Stack

- **Frontend**: React 18, Vite 5, Modern Vanilla CSS Custom Properties.
- **Backend & Database**: Supabase (PostgreSQL with real-time change feeds).
- **Typography**: Space Mono & Syne.
- **Routing**: Lightweight Hash-based room routing (`window.location.hash`).

---

## Getting Started

### Prerequisites

- **Node.js** 18+ & **npm** / **pnpm**
- A free **Supabase** account ([supabase.com](https://supabase.com))

### 1. Database Setup (Supabase)

In your Supabase project dashboard, open the **SQL Editor** and execute:

```sql
-- Rooms table
create table rooms (
  id          bigint generated always as identity primary key,
  code        text unique not null,
  created_at  timestamptz default now()
);

-- Votes table
create table votes (
  id          bigint generated always as identity primary key,
  room_code   text references rooms(code) on delete cascade not null,
  name        text not null,
  destination text[] not null default '{}',
  duration    text[] not null default '{}',
  months      text[] not null default '{}',
  budget      text not null default '',
  activities  text[] not null default '{}',
  created_at  timestamptz default now()
);

-- Enable Row Level Security (public read/write for demo rooms)
alter table rooms enable row level security;
alter table votes enable row level security;

create policy "Public rooms access" on rooms for all using (true) with check (true);
create policy "Public votes access" on votes for all using (true) with check (true);
```

### 2. Environment Variables

Create `.env` in the project root:

```bash
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
```

### 3. Local Installation & Launch

```bash
# Clone the repository
git clone https://github.com/gust330/TripVote.git
cd TripVote

# Install dependencies
npm install

# Start local dev server
npm run dev
```

Open **`http://localhost:5173`** in your browser.

---

## Deployment

Deploy with one click to Vercel or Netlify:

```bash
# Production build
npm run build

# Preview build locally
npm run preview
```

Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your hosting dashboard environment settings.

---

## Project Structure

```
TripVote/
├── src/
│   ├── App.jsx             # Main interactive voting UI and tally engine
│   ├── main.jsx            # React root mount
│   └── supabase.js         # Supabase client, queries, and mutations
├── index.html              # HTML shell & font imports
├── vite.config.js          # Vite configuration
├── DEPLOYMENT.md           # Step-by-step Supabase deployment guide
├── package.json            # Dependencies and build scripts
└── README.md
```

---

## Author & License

Engineered by **Gustavo Teixeira** ([@gust330](https://github.com/gust330)).  
Licensed under the [MIT License](LICENSE).
