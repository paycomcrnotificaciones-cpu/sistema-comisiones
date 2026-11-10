1. Base de datos (si no está corriendo):
podman start comisiones-db-v2

2. Backend (puerto 4100):
cd "/home/Delgado/Sistema de comisiones Dilan Delgado/backend"
pnpm run build && pnpm run start:prod
(o en caliente: pnpm run start:dev)

3. Frontend (puerto 3100) — en otra terminal:
cd "/home/Delgado/Sistema de comisiones Dilan Delgado/frontend"
pnpm dev -p 3100

Abrir: http://localhost:3100 — login admin@demo.com / Clave1234.