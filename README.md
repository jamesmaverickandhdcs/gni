# 🌐 Global Nexus Insights (GNI)

**Technology + Geopolitics + Financial Impact Intelligence System**

> *The forces reshaping the world — technological disruption, geopolitical power shifts, and their translation into financial market movements — do not respect borders. But the intelligence to understand them, historically, has. GNI removes that border.*

[![Live Dashboard](https://img.shields.io/badge/Live-gni--dusky.vercel.app-blue)](https://gni-dusky.vercel.app)
[![Telegram](https://img.shields.io/badge/Telegram-@GNI__Alerts-blue)](https://t.me/GNI_Alerts)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## What is GNI?

GNI is an open-source, zero-cost AI pipeline that delivers **institutional-grade geopolitical intelligence** — analysing the same forces that move Wall Street and shape foreign policy — freely and transparently to anyone with an internet connection.

GNI analyses the convergence of three pillars:

| Pillar | What GNI Tracks |
|--------|----------------|
| 🔬 **Technology** | Semiconductors, AI competition, cyber warfare, critical minerals, digital currencies |
| 🌍 **Geopolitics** | Great power competition, conflict dynamics, sanctions, alliance shifts, resource competition |
| 📈 **Financial Impact** | Capital flows, sector rotation, currency dynamics, commodity pricing, safe-haven flows |

---

## Live System

| Component | URL |
|-----------|-----|
| Dashboard | [gni-dusky.vercel.app](https://gni-dusky.vercel.app) |
| World Map | [gni-dusky.vercel.app/map](https://gni-dusky.vercel.app/map) |
| Stock Chart | [gni-dusky.vercel.app/stocks](https://gni-dusky.vercel.app/stocks) |
| Transparency Engine | [gni-dusky.vercel.app/transparency](https://gni-dusky.vercel.app/transparency) |
| Intelligence History | [gni-dusky.vercel.app/history](https://gni-dusky.vercel.app/history) |
| Telegram Channel | [@GNI_Alerts](https://t.me/GNI_Alerts) |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  GitHub Actions (2x daily)           │
│                                                      │
│  RSS Collection → Intelligence Funnel → LLM Analysis │
│       ↓                  ↓                  ↓        │
│  5 sources          4-stage filter     Llama 3 / Groq│
│  93 articles        Injection detect   11-field JSON  │
│                     Dedup + Rank                     │
│                          ↓                           │
│              Supabase (reports + trace)              │
│                    ↓           ↓                     │
│            Telegram         Vercel Dashboard         │
│           @GNI_Alerts      Next.js + Leaflet         │
└─────────────────────────────────────────────────────┘
```

### Intelligence Funnel (4 Stages)
1. **Stage 1 — Relevance Filter**: 30+ geopolitical keyword matching
2. **Stage 1b — Injection Detection**: 16-pattern adversarial prompt detector
3. **Stage 2 — Deduplication**: Title similarity threshold removes duplicate stories
4. **Stage 3 — Significance Scoring + Diversity**: Ranked by geopolitical significance, max 3 per source

### Technology Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Recharts, Leaflet
- **Backend**: Python 3.11, GitHub Actions
- **Database**: Supabase (PostgreSQL)
- **LLM**: Meta Llama 3 8B (Ollama local) + Groq API (cloud fallback)
- **Hosting**: Vercel (zero cost)
- **Notifications**: Telegram Bot API

---

## Key Features

### ✅ Explainable AI (XAI)
Every article's passage through the Intelligence Funnel is documented and publicly queryable. The `/transparency` page shows every PASS/FAIL decision for every article in every pipeline run.

### ✅ GPVS — Prediction Validation Standard
GNI measures its own accuracy using the GNI Prediction Validation Standard — a multi-timeframe, human-validated, deception-aware framework comparing predictions against actual market outcomes.

**Current GPVS Score: 100% (20 reports verified)**

### ✅ Real-Time Market Intelligence
12 geopolitically-relevant instruments tracked with AI-generated context explaining why prices moved based on the latest GNI intelligence report.

### ✅ Zero Cost Infrastructure
| Service | Cost |
|---------|------|
| Vercel (hosting) | $0/month |
| Supabase (database) | $0/month |
| GitHub Actions (CI/CD) | $0/month |
| Groq API (LLM inference) | $0/month |
| **Total** | **$0/month** |

---

## Tracked Instruments

| Ticker | Name | Geopolitical Relevance |
|--------|------|----------------------|
| SPY | S&P 500 ETF | Global fear/confidence indicator |
| GLD | Gold ETF | Safe haven — rises in crises |
| USO | Oil ETF | Middle East conflict proxy |
| XOM | ExxonMobil | Energy sector health |
| LMT | Lockheed Martin | Military escalation proxy |
| TLT | US Treasury Bonds | Risk-off safe haven |
| DX-Y.NYB | USD Index | Dollar strength vs major currencies |
| FXI | China Large-Cap ETF | China economic health proxy |
| AAPL | Apple Inc. | Tech sector and supply chain |
| JPM | JP Morgan Chase | Global banking stability |
| EWJ | Japan ETF | Asia-Pacific risk indicator |
| EWT | Taiwan ETF | Semiconductor and US-China tensions |

---

## Getting Started

### Prerequisites
- Python 3.11
- Node.js 18+
- Supabase account (free)
- Groq API key (free)

### Local Development

```bash
# Clone the repository
git clone https://github.com/jamesmaverickandhdcs/gni.git
cd gni

# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run the intelligence pipeline
python ai_engine/main.py

# Run the dashboard
npm run dev
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Groq API
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_channel_id

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## Project Structure

```
gni/
├── ai_engine/                 # Python intelligence pipeline
│   ├── collectors/            # RSS collection from 5 sources
│   ├── funnel/                # 4-stage Intelligence Funnel
│   ├── analysis/              # LLM analysis, Supabase saver
│   │   └── outcome_verifier.py  # GPVS prediction validation
│   ├── geo/                   # Geocoding engine
│   └── notifications/         # Telegram notifier
├── src/
│   └── app/
│       ├── page.tsx           # Dashboard
│       ├── map/               # Geopolitical world map
│       ├── stocks/            # Market intelligence
│       ├── transparency/      # Explainable AI engine
│       ├── history/           # Intelligence archive
│       └── api/               # Next.js API routes
├── .github/workflows/         # GitHub Actions automation
└── requirements.txt           # Python dependencies
```

---

## Testing Results

| Test | Category | Result |
|------|----------|--------|
| FT-01 to FT-07 | Functional Testing | ✅ 7/7 PASS |
| NF-001 to NF-010 | Non-Functional Testing | ✅ 10/10 PASS |
| GPVS Accuracy | Prediction Validation | ✅ 100% (20 reports) |
| Lighthouse Accessibility | Accessibility | ✅ 95/100 |
| Dashboard Load Time | Performance | ✅ ~2.5s |

---

## Academic Context

**Project**: Global Nexus Insights (GNI)
**Programme**: Higher Diploma in Computer Science
**Institution**: Spring University Myanmar (SUM)
**Date**: March 2026

### Original Contributions
1. First open-source zero-cost system integrating Technology + Geopolitics + Financial Impact analysis
2. 27 empirically-derived engineering rules (L1-L27) from real development failures
3. GPVS — GNI Prediction Validation Standard (multi-timeframe, human-in-loop, deception-aware)
4. Cross-day error prediction analysis (93% internal / 0% external predictability)
5. Explainable AI pipeline — every decision publicly queryable
6. GNI Intelligence Framework v1.0 (formal academic document)

---

## Engineering Rules (L1-L27)

27 engineering rules derived from real development failures — from Python version management to LLM model deprecation to JSX syntax constraints. See `GNI_Day1-7_SWOT_Analysis.docx` for complete documentation.

---

## Disclaimer

GNI intelligence reports are for informational and educational purposes only. They do not constitute financial advice, investment recommendations, or trading signals. Past analytical accuracy does not guarantee future predictive performance.

---

## License

MIT License — free to use, modify, and distribute.

*GNI — Global Nexus Insights | Higher Diploma in Computer Science | Spring University Myanmar (SUM) | March 2026*
