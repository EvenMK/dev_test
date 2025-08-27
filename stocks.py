from __future__ import annotations

from typing import List, Dict
from datetime import datetime, timedelta

import pandas as pd
import yfinance as yf
import requests

USER_AGENT = (
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
	"(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

_symbols_cache: Dict[str, object] = {"symbols": None, "ts": None}
_prices_cache: Dict[str, object] = {"data": None, "ts": None}


def get_sp500_symbols(force_refresh: bool = False) -> List[str]:
	global _symbols_cache
	# Cache for 24 hours
	if (
		(not force_refresh)
		and _symbols_cache["symbols"] is not None
		and _symbols_cache["ts"] is not None
		and datetime.utcnow() - _symbols_cache["ts"] < timedelta(hours=24)
	):
		return _symbols_cache["symbols"]

	# Fetch S&P 500 constituents from Wikipedia
	url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
	# Read tables with pandas; first table contains the listing
	resp = requests.get(url, timeout=20, headers={"User-Agent": USER_AGENT})
	resp.raise_for_status()
	tables = pd.read_html(resp.text)
	if not tables:
		raise RuntimeError("Failed to parse S&P 500 table")
	# Commonly the first table has a 'Symbol' column
	df = tables[0]
	symbols = [str(s).strip().upper().replace(".", "-") for s in df["Symbol"].tolist()]

	_symbols_cache = {"symbols": symbols, "ts": datetime.utcnow()}
	return symbols


def get_sp500_prices() -> List[Dict[str, float]]:
	global _prices_cache
	# Cache for 5 minutes
	if _prices_cache["data"] is not None and _prices_cache["ts"] is not None:
		if datetime.utcnow() - _prices_cache["ts"] < timedelta(minutes=5):
			return _prices_cache["data"]

	symbols = get_sp500_symbols()

	# Chunk symbols to avoid overly large requests
	chunk_size = 100
	chunks = [symbols[i:i+chunk_size] for i in range(0, len(symbols), chunk_size)]
	prices: List[Dict[str, float]] = []

	for chunk in chunks:
		data = yf.download(
			tickers=" ".join(chunk),
			period="1d",
			interval="1d",
			threads=True,
			progress=False,
		)
		if data is None or data.empty:
			continue
		if isinstance(data.columns, pd.MultiIndex):
			level0 = list({c[0] for c in data.columns})
			field = "Close" if "Close" in level0 else ("Adj Close" if "Adj Close" in level0 else None)
			if field is None:
				field = level0[0]
			close_df = data[field]
			last_row = close_df.tail(1)
			for sym in last_row.columns:
				try:
					val = float(last_row[sym].iloc[0])
					prices.append({"symbol": sym, "price": round(val, 2)})
				except Exception:
					continue
		else:
			last_row = data.tail(1)
			for sym in last_row.columns:
				try:
					val = float(last_row[sym].iloc[0])
					prices.append({"symbol": sym, "price": round(val, 2)})
				except Exception:
					continue

	# Sort by symbol for deterministic order
	prices.sort(key=lambda x: x["symbol"])
	_prices_cache = {"data": prices, "ts": datetime.utcnow()}
	return prices

