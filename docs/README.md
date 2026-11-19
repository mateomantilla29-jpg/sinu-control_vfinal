# Sinu Control · Documentación técnica

Instalación, configuración y usuarios de prueba: [README raíz](../README.md).
Arquitectura completa (C4, UML, ADR, calidad): `Informe_Proyecto_Final_SinuControl.html`.

## 1. Arquitectura en una página

```
Navegador (SPA vanilla + Bootstrap)
   │  fetch JSON + Authorization: Bearer <JWT>
   ▼
Vite (desarrollo, :5173) ── proxy /api ──►  Flask API (:5000)  /api/v1
                                              │  controladores  (HTTP, DTO, roles)
                                              │  servicios      (reglas de negocio, transacciones)
                                              │  repositorios   (consultas SQLAlchemy)
                                              │  modelos        (tablas)
                                              ▼
                                           MySQL 8 (sinu_db, utf8mb4) ← migraciones Alembic
```

- **Monolito modular** por dominios: `usuarios`, `inventario`, `platos`, `pedidos`, `alertas`,
  `reportes`, `caja` y `tablero`.
- Los servicios se crean una vez en el *app factory* y se inyectan en los controladores
  (`PedidoServicio` recibe `InventarioServicio` y `PlatoServicio`).
- `tablero` solo compone otros servicios (no tiene tablas propias, por eso no tiene repositorio ni
  modelo). `alertas` se recalcula a partir del inventario.

## 2. Contrato de respuesta

```json
{ "success": true,  "message": "Pedido PED-1 enviado a cocina.", "data": { } }
{ "success": false, "error": { "message": "Datos de entrada inválidos.", "details": { "campo": ["mensaje"] } } }
```

| Código | Cuándo |
|---|---|
| 200 / 201 / 204 | Éxito, creación, eliminación |
| 400 | DTO inválido (cuerpo o query): `details` trae el error por campo |
| 401 | Sin token, token inválido o expirado (`"Token expirado."`), usuario desactivado, credenciales incorrectas |
| 403 | El rol (leído de la base en cada petición) no tiene permiso |
| 404 | Recurso inexistente |
| 405 | Método no permitido |
| 409 | Regla de negocio: stock insuficiente, nombre duplicado, estado no válido, caja ya cerrada… |

## 3. Endpoints (`/api/v1`)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/usuarios/login` | público | Usuario y contraseña → JWT, expiración y usuario |
| POST | `/usuarios/token/renovar` | autenticado | Token nuevo mientras el actual siga vigente |
| GET / PUT | `/usuarios/yo` | autenticado | Ver / cambiar mi nombre |
| PATCH | `/usuarios/yo/contrasena` | autenticado | Cambiar contraseña (`actual`, `nueva`, `confirmacion`) |
| GET / POST | `/usuarios` | admin | Listar / crear usuario |
| PUT | `/usuarios/<id>` | admin | Editar nombre, rol y restablecer contraseña |
| PATCH | `/usuarios/<id>/estado` | admin | Activar o desactivar (`{"activo": false}`) |
| GET / POST | `/insumos` | admin | Existencias por insumo / alta |
| PUT / DELETE | `/insumos/<id>` | admin | Editar / eliminar (bloqueado si tiene stock o está en una receta) |
| GET / POST | `/lotes` | admin | Lotes en orden FEFO (`?todos=1`) / ingreso de lote |
| POST | `/lotes/<id>/merma` | admin | Merma parcial (`cantidad`, `motivo`) |
| POST | `/lotes/<id>/baja` | admin | Baja de un lote vencido |
| POST | `/lotes/vencidos/baja` | admin | Baja de todos los lotes vencidos |
| GET | `/platos` | ambos | Menú con platos posibles según stock |
| POST | `/platos` | admin | Crear plato con receta |
| GET / PUT / DELETE | `/platos/<id>` | admin | Detalle / editar / eliminar |
| POST | `/pedidos/validar` | ambos | Validar existencias sin descontar |
| POST | `/pedidos` | ambos | Crear pedido (descuenta insumos por FEFO en una transacción) |
| GET | `/pedidos/cocina` | admin | Cola de cocina con prioridad por vencimiento |
| PATCH | `/pedidos/<id>/avanzar` | admin (mesero solo listo → entregado) | Siguiente estado |
| PATCH | `/pedidos/<id>/cancelar` | ambos | Cancela; devuelve stock si estaba pendiente |
| GET | `/mesas` | ambos | Estado de las 9 mesas |
| POST | `/mesas/<n>/liberar` | ambos | Cierra los pedidos entregados de la mesa |
| GET | `/alertas?estado=activa\|atendida\|todas` | ambos | Alertas recalculadas |
| GET | `/alertas/contador` | ambos | Número de alertas activas |
| PATCH | `/alertas/<id>/atender` · `/reactivar` | admin | Cambiar estado |
| GET | `/reportes/mas-vendidos?desde&hasta` | admin | Unidades, pedidos e ingresos por plato |
| GET | `/reportes/consumo-insumos?desde&hasta` | admin | Ingresado, consumido neto y mermado por insumo |
| GET | `/reportes/movimientos?desde&hasta&tipo` | admin | Bitácora de inventario |
| GET | `/caja/resumen?fecha` | admin | Totales del día antes de cerrar |
| GET / POST | `/caja/cierres` | admin | Historial / cerrar caja del día |
| GET | `/tablero/resumen` | admin | Ventas del día, stock bajo, por vencer, platos posibles |
| GET | `/health` | público | Estado de la API |

Fechas en formato `AAAA-MM-DD`. Sin `desde`/`hasta`, los reportes usan los últimos 7 días (máximo 366).

## 4. Reglas de negocio

1. **FEFO:** al crear un pedido se descuenta primero del lote que vence antes (a igual vencimiento, el
   que ingresó antes). Los lotes vencidos y dados de baja no cuentan como stock. Si falta un insumo,
   no se descuenta nada (una sola transacción).
2. **Platos posibles** = mínimo, entre los insumos de la receta, de `stock disponible / cantidad por plato`.
3. **Estados del pedido:** `pendiente → en preparación → listo → entregado`. La cocina (admin) mueve
   todos; el mesero solo `listo → entregado`. Cancelar solo si está pendiente (devuelve stock a sus
   lotes) o en preparación (no devuelve).
4. **Mesas:** libre, ocupada o lista se derivan de sus pedidos abiertos. Se liberan cuando todos sus
   pedidos están entregados.
5. **Alertas:** agotado, stock bajo, lote vencido, lote por vencer, usar primero y plato no
   disponible. Se recalculan en cada consulta y conservan "atendida" mientras la causa siga.
6. **Mermas:** una merma no puede superar lo que queda en el lote; solo los lotes vencidos se dan de
   baja completos. Toda merma o baja deja un movimiento `merma`.
7. **Caja:** ventas del día = pedidos no cancelados (la misma cifra del tablero). Se cierra una vez por
   día y solo sin pedidos pendientes, en preparación o listos.
8. **Usuarios:** nadie puede desactivarse a sí mismo ni cambiar su propio rol; siempre queda un
   administrador activo; un usuario desactivado no puede entrar y su token deja de servir.

## 5. Base de datos (MySQL 8, `sinu_db`, utf8mb4)

| Tabla | Para qué | Llaves foráneas |
|---|---|---|
| `usuarios` | Cuentas, rol y estado activo | — |
| `insumos` | Materia prima, unidad, mínimo y días de alerta | — |
| `lotes` | Ingresos con vencimiento propio (base de FEFO) | `insumo_id → insumos` |
| `movimientos` | Bitácora: ingreso, consumo, ajuste, merma | sin FK (se conserva si se borra el insumo) |
| `platos` | Menú y precio (COP) | — |
| `receta_items` | Cantidad de cada insumo por plato | `plato_id → platos`, `insumo_id → insumos` |
| `pedidos` | Pedido de una mesa (es la venta) | `usuario_id → usuarios` |
| `pedido_items` | Líneas con copia de nombre y precio | `pedido_id → pedidos` |
| `consumos` | Qué cantidad salió de cada lote por pedido | `pedido_id → pedidos` |
| `alertas` | Alertas con estado | — |
| `cierres_caja` | Un cierre por fecha | `usuario_id → usuarios` |

Migraciones (`api/migrations/versions/`):

1. `11a44f46c8f2` esquema inicial.
2. `a1b2c3d4e5f6` cantidades de `FLOAT` a `DOUBLE`. En MySQL, `FLOAT` es de precisión simple y
   guardaba 0,15 kg como 0,150000006.
3. `44ad22de8adc` columna `usuarios.activo` y tabla `cierres_caja`.

Para mostrar en el video que un pedido queda en MySQL: [`GUION_SQL_VIDEO.sql`](GUION_SQL_VIDEO.sql).
