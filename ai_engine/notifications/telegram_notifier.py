import os
import requests
from datetime import datetime

# ============================================================
# GNI Telegram Notifier — Day 4
# Sends intelligence report alerts to Telegram channel
# ============================================================

def send_telegram_message(text: str) -> bool:
    """Send a message to the configured Telegram chat."""
    TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
    TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("  ⚠️  Telegram credentials not configured — skipping")
        return False

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": text,
        "parse_mode": "HTML"
    }

    try:
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code == 200:
            print("  ✅ Telegram notification sent")
            return True
        else:
            print(f"  ⚠️  Telegram error: {response.status_code} {response.text}")
            return False
    except Exception as e:
        print(f"  ⚠️  Telegram exception: {e}")
        return False


def format_report_message(report: dict) -> str:
    """Format a GNI report as a Telegram HTML message."""
    sentiment = report.get("sentiment", "Neutral")
    sentiment_icon = "▼" if sentiment.lower() == "bearish" else "▲" if sentiment.lower() == "bullish" else "●"

    risk = report.get("risk_level", "Unknown").upper()
    risk_icon = "🔴" if risk == "CRITICAL" else "🟠" if risk == "HIGH" else "🟡" if risk == "MEDIUM" else "🟢"

    tickers = report.get("tickers_affected", [])
    ticker_str = " ".join([f"#{t}" for t in tickers]) if tickers else "N/A"

    location = report.get("location_name", "Global")
    llm = "🧠 Llama 3 Local" if report.get("llm_source") == "ollama" else "☁️ Groq API"
    timestamp = datetime.now().strftime("%b %d, %H:%M")

    message = f"""🌐 <b>GNI — Global Nexus Insights</b>
━━━━━━━━━━━━━━━━━━━━

{risk_icon} <b>Risk Level:</b> {risk}
{sentiment_icon} <b>Sentiment:</b> {sentiment} ({report.get('sentiment_score', 0):.2f})
📍 <b>Location:</b> {location}
{llm}

<b>{report.get('title', 'Intelligence Report')}</b>

{report.get('summary', '')}

📊 <b>Tickers:</b> {ticker_str}

🕐 {timestamp}
━━━━━━━━━━━━━━━━━━━━
<i>gni-dusky.vercel.app</i>"""

    return message


def notify_report(report: dict) -> bool:
    """Send a formatted report notification to Telegram."""
    print("\n📱 Step 4: Sending Telegram Notification...")
    message = format_report_message(report)
    return send_telegram_message(message)


if __name__ == "__main__":
    from dotenv import load_dotenv
    import os
    dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env')
    load_dotenv(dotenv_path)
    # Test with dummy report
    test_report = {
        "title": "Test — GNI Telegram Notifier",
        "summary": "This is a test notification from the GNI pipeline.",
        "sentiment": "Bearish",
        "sentiment_score": -0.65,
        "risk_level": "High",
        "location_name": "Myanmar",
        "tickers_affected": ["SPY", "GLD", "XOM"],
        "llm_source": "groq"
    }
    notify_report(test_report)