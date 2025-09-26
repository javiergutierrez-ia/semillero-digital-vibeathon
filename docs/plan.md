# Plan de Desarrollo y Verificación

## Objetivo

Construir la solución mínima viable ganadora para el hackathon Vibeathon: una aplicación web que se integra con Google Classroom y Google Sheets para ofrecer dashboards diferenciados para profesores y coordinadores.

## Estrategia General

1. **Arquitectura Simple:** Backend en Node.js con Express que expone API REST, sirve frontend estático y encapsula una base `SQLite` embebida (`better-sqlite3`). Frontend ligero en HTML/CSS/JS vanilla con Chart.js desde CDN.
2. **Autenticación:** Google Identity Services obtiene ID Token (identidad) y Access Token (scopes de Classroom). El backend valida el ID Token y usa el Access Token para consultar Classroom. No dependemos de Google Sheets.
3. **Fuentes de Datos:**
   - Google Classroom API (cursos, tareas, entregas).
   - Base local SQLite: definición de células, relaciones profesor↔célula y alumno↔célula.
4. **Dashboards:** Endpoints que filtran y agregan datos según modo seleccionado (profesor o coordinador) y asignaciones definidas en la base local.

## Cronograma de Implementación

1. **Configuración del Proyecto**
   - Inicializar proyecto npm, instalar dependencias.
   - Definir estructura de carpetas: `src/`, `public/`, `docs/`.
   - Crear `.env.example` con variables requeridas.

2. **Backend**
   - Configuración de Express, middleware CORS y parsing JSON.
   - Servicio de autenticación: verificación de ID Token y detección de rol a partir de Classroom (`teacher` / `student`). Todos los `teacher` pueden activar modo coordinador.
   - Cliente Google dinámico: instancias de Classroom según Access Token.
   - Servicio de agregación: usa asignaciones guardadas en SQLite para filtrar alumnos/células y construir métricas.
   - Endpoints API principales:
     - `POST /auth/login`
     - `POST /auth/logout` (dummy)
     - `POST /api/dashboard/summary`
     - `GET /api/cells`
     - `POST /api/cells`
     - `POST /api/cells/:cellId/assignments`
     - `DELETE /api/cells/:cellId/assignments/:assignmentId`
   - Manejo de errores y validaciones básicas.

3. **Frontend**
   - Página única con flujo de login (GIS) y selector de rol/células según respuesta del backend.
   - Consumo de endpoints y render de métricas con Chart.js (gráfica de dona + barras apiladas).
   - Lista de alumnos con estado de tareas y enlaces directos a Classroom.
   - Manejo de filtros para coordinador.

4. **Documentación**
   - Actualización de `README.md` con instrucciones de configuración, ejecución y despliegue.
   - Guía de verificación/manual de pruebas en `docs/testing.md`.

5. **Verificación Manual**
   - Pruebas con cuentas reales de Google y datos de ejemplo.
   - Validar login, carga de dashboards, filtrado y enlaces.
   - Confirmar manejo de errores comunes (token inválido, scopes faltantes, etc.).

## Requisitos Previos

- **Proyecto Google Cloud** con OAuth 2.0 Client ID configurado para aplicaciones web.
- **APIs habilitadas**: Google Classroom API (obligatorio), Google People API (opcional).
- **OAuth Consent Screen** configurado como "Externo" con estos scopes:
  - `https://www.googleapis.com/auth/classroom.courses.readonly`
  - `https://www.googleapis.com/auth/classroom.rosters.readonly`
  - `https://www.googleapis.com/auth/classroom.student-submissions.students.readonly`
  - `https://www.googleapis.com/auth/classroom.profile.emails` ⚠️ **CRÍTICO**
  - `https://www.googleapis.com/auth/userinfo.email`
  - `https://www.googleapis.com/auth/userinfo.profile`
  - `openid`
- **Node.js 20+** instalado.
- **Puerto 5001** disponible (configuración por defecto).
- Opcional: dataset inicial para SQLite (seeds).

## Flujo de Datos

1. Usuario se autentica en frontend → ID Token + Access Token.
2. Frontend envía ID Token al backend (`/auth/login`).
3. Backend valida identidad, consulta Classroom para confirmar rol (`teacher` / `student`).
4. Backend crea automáticamente una célula si el docente no tiene asignadas.
5. Backend consulta SQLite para obtener células configuradas y asignaciones del usuario.
6. Frontend solicita datos (`/api/dashboard/summary`) enviando tokens y modo deseado.
7. Backend usa Access Token para consultar Classroom (solo cursos donde el docente es teacher), cruza con asignaciones locales y responde con métricas.
8. Frontend muestra dashboards filtrados y permite gestionar asignaciones si el usuario es teacher.

## Verificación Técnica (Checklist)

- [ ] Variables de entorno (`GOOGLE_CLIENT_ID`, `PORT`, `DATABASE_PATH`) cargadas correctamente.
- [ ] Tokens Google válidos y recibidos en frontend.
- [ ] Endpoint `/auth/login` detecta rol Classroom y devuelve datos de usuario.
- [ ] Gestión de células/asignaciones (crear, asignar, eliminar) funciona para teachers.
- [ ] Dashboard refleja filtros por modo y células seleccionadas.
- [ ] Enlaces a tareas abren Classroom correcto (`alternateLink`).
- [ ] Logs controlados y errores manejados.
- [ ] Build estático listo para despliegues sencillos (ej. Render/Heroku/Cloud Run).

## Próximos Pasos post-MVP

- Añadir notificaciones push/email (ej. via Google Chat o SendGrid).
- Enriquecer persistencia (agregar histórico, auditoría).
- Vista alumno y módulo de asistencia con Google Calendar.
- Automatización CI/CD y pruebas con Jest para servicios de agregación.


