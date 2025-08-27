
# Even News

A Flask-powered news aggregator for WSJ, Bloomberg, Financial Times, and The Economist via RSS. Includes two themes: Light and Neon.

## Quickstart

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

If your system lacks `venv`, you can install dependencies user-wide and run:

```bash
python3 -m pip install --user -r requirements.txt
python3 app.py
```

Open `http://localhost:5000` and use the header buttons to switch themes. Use the source filter dropdown to narrow results.

## Configuration
- Edit `feeds.py` to adjust `SOURCES` and feed URLs.
- Caching defaults to 10 minutes (in-memory). Change in `app.py` or swap to Redis/Memcached via Flask-Caching.

## Production
```bash
gunicorn 'app:app' --bind 0.0.0.0:8000
```

To enable Redis cache, set the cache type and connection info in environment or app config: `CACHE_TYPE=RedisCache`, `CACHE_REDIS_HOST`, `CACHE_REDIS_PORT`.

