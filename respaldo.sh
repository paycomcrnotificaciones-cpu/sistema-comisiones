#!/usr/bin/env bash
# Respaldo de la base de datos. Guarda los últimos 7 en backups/.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESTINO="$RAIZ/backups"
mkdir -p "$DESTINO"
ARCHIVO="$DESTINO/comisiones-$(date +%Y%m%d-%H%M).sql.gz"

iniciada_por_nosotros=false
if [ "$(podman inspect -f '{{.State.Running}}' comisiones-db-v2 2>/dev/null)" != "true" ]; then
  echo "==> Iniciando base de datos para el respaldo"
  podman start comisiones-db-v2 >/dev/null
  iniciada_por_nosotros=true
  for _ in $(seq 1 30); do
    podman exec comisiones-db-v2 pg_isready -U comisiones -d comisiones >/dev/null 2>&1 && break
    sleep 2
  done
fi

podman exec comisiones-db-v2 pg_dump -U comisiones comisiones | gzip > "$ARCHIVO"
echo "Respaldo: $ARCHIVO ($(du -h "$ARCHIVO" | cut -f1))"

ls -1t "$DESTINO"/comisiones-*.sql.gz | tail -n +8 | while read -r viejo; do
  rm -f "$viejo"
  echo "Borrado por antigüedad: $(basename "$viejo")"
done

if [ "$iniciada_por_nosotros" = true ]; then
  podman stop comisiones-db-v2 >/dev/null
  echo "Base de datos detenida de nuevo"
fi
