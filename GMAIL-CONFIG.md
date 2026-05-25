# Configurar Gmail para avisos de descansos

## 1. Contraseña de aplicación (obligatorio)

Gmail no permite la contraseña normal en esta app. Seguí estos pasos:

1. Entrá a https://myaccount.google.com/security
2. Activá **Verificación en 2 pasos** (si no la tenés).
3. Buscá **Contraseñas de aplicaciones** (o: https://myaccount.google.com/apppasswords ).
4. Creá una contraseña para **Correo** → dispositivo **Windows**.
5. Google muestra 16 caracteres (ej. `abcd efgh ijkl mnop`).

## 2. Pegar la contraseña en `.env`

1. Abrí el archivo **`.env`** en la carpeta del proyecto (Cursor o Bloc de notas).
2. Buscá la línea `SMTP_PASS=`
3. Pegá los **16 caracteres** justo después del `=` **sin comillas**:

```
SMTP_PASS=abcdefghijklmnop
```

4. **Guardá el archivo** (Ctrl+S). Si no guardás, el servidor no verá la contraseña.

## 3. Probar antes de usar la app

Doble clic en **`probar-correo.bat`**

Debe decir:
- `Conexión SMTP: OK`
- `Correo enviado a urko5673@gmail.com`

Si falla, el mensaje indica qué corregir.

## 4. Reiniciar el servidor

1. Cerrá `iniciar.bat` con **Ctrl+C**.
2. Volvé a ejecutar **`iniciar.bat`**.
3. Deberías ver: `Usuarios con correo configurado: Christian, Ariel, ...`

## 5. Probar el envío manual

Doble clic en **`probar-correo.bat`** o en PowerShell:

```powershell
npm run verificar-correo
```

Para forzar un nuevo envío el mismo día:

```powershell
npm run notificar-forzar
```

- Si dice `enviados: 6` (o más de 0), revisá la bandeja de **urko5673@gmail.com** (y spam).
- Si dice `sinSmtp: true`, falta completar `SMTP_PASS` en `.env`.
- Si hay `errores`, el mensaje indica el problema (contraseña incorrecta, etc.).

## 6. Correos por persona

En `config/usuarios.json` cada usuario puede tener su propio Gmail:

```json
{ "nombre": "Ariel", "email": "ariel.otro@gmail.com" }
```

## Nota

Los avisos automáticos se envían **una vez al día a las 08:00** (hora Argentina). Para cambiar la hora, editá `CRON_AVISOS` en `.env`.
