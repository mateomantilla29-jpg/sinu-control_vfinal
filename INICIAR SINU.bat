@echo off
setlocal EnableExtensions
title SINU Control - Lanzador
cd /d "%~dp0"
echo ============================================
echo   SINU CONTROL  -  Gastrobar Sinu, Bello
echo ============================================
echo.

rem ---------- Python ----------
set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY where python >nul 2>nul && set "PY=python"
if not defined PY goto sin_python

rem ---------- API ----------
echo [1/5] Preparando la API...
cd /d "%~dp0api"
"venv\Scripts\python.exe" -c "import flask, flask_cors, jwt, marshmallow" >nul 2>nul
if errorlevel 1 (
  echo       Instalando dependencias de Python (solo la primera vez^)...
  if exist "venv" rmdir /s /q "venv"
  %PY% -m venv venv || goto error
  "venv\Scripts\python.exe" -m pip install --disable-pip-version-check -q -r requirements.txt || goto error
)

if not exist ".env" copy ".env.example" ".env" >nul
"venv\Scripts\python.exe" -c "import re,secrets,pathlib;p=pathlib.Path('.env');t=p.read_text(encoding='utf-8');t=re.sub(r'(?m)^SECRET_KEY=\s*$','SECRET_KEY='+secrets.token_hex(32),t);p.write_text(t,encoding='utf-8')" || goto error

echo [2/5] Base de datos...
set "NUEVA=0"
if not exist "instance\sinu.db" set "NUEVA=1"
"venv\Scripts\python.exe" -m flask --app app:crear_app db upgrade || goto error
if "%NUEVA%"=="1" (
  echo       Cargando datos de ejemplo...
  "venv\Scripts\python.exe" scripts\seed.py --si || goto error
)

echo [3/5] Encendiendo la API (puerto 5000)...
start "SINU API" /D "%~dp0api" cmd /k "venv\Scripts\python.exe app.py"

rem ---------- Frontend ----------
echo [4/5] Encendiendo la aplicacion (puerto 5173)...
cd /d "%~dp0frontend"
where node >nul 2>nul || goto sin_node
if not exist ".env" copy ".env.example" ".env" >nul
if not exist "node_modules" (
  echo       Instalando dependencias de Node (solo la primera vez^)...
  call npm install || goto error
)
start "SINU Frontend" /D "%~dp0frontend" cmd /k "npm run dev"

echo [5/5] Esperando a que todo responda...
set /a N=0
:esperar
set /a N+=1
powershell -NoProfile -Command "try{$a=(Invoke-WebRequest -UseBasicParsing http://localhost:5000/health -TimeoutSec 2).StatusCode;$b=(Invoke-WebRequest -UseBasicParsing http://localhost:5173/ -TimeoutSec 2).StatusCode;if($a -eq 200 -and $b -eq 200){exit 0}else{exit 1}}catch{exit 1}" >nul 2>nul && goto listo
if %N% GEQ 60 goto lento
ping -n 2 127.0.0.1 >nul
goto esperar

:listo
start "" "http://localhost:5173"
echo.
echo  SINU Control listo:  http://localhost:5173
echo    Administrador:  admin  / admin123
echo    Mesero:         mesero / mesero123
echo.
echo  Para apagar: cierre las ventanas "SINU API" y "SINU Frontend".
echo.
pause
exit /b 0

:lento
echo.
echo  Tarda mas de lo normal. Revise la ventana "SINU API": si muestra un error, enviele una captura a soporte.
pause
exit /b 1

:sin_python
echo [ERROR] No se encontro Python. Instalelo desde https://www.python.org/downloads/ marcando "Add python.exe to PATH".
pause
exit /b 1

:sin_node
echo [ERROR] No se encontro Node.js. Instale la version LTS desde https://nodejs.org/
pause
exit /b 1

:error
echo.
echo [ERROR] Fallo el paso anterior. Lea el mensaje de arriba.
pause
exit /b 1
