import feedparser
import hashlib
from datetime import datetime, timezone
from typing import Optional

# ============================================================
# GNI RSS Collector — Day 2
# Collects articles from 5 verified RSS sources
# ============================================================

SOURCES = [
    {
        "name": "Al Jazeera",
        "url": "https://www.aljazeera.com/xml/rss/all.xml",
        "bias": "Non-Western"
    },
    {
        "name": "CNN",
        "url": "http://rss.cnn.com/rss/edition.rss",
        "bias": "Western Liberal"
    },
    {
        "name": "Fox News",
        "url": "https://moxie.foxnews.com/google-publisher/world.xml",
        "bias": "Western Conservative"
    },
    {
        "name": "BBC",
        "url": "https://feeds.bbci.co.uk/news/world/rss.xml",
        "bias": "Western Liberal"
    },
    {
        "name": "DW News",
        "url": "https://rss.dw.com/xml/rss-en-world",
        "bias": "Western Liberal"
    },
]

def make_id(title: str, source: str) -> str:
    """Generate unique article ID from title + source."""
    raw = f"{source}:{title}".encode("utf-8")
    return hashlib.md5(raw).hexdigest()

def parse_date(entry) -> str:
    """Extract published date from RSS entry."""
    if hasattr(entry, "published_parsed") and entry.published_parsed:
        dt = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
        return dt.isoformat()
    return datetime.now(timezone.utc).isoformat()

def collect_articles(max_per_source: int = 20) -> list[dict]:
    """
    Collect articles from all RSS sources.
    Returns list of article dicts.
    """
    articles = []
    seen_ids = set()

    for source in SOURCES:
        try:
            print(f"  Fetching: {source['name']}...")
            feed = feedparser.parse(source["url"])

            if feed.bozo and not feed.entries:
                print(f"  ⚠️  {source['name']}: Feed error — skipping")
                continue

            count = 0
            for entry in feed.entries[:max_per_source]:
                title = entry.get("title", "").strip()
                summary = entry.get("summary", "").strip()
                link = entry.get("link", "").strip()

                if not title:
                    continue

                article_id = make_id(title, source["name"])
                if article_id in seen_ids:
                    continue
                seen_ids.add(article_id)

                articles.append({
                    "id": article_id,
                    "title": title,
                    "summary": summary,
                    "link": link,
                    "source": source["name"],
                    "bias": source["bias"],
                    "published_at": parse_date(entry),
                    "collected_at": datetime.now(timezone.utc).isoformat(),
                })
                count += 1

            print(f"  ✅ {source['name']}: {count} articles")

        except Exception as e:
            print(f"  ❌ {source['name']}: {e}")
            continue

    print(f"\n  Total collected: {len(articles)} articles")
    return articles


if __name__ == "__main__":
    print("🔍 GNI RSS Collector — Test Run\n")
    articles = collect_articles(max_per_source=5)
    if articles:
        print(f"\n📰 Sample article:")
        a = articles[0]
        print(f"  Source:  {a['source']} ({a['bias']})")
        print(f"  Title:   {a['title'][:80]}")
        print(f"  Date:    {a['published_at']}")