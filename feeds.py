from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Dict, Iterable, List, Optional

import feedparser
import requests


USER_AGENT = (
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
	"(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


# News sources and their RSS feeds. Some sites expose multiple feeds; include a few.
SOURCES: Dict[str, List[str]] = {
	"WSJ": [
		"https://feeds.a.dj.com/rss/RSSWorldNews.xml",
		"https://feeds.a.dj.com/rss/RSSMarketsMain.xml",
	],
	"Bloomberg": [
		# Bloomberg's RSS inventory changes periodically; this feed is generally available
		"https://www.bloomberg.com/politics/feeds/site.xml",
	],
	"Financial Times": [
		"https://www.ft.com/?format=rss",
	],
	"The Economist": [
		"https://www.economist.com/latest/rss.xml",
	],
}


@dataclass
class Article:
	"""Normalized article record for the UI."""

	title: str
	link: str
	source: str
	published: Optional[datetime]
	summary: Optional[str]
	image: Optional[str]


def _http_get(url: str) -> Optional[bytes]:
	try:
		resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=10)
		if resp.status_code != 200:
			logging.warning("Non-200 from %s: %s", url, resp.status_code)
			return None
		return resp.content
	except requests.RequestException as exc:
		logging.warning("Request failed for %s: %s", url, exc)
		return None


def _parse_datetime(entry) -> Optional[datetime]:
	# Try multiple standard fields
	for key in ("published", "updated", "created"):
		value = entry.get(key)
		if value:
			try:
				dt = parsedate_to_datetime(value)
				# Ensure timezone-aware
				if dt.tzinfo is None:
					dt = dt.replace(tzinfo=timezone.utc)
				return dt
			except Exception:
				continue
	# feedparser may also provide *_parsed structs
	for key in ("published_parsed", "updated_parsed"):
		value = entry.get(key)
		if value:
			try:
				return datetime(*value[:6], tzinfo=timezone.utc)
			except Exception:
				continue
	return None


def _extract_image(entry) -> Optional[str]:
	# Common places RSS embeds images
	for key in ("media_content", "media_thumbnail"):
		items = entry.get(key)
		if isinstance(items, list) and items:
			first = items[0]
			if isinstance(first, dict):
				url = first.get("url") or first.get("href")
				if url:
					return url
	# Some feeds put image in links
	links = entry.get("links")
	if isinstance(links, list):
		for link in links:
			if link.get("type", "").startswith("image/"):
				return link.get("href")
	return None


def _normalize_entry(entry, source: str) -> Article:
	return Article(
		title=entry.get("title", "Untitled"),
		link=entry.get("link", ""),
		source=source,
		published=_parse_datetime(entry),
		summary=entry.get("summary"),
		image=_extract_image(entry),
	)


def _fetch_feed(url: str, source: str) -> Iterable[Article]:
	data = _http_get(url)
	if not data:
		return []
	feed = feedparser.parse(data)
	entries = getattr(feed, "entries", []) or []
	return [_normalize_entry(e, source) for e in entries]


def get_articles(source_filter: Optional[str] = None, per_source: int = 30) -> List[Article]:
	articles: List[Article] = []
	for source, urls in SOURCES.items():
		if source_filter and source != source_filter:
			continue
		collected_for_source = 0
		for url in urls:
			for art in _fetch_feed(url, source):
				articles.append(art)
				collected_for_source += 1
				if collected_for_source >= per_source:
					break
			if collected_for_source >= per_source:
				break

	# De-duplicate by link, keep the latest occurrence
	seen = set()
	unique: List[Article] = []
	for art in sorted(
		articles,
		key=lambda a: (
			(a.published or datetime.min.replace(tzinfo=timezone.utc)),
			(a.title or ""),
		),
		reverse=True,
	):
		if art.link and art.link in seen:
			continue
		seen.add(art.link)
		unique.append(art)

	return unique

