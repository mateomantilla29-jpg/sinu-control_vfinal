# Sinu Control · Gastrobar Sinu (Bello)

Sistema web para el **Gastrobar Sinu**: toma de pedidos por mesa, cola de cocina, inventario por
**lotes con rotación FEFO** (primero vence, primero sale), alertas de stock y vencimiento, mermas,
reportes y cierre de caja.

Proyecto final del curso **Arquitecturas de Software y Computacional** (Universidad Cooperativa de
Colombia, sede Medellín, 2026-2). El informe completo está en
[`Informe_Proyecto_Final_SinuControl.html`](Informe_Proyecto_Final_SinuControl.html).

| Capa | Tecnología |
|---|---|
| Frontend | SPA en **JavaScript vanilla** (sin frameworks) con **Vite 8** y **Bootstrap 5.3** |
| Backend | **Flask 3.1**, API REST `/api/v1`, monolito modular por dominios |
| Datos | **MySQL 8** con SQLAlchemy 2 y migraciones Alembic (Flask-Migrate) |
| Seguridad | JWT (HS256), 2 roles (`admin`, `mesero`) validados en la base en cada petición, contraseñas con hash |
| Pruebas | pytest (55), Vitest (11) y 21 casos funcionales en navegador (Playwright) |

---

## 1. Requisitos

- **Python 3.11 o superior** (probado con 3.13)
- **Node.js 20 o superior** (probado con 22 y 24)
- **MySQL 8** encendido, con un usuario que pueda crear bases de datos
- Git (para clonar el repositorio)

## 2. Instalación y ejecución

### Opción A · Lanzador para Windows

1. Doble clic en **`INICIAR SINU.bat`**.
2. La primera vez se abre `api\.env`: complete `DB_USER` y `DB_PASSWORD` de su MySQL, guarde y vuelva
   a ejecutar el lanzador.
3. El lanzador crea el entorno virtual, instala dependencias, crea la base `sinu_db`, aplica las
   migraciones, carga los datos de ejemplo (solo si la base está vacía) y abre
   <http://localhost:5173>.

### Opción B · Paso a paso (Windows PowerShell; en Linux/macOS cambie `\` por `/` y active con `source venv/bin/activate`)

**API (puerto 5000)**

```powershell
cd api
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env               # y complete el archivo (ver sección 3)
python scripts\generate_secret.py    # copie la clave en SECRET_KEY
python scripts\create_db.py          # crea la base sinu_db (utf8mb4) si no existe
flask db upgrade                     # crea las 11 tablas con las migraciones
python scripts\seed.py               # datos de ejemplo (pide escribir SI: borra los datos)
python app.py
```

Comprobación: <http://localhost:5000/health> responde `{"status": "ok", "service": "sinu-api"}`.

**Frontend (puerto 5173)**, en otra terminal:

```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

Abra <http://localhost:5173>. Vite reenvía `/api` a la API (puerto 5000), así que no hay problemas de
CORS en desarrollo.

## 3. Configuración (`.env`)

Los archivos `.env` **no se suben a Git** (están en `.gitignore`). Se copian desde `.env.example`.

**`api/.env`**

| Variable | Obligatoria | Descripción |
|---|---|---|
| `SECRET_KEY` | Sí | Clave para firmar los JWT. Generar con `python scripts/generate_secret.py`. |
| `DB_USER`, `DB_PASSWORD` | Sí | Usuario y contraseña de MySQL. |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_CHARSET` | No | Por defecto `localhost`, `3306`, `sinu_db`, `utf8mb4`. |
| `JWT_EXP_MINUTES` | No | Duración del token. Por defecto 480 (un turno de 8 h). |
| `DIAS_ALERTA_DEFECTO` | No | Días de anticipación para alertar vencimientos. Por defecto 3. |
| `CORS_ALLOWED_ORIGINS` | No | Orígenes permitidos separados por comas. Vacío = solo `localhost:5173`. |
| `TEST_DATABASE_URL` | No | Solo pruebas: corre pytest contra MySQL en lugar de SQLite en memoria. |

**`frontend/.env`**: `VITE_API_URL=/api/v1` (usa el proxy de Vite).

Si falta `SECRET_KEY` o `DB_USER`, la API no arranca y explica qué falta. **SQLite solo se usa en las
pruebas.**

## 4. Usuarios de prueba

Los crea `python scripts/seed.py`. Son solo para desarrollo y demostración: cámbielos desde
**Usuarios** o **Mi perfil** antes de usar el sistema con datos reales, y no los muestre en el video.

| Rol | Usuario | Contraseña | Puede usar |
|---|---|---|---|
| Administrador | `admin` | `admin123` | Tablero, mesas, cocina, platos, inventario, lotes, mermas, reportes, cierre de caja, usuarios, alertas y su perfil |
| Mesero | `mesero` | `mesero123` | Mapa de mesas y pedidos, alertas en solo lectura y su perfil |

Los datos de ejemplo traen 10 insumos, 15 lotes (con fechas relativas a hoy: hay lotes vencidos, por
vencer y vigentes) y 6 platos con receta.

## 5. Pruebas

```powershell
cd api
python -m pytest -v                  # 55 pruebas en SQLite en memoria

# Las mismas pruebas contra MySQL (base vacía para pruebas):
$env:TEST_DATABASE_URL="mysql+pymysql://USUARIO:CLAVE@localhost:3306/sinu_test"
python -m pytest -v

cd ..\frontend
npm test                             # 11 pruebas con Vitest

# Casos funcionales en navegador (API y frontend encendidos, datos recién cargados)
pip install playwright && python -m playwright install chromium
python tools\e2e\casos_funcionales.py
```

Resultados guardados y tabla de casos de prueba: [`docs/pruebas/`](docs/pruebas/README.md).

## 6. Estructura del repositorio

```
sinu-control/
├── api/                          Backend Flask
│   ├── app/
│   │   ├── __init__.py           App factory: extensiones, blueprints y manejador único de errores
│   │   ├── config.py             Configuración (MySQL obligatorio; SQLite solo en pruebas)
│   │   ├── seguridad.py          Decoradores requiere_token / requiere_rol (JWT + rol en BD)
│   │   ├── errores.py            Excepciones de dominio con su código HTTP (400, 401, 403, 404, 409)
│   │   ├── respuestas.py         Contrato {success, message, data} y validación con DTO
│   │   └── dominios/             Un paquete por dominio:
│   │       ├── usuarios/         controladores · servicios · repositorios · dtos · modelos
│   │       ├── inventario/       insumos, lotes (FEFO), movimientos, mermas
│   │       ├── platos/           platos, recetas y disponibilidad
│   │       ├── pedidos/          pedidos, consumos por lote y mesas
│   │       ├── alertas/          alertas recalculadas
│   │       ├── reportes/         más vendidos, consumo por insumo, movimientos
│   │       ├── caja/             cierre de caja diario
│   │       └── tablero/          resumen del día (solo lectura, compone otros servicios)
│   ├── migrations/               Alembic: 3 migraciones
│   ├── scripts/                  create_db.py · seed.py · generate_secret.py
│   └── tests/                    pytest
├── frontend/                     SPA vanilla
│   ├── src/js/
│   │   ├── main.js               Arranque, render y navegación
│   │   ├── state/store.js        Estado global con suscripción a cambios
│   │   ├── router/               Rutas por #hash y guards por rol
│   │   ├── auth/                 Sesión, permisos y vigilancia de expiración del token
│   │   ├── api/                  Un módulo por recurso sobre http.js (fetch + Bearer)
│   │   ├── pages/                13 páginas (XPage + mountXPage)
│   │   ├── components/           common/ (Campo, Tabla, Kpis, Modal, FiltroFechas), layout/, mesas/, cocina/, inventario/
│   │   └── utils/                validators.js, formatters.js, ui.js, jwt.js, storage.js
│   └── tests/                    Vitest
├── docs/
│   ├── README.md                 Documentación técnica: API, reglas de negocio y base de datos
│   ├── GUION_SQL_VIDEO.sql       Consultas para mostrar MySQL en el video
│   ├── GUION_VIDEO.md            Guion cronometrado del video
│   ├── GITHUB.md                 Pasos para publicar el repositorio
│   ├── PREGUNTAS_SUSTENTACION.md Preguntas probables y respuestas
│   ├── REVISION_FINAL.md         Validación contra la rúbrica
│   ├── pruebas/                  Resultados de pruebas y casos funcionales
│   ├── capturas/                 final/ (versión final) y avance-parcial/
│   └── historial/                Entrega del avance parcial
├── tools/e2e/                    Casos funcionales con Playwright
├── Informe_Proyecto_Final_SinuControl.html
├── INICIAR SINU.bat · COMO INICIAR.txt · SINU CONTROL.html (pantalla de arranque)
└── README.md
```

## 7. Documentación

- **Técnica (endpoints, reglas, base de datos):** [`docs/README.md`](docs/README.md)
- **Informe final (fases 01 a 05, C4, UML, ADR, calidad):** [`Informe_Proyecto_Final_SinuControl.html`](Informe_Proyecto_Final_SinuControl.html)
- **Video:** [`docs/GUION_VIDEO.md`](docs/GUION_VIDEO.md) y [`docs/GUION_SQL_VIDEO.sql`](docs/GUION_SQL_VIDEO.sql)
