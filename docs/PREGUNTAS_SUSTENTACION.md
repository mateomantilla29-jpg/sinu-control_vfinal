# Preguntas probables de sustentación (G4)

Respuestas cortas, con el archivo donde se puede mostrar cada una.

## Arquitectura

**1. ¿Qué estilo de arquitectura usaron y por qué no microservicios?**
Un monolito modular en capas. Un solo local, un equipo de cómputo y tres desarrolladores. Además, FEFO necesita una transacción que toca pedidos y lotes a la vez; con microservicios habría que usar sagas. Los dominios están separados, así que se podría extraer uno después (ADR-02).

**2. ¿Qué hace cada capa?**
El controlador recibe HTTP, valida el DTO y el rol y responde. El servicio aplica las reglas de negocio y maneja la transacción. El repositorio hace las consultas con SQLAlchemy. El modelo representa la tabla. Ejemplo: `pedidos/controladores.py → PedidoServicio.crear → PedidoRepositorio → Pedido`.

**3. ¿Cómo se comunican los dominios entre sí?**
Por inyección de dependencias en `crear_app()`: `PedidoServicio(inventario, platos)`, `AlertaServicio(inventario, platos)`, `TableroServicio(inventario, platos, pedidos, alertas)`. Los controladores no se llaman entre sí.

**4. ¿Por qué `tablero` no tiene repositorio ni modelos, y `reportes` no tiene modelos?**
`tablero` solo compone datos de otros servicios y no tiene tablas propias. `reportes` lee tablas de otros dominios (pedidos y movimientos) con consultas agregadas en su propio repositorio; crear modelos duplicaría los existentes.

**5. ¿Cómo manejan los errores?**
Con excepciones de dominio (`app/errores.py`), cada una con su `codigo_http` (400, 401, 403, 404, 409), y un solo `errorhandler` en el *app factory* que arma `{success:false, error:{message, details}}`. Los servicios no conocen HTTP (ADR-10).

## Reglas de negocio

**6. ¿Qué es FEFO y dónde está implementado?**
*First Expired, First Out*: primero sale lo que vence antes. `InventarioServicio.consumir_fefo` ordena los lotes activos por (vencimiento, ingreso, id) y va descontando hasta completar la cantidad.

**7. ¿Qué pasa si falta un insumo a mitad del pedido?**
Primero se valida todo el pedido. Si falta algo, responde 409 y no toca nada. Si falla durante el descuento, `PedidoServicio.crear` hace `rollback`: nunca queda un pedido a medias ni stock negativo.

**8. ¿Cómo se devuelve el stock al cancelar?**
La tabla `consumos` guarda de qué lote salió cada cantidad. Si el pedido estaba pendiente, `InventarioServicio.devolver` suma esas cantidades a sus lotes exactos y deja un movimiento `ajuste`. Si estaba en preparación, no se devuelve (ya se cocinó).

**9. ¿Cómo se calculan los platos posibles?**
Para cada insumo de la receta: `floor(stock disponible / cantidad por plato)`. El plato posible es el mínimo de esos valores. El insumo que da el mínimo es el "limitante".

**10. ¿Por qué las alertas se recalculan al consultarlas?**
Un lote vence a medianoche sin que nadie haga nada. Recalcular en cada consulta las mantiene al día sin tareas programadas. El costo es que cada consulta recorre el inventario; con 9 mesas no es un problema (ADR-06, sección 11).

**11. ¿Por qué el cierre de caja coincide con el tablero?**
Los dos usan la misma regla: ventas = pedidos del día no cancelados. Además, la caja no se puede cerrar con pedidos sin entregar. Lo comprueba `test_resumen_coincide_con_tablero`.

## Datos

**12. ¿Por qué MySQL y no PostgreSQL?**
El equipo lo conoce, se instala fácil en Windows y Workbench sirve para la demo. PostgreSQL tiene tipos más ricos, pero no los necesitábamos (ADR-01).

**13. ¿Qué problema tuvieron al pasar a MySQL?**
`db.Float` crea columnas `FLOAT` de precisión simple: 0,15 kg quedaba como 0,150000006. Se creó la migración `a1b2c3d4e5f6` que pasa las cantidades a `DOUBLE` y se redondea con `r3()` (ADR-08).

**14. ¿Cómo se versiona la base?**
Con Alembic (Flask-Migrate): tres migraciones en `api/migrations/versions`. `flask db upgrade` crea o actualiza las tablas; se probaron subir, bajar y volver a subir en MySQL.

**15. ¿Por qué `pedido_items` copia el nombre y el precio?**
Para que un pedido histórico no cambie si después se edita o se elimina el plato. Por eso `plato_id` no tiene llave foránea.

## Seguridad

**16. ¿Cómo funciona la autenticación?**
El login verifica el hash scrypt de la contraseña y entrega un JWT HS256 con `sub`, `rol`, `iat` y `exp` (8 horas). La SPA lo envía en `Authorization: Bearer`.

**17. Si el rol va en el token, ¿por qué consultan la base en cada petición?**
Para que un cambio de rol o una desactivación aplique de inmediato, sin esperar a que venza el token. `requiere_rol` lee el usuario y verifica `activo` y `rol` (ADR-04).

**18. ¿Qué pasa cuando expira el token?**
Faltando 10 minutos aparece un aviso con "Renovar sesión" (`POST /usuarios/token/renovar`). Si vence, la API responde 401 "Token expirado." y la SPA vuelve al login con un mensaje que lo explica (ADR-09).

**19. ¿Cómo evitan inyección SQL y XSS?**
SQL: solo consultas del ORM con parámetros. XSS: toda salida pasa por `escapeHtml()` antes de insertarse con `innerHTML`, y no hay scripts de terceros.

**20. ¿Dónde están las claves?**
En `api/.env`, que está en `.gitignore`. El repositorio solo tiene `.env.example` sin valores. La API no arranca sin `SECRET_KEY`.

## Frontend

**21. ¿Cómo hicieron una SPA sin framework?**
Router por `#hash` (`router/routes.js`) con guards por rol. Cada página es `XPage()` (HTML) y `mountXPage()` (eventos y datos). Los componentes son funciones que devuelven HTML (`components/common/Tabla.js`, `Campo.js`, `Modal.js`…). Vite solo sirve y empaqueta.

**22. ¿Dónde vive el estado?**
En `state/store.js`: sesión, vista actual, borradores de pedido por mesa, contador de alertas y aviso del login. Se cambia con acciones (`actions.setCarrito`…) y las vistas se suscriben (`subscribe(listener, selector)`).

**23. ¿Cómo validan los formularios?**
En el cliente, con `utils/validators.js`, que tiene las mismas reglas que los DTO de marshmallow; los errores se muestran bajo cada campo sin llamar a la API. El servidor vuelve a validar y responde 400 con `details` por campo, que se pintan en el mismo lugar.

## Calidad y pruebas

**24. ¿Qué pruebas tienen?**
55 de pytest (éxito, validación y permiso para cada funcionalidad), que corren en SQLite y en MySQL con `TEST_DATABASE_URL`; 11 de Vitest (validadores, store, JWT); y 21 casos funcionales en Chrome con Playwright, con su resultado obtenido en `docs/pruebas/`.

**25. ¿Cuál es el punto más lento y cómo lo mejorarían?**
El tablero (p95 de unos 111 ms con 40 pedidos abiertos) por consultas N+1 en la cola de cocina y el recálculo de alertas. Se mejoraría con `selectinload`, calculando una sola vez los insumos por vencer y limitando el recálculo de alertas a una vez cada N segundos.

**26. ¿Qué pasa si se daña el equipo del local?**
Es un punto único de falla aceptado. RPO de 24 h con `mysqldump` diario y RTO de 1 h reinstalando desde GitHub con el lanzador y restaurando el respaldo (sección 11.4).

**27. ¿Cómo escalaría a varias sedes o a meseros con tabletas?**
Con tabletas: compilar la SPA, servirla con Nginx y HTTPS, y correr la API con Waitress o Gunicorn; el JWT no tiene estado, así que admite varios procesos. Para varias sedes: agregar `sede_id` y desplegar en un VPS.

**28. ¿Qué quedó fuera del alcance?**
POS, facturación electrónica, proveedores, pagos y respaldo desde la interfaz. Fueron decisiones con el cliente, y los botones "Próximamente" se eliminaron para no mostrar funciones falsas.
