@echo off
cd /d "%~dp0"

if exist "C:\Program Files\Git\cmd\git.exe" (
  set "PATH=C:\Program Files\Git\cmd;%PATH%"
)
if exist "C:\Program Files\nodejs\node.exe" (
  set "PATH=C:\Program Files\nodejs;%PATH%"
)
if exist "C:\Program Files\GitHub CLI\gh.exe" (
  set "PATH=C:\Program Files\GitHub CLI;%PATH%"
)

echo ========================================
echo  Subir Descansos a GitHub (Christiantuc)
echo ========================================
echo.

where git >nul 2>&1
if %errorlevel% neq 0 (
  echo Git no esta instalado. Ejecute de nuevo despues de instalar Git.
  pause
  exit /b 1
)

if not exist ".git\" (
  echo Inicializando repositorio...
  git init
  git branch -M main
)

echo Agregando archivos...
git add .
git status --short

echo.
git diff --cached --quiet
if %errorlevel% equ 0 (
  echo No hay cambios nuevos para guardar.
) else (
  git commit -m "App descansos de choferes"
  echo Commit creado.
)

echo.
where gh >nul 2>&1
if %errorlevel% equ 0 (
  gh auth status >nul 2>&1
  if %errorlevel% equ 0 (
    echo Creando repositorio en GitHub y subiendo...
    gh repo create descansos-choferes --public --source=. --remote=origin --push
    if %errorlevel% equ 0 (
      echo.
      echo LISTO. Repo: https://github.com/Christiantuc/descansos-choferes
      pause
      exit /b 0
    )
  ) else (
    echo.
    echo Primero inicie sesion en GitHub. Se abrira el navegador:
    gh auth login
    echo.
    echo Luego ejecute este archivo otra vez.
    pause
    exit /b 0
  )
)

echo Si gh no esta disponible, use el metodo manual:
echo.
echo 1. Abra: https://github.com/new
echo 2. Nombre: descansos-choferes
echo 3. Publico, SIN README ni .gitignore
echo 4. Create repository
echo 5. Ejecute estos comandos en esta carpeta:
echo.
echo    git remote add origin https://github.com/Christiantuc/descansos-choferes.git
echo    git push -u origin main
echo.
pause
