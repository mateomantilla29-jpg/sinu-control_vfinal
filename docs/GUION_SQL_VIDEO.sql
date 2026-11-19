-- =====================================================================
-- SINU CONTROL · Guion de consultas para el video (MySQL 8 Workbench)
-- Objetivo: demostrar que un pedido creado en la app queda en MySQL
-- (pedidos, pedido_items, consumos, lotes y movimientos).
-- =====================================================================
-- PASO 0. Antes de grabar: python scripts/seed.py --si
-- PASO 1. Ejecute la consulta A ("antes") y deje el resultado visible.
-- PASO 2. En la app, como Mesero: Mesa 3 -> 2 x "Mojarra frita con patacón" -> Confirmar.
-- PASO 3. Ejecute B, C, D, E y F (ya apuntan al último pedido).
-- =====================================================================

SET NAMES utf8mb4;
USE sinu_db;

-- A. ANTES del pedido: lotes de Pescado blanco en orden FEFO
SELECT l.id AS lote, i.nombre AS insumo, l.cantidad_actual, l.fecha_vencimiento
FROM lotes l
JOIN insumos i ON i.id = l.insumo_id
WHERE i.nombre = 'Pescado blanco' AND l.cantidad_actual > 0
ORDER BY l.fecha_vencimiento, l.fecha_ingreso, l.id;

-- Variable con el último pedido creado desde la app
SET @pedido := (SELECT MAX(id) FROM pedidos);

-- B. El pedido (tabla pedidos)
SELECT p.id, CONCAT('PED-', p.id) AS codigo, p.mesa, p.estado, p.total, p.fecha,
       u.usuario AS creado_por
FROM pedidos p
LEFT JOIN usuarios u ON u.id = p.usuario_id
WHERE p.id = @pedido;

-- C. Sus líneas (tabla pedido_items): nombre y precio copiados del plato
SELECT pi.pedido_id, pi.nombre AS plato, pi.cantidad, pi.precio,
       pi.cantidad * pi.precio AS subtotal
FROM pedido_items pi
WHERE pi.pedido_id = @pedido;

-- D. Qué lote se descontó (tabla consumos): FEFO = el que vence primero
SELECT c.pedido_id, i.nombre AS insumo, c.lote_id, c.cantidad AS descontado,
       l.cantidad_actual AS queda_en_lote, l.fecha_vencimiento
FROM consumos c
JOIN insumos i ON i.id = c.insumo_id
JOIN lotes l ON l.id = c.lote_id
WHERE c.pedido_id = @pedido
ORDER BY i.nombre, l.fecha_vencimiento;

-- E. DESPUÉS: los mismos lotes de Pescado blanco (compare con A)
SELECT l.id AS lote, i.nombre AS insumo, l.cantidad_inicial, l.cantidad_actual,
       l.fecha_vencimiento
FROM lotes l
JOIN insumos i ON i.id = l.insumo_id
WHERE i.nombre = 'Pescado blanco'
ORDER BY l.fecha_vencimiento, l.fecha_ingreso, l.id;

-- F. Bitácora de inventario (tabla movimientos) generada por el pedido
SELECT m.id, m.tipo, i.nombre AS insumo, m.lote_id, m.cantidad, m.fecha, m.usuario, m.nota
FROM movimientos m
LEFT JOIN insumos i ON i.id = m.insumo_id
WHERE m.nota LIKE CONCAT('Pedido PED-', @pedido, ' %')
ORDER BY m.id;

-- G. (Opcional) Ventas del día: debe coincidir con el Tablero y el Cierre de caja
SELECT COUNT(*) AS pedidos, COALESCE(SUM(total), 0) AS ventas
FROM pedidos
WHERE DATE(fecha) = CURDATE() AND estado <> 'cancelado';

-- H. (Opcional) Estructura: tablas y llaves foráneas creadas por Alembic
SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'sinu_db' AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME;
