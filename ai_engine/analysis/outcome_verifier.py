import os
import sys
import json
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

# Load env
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env')
load_dotenv(dotenv_path)

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from analysis.supabase_saver import get_client

# ============================================================
# GNI Outcome Verifier
# Compares GNI predictions against actual market movements
# Implements GPVS — GNI Prediction Validation Standard v1.0
# ============================================================

TICKERS_TO_CHECK = ['SPY', 'GLD', 'USO']


def fetch_price_change(ticker: str, days_ago: int) -> float | None:
    """Fetch actual price change % for a ticker over N days."""
    try:
        import urllib.request
        range_map = {3: '5d', 7: '7d', 14: '1mo'}
        period = range_map.get(days_ago, '7d')
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range={period}"
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read())

        result = data.get('chart', {}).get('result', [])
        if not result:
            return None

        closes = result[0].get('indicators', {}).get('quote', [{}])[0].get('close', [])
        closes = [c for c in closes if c is not None]

        if len(closes) < 2:
            return None

        change_pct = ((closes[-1] - closes[0]) / closes[0]) * 100
        return round(change_pct, 2)

    except Exception as e:
        print(f"  ⚠️  Price fetch failed for {ticker}: {e}")
        return None


def calculate_accuracy_score(
    predicted_sentiment: str,
    spy_change_3d: float | None,
    spy_change_7d: float | None,
    black_swan: bool = False,
    context_credit: bool = False
) -> float:
    """
    Calculate GPVS accuracy score.
    Based on GNI Prediction Validation Standard v1.0:
    - Full credit (1.0): direction correct in 2+ timeframes
    - Partial credit (0.5): direction correct but delayed
    - Context credit (0.25): black swan overrode prediction
    - No credit (0.0): direction wrong, no mitigating factors
    """
    if black_swan or context_credit:
        return 0.25

    if predicted_sentiment is None:
        return 0.0

    is_bearish = predicted_sentiment.lower() == 'bearish'
    is_bullish = predicted_sentiment.lower() == 'bullish'

    correct_3d = False
    correct_7d = False

    if spy_change_3d is not None:
        if is_bearish and spy_change_3d < 0:
            correct_3d = True
        elif is_bullish and spy_change_3d > 0:
            correct_3d = True

    if spy_change_7d is not None:
        if is_bearish and spy_change_7d < 0:
            correct_7d = True
        elif is_bullish and spy_change_7d > 0:
            correct_7d = True

    if correct_3d and correct_7d:
        return 1.0
    elif correct_7d:
        return 0.5  # Delayed effect — partial credit
    elif correct_3d:
        return 0.5
    else:
        return 0.0


def check_human_review_needed(
    predicted_sentiment: str,
    spy_change_3d: float | None,
    accuracy_score: float
) -> bool:
    """Check if human review is needed per GPVS rules."""
    if spy_change_3d is not None and abs(spy_change_3d) > 3.0:
        # Large move — verify if prediction was correct
        return True
    if accuracy_score == 0.0:
        # Prediction was wrong — review why
        return True
    return False


def verify_pending_outcomes():
    """
    Fetch reports that need outcome verification and measure them.
    Runs reports that are 3+ days old and haven't been verified yet.
    """
    client = get_client()
    if not client:
        print("❌ Cannot connect to Supabase")
        return

    print("\n📊 GNI Outcome Verifier — GPVS v1.0")
    print("=" * 50)

    # Get reports that are 3+ days old and not yet verified
    cutoff = (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
    already_verified = client.table('prediction_outcomes').select('report_id').execute()
    verified_ids = {r['report_id'] for r in (already_verified.data or [])}

    reports_result = client.table('reports') \
        .select('id, title, sentiment, risk_level, tickers_affected, created_at') \
        .lte('created_at', cutoff) \
        .order('created_at', desc=True) \
        .limit(20) \
        .execute()

    reports = [r for r in (reports_result.data or []) if r['id'] not in verified_ids]

    if not reports:
        print("  ✅ No pending outcomes to verify")
        return

    print(f"  Found {len(reports)} reports to verify")
    verified_count = 0

    for report in reports:
        print(f"\n  Verifying: {report['title'][:60]}...")
        print(f"  Prediction: {report['sentiment']} | Risk: {report['risk_level']}")

        # Fetch 3-day price changes
        spy_3d = fetch_price_change('SPY', 3)
        gld_3d = fetch_price_change('GLD', 3)
        uso_3d = fetch_price_change('USO', 3)

        # Fetch 7-day price changes
        spy_7d = fetch_price_change('SPY', 7)
        gld_7d = fetch_price_change('GLD', 7)
        uso_7d = fetch_price_change('USO', 7)

        print(f"  SPY: 3d={spy_3d}% / 7d={spy_7d}%")
        print(f"  GLD: 3d={gld_3d}% / 7d={gld_7d}%")
        print(f"  USO: 3d={uso_3d}% / 7d={uso_7d}%")

        # Calculate direction correctness
        sentiment = report.get('sentiment', 'Neutral')
        direction_3d = None
        direction_7d = None

        if spy_3d is not None:
            if sentiment.lower() == 'bearish':
                direction_3d = spy_3d < 0
            elif sentiment.lower() == 'bullish':
                direction_3d = spy_3d > 0

        if spy_7d is not None:
            if sentiment.lower() == 'bearish':
                direction_7d = spy_7d < 0
            elif sentiment.lower() == 'bullish':
                direction_7d = spy_7d > 0

        # Calculate accuracy score
        accuracy = calculate_accuracy_score(sentiment, spy_3d, spy_7d)

        # Check if human review needed
        review_needed = check_human_review_needed(sentiment, spy_3d, accuracy)

        print(f"  Accuracy Score: {accuracy} | Review needed: {review_needed}")

        # Save to prediction_outcomes
        record = {
            'report_id': report['id'],
            'run_at': report['created_at'],
            'predicted_sentiment': sentiment,
            'predicted_risk': report.get('risk_level', ''),
            'tickers_checked': TICKERS_TO_CHECK,
            'spy_change_3d': spy_3d,
            'gld_change_3d': gld_3d,
            'uso_change_3d': uso_3d,
            'direction_correct_3d': direction_3d,
            'spy_change_7d': spy_7d,
            'gld_change_7d': gld_7d,
            'uso_change_7d': uso_7d,
            'direction_correct_7d': direction_7d,
            'accuracy_score': accuracy,
            'human_review_needed': review_needed,
            'black_swan_flag': False,
            'context_credit': False,
            'status': 'measured',
            'measured_at': datetime.now(timezone.utc).isoformat(),
        }

        client.table('prediction_outcomes').insert(record).execute()
        verified_count += 1
        print(f"  ✅ Saved outcome record")

    print(f"\n{'=' * 50}")
    print(f"  Verified: {verified_count} reports")
    print(f"  Done.")


def get_accuracy_summary() -> dict:
    """Get overall GNI prediction accuracy summary."""
    client = get_client()
    if not client:
        return {}

    result = client.table('prediction_outcomes') \
        .select('accuracy_score, direction_correct_3d, direction_correct_7d, predicted_sentiment, measured_at') \
        .eq('status', 'measured') \
        .execute()

    outcomes = result.data or []
    if not outcomes:
        return {'total': 0, 'avg_score': 0, 'directional_3d': 0, 'directional_7d': 0}

    total = len(outcomes)
    avg_score = sum(o['accuracy_score'] or 0 for o in outcomes) / total

    correct_3d = sum(1 for o in outcomes if o.get('direction_correct_3d') is True)
    correct_7d = sum(1 for o in outcomes if o.get('direction_correct_7d') is True)

    has_3d = sum(1 for o in outcomes if o.get('direction_correct_3d') is not None)
    has_7d = sum(1 for o in outcomes if o.get('direction_correct_7d') is not None)

    return {
        'total': total,
        'avg_score': round(avg_score * 100, 1),
        'directional_3d': round((correct_3d / has_3d * 100) if has_3d > 0 else 0, 1),
        'directional_7d': round((correct_7d / has_7d * 100) if has_7d > 0 else 0, 1),
        'pending_review': sum(1 for o in outcomes if o.get('human_review_needed')),
    }


if __name__ == "__main__":
    verify_pending_outcomes()

    print("\n📈 Accuracy Summary:")
    summary = get_accuracy_summary()
    print(f"  Total verified: {summary.get('total', 0)}")
    print(f"  Average GPVS score: {summary.get('avg_score', 0)}%")
    print(f"  3-day directional accuracy: {summary.get('directional_3d', 0)}%")
    print(f"  7-day directional accuracy: {summary.get('directional_7d', 0)}%")
    print(f"  Pending human review: {summary.get('pending_review', 0)}")
