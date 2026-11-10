#!/usr/bin/env bash
# Apaga API, web y base de datos.
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS="$RAIZ/logs"

detener() {
  local nombre="$1" archivo="$LOGS/$1.pid"
  [ -f "$archivo" ] || return 0
  local pid
  pid="$(cat "$archivo")"
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null
    for _ in $(seq 1 15); do
      kill -0 "$pid" 2>/dev/null || break
      sleep 1
    done
    kill -9 "$pid" 2>/dev/null
    echo "    $nombre detenido (PID $pid)"
  else
    echo "    $nombre no estaba corriendo"
  fi
  rm -f "$archivo"
}

echo "==> Web"
detener web
# next start puede dejar procesos hijos aparte del PID guardado
pkill -f "next start -H 127.0.0.1 -p 3100" 2>/dev/null && echo "    procesos de Next cerrados"

echo "==> API"
detener api
pkill -f "node dist/main\.js" 2>/dev/null && echo "    procesos de la API cerrados"

echo "==> Base de datos"
if [ "$(podman inspect -f '{{.State.Running}}' comisiones-db-v2 2>/dev/null)" = "true" ]; then
  podman stop comisiones-db-v2 >/dev/null
  echo "    contenedor detenido"
else
  echo "    ya estaba detenida"
fi

echo
echo "Todo apagado. Para volver a abrir: ./iniciar.sh"
