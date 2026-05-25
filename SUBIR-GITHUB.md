# Subir la app a GitHub (Christiantuc)

Ya está preparado el proyecto en tu PC. Solo falta **iniciar sesión en GitHub** y subirlo (un solo paso que vos hacés).

---

## Paso 1 — Iniciar sesión en GitHub (una sola vez)

1. Abrí **PowerShell** o **Símbolo del sistema**.
2. Pegá y ejecutá:

```powershell
cd "c:\Chistian\Mia\Cursor\Descansos"
gh auth login
```

3. Respondé así cuando pregunte:
   - **What account do you want to log into?** → `GitHub.com`
   - **What is your preferred protocol?** → `HTTPS`
   - **Authenticate Git with your GitHub credentials?** → `Yes`
   - **How would you like to authenticate?** → `Login with a web browser`
4. Copiá el código que muestra, presioná Enter, se abre el navegador.
5. Pegá el código en GitHub e iniciá sesión con tu usuario **Christiantuc**.

---

## Paso 2 — Subir el proyecto

**Opción A (recomendada):** en PowerShell, copiá y pegá todo esto:

```powershell
cd "c:\Chistian\Mia\Cursor\Descansos"
gh repo create descansos-choferes --public --source=. --remote=origin --push
```

**Opción B:** doble clic en **`subir-github.bat`** (si Windows dice “no se puede abrir”, usá la Opción A).

Si el repo ya existe, usá solo:

```powershell
git remote add origin https://github.com/Christiantuc/descansos-choferes.git
git push -u origin main
```

---

## Paso 3 — Verificar

Abrí en el navegador:

**https://github.com/Christiantuc/descansos-choferes**

Deberías ver todos los archivos (sin `.env` ni `node_modules`).

---

## Siguiente paso: publicar en internet

Cuando el repo esté en GitHub, seguí **[DEPLOY.md](./DEPLOY.md)** (Parte 2 en adelante) para Render.

---

## Si algo falla

| Problema | Qué hacer |
|----------|-----------|
| `gh no se reconoce` | Cerrá y abrí de nuevo PowerShell, o reiniciá la PC |
| `Repository already exists` | Usá `git push -u origin main` |
| Pide usuario/contraseña al push | Usá un **Personal Access Token** de GitHub como contraseña |

Crear token: GitHub → Settings → Developer settings → Personal access tokens → Generate (marca `repo`).
