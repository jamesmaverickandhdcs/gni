import os
import json
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(override=False)

# ============================================================
# GNI Supabase Saver — Day 6
# Now saves pipeline runs + full article trace
# ============================================================

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

_client: Client | None = None


def get_client() -> Client | None:
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
    """Save a GNI report to Supabase reports table."""
    client = get_client()
    if not client:
        return None

    try:
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
            "market_impact": report.get("market_impact", ""),
            "risk_level": report.get("risk_level", "Medium"),
            "llm_source": report.get("llm_source", ""),
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


def save_pipeline_run(
    run_at: str,
    report_id: str | None,
    total_collected: int,
    total_after_relevance: int,
    total_after_dedup: int,
    total_after_funnel: int,
    llm_source: str,
    status: str,
    duration_seconds: float,
) -> str | None:
    """Save a pipeline run record. Returns run_id or None."""
    client = get_client()
    if not client:
        return None

    try:
        record = {
            "run_at": run_at,
            "report_id": report_id,
            "total_collected": total_collected,
            "total_after_relevance": total_after_relevance,
            "total_after_dedup": total_after_dedup,
            "total_after_funnel": total_after_funnel,
            "llm_source": llm_source,
            "status": status,
            "duration_seconds": duration_seconds,
        }
        result = client.table("pipeline_runs").insert(record).execute()
        if result.data:
            run_id = result.data[0]["id"]
            print(f"  ✅ Pipeline run saved: {run_id[:8]}...")
            return run_id
        return None
    except Exception as e:
        print(f"  ❌ Failed to save pipeline run: {e}")
        return None


def save_pipeline_articles(run_id: str, trace: list[dict]) -> bool:
    """Save full article trace to pipeline_articles table."""
    client = get_client()
    if not client:
        return False

    try:
        records = []
        for art in trace:
            records.append({
                "run_id": run_id,
                "source": art.get("source", ""),
                "bias": art.get("bias", ""),
                "title": art.get("title", ""),
                "url": art.get("link") or art.get("url", ""),
                "summary": (art.get("summary", "") or "")[:500],
                "published_at": str(art.get("published", "")),
                "stage1_passed": art.get("stage1_passed", False),
                "stage1_reason": art.get("stage1_reason", ""),
                "stage1b_passed": art.get("stage1b_passed", True),
                "stage1b_reason": art.get("stage1b_reason", ""),
                "stage2_passed": art.get("stage2_passed", True),
                "stage2_reason": art.get("stage2_reason", ""),
                "stage3_score": float(art.get("stage3_score", 0.0)),
                "stage4_selected": art.get("stage4_selected", False),
                "stage4_rank": art.get("stage4_rank", None),
            })

        # Insert in batches of 50
        batch_size = 50
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            client.table("pipeline_articles").insert(batch).execute()

        print(f"  ✅ Article trace saved: {len(records)} articles")
        return True

    except Exception as e:
        print(f"  ❌ Failed to save article trace: {e}")
        return False
    
def save_article_events(
    run_id: str,
    report_id: str | None,
    articles: list[dict]
) -> bool:
    """Save top selected articles to article_events table for map pins."""
    client = get_client()
    if not client:
        return False

    try:
        import sys, os
        sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from geo.geocoder import geocode

        records = []
        for art in articles:
            # Only save selected articles (top 5-10)
            if not art.get("stage4_selected"):
                continue

            # Geocode article location from title/summary
            location_name = _extract_location(art)
            lat, lng = None, None
            if location_name:
                geo = geocode(location_name)
                if geo:
                    lat = geo["lat"]
                    lng = geo["lng"]

            records.append({
                "run_id": run_id,
                "report_id": report_id,
                "source": art.get("source", ""),
                "bias": art.get("bias", ""),
                "title": art.get("title", ""),
                "url": art.get("link") or art.get("url", ""),
                "summary": (art.get("summary", "") or "")[:500],
                "stage3_score": float(art.get("stage3_score", 0)),
                "stage4_rank": art.get("stage4_rank"),
                "location_name": location_name,
                "lat": lat,
                "lng": lng,
            })

        if records:
            client.table("article_events").insert(records).execute()
            print(f"  ✅ Article events saved: {len(records)} pins")

        return True

    except Exception as e:
        print(f"  ❌ Failed to save article events: {e}")
        return False


def _extract_location(article: dict) -> str | None:
    """Extract primary location from article title and summary."""
    text = f"{article.get('title', '')} {article.get('summary', '')}".lower()

    # Known locations in priority order
    locations = [
        "Israel", "Iran", "Ukraine", "Russia", "China", "Taiwan",
        "Gaza", "Lebanon", "Syria", "Iraq", "Saudi Arabia", "Yemen",
        "North Korea", "South Korea", "Japan", "India", "Pakistan",
        "United States", "Washington", "Europe", "Middle East",
        "Sudan", "Ethiopia", "Somalia", "Myanmar", "Afghanistan",
    ]

    for loc in locations:
        if loc.lower() in text:
            return loc

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