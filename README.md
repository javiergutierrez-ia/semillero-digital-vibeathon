# Semillero Digital Dashboard

Aplicación web minimalista para el hackathon Vibeathon 2025. Permite a profesores y coordinadores de Semillero Digital visualizar métricas consolidadas de tareas en Google Classroom y gestionar células/alumnos directamente desde la app (sin Google Sheets).

## Características

- Inicio de sesión con Google Identity Services.
- Dashboards diferenciados por modo (profesor o coordinador) con cambio dinámico.
- Gestión de células y asignación de profesores/alumnos desde la propia aplicación.
- Gráfico de dona de estados globales, barras apiladas por tarea y célula.
- Listado detallado de alumnos con enlaces directos a Classroom.

## Requisitos Previos

1. **Proyecto en Google Cloud Console** con OAuth 2.0 Client ID configurado para aplicación web.
2. **APIs habilitadas**: 
   - Google Classroom API (obligatorio)
   - Google People API (opcional, para datos de perfil)
3. **Node.js 20+** instalado.

## Configuración

### 1. Configuración de Google Cloud Console

#### 1.1 Crear Proyecto
1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuevo proyecto o selecciona uno existente

#### 1.2 Habilitar APIs
1. Ve a **APIs & Services** → **Library**
2. Busca y habilita:
   - **Google Classroom API** (obligatorio)
   - **Google People API** (opcional)

#### 1.3 Configurar OAuth Consent Screen
1. Ve a **APIs & Services** → **OAuth consent screen**
2. Selecciona **"Externo"** como tipo de usuario
3. Completa la información de la aplicación:
   - **Nombre de la aplicación**: Semillero Digital Dashboard
   - **Email de soporte**: Tu email
4. **IMPORTANTE**: En **Scopes**, agrega estos permisos exactos:
   - `https://www.googleapis.com/auth/classroom.courses.readonly`
   - `https://www.googleapis.com/auth/classroom.rosters.readonly`
   - `https://www.googleapis.com/auth/classroom.student-submissions.students.readonly`
   - `https://www.googleapis.com/auth/classroom.profile.emails` ⚠️ **CRÍTICO**
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `openid`
5. Agrega tu email en **Test users** para desarrollo

#### 1.4 Crear OAuth 2.0 Client ID
1. Ve a **APIs & Services** → **Credentials**
2. Crea **OAuth 2.0 Client ID** para **Aplicación web**
3. **Authorized JavaScript origins**:
   - `http://localhost:5001`
   - `http://127.0.0.1:5001`
4. **Authorized redirect URIs**:
   - `http://localhost:5001/oauth/callback`
   - `http://127.0.0.1:5001/oauth/callback`

### 2. Configuración Local

#### 2.1 Clonar repositorio e instalar dependencias
```bash
git clone <repository-url>
cd semillero-digital-vibeathon
npm install
```

#### 2.2 Crear archivo `.env`
Crea un archivo `.env` en la raíz del proyecto:
```
GOOGLE_CLIENT_ID=977103222873-tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-tu-client-secret
PORT=5001
DATABASE_PATH=data/app.db
SECRET_KEY=tu-secret-key-super-seguro
```

#### 2.3 Ejecutar la aplicación
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5001`.

## ⚠️ Problemas Comunes y Soluciones

### Error 403: "The given origin is not allowed"
- **Causa**: Configuración incorrecta de JavaScript origins en Google Cloud Console
- **Solución**: Verifica que tengas exactamente `http://localhost:5001` y `http://127.0.0.1:5001` en Authorized JavaScript origins

### Error 400: "redirect_uri_mismatch"
- **Causa**: URIs de redirección mal configuradas
- **Solución**: Agrega `http://localhost:5001/oauth/callback` y `http://127.0.0.1:5001/oauth/callback`

### Error: "No se encontró el usuario en Classroom"
- **Causa**: Falta el scope `classroom.profile.emails` o el usuario no está en Google Classroom
- **Solución**: 
  1. Agrega el scope `https://www.googleapis.com/auth/classroom.profile.emails` en OAuth consent screen
  2. Verifica que el usuario sea profesor en al menos un curso activo de Google Classroom

### Aplicación configurada como "Interno" en lugar de "Externo"
- **Causa**: Solo usuarios del mismo dominio pueden acceder
- **Solución**: Marca como "Externo" en OAuth consent screen

## Actualización de Client ID

Si cambias las credenciales de Google, actualiza también:
- `public/app.js` (líneas 62 y 440)
- `public/index.html` (línea 92)

## Gestión de Células

- Cualquier cuenta con rol `teacher` en Classroom puede usar el modo coordinador.
- Desde el modo coordinador se crean células y se asignan profesores/alumnos (persisten en SQLite).
- Los profesores ven por defecto solo sus células; al activar modo coordinador visualizan todas las células asignadas.

## Scopes de OAuth Requeridos

La aplicación requiere estos permisos específicos para funcionar correctamente:

| Scope | Propósito | Crítico |
|-------|-----------|---------|
| `classroom.courses.readonly` | Leer cursos de Google Classroom | ✅ Sí |
| `classroom.rosters.readonly` | Leer listas de profesores y estudiantes | ✅ Sí |
| `classroom.student-submissions.students.readonly` | Leer entregas de estudiantes | ✅ Sí |
| `classroom.profile.emails` | **Acceder a emails de perfiles de Classroom** | ⚠️ **CRÍTICO** |
| `userinfo.email` | Email del usuario autenticado | ✅ Sí |
| `userinfo.profile` | Información de perfil del usuario | ✅ Sí |
| `openid` | Identificación OpenID Connect | ✅ Sí |

> **⚠️ IMPORTANTE**: El scope `classroom.profile.emails` es **CRÍTICO** y debe estar configurado en Google Cloud Console. Sin este scope, la aplicación no podrá identificar qué usuario es profesor en cada curso.

## Flujo de Uso

1. Abrir la aplicación en `http://localhost:5001` y autenticarse con Google.
2. El backend verifica el ID token, consulta Google Classroom API para identificar el rol del usuario y carga asignaciones de la base SQLite.
3. Seleccionar células o cambiar a modo coordinador para ver y gestionar más grupos.
4. Navegar los gráficos y la tabla de alumnos con enlaces directos a Classroom.

## Pruebas Manuales

Consultar `docs/testing.md` para una guía detallada de validación funcional.

## Despliegue

La aplicación puede desplegarse en cualquier servicio que soporte Node.js (Railway, Render, Cloud Run). Configurar las variables de entorno y asegurarse de servir la carpeta `public` de forma estática (ya gestionado por Express).

## Licencia

ISC

