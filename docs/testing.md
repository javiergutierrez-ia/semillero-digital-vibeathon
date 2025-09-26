# Guía de Verificación Manual

## Preparación

1. **Configurar Google Cloud Console**:
   - OAuth consent screen como "Externo"
   - Todos los scopes requeridos (especialmente `classroom.profile.emails`)
   - JavaScript origins: `http://localhost:5001`, `http://127.0.0.1:5001`
   - Redirect URIs: `http://localhost:5001/oauth/callback`, `http://127.0.0.1:5001/oauth/callback`

2. **Configurar archivo `.env`**:
   ```
   GOOGLE_CLIENT_ID=tu-client-id
   GOOGLE_CLIENT_SECRET=tu-client-secret
   PORT=5001
   DATABASE_PATH=data/app.db
   SECRET_KEY=tu-secret-key
   ```

3. **Actualizar Client ID en el frontend** (si es necesario):
   - `public/index.html` línea 92
   - `public/app.js` líneas 62 y 440

4. **Ejecutar la aplicación**:
   ```bash
   npm run dev
   ```
   Debería estar disponible en `http://localhost:5001`

## Escenarios Clave

### 1. Autenticación
- **Acceso inicial**: Ir a `http://localhost:5001` y hacer clic en "Iniciar sesión con Google"
- **Permisos**: En el primer login, Google solicitará permisos para acceder a Classroom - aceptar todos
- **Verificación de rol**: Ingresar con una cuenta que sea **profesor** en al menos un curso de Google Classroom
- **Modo de usuario**: Verificar que se muestra el modo actual (profesor) y que puede alternar a coordinador
- **Detección automática**: La aplicación debe crear automáticamente una célula para profesores nuevos

**⚠️ Errores comunes**:
- Error 403: Verificar JavaScript origins en Google Cloud Console
- "No se encontró usuario": Verificar que el scope `classroom.profile.emails` esté configurado
- Error 400: Verificar redirect URIs

### 2. Dashboards
- Validar que los gráficos cargan y muestran métricas.
- Cambiar selección de células y modo; confirmar actualización inmediata.
- Revisar que los estados coincidan con los registros de Classroom.

### 3. Listado de Alumnos
- Verificar que se muestran los alumnos de las células seleccionadas.
- Abrir enlaces a Classroom y confirmar que redirigen a la tarea correcta.
- Revisar indicador de retraso (`late`).

### 4. Manejo de Errores
- **Scopes insuficientes**: Revocar permisos desde Google Account y reintentar login
- **Sin asignaciones**: La aplicación debe permitir acceso y crear células automáticamente para profesores
- **Permisos de gestión**: Verificar que solo usuarios con rol teacher pueden gestionar células
- **Debugging**: Revisar logs del servidor en la terminal para identificar problemas específicos

### 5. Responsividad
- Probar en móvil y tablet (modo responsive del navegador).
- Confirmar que tablas y gráficos se adaptan sin desbordes.

## Métricas de Aceptación
- Profesor identifica alumnos con tareas pendientes en menos de 1 minuto.
- Coordinador obtiene métricas consolidadas en un vistazo sin cambios manuales.

## Recomendaciones
- Generar un dataset de prueba en Classroom y Sheets para demo.
- Grabar el flujo completo para el video de presentación.

