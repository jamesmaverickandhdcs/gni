import os
import json
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(override=False)

# ============================================================
# GNI Supabase Saver — Day 2
# Saves AI-generated reports to Supabase PostgreSQL
# ============================================================

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

_client: Client | None = None


def get_client() -> Client | None:
    """Get or create Supabase client."""
    global _client
    if _client:
        return _client
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("  ⚠️  Supabase credentials not found in .env")
        return None
    try:
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        return _client
    except Exception as e:
        print(f"  ❌ Supabase connection failed: {e}")
        return None


def save_report(report: dict, articles: list[dict]) -> str | None:
    """
    Save a GNI report to Supabase reports table.
    Returns the saved report ID or None on failure.
    """
    client = get_client()
    if not client:
        return None

    try:
        # Geocode primary location
        lat, lng = None, None
        location_name = report.get("location_name", "")
        if location_name:
            import sys, os
            sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            from geo.geocoder import geocode
            geo = geocode(location_name)
            if geo:
                lat = geo["lat"]
                lng = geo["lng"]

        # Build record
        record = {
            "title": report.get("title", "Untitled Report"),
            "summary": report.get("summary", ""),
            "myanmar_summary": report.get("myanmar_summary", ""),
            "full_analysis": json.dumps(report),
            "source_consensus_score": float(report.get("source_consensus_score", 0.0)),
            "sentiment": report.get("sentiment", "Neutral"),
            "sentiment_score": float(report.get("sentiment_score", 0.0)),
            "lat": lat,
            "lng": lng,
            "location_name": location_name,
            "sources": json.dumps(report.get("sources_used", [])),
            "tickers_affected": report.get("tickers_affected", []),
        }

        result = client.table("reports").insert(record).execute()

        if result.data:
            report_id = result.data[0]["id"]
            print(f"  ✅ Report saved to Supabase: {report_id[:8]}...")
            return report_id
        else:
            print(f"  ❌ Supabase insert returned no data")
            return None

    except Exception as e:
        print(f"  ❌ Failed to save report: {e}")
        return None


def save_runtime_log(
    run_at: str,
    total_seconds: float,
    articles_collected: int,
    articles_after_funnel: int,
    reports_saved: int,
    step_timings: dict,
    status: str,
    error_message: str = ""
) -> bool:
    """Save pipeline runtime log to Supabase."""
    client = get_client()
    if not client:
        return False

    try:
        record = {
            "run_at": run_at,
            "total_duration_seconds": total_seconds,
            "articles_collected": articles_collected,
            "articles_after_funnel": articles_after_funnel,
            "reports_saved": reports_saved,
            "step_timings": json.dumps(step_timings),
            "status": status,
            "error_message": error_message,
        }
        client.table("runtime_logs").insert(record).execute()
        print(f"  ✅ Runtime log saved ({status})")
        return True

    except Exception as e:
        print(f"  ❌ Failed to save runtime log: {e}")
        return False


if __name__ == "__main__":
    import sys, os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from collectors.rss_collector import collect_articles
    from funnel.intelligence_funnel import run_funnel
    from analysis.nexus_analyzer import analyze

    print("💾 GNI Supabase Saver — Test Run\n")

    # Check connection
    client = get_client()
    if not client:
        print("❌ Cannot connect to Supabase — check .env file")
        exit(1)
    print("  ✅ Supabase connected\n")

    # Run full pipeline
    raw = collect_articles(max_per_source=20)
    top = run_funnel(raw, top_n=10, max_per_source=3)

    print("\n🔬 Analyzing...")
    report = analyze(top)

    if report:
        print("\n💾 Saving to Supabase...")
        report_id = save_report(report, top)
        if report_id:
            print(f"\n  ✅ Full pipeline complete!")
            print(f"  Report ID: {report_id}")
        else:
            print("\n  ❌ Save failed")
    else:
        print("  ❌ Analysis failed")