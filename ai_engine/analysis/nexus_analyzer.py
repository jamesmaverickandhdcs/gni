import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

# ============================================================
# GNI Nexus Analyzer — Day 3 (updated)
# Primary:  Groq API (GitHub Actions / cloud)
# Local:    Llama 3 8B via Ollama (local development)
# Auto-detects environment and uses appropriate LLM
# ============================================================

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3:8b"
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = "llama-3.1-8b-instant"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GITHUB_ACTIONS = os.getenv("GITHUB_ACTIONS", "false").lower() == "true"


def _build_prompt(articles: list[dict]) -> str:
    """Build analysis prompt from top articles."""
    articles_text = ""
    for i, a in enumerate(articles, 1):
        articles_text += f"""
Article {i}:
Source: {a['source']} ({a['bias']})
Title: {a['title']}
Summary: {a['summary'][:150]}
---"""

    return f"""You are GNI — Global Nexus Insights, an expert geopolitical and macroeconomic analyst.

Analyze the following {len(articles)} news articles and produce a structured JSON report.

ARTICLES:
{articles_text}

Respond ONLY with a valid JSON object in this exact format:
{{
  "title": "Brief title summarizing the main geopolitical theme (max 15 words)",
  "summary": "2-3 sentence English summary of the key event and its significance",
 
  "sentiment": "Bullish or Bearish or Neutral",
  "sentiment_score": 0.0,
  "source_consensus_score": 0.0,
  "location_name": "Primary location of the event (city or country name)",
  "tickers_affected": ["SPY", "GLD"],
  "market_impact": "2-3 sentence analysis of potential market impact",
  "risk_level": "Low or Medium or High or Critical"
}}

Rules:
- sentiment_score: -1.0 (very bearish) to +1.0 (very bullish) for markets
- source_consensus_score: 0.0 to 1.0 (how much sources agree)
- tickers_affected: choose from [SPY, AAPL, JPM, XOM, GLD, USO, LMT, TLT, EWT, EWJ, FXI, DXY]
- Do NOT include myanmar_summary field
- Respond with JSON only — no extra text, no markdown, no explanation
"""


def _call_ollama(prompt: str) -> str | None:
    """Call local Ollama Llama 3."""
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.3, "num_predict": 1200}
            },
            timeout=180
        )
        if response.status_code == 200:
            return response.json().get("response", "")
    except Exception as e:
        print(f"  ⚠️  Ollama error: {e}")
    return None


def _call_groq(prompt: str) -> str | None:
    """Call Groq API."""
    if not GROQ_API_KEY:
        print("  ⚠️  No Groq API key found in .env")
        return None
    try:
        response = requests.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": GROQ_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
                "max_tokens": 1500
            },
            timeout=30
        )
        if response.status_code == 200:
            return response.json()["choices"][0]["message"]["content"]
        else:
            print(f"  ⚠️  Groq error: {response.status_code} {response.text[:100]}")
    except Exception as e:
        print(f"  ⚠️  Groq error: {e}")
    return None


def _parse_json_response(raw: str) -> dict | None:
    """Safely parse JSON from LLM response — handles truncated responses."""
    if not raw:
        return None

    raw = raw.strip()

    # Strip markdown code fences
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1]).strip()

    # Try direct parse first
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Try extracting JSON object
    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start >= 0 and end > start:
        try:
            return json.loads(raw[start:end])
        except Exception:
            pass

    # Try fixing truncated JSON by closing open strings and braces
    try:
        partial = raw[start:] if start >= 0 else raw
        # Count open braces
        open_braces = partial.count("{") - partial.count("}")
        open_quotes = partial.count('"') % 2

        if open_quotes:
            partial += '"'
        if open_braces > 0:
            partial += "}" * open_braces

        result = json.loads(partial)
        # Fill missing required fields with defaults
        defaults = {
            "title": "GNI Report",
            "summary": "",
            "myanmar_summary": "",
            "sentiment": "Neutral",
            "sentiment_score": 0.0,
            "source_consensus_score": 0.5,
            "location_name": "Global",
            "tickers_affected": ["SPY"],
            "market_impact": "",
            "risk_level": "Medium"
        }
        for k, v in defaults.items():
            if k not in result:
                result[k] = v
        return result
    except Exception:
        pass

    return None


def analyze(articles: list[dict]) -> dict | None:
    """
    Analyze top articles using appropriate LLM.
    GitHub Actions → Groq API directly (no Ollama timeout waste)
    Local development → Ollama first, Groq fallback
    """
    if not articles:
        print("  ⚠️  No articles to analyze")
        return None

    prompt = _build_prompt(articles)
    raw = None
    source_used = None

    if GITHUB_ACTIONS:
        # Cloud mode — Groq directly, no Ollama attempt
        print("  ☁️  GitHub Actions — using Groq API directly...")
        raw = _call_groq(prompt)
        source_used = "groq"
    else:
        # Local mode — Ollama first, Groq fallback
        print("  🧠 Calling Ollama (Llama 3 8B local)...")
        raw = _call_ollama(prompt)
        source_used = "ollama"

        if not raw:
            print("  🔄 Ollama unavailable — falling back to Groq API...")
            raw = _call_groq(prompt)
            source_used = "groq"

    if not raw:
        print("  ❌ Both Ollama and Groq failed")
        return None

    report = _parse_json_response(raw)
    if not report:
        print("  ❌ Failed to parse LLM response as JSON")
        print(f"  Raw response: {raw[:200]}")
        return None

    report["llm_source"] = source_used
    report["articles_analyzed"] = len(articles)
    report["sources_used"] = list(set(a["source"] for a in articles))

    return report


if __name__ == "__main__":
    import sys, os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from collectors.rss_collector import collect_articles
    from funnel.intelligence_funnel import run_funnel

    print("🧠 GNI Nexus Analyzer — Test Run\n")

    if GITHUB_ACTIONS:
        print("  Mode: GitHub Actions (Groq)\n")
    else:
        print("  Mode: Local (Ollama + Groq fallback)\n")
        try:
            r = requests.get("http://localhost:11434", timeout=3)
            print("  ✅ Ollama is running\n")
        except Exception:
            print("  ⚠️  Ollama not running — will use Groq fallback\n")

    raw = collect_articles(max_per_source=20)
    top = run_funnel(raw, top_n=10, max_per_source=3)

    print("\n🔬 Analyzing top articles...\n")
    report = analyze(top)

    if report:
        print("\n📊 GNI REPORT:")
        print(f"  Title:      {report.get('title')}")
        print(f"  Sentiment:  {report.get('sentiment')} ({report.get('sentiment_score')})")
        print(f"  Risk Level: {report.get('risk_level')}")
        print(f"  Location:   {report.get('location_name')}")
        print(f"  Tickers:    {report.get('tickers_affected')}")
        print(f"  LLM Used:   {report.get('llm_source')}")
        print(f"\n  Summary:\n  {report.get('summary')}")
        print(f"\n  Market Impact:\n  {report.get('market_impact')}")
    else:
        print("  ❌ Analysis failed")