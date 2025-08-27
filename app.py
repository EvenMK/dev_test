import os
from flask import Flask, render_template, request, Response
from flask_caching import Cache
from feeds import get_articles, SOURCES


def create_app() -> Flask:
	app = Flask(__name__)

	# Simple in-memory cache (can be swapped for Redis/Memcached later)
	app.config.update(
		CACHE_TYPE="SimpleCache",
		CACHE_DEFAULT_TIMEOUT=600,
	)
	cache = Cache(app)

	@app.before_request
	def _require_basic_auth():
		# Allow static files without auth
		if request.path.startswith("/static/"):
			return None
		username = os.environ.get("BASIC_AUTH_USER")
		password = os.environ.get("BASIC_AUTH_PASS")
		# Only enforce if both are set
		if not (username and password):
			return None
		auth = request.authorization
		if not auth or auth.type.lower() != "basic" or auth.username != username or auth.password != password:
			resp = Response("Authentication required", 401)
			resp.headers["WWW-Authenticate"] = 'Basic realm="Market News Hub"'
			return resp

	@app.route("/")
	@cache.cached(timeout=600, query_string=True)
	def index():
		source_filter = request.args.get("source") or None
		articles = get_articles(source_filter=source_filter, per_source=30)
		return render_template(
			"index.html",
			articles=articles,
			sources=list(SOURCES.keys()),
			active_source=source_filter,
		)

	return app


app = create_app()


if __name__ == "__main__":
	port = int(os.environ.get("PORT", "5000"))
	# Bind to all interfaces for remote environments
	app.run(host="0.0.0.0", port=port, debug=True)

