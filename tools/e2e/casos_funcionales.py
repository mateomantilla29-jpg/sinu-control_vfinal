"""
Casos de prueba funcionales de Sinu Control ejecutados en un navegador real (Playwright).

Registra para cada caso: entrada, resultado esperado, resultado obtenido y captura.
Genera docs/pruebas/casos_funcionales.json y las capturas en docs/capturas/final/.

Requisitos: API (python app.py) y frontend (npm run dev) encendidos, y datos recien
cargados con `python scripts/seed.py --si`.
    pip install playwright python-dotenv pyjwt && python -m playwright install chromium
    python tools/e2e/casos_funcionales.py
"""

import json
import os
import sys
import time
from pathlib import Path

import jwt
from dotenv import dotenv_values
from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parents[2]
CAPTURAS = RAIZ / "docs" / "capturas" / "final"
SALIDA = RAIZ / "docs" / "pruebas" / "casos_funcionales.json"
BASE = os.getenv("SINU_URL", "http://localhost:5173")
SECRET = dotenv_values(RAIZ / "api" / ".env").get("SECRET_KEY")
CHROME = os.getenv("CHROME_PATH")  # opcional: usar un Chrome instalado

casos, errores_consola, llamadas_api = [], [], []


def caso(codigo, nombre, entrada, esperado, obtenido, cumple, captura=None):
    casos.append({"codigo": codigo, "nombre": nombre, "entrada": entrada, "esperado": esperado,
                  "obtenido": obtenido, "resultado": "Cumple" if cumple else "No cumple", "captura": captura})
    print(("OK " if cumple else "FALLA ") + codigo, "-", obtenido)


def foto(page, nombre, completa=True):
    page.evaluate("document.querySelector('#toasts') && (document.querySelector('#toasts').innerHTML = '')")
    page.wait_for_timeout(300)
    page.screenshot(path=str(CAPTURAS / f"{nombre}.png"), full_page=completa)
    return f"docs/capturas/final/{nombre}.png"


def limpiar_toasts(page):
    page.evaluate("document.querySelector('#toasts').innerHTML = ''")


def esperar_toast(page):
    page.wait_for_selector(".toast-sinu")
    texto = page.locator(".toast-sinu").last.inner_text()
    limpiar_toasts(page)
    return texto


def ingresar(page, usuario, clave):
    page.goto(f"{BASE}/#login")
    page.wait_for_selector("#loginForm")
    page.fill("[name=usuario]", usuario)
    page.fill("[name=contrasena]", clave)
    page.click("#btnIngresar")


def salir(page):
    page.click(".btn-usuario")
    page.click("[data-action=logout]")
    page.wait_for_selector("#loginForm")


def errores_de(page, form):
    return {el.get_attribute("data-error-de"): el.inner_text()
            for el in page.locator(f"{form} [data-error-de]").all() if el.inner_text().strip()}


def main():
    CAPTURAS.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        navegador = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"]) if CHROME else p.chromium.launch()
        page = navegador.new_page(viewport={"width": 1280, "height": 900}, locale="es-CO")
        page.on("console", lambda m: m.type == "error" and errores_consola.append(m.text))
        page.on("pageerror", lambda e: errores_consola.append(str(e)))
        page.on("request", lambda r: "/api/" in r.url and llamadas_api.append(r.url))

        # CP-01 login vacío
        page.goto(f"{BASE}/#login"); page.wait_for_selector("#loginForm")
        antes = len(llamadas_api); page.click("#btnIngresar")
        errs = errores_de(page, "#loginForm")
        caso("CP-01", "Login sin datos", "Usuario y contraseña vacíos", "Error en cada campo sin llamar a la API",
             f"{errs}; llamadas a la API: {len(llamadas_api) - antes}",
             set(errs) == {"usuario", "contrasena"} and len(llamadas_api) == antes, foto(page, "01-login-validacion", False))

        # CP-02 contraseña incorrecta
        ingresar(page, "admin", "incorrecta"); page.wait_for_function("document.querySelector('[data-error-general]').innerText.length > 0")
        msg = page.inner_text("[data-error-general]")
        caso("CP-02", "Login con contraseña incorrecta", "admin / contraseña errada", "Mensaje 'Usuario o contraseña incorrectos.' (401)",
             msg, "incorrectos" in msg)

        # CP-03 mesero entra a mesas
        ingresar(page, "mesero", "mesero123"); page.wait_for_selector(".mapa")
        n = page.locator(".mesa").count()
        caso("CP-03", "Login del mesero", "mesero / contraseña de prueba", "Entra al mapa con 9 mesas",
             f"Vista #{page.url.split('#')[-1]} con {n} mesas", n == 9 and page.url.endswith("#mesas"), foto(page, "02-mesero-mesas"))

        # CP-04 pedido
        page.click("[data-mesa='3']"); page.wait_for_selector(".menu-lista")
        mas = page.locator(".menu-fila", has_text="Mojarra").locator("[data-accion=mas]")
        mas.click(); mas.click()
        foto(page, "03-mesa3-panel-pedido", False)
        page.click("[data-accion=confirmar]"); page.click("[data-respuesta=si]")
        t = esperar_toast(page); page.wait_for_timeout(600)
        estado = page.locator("[data-mesa='3'] .mesa-txt").inner_text()
        caso("CP-04", "Crear pedido", "Mesa 3: 2 × Mojarra frita con patacón", "Pedido enviado a cocina y mesa 3 ocupada",
             f"'{t}'; mesa 3: {estado}", "enviado a cocina" in t and estado == "Ocupada", foto(page, "04-pedido-mesa3"))

        # CP-05 permiso por rol
        page.goto(f"{BASE}/#tablero"); page.wait_for_selector(".contenedor")
        txt = page.inner_text("#page-root")
        caso("CP-05", "Mesero abre una vista de administrador", "URL #tablero con sesión de mesero",
             "Mensaje de permisos insuficientes", txt.splitlines()[1] if len(txt.splitlines()) > 1 else txt, "No tiene permisos" in txt)

        # CP-16 cambio de contraseña (mesero)
        page.goto(f"{BASE}/#perfil"); page.wait_for_selector("#formClave")
        page.fill("#formClave [name=actual]", "mesero123"); page.fill("#formClave [name=nueva]", "123"); page.fill("#formClave [name=confirmacion]", "999")
        page.click("#formClave [type=submit]")
        errs = errores_de(page, "#formClave"); foto(page, "05-perfil-validacion")
        page.fill("#formClave [name=nueva]", "mesero456"); page.fill("#formClave [name=confirmacion]", "mesero456")
        page.click("#formClave [type=submit]"); t = esperar_toast(page)
        salir(page); ingresar(page, "mesero", "mesero456"); page.wait_for_selector(".mapa")
        ok_nueva = page.url.endswith("#mesas")
        page.goto(f"{BASE}/#perfil"); page.wait_for_selector("#formClave")
        page.fill("#formClave [name=actual]", "mesero456"); page.fill("#formClave [name=nueva]", "mesero123"); page.fill("#formClave [name=confirmacion]", "mesero123")
        page.click("#formClave [type=submit]"); esperar_toast(page)
        caso("CP-06", "Cambiar contraseña", "Nueva '123' y confirmación distinta; luego una válida",
             "Errores por campo; con datos válidos se cambia y el login funciona con la nueva",
             f"Errores: {sorted(errs)}; '{t}'; login con la nueva: {'sí' if ok_nueva else 'no'}",
             set(errs) == {"nueva", "confirmacion"} and ok_nueva)
        salir(page)

        # Admin
        ingresar(page, "admin", "admin123"); page.wait_for_selector(".kpis")
        foto(page, "06-admin-tablero")
        page.click("nav.tabs [data-view=cocina]"); page.wait_for_selector("[data-avanzar]")
        foto(page, "07-cocina-ticket")
        estados = []
        for _ in range(3):
            page.click("[data-avanzar]"); estados.append(esperar_toast(page).split(": ")[-1].rstrip(".")); page.wait_for_timeout(800)
        caso("CP-07", "Avanzar pedido en cocina", "Tres clics sobre el ticket PED-1",
             "pendiente → en preparación → listo → entregado", " → ".join(estados), estados[-1].startswith("Entregado"))

        page.click("nav.tabs [data-view=lotes]"); page.wait_for_selector("[data-merma]")
        filas = page.locator("tbody tr", has_text="Pescado blanco").all_inner_texts()
        caso("CP-08", "FEFO en lotes", "Pedido de 2 Mojarras (0,5 kg de pescado c/u)",
             "Se descuenta 1 kg del lote de pescado que vence primero", " | ".join(f.split("\t")[0] + " " + f.split("\t")[2] for f in filas),
             "3 / 4" in filas[0] and "8 / 8" in filas[1], foto(page, "08-lotes-fefo"))

        fila = page.locator("tbody tr", has_text="Arroz")
        fila.locator("[data-merma]").click(); page.wait_for_selector("#formModal")
        antes = len(llamadas_api)
        page.fill("#formModal [name=cantidad]", "999"); page.fill("#formModal [name=motivo]", "x"); page.click("#formModal [type=submit]")
        errs = errores_de(page, "#formModal")
        caso("CP-09", "Merma inválida", "Cantidad 999 (el lote tiene 20 kg) y motivo 'x'", "Errores por campo sin llamar a la API",
             f"{errs}; llamadas: {len(llamadas_api) - antes}", set(errs) == {"cantidad", "motivo"} and len(llamadas_api) == antes,
             foto(page, "09-merma-validacion", False))
        page.fill("#formModal [name=cantidad]", "1.5"); page.fill("#formModal [name=motivo]", "Bolsa rota en bodega"); page.click("#formModal [type=submit]")
        t = esperar_toast(page); page.wait_for_timeout(600)
        arroz = page.locator("tbody tr", has_text="Arroz").inner_text().split("\t")[2]
        caso("CP-10", "Registrar merma", "Lote de Arroz: 1,5 kg, motivo 'Bolsa rota en bodega'",
             "El lote baja a 18,5 kg y queda el movimiento", f"'{t}'; lote: {arroz}", "18,5 / 20" in arroz)

        page.fill("#formLote [name=cantidad]", "3"); page.select_option("#formLote [name=insumo_id]", label="Limón (unidad)")
        page.fill("#formLote [name=fecha_vencimiento]", "2020-01-01"); page.click("#formLote [type=submit]")
        errs = errores_de(page, "#formLote")
        caso("CP-11", "Lote con vencimiento anterior al ingreso", "Vencimiento 2020-01-01", "Error en el campo de vencimiento",
             str(errs), "fecha_vencimiento" in errs)

        page.click("nav.tabs [data-view=mermas]"); page.wait_for_selector("#btnBajaTodos")
        foto(page, "10-mermas-vencidos")
        page.click("#btnBajaTodos"); page.click("[data-respuesta=si]"); t = esperar_toast(page); page.wait_for_timeout(800)
        hist = page.locator(".tarjeta", has_text="Historial de mermas").locator("tbody tr").count()
        caso("CP-12", "Baja de lotes vencidos", "Botón 'Dar de baja todos'", "2 lotes dados de baja y 3 mermas en el historial",
             f"'{t}'; filas en historial: {hist}", "2 lote" in t and hist == 3, foto(page, "11-mermas-historial"))

        page.click("nav.tabs [data-view=reportes]"); page.wait_for_selector("#reportesCuerpo table")
        top = page.locator(".tarjeta", has_text="Platos más vendidos").locator("tbody tr").first.inner_text().replace("\t", " | ")
        caso("CP-13", "Reporte de más vendidos", "Últimos 7 días", "Mojarra: 2 unidades, $ 70.000", top,
             "Mojarra" in top and "70.000" in top, foto(page, "12-reportes"))
        page.fill("#formFiltro [name=desde]", "2026-12-31"); page.fill("#formFiltro [name=hasta]", "2026-01-01"); page.click("#formFiltro [type=submit]")
        errs = errores_de(page, "#formFiltro")
        caso("CP-14", "Reporte con fechas invertidas", "Desde 31/12/2026, hasta 01/01/2026", "Error en 'hasta' sin consultar",
             str(errs), "hasta" in errs)

        page.click("nav.tabs [data-view=tablero]"); page.wait_for_selector(".kpis")
        ventas_tablero = page.locator(".kpi").first.locator(".v").inner_text()
        page.click("nav.tabs [data-view=caja]"); page.wait_for_selector(".cifra-grande")
        ventas_caja = page.inner_text(".cifra-grande")
        foto(page, "13-caja-antes")
        page.click("#formCierre [type=submit]"); page.click("[data-respuesta=si]"); t = esperar_toast(page); page.wait_for_timeout(600)
        caso("CP-15", "Cierre de caja", "Cerrar la caja del día", "El total coincide con 'Ventas de hoy' del tablero y se registra el cierre",
             f"Tablero {ventas_tablero} · Caja {ventas_caja}; '{t}'", ventas_tablero == ventas_caja and "cerrada" in t,
             foto(page, "14-caja-cerrada"))

        page.click("nav.tabs [data-view=usuarios]"); page.wait_for_selector("#formUsuario")
        page.fill("#formUsuario [name=usuario]", "Ana Pérez"); page.fill("#formUsuario [name=contrasena]", "12"); page.click("#formUsuario [type=submit]")
        errs = errores_de(page, "#formUsuario"); foto(page, "15-usuarios-validacion")
        page.fill("#formUsuario [name=usuario]", "ana.perez"); page.fill("#formUsuario [name=nombre]", "Ana Pérez"); page.fill("#formUsuario [name=contrasena]", "clave123")
        page.click("#formUsuario [type=submit]"); t = esperar_toast(page); page.wait_for_timeout(600)
        caso("CP-16", "Crear usuario", "Primero datos inválidos; luego ana.perez / Ana Pérez / Mesero",
             "Errores por campo; luego el usuario aparece activo", f"Errores: {sorted(errs)}; '{t}'",
             set(errs) == {"usuario", "nombre", "contrasena"} and "creado" in t)
        page.locator("tbody tr", has_text="ana.perez").locator("[data-estado]").click(); page.click("[data-respuesta=si]"); esperar_toast(page)
        page.wait_for_timeout(500); foto(page, "16-usuarios-lista")
        salir(page); ingresar(page, "ana.perez", "clave123"); page.wait_for_function("document.querySelector('[data-error-general]').innerText.length > 0")
        msg = page.inner_text("[data-error-general]")
        caso("CP-17", "Usuario desactivado", "Ingresar como ana.perez después de desactivarla", "Login rechazado con mensaje claro",
             msg, "desactivado" in msg.lower())

        ingresar(page, "admin", "admin123"); page.wait_for_selector(".kpis")
        page.click("nav.tabs [data-view=inventario]"); page.wait_for_selector("#formInsumo")
        page.fill("#formInsumo [name=stock_minimo]", "-2"); page.click("#formInsumo [type=submit]")
        errs = errores_de(page, "#formInsumo")
        caso("CP-18", "Insumo inválido", "Nombre vacío y stock mínimo -2", "Errores por campo", str(errs),
             {"nombre", "stock_minimo"} <= set(errs), foto(page, "17-inventario-validacion", False))

        page.click("nav.tabs [data-view=platos]"); page.wait_for_selector("#formPlato"); page.click("#formPlato [type=submit]")
        errs = errores_de(page, "#formPlato")
        caso("CP-19", "Plato sin receta", "Formulario vacío", "Errores en nombre, precio y receta", str(errs),
             {"nombre", "precio", "receta"} <= set(errs), foto(page, "18-platos-validacion", False))

        # Sesión
        token = page.evaluate("JSON.parse(localStorage.getItem('sinu_control_access_token'))")
        datos = jwt.decode(token, options={"verify_signature": False})
        corto = jwt.encode({**datos, "exp": int(time.time()) + 240}, SECRET, algorithm="HS256")
        page.evaluate(f"localStorage.setItem('sinu_control_access_token', JSON.stringify('{corto}'))")
        page.reload(); page.wait_for_selector("#avisoSesion:not([hidden])", timeout=8000)
        aviso = page.inner_text("#avisoSesion"); captura = foto(page, "19-aviso-sesion", False)
        page.click("[data-renovar-sesion]"); page.wait_for_timeout(1200)
        caso("CP-20", "Aviso de expiración y renovación", "Token al que le quedan 4 minutos",
             "Aviso con 'Renovar sesión'; al renovar el aviso desaparece",
             f"'{aviso.splitlines()[0]}'; visible tras renovar: {page.is_visible('#avisoSesion')}",
             "vence en" in aviso and not page.is_visible("#avisoSesion"), captura)
        vencido = jwt.encode({**datos, "exp": int(time.time()) - 5}, SECRET, algorithm="HS256")
        page.evaluate(f"localStorage.setItem('sinu_control_access_token', JSON.stringify('{vencido}'))")
        page.reload(); page.wait_for_selector(".aviso-login", timeout=8000)
        caso("CP-21", "Sesión expirada", "Token vencido al recargar", "Vuelve al login con un aviso explicativo",
             page.inner_text(".aviso-login"), "expiró" in page.inner_text(".aviso-login"), foto(page, "20-sesion-expirada", False))
        navegador.close()

    relevantes = [e for e in errores_consola if "401" not in e]
    SALIDA.write_text(json.dumps({"fecha": time.strftime("%Y-%m-%d %H:%M"), "casos": casos,
                                  "errores_consola": relevantes}, ensure_ascii=False, indent=2), encoding="utf-8")
    fallas = [c for c in casos if c["resultado"] != "Cumple"]
    print(f"\n{len(casos) - len(fallas)}/{len(casos)} casos cumplen. Errores de consola: {relevantes}")
    sys.exit(1 if fallas or relevantes else 0)


if __name__ == "__main__":
    main()
