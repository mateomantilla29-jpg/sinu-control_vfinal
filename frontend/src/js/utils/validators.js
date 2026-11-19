/*
 * Validación en el cliente, coherente con los DTO de la API (marshmallow).
 * Cada regla recibe (valor, valores) y devuelve un mensaje de error o ''.
 * Así el usuario ve el error junto al campo antes de enviar nada a la API;
 * la API vuelve a validar y responde 400 con el detalle por campo.
 */

const vacio = (v) => v === undefined || v === null || String(v).trim() === '';

export const reglas = {
  requerido: (msg = 'Este campo es obligatorio.') => (v) => (vacio(v) ? msg : ''),

  longitud: (min, max, msg) => (v) => {
    if (vacio(v)) return '';
    const n = String(v).trim().length;
    return n < min || n > max ? msg ?? `Debe tener entre ${min} y ${max} caracteres.` : '';
  },

  patron: (regex, msg) => (v) => (vacio(v) || regex.test(String(v)) ? '' : msg),

  numero: ({ min = null, max = null, minExclusivo = false, entero = false, msg } = {}) => (v) => {
    if (vacio(v)) return '';
    const n = Number(v);
    if (!Number.isFinite(n)) return 'Debe ser un número válido.';
    if (entero && !Number.isInteger(n)) return 'Debe ser un número entero.';
    if (min !== null && (minExclusivo ? n <= min : n < min)) {
      return msg ?? (minExclusivo ? `Debe ser mayor que ${min}.` : `Debe ser mayor o igual a ${min}.`);
    }
    if (max !== null && n > max) return msg ?? `Debe ser menor o igual a ${max}.`;
    return '';
  },

  fecha: (msg = 'Fecha no válida.') => (v) => (vacio(v) || /^\d{4}-\d{2}-\d{2}$/.test(v) ? '' : msg),

  fechaNoFutura: (hoyIso, msg = 'La fecha no puede ser futura.') => (v) => (vacio(v) || v <= hoyIso ? '' : msg),

  /** Compara con otro campo: (v, valores) => v >= valores[otro] */
  fechaNoAnteriorA: (otro, msg) => (v, valores) =>
    vacio(v) || vacio(valores[otro]) || v >= valores[otro] ? '' : msg,

  igualA: (otro, msg) => (v, valores) => (v === valores[otro] ? '' : msg),

  distintoDe: (otro, msg) => (v, valores) => (vacio(v) || v !== valores[otro] ? '' : msg),

  maximo: (limite, msg) => (v) => (vacio(v) || Number(v) <= limite + 1e-9 ? '' : msg),
};

/**
 * Valida `valores` con `esquema` ({ campo: [regla, ...] }).
 * Devuelve { campo: 'mensaje' } solo con los campos que fallan (primer error de cada uno).
 */
export function validar(valores, esquema) {
  const errores = {};
  for (const [campo, listaReglas] of Object.entries(esquema)) {
    for (const regla of listaReglas) {
      const mensaje = regla(valores[campo], valores);
      if (mensaje) {
        errores[campo] = mensaje;
        break;
      }
    }
  }
  return errores;
}

export function esValido(errores) {
  return Object.keys(errores).length === 0;
}

// ---------------- Esquemas compartidos (mismas reglas que los DTO del servidor) ----------------

export const PATRON_USUARIO = /^[a-z0-9._-]{3,50}$/;
export const MIN_CLAVE = 6;

export const esquemaLogin = {
  usuario: [reglas.requerido('Escriba su usuario.')],
  contrasena: [reglas.requerido('Escriba su contraseña.')],
};

export const esquemaInsumo = {
  nombre: [reglas.requerido('Escriba el nombre del insumo.'), reglas.longitud(1, 100)],
  unidad: [reglas.requerido('Seleccione la unidad.')],
  stock_minimo: [reglas.requerido('Indique el stock mínimo.'), reglas.numero({ min: 0 })],
  dias_alerta: [reglas.numero({ min: 0, entero: true })],
};

export function esquemaLote(hoyIso) {
  return {
    insumo_id: [reglas.requerido('Seleccione un insumo.')],
    cantidad: [reglas.requerido('Indique la cantidad.'), reglas.numero({ min: 0, minExclusivo: true })],
    fecha_ingreso: [reglas.requerido('Indique la fecha de ingreso.'), reglas.fecha(), reglas.fechaNoFutura(hoyIso, 'La fecha de ingreso no puede ser futura.')],
    fecha_vencimiento: [
      reglas.requerido('Indique la fecha de vencimiento.'),
      reglas.fecha(),
      reglas.fechaNoAnteriorA('fecha_ingreso', 'El vencimiento no puede ser anterior al ingreso.'),
    ],
  };
}

export const esquemaPlato = {
  nombre: [reglas.requerido('Escriba el nombre del plato.'), reglas.longitud(1, 120)],
  precio: [reglas.requerido('Indique el precio.'), reglas.numero({ min: 1, entero: true, msg: 'El precio debe ser un entero mayor que 0.' })],
};

export function esquemaMerma(maximo) {
  return {
    cantidad: [
      reglas.requerido('Indique la cantidad.'),
      reglas.numero({ min: 0, minExclusivo: true }),
      reglas.maximo(maximo, `No puede superar lo que queda en el lote (${maximo}).`),
    ],
    motivo: [reglas.requerido('Describa el motivo.'), reglas.longitud(3, 200, 'Describa el motivo (3 a 200 caracteres).')],
  };
}

const reglasNombre = [reglas.requerido('Escriba el nombre.'), reglas.longitud(2, 100, 'El nombre debe tener entre 2 y 100 caracteres.')];
const reglaClave = reglas.longitud(MIN_CLAVE, 128, `La contraseña debe tener al menos ${MIN_CLAVE} caracteres.`);

export const esquemaUsuarioNuevo = {
  usuario: [
    reglas.requerido('Escriba el usuario de acceso.'),
    reglas.patron(PATRON_USUARIO, 'Use de 3 a 50 caracteres: minúsculas, números, punto, guion o guion bajo.'),
  ],
  nombre: reglasNombre,
  rol: [reglas.requerido('Seleccione el rol.')],
  contrasena: [reglas.requerido('Escriba una contraseña.'), reglaClave],
};

export const esquemaUsuarioEditar = {
  nombre: reglasNombre,
  rol: [reglas.requerido('Seleccione el rol.')],
  contrasena: [reglaClave],
};

export const esquemaPerfil = { nombre: reglasNombre };

export const esquemaContrasena = {
  actual: [reglas.requerido('Escriba su contraseña actual.')],
  nueva: [reglas.requerido('Escriba la nueva contraseña.'), reglaClave, reglas.distintoDe('actual', 'La nueva contraseña debe ser distinta de la actual.')],
  confirmacion: [reglas.requerido('Confirme la nueva contraseña.'), reglas.igualA('nueva', 'La confirmación no coincide con la nueva contraseña.')],
};

export const esquemaFiltroFechas = {
  desde: [reglas.requerido('Indique la fecha inicial.'), reglas.fecha()],
  hasta: [reglas.requerido('Indique la fecha final.'), reglas.fecha(), reglas.fechaNoAnteriorA('desde', 'La fecha final no puede ser anterior a la inicial.')],
};
