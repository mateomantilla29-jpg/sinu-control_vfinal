# Revisión final contra la rúbrica (G3)

Validación punto por punto después de las fases A a G. La columna "Antes" es el estado del avance parcial; "Ahora" es el estado de esta entrega.

| Requisito | Antes | Ahora | Evidencia |
|---|---|---|---|
| Frontend HTML/CSS/JS vanilla, sin React, Angular ni Vue | ✅ | ✅ | `frontend/package.json` solo depende de `bootstrap` y `bootstrap-icons`; Vite y Vitest son herramientas de desarrollo |
| Bootstrap o Tailwind | ✅ | ✅ | Bootstrap 5.3 en `main.js` |
| SPA con páginas, componentes y enrutamiento | ✅ (4 componentes) | ✅ | 13 páginas, router con guards y 10 archivos de componentes (`components/common`: Campo, Tabla, Kpis, Modal, FiltroFechas; `inventario/MermaModal`…) |
| Gestión de estado | ⚠️ | ✅ | `state/store.js`: sesión, vista, carritos por mesa y alertas, con acciones y `subscribe`; pruebas en `tests/store.test.js` |
| Consumo de API con HTTP asíncrono | ✅ | ✅ | `api/http.js` (fetch, Bearer, manejo del 401 con aviso) y un módulo por recurso |
| Validación de formularios y errores | ⚠️ | ✅ | `utils/validators.js` (mismas reglas que los DTO) y errores por campo en login, insumos, lotes, platos, mermas, usuarios, perfil y reportes; casos CP-01, 06, 09, 11, 14, 16, 18 y 19 |
| Backend Flask con API REST | ✅ | ✅ | `/api/v1`, 8 dominios y 41 combinaciones de método y ruta |
| Capas: controladores, servicios, repositorios, DTO y modelos | ✅ | ✅ | Alertas ahora tiene DTO; tablero (sin tablas) y reportes (lee tablas ajenas) justificados en el informe, sección 7.1 |
| Reglas de negocio, excepciones y códigos HTTP | ✅ | ✅ | FEFO, stock, estados, mermas, caja y usuarios; manejador único con 400, 401, 403, 404, 405 y 409 |
| Autenticación y autorización | ✅ | ✅ | JWT con dos roles verificados en la base; usuarios desactivados bloqueados; renovación de token |
| Base de datos MySQL o PostgreSQL | ❌ (SQLite) | ✅ | MySQL obligatorio en `config.py`; SQLite solo en pruebas; guion `docs/GUION_SQL_VIDEO.sql` |
| ORM y migraciones | ✅ (sin probar en MySQL) | ✅ | 3 migraciones; `flask db upgrade`, `downgrade` y `seed.py` probados en un servidor compatible con MySQL |
| Pruebas de funcionamiento | ⚠️ (10, sin frontend) | ✅ | 55 pytest (SQLite y MySQL), 11 Vitest y 21 casos funcionales en navegador; resultados en `docs/pruebas/` |
| Control de versiones | ❌ (sin .git) | ✅ | Repositorio Git con commits por fase; pasos para GitHub y acceso de lectura en `docs/GITHUB.md` |
| Instrucciones de instalación | ⚠️ | ✅ | README reescrito; instalación probada desde un clon limpio |
| Informe HTML `Informe_Proyecto_Final_SinuControl.html` | ❌ | ✅ | En la raíz del repositorio; autocontenido |
| Fases 01 a 05 documentadas | ❌ | ✅ | Informe, secciones 1, 2, 3, 12 y 13 |
| Diagramas C4 (contexto, contenedores, componentes) | ❌ | ✅ | Informe, sección 5 (4 diagramas) |
| UML, arquitectura lógica, despliegue, modelo lógico y físico de la BD | ❌ | ✅ | Informe, secciones 6 a 8 (casos de uso, clases, 2 secuencias, 2 de estados, capas, 2 despliegues, ER y DDL) |
| Diseño de API, diseño de seguridad y ADR | ❌ | ✅ | Informe, secciones 9 y 10 (10 ADR) |
| Atributos de calidad, rendimiento, escalabilidad, costos y riesgos | ❌ | ✅ | Informe, secciones 4.3 y 11, con tiempos medidos |
| Video MP4 | ❌ | ⏳ Pendiente del equipo | Guion cronometrado en `docs/GUION_VIDEO.md` |
| Funcionalidades completas | ⚠️ ("Próximamente") | ✅ | Reportes, cierre de caja, mermas y bajas, perfil y contraseña, usuarios y renovación de sesión; "Respaldo" y "Ajustar" se eliminaron |
| No exponer credenciales | ⚠️ (`.env` en el zip) | ✅ | Sin `.env` en el repositorio ni en el zip; las contraseñas de prueba solo en el README, con aviso de no mostrarlas en el video |

## Lo que todavía debe hacer el equipo

1. **Completar los datos resaltados en amarillo** en la portada del informe: integrantes, docente, enlace del repositorio y del video. Si sus fechas de sprint fueron otras, ajústelas en la sección 3.4.
2. **Publicar en GitHub** y dar acceso de lectura a rortegani@gmail.com (`docs/GITHUB.md`).
3. **Repetir las pruebas en su MySQL 8:** `TEST_DATABASE_URL=... python -m pytest`. En el entorno de construcción se usó MariaDB 10.11, que es compatible con MySQL.
4. **Grabar el video** siguiendo `docs/GUION_VIDEO.md`.
5. **Cambiar las contraseñas de prueba** si el sistema se instala en el gastrobar.
