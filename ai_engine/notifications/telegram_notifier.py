import os
import requests
from datetime import datetime

# ============================================================
# GNI Telegram Notifier — Day 6
# Sends full intelligence report to @GNI_Alerts channel
# Includes: consolidated report + 10 articles + AI thinking
# ============================================================


def send_telegram_message(text: str) -> bool:
    """Send a message to the configured Telegram channel."""
    TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
    TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("  ⚠️  Telegram credentials not configured — skipping")
        return False

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True
    }
    try:
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code == 200:
            print("  ✅ Telegram notification sent")
            return True
        else:
            print(f"  ⚠️  Telegram error: {response.status_code} {response.text[:100]}")
            return False
    except Exception as e:
        print(f"  ⚠️  Telegram exception: {e}")
        return False


def format_consolidated_message(report: dict) -> str:
    """Format the consolidated intelligence report message."""
    sentiment = report.get("sentiment", "Neutral")
    sentiment_icon = "▼" if sentiment.lower() == "bearish" else "▲" if sentiment.lower() == "bullish" else "◆"
    risk = report.get("risk_level", "Unknown").upper()
    risk_icon = "🔴" if risk == "CRITICAL" else "🟠" if risk == "HIGH" else "🟡" if risk == "MEDIUM" else "🟢"
    tickers = report.get("tickers_affected", [])
    ticker_str = " ".join([f"#{t}" for t in tickers]) if tickers else "N/A"
    location = report.get("location_name", "Global")
    llm = "🧠 Llama 3 Local" if report.get("llm_source") == "ollama" else "☁️ Groq API"
    timestamp = datetime.now().strftime("%b %d, %H:%M")
    sentiment_score = report.get("sentiment_score", 0)

    message = f"""🌐 <b>GNI — Global Nexus Insights</b>
━━━━━━━━━━━━━━━━━━━━
{risk_icon} <b>Risk Level:</b> {risk}
{sentiment_icon} <b>Sentiment:</b> {sentiment} ({sentiment_score:.2f})
📍 <b>Location:</b> {location}
{llm}

<b>{report.get('title', 'Intelligence Report')}</b>

{report.get('summary', '')}

📊 <b>Market Impact:</b>
{report.get('market_impact', 'See dashboard for details.')}

📈 <b>Tickers:</b> {ticker_str}
🕐 {timestamp}
━━━━━━━━━━━━━━━━━━━━
🔍 <a href="https://gni-dusky.vercel.app">View Dashboard</a> | <a href="https://gni-dusky.vercel.app/transparency">Transparency</a>
━━━━━━━━━━━━━━━━━━━━
<i>⚠️ DISCLAIMER: GNI reports are for informational purposes only and do not constitute financial advice. Always conduct your own research before making investment decisions.</i>"""

    return message


def format_ai_thinking_message(report: dict, articles: list) -> str:
    """Format AI thinking message — how 10 articles consolidated to 1 report."""
    if not articles:
        return ""

    timestamp = datetime.now().strftime("%b %d, %H:%M")
    total = len(articles)

    # Build article list
    article_lines = ""
    for i, art in enumerate(articles, 1):
        source = art.get("source", "Unknown")
        title = art.get("title", "Untitled")
        score = art.get("stage3_score", 0)
        url = art.get("link") or art.get("url", "")
        # Truncate long titles
        if len(title) > 80:
            title = title[:77] + "..."
        if url:
            article_lines += f"\n{i}. [{source}] <a href=\"{url}\">{title}</a> (Score: {score})"
        else:
            article_lines += f"\n{i}. [{source}] {title} (Score: {score})"

    # Source distribution
    source_counts = {}
    for art in articles:
        s = art.get("source", "Unknown")
        source_counts[s] = source_counts.get(s, 0) + 1
    source_dist = " | ".join([f"{s}: {c}" for s, c in source_counts.items()])

    # Score range
    scores = [art.get("stage3_score", 0) for art in articles]
    max_score = max(scores) if scores else 0
    min_score = min(scores) if scores else 0

    message = f"""🧠 <b>GNI — AI Thinking Transparency</b>
━━━━━━━━━━━━━━━━━━━━
<b>How AI consolidated {total} articles → 1 report</b>

<b>Step 1: Collection</b>
93 articles collected from 5 sources

<b>Step 2: Intelligence Funnel</b>
Stage 1 (Relevance): Removed non-geopolitical content
Stage 1b (Injection): Scanned for adversarial content
Stage 2 (Dedup): Removed duplicate stories
Stage 3 (Score): Ranked by geopolitical significance
Stage 4 (Diversity): Max 3 per source enforced

<b>Step 3: Top {total} Articles Selected</b>
Score range: {min_score} — {max_score}
Source mix: {source_dist}
{article_lines}

<b>Step 4: LLM Analysis</b>
Model: {report.get('llm_source', 'groq').upper()}
All {total} articles fed to Llama 3 simultaneously
LLM identified: main theme, sentiment, risk level,
affected markets, primary location

<b>Step 5: Result</b>
→ Title: {report.get('title', '')}
→ Sentiment: {report.get('sentiment', '')} ({report.get('sentiment_score', 0):.2f})
→ Risk: {report.get('risk_level', '')}
→ Location: {report.get('location_name', '')}

🕐 {timestamp}
━━━━━━━━━━━━━━━━━━━━
🔍 <a href="https://gni-dusky.vercel.app/transparency">Full Transparency Engine</a>
<i>⚠️ For informational purposes only. Not financial advice.</i>"""

    return message


def notify_report(report: dict, articles: list = None) -> bool:
    """
    Send full intelligence notification to Telegram.
    Message 1: Consolidated report
    Message 2: AI thinking + 10 articles
    """
    print("\n📱 Step 5: Sending Telegram Notification...")

    # Message 1: Consolidated report
    msg1 = format_consolidated_message(report)
    success1 = send_telegram_message(msg1)

    # Message 2: AI thinking (only if articles provided)
    success2 = True
    if articles:
        msg2 = format_ai_thinking_message(report, articles)
        if msg2:
            success2 = send_telegram_message(msg2)

    return success1 and success2


if __name__ == "__main__":
    from dotenv import load_dotenv
    import os
    dotenv_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        '.env'
    )
    load_dotenv(dotenv_path)

    # Test with dummy data
    test_report = {
        "title": "Escalating Middle East Tensions Drive Oil Price Surge",
        "summary": "Iran-Israel conflict escalates with new missile strikes, driving oil prices up 4% and triggering safe-haven flows into gold.",
        "sentiment": "Bearish",
        "sentiment_score": -0.75,
        "risk_level": "High",
        "location_name": "Iran",
        "market_impact": "Oil prices may rise 5-10%. Gold and defence stocks likely to benefit. SPY may face short-term pressure.",
        "tickers_affected": ["SPY", "GLD", "USO", "XOM", "LMT"],
        "llm_source": "groq"
    }
    test_articles = [
        {"source": "Al Jazeera", "title": "Iran launches missile strikes on Israel", "url": "https://aljazeera.com", "stage3_score": 18},
        {"source": "BBC", "title": "Oil prices surge amid Middle East tensions", "url": "https://bbc.com", "stage3_score": 15},
        {"source": "CNN", "title": "US warns of escalation risk in Iran conflict", "url": "https://cnn.com", "stage3_score": 13},
        {"source": "Fox News", "title": "Israel responds to Iranian drone attack", "url": "https://foxnews.com", "stage3_score": 11},
        {"source": "DW News", "title": "European markets fall on Middle East fears", "url": "https://dw.com", "stage3_score": 10},
    ]
    notify_report(test_report, test_articles)