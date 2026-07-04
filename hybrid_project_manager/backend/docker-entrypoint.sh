#!/bin/bash
set -e

echo "⏳ Waiting for PostgreSQL..."
while ! nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
  sleep 1
done
echo "✅ PostgreSQL is ready"

echo "⏳ Waiting for Redis..."
while ! nc -z "${REDIS_HOST:-redis}" "${REDIS_PORT:-6379}" 2>/dev/null; do
  sleep 1
done
echo "✅ Redis is ready"

# ─── Auto-migration ───
echo "🗃️  Running migrate..."
python manage.py migrate --noinput
python manage.py migrate --noinput

echo "📂 Collecting static files..."
python manage.py collectstatic --noinput --clear 2>/dev/null || true

# ─── Pick the right server based on WORKER_TYPE ───
if [ "$WORKER_TYPE" = "celery" ]; then
  echo "⚡ Starting Celery worker..."
  exec celery -A config worker -l INFO --concurrency="${CELERY_CONCURRENCY:-4}"
elif [ "$WORKER_TYPE" = "beat" ]; then
  echo "⏰ Starting Celery beat..."
  exec celery -A config beat -l INFO
else
  echo "🚀 Starting Django (ASGI via Daphne) on 0.0.0.0:8000..."
  exec daphne -b 0.0.0.0 -p 8000 config.asgi:application
fi
