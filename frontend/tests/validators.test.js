import { describe, expect, it } from 'vitest';
import {
  esquemaContrasena,
  esquemaFiltroFechas,
  esquemaInsumo,
  esquemaLote,
  esquemaMerma,
  esquemaUsuarioNuevo,
  esValido,
  validar,
} from '../src/js/utils/validators.js';

describe('validación de formularios (coherente con los DTO)', () => {
  it('insumo: nombre obligatorio y stock mínimo no negativo', () => {
    const errores = validar({ nombre: '', unidad: 'kg', stock_minimo: '-1', dias_alerta: '' }, esquemaInsumo);
    expect(Object.keys(errores).sort()).toEqual(['nombre', 'stock_minimo']);
    expect(esValido(validar({ nombre: 'Pargo', unidad: 'kg', stock_minimo: '2', dias_alerta: '' }, esquemaInsumo))).toBe(true);
  });

  it('lote: cantidad > 0, ingreso no futuro y vencimiento no anterior al ingreso', () => {
    const errores = validar(
      { insumo_id: '1', cantidad: '0', fecha_ingreso: '2026-11-20', fecha_vencimiento: '2026-11-01' },
      esquemaLote('2026-11-19'),
    );
    expect(errores).toEqual({
      cantidad: 'Debe ser mayor que 0.',
      fecha_ingreso: 'La fecha de ingreso no puede ser futura.',
      fecha_vencimiento: 'El vencimiento no puede ser anterior al ingreso.',
    });
  });

  it('usuario nuevo: patrón del usuario de acceso y contraseña mínima', () => {
    const errores = validar({ usuario: 'Ana Pérez', nombre: 'Ana', rol: 'mesero', contrasena: '123' }, esquemaUsuarioNuevo);
    expect(Object.keys(errores).sort()).toEqual(['contrasena', 'usuario']);
  });

  it('contraseña: confirmación igual y nueva distinta de la actual', () => {
    expect(validar({ actual: 'abc123', nueva: 'abc123', confirmacion: 'abc123' }, esquemaContrasena)).toHaveProperty('nueva');
    expect(validar({ actual: 'abc123', nueva: 'nueva456', confirmacion: 'otra' }, esquemaContrasena)).toHaveProperty('confirmacion');
    expect(esValido(validar({ actual: 'abc123', nueva: 'nueva456', confirmacion: 'nueva456' }, esquemaContrasena))).toBe(true);
  });

  it('merma: no supera lo que queda en el lote', () => {
    expect(validar({ cantidad: '3', motivo: 'Derrame' }, esquemaMerma(2))).toHaveProperty('cantidad');
    expect(esValido(validar({ cantidad: '2', motivo: 'Derrame' }, esquemaMerma(2)))).toBe(true);
  });

  it('filtro de fechas: la final no puede ser anterior a la inicial', () => {
    expect(validar({ desde: '2026-11-10', hasta: '2026-11-01' }, esquemaFiltroFechas)).toHaveProperty('hasta');
  });
});
