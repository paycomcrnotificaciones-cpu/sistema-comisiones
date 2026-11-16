# Prender y apagar la app

Todo es **manual**: nada arranca solo al encender la laptop.

## Abrir

```bash
cd "/home/Delgado/Sistema de comisiones Dilan Delgado"
./iniciar.sh
```

Hace todo en orden: base de datos (PostgreSQL local en `db/pgdata`, puerto `55433`), API en `:4100` y web en `:3100`. Al terminar imprime:

```
Listo:  http://localhost:3100
```

Abre esa dirección en el navegador. Login: `admin@demo.com` / `Clave1234`.

## Cerrar

```bash
cd "/home/Delgado/Sistema de comisiones Dilan Delgado"
./detener.sh
```

Apaga web, API y base de datos. Nada queda corriendo.

## Respaldo

```bash
cd "/home/Delgado/Sistema de comisiones Dilan Delgado"
./respaldo.sh
```

Guarda `backups/comisiones-AAAAMMDD-HHMM.sql.gz` y conserva los últimos 7. Si la base estaba apagada, la prende, respalda y la vuelve a apagar.

Restaurar un respaldo:

```bash
./iniciar.sh
gunzip -c backups/comisiones-FECHA.sql.gz | psql "postgresql://comisiones:CLAVE@127.0.0.1:55433/comisiones"
```

La clave está en `backend/.env` (`DATABASE_URL`).

## Notas

- Solo accesible desde esta laptop (`127.0.0.1`). No se expone a la red ni a internet.
- Logs en `logs/api.log` y `logs/web.log`.
- Si cambias código: `cd backend && pnpm build` y/o `cd frontend && pnpm build`, luego `./detener.sh && ./iniciar.sh`.
- La app vieja (`/home/Delgado/comisiones`, puertos 3000/4000) está detenida y desactivada. Se reactiva con:
  `systemctl --user enable --now comisiones-db comisiones-redis comisiones-api comisiones-web`
