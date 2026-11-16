#!/usr/bin/env bash
# Respaldo de la base de datos. Guarda los últimos 7 en backups/.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESTINO="$RAIZ/backups"
mkdir -p "$DESTINO"
ARCHIVO="$DESTINO/comisiones-$(date +%Y%m%d-%H%M).sql.gz"

# La dirección de la base sale de backend/.env (una sola fuente de verdad).
URL="$(grep -m1 '^DATABASE_URL=' "$RAIZ/backend/.env" | cut -d'"' -f2)"
# pg_dump no entiende el ?schema=public que usa Prisma, así que se quita.
URL="${URL%%\?*}"

iniciada_por_nosotros=false
if ! pg_isready -h 127.0.0.1 -p 55433 -q 2>/dev/null; then
  echo "==> Iniciando base de datos para el respaldo"
  pg_ctl -D "$RAIZ/db/pgdata" -l "$RAIZ/logs/db.log" start -w -t 60 >/dev/null
  iniciada_por_nosotros=true
fi

pg_dump "$URL" | gzip > "$ARCHIVO"
echo "Respaldo: $ARCHIVO ($(du -h "$ARCHIVO" | cut -f1))"

ls -1t "$DESTINO"/comisiones-*.sql.gz | tail -n +8 | while read -r viejo; do
  rm -f "$viejo"
  echo "Borrado por antigüedad: $(basename "$viejo")"
done

if [ "$iniciada_por_nosotros" = true ]; then
  pg_ctl -D "$RAIZ/db/pgdata" stop -m fast >/dev/null
  echo "Base de datos detenida de nuevo"
fi
