# Publicar Sinu Control en GitHub (G1)

El proyecto **ya trae su historial de Git** con un commit por funcionalidad:

```
git log --oneline
```

| Commit | Contenido |
|---|---|
| Avance parcial (50 %) | API Flask por dominios y SPA vanilla |
| Fase A | MySQL 8, guion SQL y limpieza del paquete |
| Fase B (API) | Usuarios, perfil, mermas, reportes, caja y renovación de token |
| Fases B y C (frontend) | Nuevas vistas, estado explícito, validaciones y componentes |
| Fases C4 y D | Validación completa y pruebas |
| Fase E | README y documentación técnica |
| Fase F | Informe HTML |
| Fase G | Guiones, sustentación y revisión final |

Los commits están firmados como `Equipo Sinu Control`. Si quieren que aparezca cada integrante, vean el paso 5.

## 1. Comprobar que no se suben secretos

```powershell
cd sinu-control
git status                 # no debe aparecer api/.env ni frontend/.env
git ls-files | findstr .env  # solo deben salir los .env.example
```

`.env`, `venv/`, `node_modules/`, `instance/` y `__pycache__/` están en `.gitignore`.

## 2. Crear el repositorio vacío en GitHub

**Opción A, recomendada (acceso de solo lectura real):**

1. En GitHub: botón **+** → **New organization** → plan **Free**. Póngale un nombre, por ejemplo `sinu-control-ucc`.
2. Dentro de la organización: **New repository** → nombre `sinu-control` → **Private** → **sin** README, `.gitignore` ni licencia (el proyecto ya los tiene).

**Opción B (cuenta personal):** **New repository** en su cuenta → `sinu-control` → Private. En un repositorio privado de una cuenta personal, GitHub **solo permite dar acceso de escritura** a los colaboradores, no de solo lectura. Si la rúbrica exige "solo lectura", use la opción A o deje el repositorio **Public**.

## 3. Subir el código

```powershell
git remote add origin https://github.com/ORGANIZACION_O_USUARIO/sinu-control.git
git branch -M main
git push -u origin main
```

Si pide credenciales, use un *Personal Access Token* (GitHub → Settings → Developer settings → Tokens) o inicie sesión con GitHub Desktop o con `gh auth login`.

## 4. Dar acceso de lectura a rortegani@gmail.com

- **Opción A (organización):** en el repositorio → **Settings** → **Collaborators and teams** → **Add people** → escriba `rortegani@gmail.com` → rol **Read** → **Add**.
- **Opción B (cuenta personal privada):** **Settings** → **Collaborators** → **Add people** → `rortegani@gmail.com`. Quedará con escritura (limitación de GitHub).
- **Repositorio público:** cualquiera puede leerlo; envíe el enlace al docente.

El docente recibe una invitación por correo y debe aceptarla. Compruebe que aparece como *Pending invite* o como colaborador.

## 5. (Opcional) Commits a nombre de cada integrante

Cada integrante configura su identidad antes de hacer nuevos commits:

```powershell
git config user.name "Nombre Apellido"
git config user.email "correo@ucc.edu.co"
```

Para reasignar los commits existentes a quien sube el repositorio (antes del primer `push`):

```powershell
git rebase -r --root --exec "git commit --amend --no-edit --reset-author"
```

Para próximos cambios, trabajen con ramas y *pull requests*:

```powershell
git switch -c feature/nombre-corto
git add .
git commit -m "Fase X: que se hizo"
git push -u origin feature/nombre-corto   # luego abran el Pull Request en GitHub
```

## 6. Verificación final

- [ ] El repositorio muestra el README en la portada.
- [ ] `git log` en GitHub muestra los commits por fase.
- [ ] No hay archivos `.env` (busque ".env" en el repositorio).
- [ ] rortegani@gmail.com aparece con rol **Read** (o el repositorio es público).
- [ ] El enlace del repositorio está en la portada del informe HTML.
