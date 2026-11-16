#!/usr/bin/env bash
# Levanta la app en modo producción, solo accesible desde esta laptop.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Node y pnpm viven en ~/.local/node/bin (no están en el PATH del sistema).
export PATH="$HOME/.local/node/bin:$PATH"
LOGS="$RAIZ/logs"
APP="Sistema de comisiones Dilan Delgado"
API_PUERTO=4100
WEB_PUERTO=3100

mkdir -p "$LOGS"
cd "$RAIZ"

puerto_ocupado() {
  ss -ltn 2>/dev/null | grep -q ":$1 "
}

esperar() {
  local intentos=$(( $1 / 2 ))
  shift
  for _ in $(seq 1 "$intentos"); do
    if "$@" >/dev/null 2>&1; then return 0; fi
    sleep 2
  done
  return 1
}

echo "==> Base de datos"
DATOS="$RAIZ/db/pgdata"
if ! pg_isready -h 127.0.0.1 -p 55433 -q 2>/dev/null; then
  pg_ctl -D "$DATOS" -l "$LOGS/db.log" start -w -t 60 >/dev/null 2>&1
fi
esperar 30 pg_isready -h 127.0.0.1 -p 55433 -q \
  || { echo "La base de datos no respondió. Revisa: logs/db.log"; exit 1; }
echo "    lista en 127.0.0.1:55433"

echo "==> API (:$API_PUERTO)"
if puerto_ocupado "$API_PUERTO"; then
  echo "    ya estaba corriendo, se deja igual"
else
  [ -f backend/dist/main.js ] || (cd backend && pnpm build)
  # se ejecuta desde backend/ para que dotenv lea backend/.env
  (
    cd backend
    HOST=127.0.0.1 PORT=$API_PUERTO nohup node dist/main.js \
      > "$LOGS/api.log" 2>&1 &
    echo $! > "$LOGS/api.pid"
  )
  esperar 60 curl -sf "http://127.0.0.1:$API_PUERTO/api/health" \
    || { echo "La API no arrancó. Revisa: logs/api.log"; tail -20 "$LOGS/api.log"; exit 1; }
  echo "    PID $(cat "$LOGS/api.pid")"
fi

echo "==> Web (:$WEB_PUERTO)"
if puerto_ocupado "$WEB_PUERTO"; then
  echo "    ya estaba corriendo, se deja igual"
else
  [ -f frontend/.next/BUILD_ID ] || (cd frontend && pnpm build)
  (
    cd frontend
    nohup ./node_modules/.bin/next start -H 127.0.0.1 -p "$WEB_PUERTO" \
      > "$LOGS/web.log" 2>&1 &
    echo $! > "$LOGS/web.pid"
  )
  esperar 60 curl -sf -o /dev/null "http://127.0.0.1:$WEB_PUERTO/login" \
    || { echo "La web no arrancó. Revisa: logs/web.log"; tail -20 "$LOGS/web.log"; exit 1; }
  echo "    PID $(cat "$LOGS/web.pid")"
fi

echo
echo "Listo:  http://localhost:$WEB_PUERTO"
echo "Logs:   $LOGS/api.log  y  $LOGS/web.log"
echo "Parar:  ./detener.sh"
echo
echo "Proyecto: $APP"
