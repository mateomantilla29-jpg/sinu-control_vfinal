# Guion del video MP4 (G2) · duración objetivo: 12 minutos

**Participan los tres integrantes.** I1, I2 e I3 = integrantes 1, 2 y 3 (reemplace por sus nombres).

## Antes de grabar

1. MySQL 8 encendido. En `api/`: `python scripts/seed.py --si` (deja L-1, PED-1… iguales al guion).
2. API (`python app.py`) y frontend (`npm run dev`) encendidos; navegador en `http://localhost:5173`.
3. Abra MySQL Workbench con `docs/GUION_SQL_VIDEO.sql` cargado y conectado a `sinu_db`.
4. VS Code con el proyecto abierto y una terminal en `api/`.
5. **No muestre contraseñas:** escriba las claves de prueba fuera de cámara o pause la grabación; no abra `api/.env`, `README` (sección de usuarios) ni `COMO INICIAR.txt` en pantalla.
6. Resolución de 1920 × 1080 y zoom del navegador al 110 %. Grabe con OBS o con la barra de juegos de Windows (Win + G).

## Guion

| Tiempo | Quién | En pantalla | Qué decir (resumen) | Punto de la rúbrica |
|---|---|---|---|---|
| 0:00–0:40 | I1 | Portada del informe HTML | Presentación del equipo, el curso y el problema del Gastrobar Sinu: mariscos que se vencen, platos sin insumos, pedidos en papel. | Contexto |
| 0:40–1:40 | I1 | Informe → C4 contenedores y componentes | Monolito modular: SPA vanilla + Bootstrap, API Flask por dominios, MySQL 8. Mostrar las capas controlador → servicio → repositorio → modelo y los DTO. | Arquitectura, capas |
| 1:40–2:20 | I1 | VS Code: árbol `api/app/dominios/` y `frontend/src/js/` | Un paquete por dominio con los mismos cinco archivos; en el frontend `pages/`, `components/`, `router/`, `state/store.js`. Sin React, Angular ni Vue (`package.json`). | Frontend vanilla, SPA |
| 2:20–3:30 | I2 | App: login → tarjeta Mesero | Login con JWT. Primero enviar vacío: errores junto a cada campo, sin llamar a la API (validación en el cliente). Luego ingresar. | Validación, autenticación |
| 3:30–5:00 | I2 | Mesa 3 → 2 × Mojarra → Validar → Confirmar | El menú muestra cuántos platos se pueden preparar según el stock. El Filete en salsa de coco aparece no disponible porque la leche de coco está vencida. Al confirmar, la API descuenta por FEFO en una sola transacción. | Reglas de negocio |
| 5:00–5:40 | I2 | URL `#tablero` siendo mesero | "No tiene permisos": las vistas y la API validan el rol (403). | Autorización |
| 5:40–6:40 | I2 | Login Administrador → Cocina → avanzar ×3 | Cola de cocina con cronómetro y prioridad; estados pendiente → en preparación → listo → entregado. | Estados, HTTP |
| 6:40–7:40 | I3 | MySQL Workbench: consultas B a F de `GUION_SQL_VIDEO.sql` | El pedido PED-1 está en `pedidos` y `pedido_items`; `consumos` muestra que salió del lote L-1 (el que vence primero); `lotes` pasó de 4 a 3 kg; `movimientos` guarda la bitácora. | MySQL, ORM |
| 7:40–8:40 | I3 | App: Mermas → Dar de baja todos; Reportes; Cierre de caja | Baja de lotes vencidos con historial; reportes con datos reales; el cierre de caja coincide con las ventas del tablero ($ 70.000). | Funcionalidades completas |
| 8:40–9:20 | I3 | Usuarios: crear con datos inválidos y luego válidos; Desactivar | Errores por campo coherentes con los DTO; un usuario desactivado no puede entrar. | CRUD, validación |
| 9:20–10:20 | I3 | Terminal: `python -m pytest -q` y `npm test` | 55 pruebas de backend y 11 de frontend en verde. Mencionar los 21 casos funcionales de `docs/pruebas/`. | Pruebas |
| 10:20–11:00 | I1 | Terminal: `flask db history` y `git log --oneline` | Tres migraciones de Alembic (incluida la de DOUBLE para MySQL) y commits por funcionalidad en GitHub. | Migraciones, versiones |
| 11:00–11:40 | I1 | Informe: ADR y sección 11 | Dos decisiones clave (monolito modular, JWT con rol en la base) y el rendimiento medido (crear pedido, p95 de 17 ms). | ADR, calidad |
| 11:40–12:00 | Todos | Portada del informe | Cierre y agradecimiento. | — |

## Después de grabar

- Exporte en MP4 (H.264, 1080p).
- Verifique que en ningún cuadro se vean contraseñas, `SECRET_KEY` ni `DB_PASSWORD`.
- Ponga el enlace o el nombre del archivo en la portada del informe (campo «Video»).
