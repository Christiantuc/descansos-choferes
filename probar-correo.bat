@echo off
cd /d "%~dp0"

if exist "C:\Program Files\nodejs\node.exe" (
  set "PATH=C:\Program Files\nodejs;%PATH%"
)

echo Probando configuracion de Gmail...
call npm run verificar-correo
pause
