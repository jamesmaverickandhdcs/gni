import os
import time
import sys
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

# Add ai_engine to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from collectors.rss_collector import collect_articles
from funnel.intelligence_funnel import run_funnel
from analysis.nexus_analyzer import analyze
from analysis.supabase_saver import save_report, save_runtime_log

# ============================================================
# GNI Main Pipeline — Day 2
# Full orchestration: RSS → Funnel → AI → Supabase
# Designed to run via GitHub Actions 2x daily
# ============================================================

def run_pipeline():
    """Run the complete GNI intelligence pipeline."""
    run_start = datetime.now(timezone.utc)
    run_at = run_start.isoformat()
    step_timings = {}
    status = "success"
    error_message = ""
    articles_collected = 0
    articles_after_funnel = 0
    reports_saved = 0

    print("=" * 60)
    print("🌐 GNI — Global Nexus Insights")
    print(f"   Pipeline Start: {run_at}")
    print("=" * 60)

    try:
        # ── STEP 1: Collect Articles ──────────────────────────
        print("\n📡 Step 1: Collecting RSS Articles...")
        t0 = time.time()
        articles = collect_articles(max_per_source=20)
        step_timings["collection"] = round(time.time() - t0, 2)
        articles_collected = len(articles)

        if articles_collected < 10:
            raise Exception(f"Too few articles collected: {articles_collected}")

        # ── STEP 2: Intelligence Funnel ───────────────────────
        print("\n🔽 Step 2: Running Intelligence Funnel...")
        t0 = time.time()
        top_articles = run_funnel(articles, top_n=10, max_per_source=3)
        step_timings["funnel"] = round(time.time() - t0, 2)
        articles_after_funnel = len(top_articles)

        if articles_after_funnel < 3:
            raise Exception(f"Too few articles after funnel: {articles_after_funnel}")

        # ── STEP 3: AI Analysis ───────────────────────────────
        print("\n🧠 Step 3: AI Analysis (Llama 3)...")
        t0 = time.time()
        report = analyze(top_articles)
        step_timings["analysis"] = round(time.time() - t0, 2)

        if not report:
            raise Exception("AI analysis returned no report")

        # ── STEP 4: Save to Supabase ──────────────────────────
        print("\n💾 Step 4: Saving to Supabase...")
        t0 = time.time()
        report_id = save_report(report, top_articles)
        step_timings["save"] = round(time.time() - t0, 2)

        if report_id:
            reports_saved = 1

    except Exception as e:
        status = "failed"
        error_message = str(e)
        print(f"\n❌ Pipeline error: {e}")

    finally:
        # ── STEP 5: Save Runtime Log ──────────────────────────
        total_seconds = round((datetime.now(timezone.utc) - run_start).total_seconds(), 2)
        print(f"\n📊 Step 5: Saving Runtime Log...")
        save_runtime_log(
            run_at=run_at,
            total_seconds=total_seconds,
            articles_collected=articles_collected,
            articles_after_funnel=articles_after_funnel,
            reports_saved=reports_saved,
            step_timings=step_timings,
            status=status,
            error_message=error_message,
        )

        # ── SUMMARY ───────────────────────────────────────────
        print("\n" + "=" * 60)
        print(f"  Status:            {status.upper()}")
        print(f"  Total Time:        {total_seconds}s")
        print(f"  Articles Collected:{articles_collected}")
        print(f"  After Funnel:      {articles_after_funnel}")
        print(f"  Reports Saved:     {reports_saved}")
        print(f"  Step Timings:      {step_timings}")
        print("=" * 60)

        return status == "success"


if __name__ == "__main__":
    success = run_pipeline()
    sys.exit(0 if success else 1)