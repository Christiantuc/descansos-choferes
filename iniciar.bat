@echo off
cd /d "%~dp0"

where node >nul 2>&1
if %errorlevel% neq 0 (
  if exist "C:\Program Files\nodejs\node.exe" (
    set "PATH=C:\Program Files\nodejs;%PATH%"
  ) else (
    echo Node.js no esta instalado. Descarguelo desde https://nodejs.org/
    pause
    exit /b 1
  )
)

if not exist "node_modules\" (
  echo Instalando dependencias...
  call npm install
  if %errorlevel% neq 0 (
    echo Error al instalar dependencias.
    pause
    exit /b 1
  )
)

findstr /R /C:"^SMTP_PASS=.\+" .env >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo ========================================
  echo  ATENCION: SMTP_PASS esta vacio en .env
  echo ========================================
  echo  Abra .env y pegue la contraseña de aplicacion de Gmail en:
  echo  SMTP_PASS=sucontraseña
  echo  Guia: GMAIL-CONFIG.md
  echo ========================================
  echo.
)

echo.
echo Servidor en http://localhost:3000
echo Presione Ctrl+C para detener.
echo.
node server/index.js
pause
