import os
import time
import sys
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from collectors.rss_collector import collect_articles
from funnel.intelligence_funnel import run_funnel
from analysis.nexus_analyzer import analyze
from analysis.supabase_saver import (
    save_report,
    save_pipeline_run,
    save_pipeline_articles,
    save_runtime_log,
)
from notifications.telegram_notifier import notify_report

# ============================================================
# GNI Main Pipeline — Day 6
# Now saves full article trace for Explainable AI
# ============================================================

GITHUB_ACTIONS = os.getenv("GITHUB_ACTIONS", "false").lower() == "true"


def run_pipeline():
    run_start = datetime.now(timezone.utc)
    run_at = run_start.isoformat()
    step_timings = {}
    status = "success"
    error_message = ""
    articles_collected = 0
    articles_after_funnel = 0
    reports_saved = 0
    report_id = None
    run_id = None
    trace = []
    report = None

    print("=" * 60)
    print("🌐 GNI — Global Nexus Insights")
    print(f"   Pipeline Start: {run_at}")
    print("=" * 60)

    try:
        # ── Step 1: Collect Articles ────────────────────────
        print("\n📡 Step 1: Collecting RSS Articles...")
        t0 = time.time()
        articles = collect_articles(max_per_source=20)
        step_timings["collection"] = round(time.time() - t0, 2)
        articles_collected = len(articles)

        if articles_collected < 10:
            raise Exception(f"Too few articles: {articles_collected}")

        # ── Step 2: Intelligence Funnel ─────────────────────
        print("\n🔽 Step 2: Running Intelligence Funnel...")
        t0 = time.time()
        top_n = 5 if GITHUB_ACTIONS else 10
        top_articles, trace = run_funnel(
            articles,
            top_n=top_n,
            max_per_source=3
        )
        step_timings["funnel"] = round(time.time() - t0, 2)
        articles_after_funnel = len(top_articles)

        # Count funnel stages
        total_after_relevance = len([a for a in trace if a.get("stage1_passed")])
        total_after_dedup = len([a for a in trace if a.get("stage2_passed")])

        if articles_after_funnel < 3:
            raise Exception(f"Too few after funnel: {articles_after_funnel}")

        # ── Step 3: AI Analysis ─────────────────────────────
        print("\n🧠 Step 3: AI Analysis (Llama 3)...")
        t0 = time.time()
        report = analyze(top_articles)
        step_timings["analysis"] = round(time.time() - t0, 2)

        if not report:
            raise Exception("AI analysis returned no report")

        # ── Step 4: Save Report ─────────────────────────────
        print("\n💾 Step 4: Saving Report to Supabase...")
        t0 = time.time()
        report_id = save_report(report, top_articles)
        step_timings["save"] = round(time.time() - t0, 2)

        if report_id:
            reports_saved = 1

        # ── Step 5: Save Pipeline Run ───────────────────────
        print("\n📊 Step 5: Saving Pipeline Run & Article Trace...")
        total_seconds_so_far = round(
            (datetime.now(timezone.utc) - run_start).total_seconds(), 2
        )
        run_id = save_pipeline_run(
            run_at=run_at,
            report_id=report_id,
            total_collected=articles_collected,
            total_after_relevance=total_after_relevance,
            total_after_dedup=total_after_dedup,
            total_after_funnel=articles_after_funnel,
            llm_source=report.get("llm_source", "unknown") if report else "unknown",
            status="success",
            duration_seconds=total_seconds_so_far,
        )

        if run_id and trace:
            save_pipeline_articles(run_id, trace)

        # ── Step 6: Telegram Notification ──────────────────
        print("\n📱 Step 6: Sending Telegram Notification...")
        if report and report_id:
            notify_report(report)

    except Exception as e:
        status = "failed"
        error_message = str(e)
        print(f"\n❌ Pipeline error: {e}")

    finally:
        # ── Step 7: Save Runtime Log ────────────────────────
        total_seconds = round(
            (datetime.now(timezone.utc) - run_start).total_seconds(), 2
        )
        print(f"\n📋 Step 7: Saving Runtime Log...")
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

        print("\n" + "=" * 60)
        print(f"  Status:             {status.upper()}")
        print(f"  Total Time:         {total_seconds}s")
        print(f"  Articles Collected: {articles_collected}")
        print(f"  After Funnel:       {articles_after_funnel}")
        print(f"  Reports Saved:      {reports_saved}")
        print(f"  Pipeline Run ID:    {run_id[:8] if run_id else 'N/A'}...")
        print(f"  Article Trace:      {len(trace)} articles documented")
        print(f"  Step Timings:       {step_timings}")
        print("=" * 60)

        return status == "success"


if __name__ == "__main__":
    success = run_pipeline()
    sys.exit(0 if success else 1)