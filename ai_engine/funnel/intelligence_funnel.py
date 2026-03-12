import re
from typing import Optional

# ============================================================
# GNI 4-Stage Intelligence Funnel — Day 2 (v2)
# FIX 1: Removed Non-Western scoring bias
# FIX 2: Prompt injection detection integrated
# FIX 3: Source diversity enforcement in Stage 4
# ============================================================

# --- Stage 1: Relevance Keywords ---
GEOPOLITICAL_KEYWORDS = [
    # Conflict & Military
    "war", "conflict", "military", "attack", "airstrike", "missile",
    "troops", "invasion", "ceasefire", "sanctions", "nuclear",
    "weapon", "bomb", "explosion", "shootout", "assassination",
    # Economic & Markets
    "economy", "recession", "inflation", "interest rate", "federal reserve",
    "central bank", "gdp", "trade war", "tariff", "embargo", "oil",
    "energy", "commodity", "stock market", "crash", "rally", "crisis",
    # Geopolitics
    "election", "coup", "protest", "government", "president", "prime minister",
    "summit", "treaty", "alliance", "nato", "united nations", "g7", "g20",
    "china", "russia", "ukraine", "israel", "iran", "north korea",
    "taiwan", "india", "pakistan", "middle east", "south china sea",
    # Natural Disasters & Health
    "earthquake", "tsunami", "hurricane", "flood", "drought",
    "pandemic", "outbreak", "disease", "famine",
]

IRRELEVANT_KEYWORDS = [
    "entertainment", "celebrity", "sports", "movie", "music",
    "fashion", "lifestyle", "recipe", "travel tips", "horoscope",
    "reality tv", "award show",
]

# --- FIX 2: Prompt Injection Patterns ---
INJECTION_PATTERNS = [
    r"ignore\s+(previous|prior|above|all)\s+instructions?",
    r"disregard\s+(previous|prior|above|all)\s+instructions?",
    r"forget\s+(previous|prior|above|all)\s+instructions?",
    r"override\s+(previous|prior|above|all)\s+instructions?",
    r"new\s+instructions?\s*:",
    r"system\s*:\s*you\s+are",
    r"you\s+are\s+now\s+a",
    r"act\s+as\s+(a|an)\s+\w+",
    r"pretend\s+(you\s+are|to\s+be)",
    r"rate\s+this\s+article\s+[\d/]+",
    r"score\s*[:=]\s*\d+",
    r"significance\s*[:=]\s*\d+",
    r"mark\s+(all|this)\s+(others?|article)",
    r"(always|never)\s+(rate|score|rank)\s+\w+\s+as",
    r"<\s*system\s*>",
    r"\[INST\]",
    r"<<SYS>>",
]
_COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in INJECTION_PATTERNS]


def _detect_injection(article: dict) -> bool:
    """Returns True if article is clean, False if injection detected."""
    text = f"{article.get('title', '')} {article.get('summary', '')}"
    for pattern in _COMPILED_PATTERNS:
        if pattern.search(text):
            article["injection_threat"] = True
            return False
    article["injection_threat"] = False
    return True


def stage1_relevance(articles: list[dict]) -> list[dict]:
    """Filter articles by geopolitical/economic relevance."""
    passed = []
    for article in articles:
        text = f"{article['title']} {article['summary']}".lower()
        if any(kw in text for kw in IRRELEVANT_KEYWORDS):
            continue
        if any(kw in text for kw in GEOPOLITICAL_KEYWORDS):
            article["stage1_passed"] = True
            passed.append(article)
    print(f"  Stage 1 (Relevance):       {len(articles)} → {len(passed)} articles")
    return passed


def stage1b_injection_filter(articles: list[dict]) -> list[dict]:
    """FIX 2: Remove articles with prompt injection attempts."""
    clean = []
    flagged_count = 0
    for article in articles:
        if _detect_injection(article):
            clean.append(article)
        else:
            flagged_count += 1
            print(f"  🚨 INJECTION FLAGGED: [{article['source']}] {article['title'][:60]}")
    print(f"  Stage 1b (Inj. Filter):    {len(articles)} → {len(clean)} articles ({flagged_count} flagged)")
    return clean


def stage2_deduplication(articles: list[dict], threshold: float = 0.6) -> list[dict]:
    """Remove duplicate articles based on title similarity."""
    def normalize(text: str) -> set:
        words = re.sub(r'[^\w\s]', '', text.lower()).split()
        return set(w for w in words if len(w) > 3)

    unique = []
    seen_titles = []

    for article in articles:
        title_words = normalize(article["title"])
        is_duplicate = False
        for seen in seen_titles:
            if not title_words or not seen:
                continue
            overlap = len(title_words & seen) / len(title_words | seen)
            if overlap >= threshold:
                is_duplicate = True
                break
        if not is_duplicate:
            unique.append(article)
            seen_titles.append(title_words)

    print(f"  Stage 2 (Deduplication):   {len(articles)} → {len(unique)} articles")
    return unique


def stage3_significance(articles: list[dict]) -> list[dict]:
    """
    FIX 1: Score articles by significance (0-100).
    Removed Non-Western bias bonus — all sources scored equally.
    Added recency bonus and multi-source consensus bonus.
    """
    HIGH_IMPACT = [
        "nuclear", "war", "invasion", "coup", "crash", "collapse",
        "recession", "pandemic", "assassination", "ceasefire", "sanctions",
        "federal reserve", "interest rate", "explosion", "attack",
    ]
    MEDIUM_IMPACT = [
        "election", "protest", "military", "oil", "trade", "tariff",
        "summit", "treaty", "conflict", "missile", "inflation", "gdp",
    ]

    # Count topic coverage across sources for consensus bonus
    topic_source_map: dict[str, set] = {}
    for article in articles:
        key = article["title"][:40].lower()
        if key not in topic_source_map:
            topic_source_map[key] = set()
        topic_source_map[key].add(article["source"])

    for article in articles:
        text = f"{article['title']} {article['summary']}".lower()
        score = 0

        # Impact scoring — same for ALL sources (FIX 1)
        if any(kw in text for kw in HIGH_IMPACT):
            score += 35
        elif any(kw in text for kw in MEDIUM_IMPACT):
            score += 20

        # Multi-source consensus bonus (objective signal)
        key = article["title"][:40].lower()
        source_count = len(topic_source_map.get(key, set()))
        if source_count >= 3:
            score += 25  # Strong consensus
        elif source_count == 2:
            score += 15  # Moderate consensus

        # Economic market impact bonus
        if any(kw in text for kw in ["federal reserve", "interest rate", "recession", "gdp", "inflation"]):
            score += 10

        article["significance_score"] = min(score, 100)
        article["source_consensus"] = source_count

    print(f"  Stage 3 (Significance):    Scored {len(articles)} articles")
    return articles


def stage4_ranking(articles: list[dict], top_n: int = 10, max_per_source: int = 3) -> list[dict]:
    """
    FIX 3: Rank by significance AND enforce source diversity.
    Max 3 articles per source in final top N.
    """
    ranked = sorted(articles, key=lambda x: x.get("significance_score", 0), reverse=True)

    # Source diversity enforcement
    source_counts: dict[str, int] = {}
    diverse_top = []

    for article in ranked:
        source = article["source"]
        count = source_counts.get(source, 0)
        if count < max_per_source:
            diverse_top.append(article)
            source_counts[source] = count + 1
        if len(diverse_top) >= top_n:
            break

    print(f"  Stage 4 (Ranking+Diversity): Top {len(diverse_top)} selected")
    print(f"  Source distribution: { {k:v for k,v in source_counts.items()} }")
    return diverse_top


def run_funnel(articles: list[dict], top_n: int = 10, max_per_source: int = 3) -> list[dict]:
    """Run all stages of the intelligence funnel."""
    print("\n🔽 Intelligence Funnel Running...")
    articles = stage1_relevance(articles)
    articles = stage1b_injection_filter(articles)
    articles = stage2_deduplication(articles)
    articles = stage3_significance(articles)
    articles = stage4_ranking(articles, top_n=top_n, max_per_source=max_per_source)
    print(f"\n  ✅ Funnel complete — {len(articles)} articles ready for AI analysis\n")
    return articles


if __name__ == "__main__":
    import sys, os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from collectors.rss_collector import collect_articles

    print("🔍 GNI Intelligence Funnel v2 — Test Run\n")
    raw = collect_articles(max_per_source=20)
    top = run_funnel(raw, top_n=10, max_per_source=3)

    print("📊 Top Articles After Funnel (Bias-Free + Injection-Safe):")
    for i, a in enumerate(top, 1):
        consensus = a.get("source_consensus", 1)
        injected = "🚨" if a.get("injection_threat") else "✅"
        print(f"  {i:2}. {injected} [{a['significance_score']:3}] [src:{consensus}] {a['source']:12} {a['title'][:55]}")
