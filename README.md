# Semillero Digital Dashboard

Aplicación web minimalista para el hackathon Vibeathon 2025. Permite a profesores y coordinadores de Semillero Digital visualizar métricas consolidadas de tareas en Google Classroom y gestionar células/alumnos directamente desde la app (sin Google Sheets).

## Características

- Inicio de sesión con Google Identity Services.
- Dashboards diferenciados por modo (profesor o coordinador) con cambio dinámico.
- Gestión de células y asignación de profesores/alumnos desde la propia aplicación.
- Gráfico de dona de estados globales, barras apiladas por tarea y célula.
- Listado detallado de alumnos con enlaces directos a Classroom.

## Requisitos Previos

1. Proyecto en Google Cloud con OAuth 2.0 Client ID para aplicación web.
2. APIs habilitadas: Google Classroom (y opcionalmente People para datos de perfil).
3. Node.js 20+.

## Configuración

1. Clonar el repositorio.
2. Crear un archivo `.env` en la raíz con las variables:

```
GOOGLE_CLIENT_ID=<tu client id de OAuth>
PORT=3000
DATABASE_PATH=data/app.db
```

3. Instalar dependencias:

```
npm install
```

4. Ejecutar en desarrollo:

```
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

## Variables en el Frontend

El `GOOGLE_CLIENT_ID` ya está embebido en `public/app.js` y `public/index.html`; reemplázalo si cambias de credenciales.

## Gestión de Células

- Cualquier cuenta con rol `teacher` en Classroom puede usar el modo coordinador.
- Desde el modo coordinador se crean células y se asignan profesores/alumnos (persisten en SQLite).
- Los profesores ven por defecto solo sus células; al activar modo coordinador visualizan todas las células asignadas.

## Flujo de Uso

1. Abrir la aplicación y autenticarse con Google.
2. El backend verifica el ID token en Google, identifica rol Classroom y carga asignaciones de la base SQLite.
3. Seleccionar células o cambiar a modo coordinador para ver y gestionar más grupos.
4. Navegar los gráficos y la tabla de alumnos con enlaces directos a Classroom.

## Pruebas Manuales

Consultar `docs/testing.md` para una guía detallada de validación funcional.

## Despliegue

La aplicación puede desplegarse en cualquier servicio que soporte Node.js (Railway, Render, Cloud Run). Configurar las variables de entorno y asegurarse de servir la carpeta `public` de forma estática (ya gestionado por Express).

## Licencia

ISC

