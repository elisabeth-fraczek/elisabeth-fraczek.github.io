#!/usr/bin/env python3
"""Resolve Wikipedia article titles and save three complete months of pageviews."""

import argparse
import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

DATA_DIR = Path(__file__).resolve().parents[1] / "game" / "data"
PROJECT = "en.wikipedia"
ACTION_API = "https://en.wikipedia.org/w/api.php"
PAGEVIEWS_API = "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article"
USER_AGENT = "VebitaConnections/1.0 (https://elisabeth-fraczek.github.io/senckenberg/)"


def read_api(url):
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    with urlopen(request, timeout=25) as response:
        return json.load(response)


def resolve_articles(titles):
    articles = {}
    # The Action API accepts up to 50 titles per anonymous request.
    for offset in range(0, len(titles), 50):
        batch = titles[offset : offset + 50]
        params = urlencode({
            "action": "query",
            "titles": "|".join(batch),
            "redirects": "1",
            "prop": "info|pageprops",
            "ppprop": "disambiguation",
            "inprop": "url",
            "format": "json",
            "formatversion": "2",
        })
        query = read_api(f"{ACTION_API}?{params}")["query"]
        redirects = {
            item["from"]: item["to"]
            for field in ("normalized", "redirects")
            for item in query.get(field, [])
        }
        pages = {page["title"]: page for page in query["pages"]}
        for title in batch:
            canonical = title
            while canonical in redirects:
                canonical = redirects[canonical]
            page = pages.get(canonical, {})
            if "fullurl" not in page or "disambiguation" in page.get("pageprops", {}):
                raise ValueError(f"Choose a specific Wikipedia article for {title!r}.")
            articles[title] = {"title": canonical, "url": page["fullurl"]}
    return articles


def previous_month(first_day):
    return (first_day - timedelta(days=1)).replace(day=1)


def monthly_views(title, months, last_day):
    slug = quote(title.replace(" ", "_"), safe="")
    start = months[0].strftime("%Y%m%d")
    end = last_day.strftime("%Y%m%d")
    url = f"{PAGEVIEWS_API}/{PROJECT}/all-access/user/{slug}/monthly/{start}/{end}"
    items = read_api(url)["items"]
    counts = {item["timestamp"][:8]: item["views"] for item in items}
    expected = {month.strftime("%Y%m%d") for month in months}
    if set(counts) != expected or any(type(count) is not int or count < 0 for count in counts.values()):
        raise ValueError(f"Incomplete pageview data for {title!r}.")
    return sum(counts.values())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--end-month", help="Last complete month to include, in YYYY-MM format.")
    args = parser.parse_args()

    current_month = datetime.now(timezone.utc).date().replace(day=1)
    end_month = date.fromisoformat(f"{args.end_month}-01") if args.end_month else previous_month(current_month)
    if end_month >= current_month:
        parser.error("--end-month must be a complete month in UTC.")
    next_month = (end_month.replace(day=28) + timedelta(days=4)).replace(day=1)
    last_day = next_month - timedelta(days=1)
    months = [previous_month(previous_month(end_month)), previous_month(end_month), end_month]

    rounds = json.loads((DATA_DIR / "questions.json").read_text(encoding="utf-8"))
    titles = sorted({answer["article"] for item in rounds for answer in item["answers"]})
    articles = resolve_articles(titles)
    totals = {}
    for article in articles.values():
        title = article["title"]
        if title not in totals:
            totals[title] = monthly_views(title, months, last_day)
            print(f"{title}: {totals[title]:,}", flush=True)
        article["views"] = totals[title]

    snapshot = {
        "project": PROJECT,
        "start": months[0].isoformat(),
        "end": last_day.isoformat(),
        "articles": articles,
    }
    # Keep the previous playable snapshot if any request fails.
    temporary = DATA_DIR / "pageviews.tmp"
    temporary.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(DATA_DIR / "pageviews.json")
    print(f"Saved {len(articles)} articles for {snapshot['start']} through {snapshot['end']}.")


if __name__ == "__main__":
    main()
