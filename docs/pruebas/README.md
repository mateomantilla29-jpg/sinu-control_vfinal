# Pruebas de Sinu Control

Evidencia de pruebas para el informe final. Todas se ejecutaron el 2026-11-19.

## Resumen

| Tipo | Herramienta | Alcance | Resultado | Archivo |
|---|---|---|---|---|
| Unitarias e integración del backend | pytest + cliente de pruebas de Flask, SQLite en memoria | 55 pruebas: login y roles, FEFO, pedidos, alertas, usuarios, perfil, sesión, mermas, reportes, caja y validación 400 | 55 passed in 16.06s | `pytest_sqlite.txt` |
| Mismas pruebas contra MySQL | pytest con `TEST_DATABASE_URL` (servidor compatible con MySQL) | Las mismas 55 | 55 passed in 24.87s | `pytest_mysql.txt` |
| Unitarias del frontend | Vitest | Validadores, store y expiración del JWT | 11 passed (11) | `vitest_frontend.txt` |
| Funcionales en navegador | Playwright + Chrome (`tools/e2e/casos_funcionales.py`) | 21 casos de punta a punta | 21/21 cumplen, sin errores en consola | `casos_funcionales.json` |

Cada funcionalidad nueva tiene pruebas de éxito, de validación (400) y de permiso denegado (401/403).

## Cómo repetirlas

```bash
# Backend (desde api/)
python -m pytest -v
TEST_DATABASE_URL=mysql+pymysql://USUARIO:CLAVE@localhost:3306/sinu_test python -m pytest -v   # base sinu_test vacía

# Frontend (desde frontend/)
npm test

# Funcionales (API y frontend encendidos; datos recién cargados con python scripts/seed.py --si)
python tools/e2e/casos_funcionales.py
```

## Casos de prueba funcionales

La columna "Resultado obtenido" la escribió el script al ejecutar cada caso en el navegador.

| Código | Caso | Entrada | Resultado esperado | Resultado obtenido | Estado | Captura |
|---|---|---|---|---|---|---|
| CP-01 | Login sin datos | Usuario y contraseña vacíos | Error en cada campo sin llamar a la API | {'usuario': 'Escriba su usuario.', 'contrasena': 'Escriba su contraseña.'}; llamadas a la API: 0 | **Cumple** | `01-login-validacion.png` |
| CP-02 | Login con contraseña incorrecta | admin / contraseña errada | Mensaje 'Usuario o contraseña incorrectos.' (401) | Usuario o contraseña incorrectos. | **Cumple** | — |
| CP-03 | Login del mesero | mesero / contraseña de prueba | Entra al mapa con 9 mesas | Vista #mesas con 9 mesas | **Cumple** | `02-mesero-mesas.png` |
| CP-04 | Crear pedido | Mesa 3: 2 × Mojarra frita con patacón | Pedido enviado a cocina y mesa 3 ocupada | 'Pedido PED-1 enviado a cocina.'; mesa 3: Ocupada | **Cumple** | `04-pedido-mesa3.png` |
| CP-05 | Mesero abre una vista de administrador | URL #tablero con sesión de mesero | Mensaje de permisos insuficientes | No tiene permisos para ver esta sección | **Cumple** | — |
| CP-06 | Cambiar contraseña | Nueva '123' y confirmación distinta; luego una válida | Errores por campo; con datos válidos se cambia y el login funciona con la nueva | Errores: ['confirmacion', 'nueva']; 'Contraseña actualizada. Úsela en su próximo ingreso.'; login con la nueva: sí | **Cumple** | — |
| CP-07 | Avanzar pedido en cocina | Tres clics sobre el ticket PED-1 | pendiente → en preparación → listo → entregado | En preparación → Listo → Entregado | **Cumple** | — |
| CP-08 | FEFO en lotes | Pedido de 2 Mojarras (0,5 kg de pescado c/u) | Se descuenta 1 kg del lote de pescado que vence primero | L-1 3 / 4 kg / L-2 8 / 8 kg | **Cumple** | `08-lotes-fefo.png` |
| CP-09 | Merma inválida | Cantidad 999 (el lote tiene 20 kg) y motivo 'x' | Errores por campo sin llamar a la API | {'cantidad': 'No puede superar lo que queda en el lote (20).', 'motivo': 'Describa el motivo (3 a 200 caracteres).'}; llamadas: 0 | **Cumple** | `09-merma-validacion.png` |
| CP-10 | Registrar merma | Lote de Arroz: 1,5 kg, motivo 'Bolsa rota en bodega' | El lote baja a 18,5 kg y queda el movimiento | 'Merma registrada en el lote L-7.'; lote: 18,5 / 20 kg | **Cumple** | — |
| CP-11 | Lote con vencimiento anterior al ingreso | Vencimiento 2020-01-01 | Error en el campo de vencimiento | {'fecha_vencimiento': 'El vencimiento no puede ser anterior al ingreso.'} | **Cumple** | — |
| CP-12 | Baja de lotes vencidos | Botón 'Dar de baja todos' | 2 lotes dados de baja y 3 mermas en el historial | '2 lote(s) vencido(s) dado(s) de baja.'; filas en historial: 3 | **Cumple** | `11-mermas-historial.png` |
| CP-13 | Reporte de más vendidos | Últimos 7 días | Mojarra: 2 unidades, $ 70.000 | 1 / Mojarra frita con patacón / 2 / 1 / $ 70.000 | **Cumple** | `12-reportes.png` |
| CP-14 | Reporte con fechas invertidas | Desde 31/12/2026, hasta 01/01/2026 | Error en 'hasta' sin consultar | {'hasta': 'La fecha final no puede ser anterior a la inicial.'} | **Cumple** | — |
| CP-15 | Cierre de caja | Cerrar la caja del día | El total coincide con 'Ventas de hoy' del tablero y se registra el cierre | Tablero $ 70.000 · Caja $ 70.000; 'Caja del 2026-11-19 cerrada.' | **Cumple** | `14-caja-cerrada.png` |
| CP-16 | Crear usuario | Primero datos inválidos; luego ana.perez / Ana Pérez / Mesero | Errores por campo; luego el usuario aparece activo | Errores: ['contrasena', 'nombre', 'usuario']; 'Usuario ana.perez creado.' | **Cumple** | — |
| CP-17 | Usuario desactivado | Ingresar como ana.perez después de desactivarla | Login rechazado con mensaje claro | Usuario desactivado. Consulte al administrador. | **Cumple** | — |
| CP-18 | Insumo inválido | Nombre vacío y stock mínimo -2 | Errores por campo | {'nombre': 'Escriba el nombre del insumo.', 'stock_minimo': 'Debe ser mayor o igual a 0.'} | **Cumple** | `17-inventario-validacion.png` |
| CP-19 | Plato sin receta | Formulario vacío | Errores en nombre, precio y receta | {'nombre': 'Escriba el nombre del plato.', 'precio': 'Indique el precio.', 'receta': 'La receta debe tener al menos un insumo.'} | **Cumple** | `18-platos-validacion.png` |
| CP-20 | Aviso de expiración y renovación | Token al que le quedan 4 minutos | Aviso con 'Renovar sesión'; al renovar el aviso desaparece | '⏳ Su sesión vence en 4 min. Renuévela para no perder lo que está haciendo.'; visible tras renovar: False | **Cumple** | `19-aviso-sesion.png` |
| CP-21 | Sesión expirada | Token vencido al recargar | Vuelve al login con un aviso explicativo | ⏳ Su sesión expiró. Ingrese de nuevo para continuar. | **Cumple** | `20-sesion-expirada.png` |

Las capturas están en `docs/capturas/final/`.
