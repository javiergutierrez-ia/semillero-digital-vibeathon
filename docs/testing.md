# Guía de Verificación Manual

## Preparación

1. Configurar `.env` con las credenciales (`GOOGLE_CLIENT_ID`, `DATABASE_PATH`, `PORT`).
2. Actualizar `public/index.html` y `public/app.js` con el `GOOGLE_CLIENT_ID`.
3. (Opcional) Pre-sembrar `data/app.db` con células/alumnos usando la UI en modo coordinador.
4. Ejecutar la aplicación (`npm run dev`).

## Escenarios Clave

### 1. Autenticación
- Ingresar con una cuenta con rol `teacher` en alguno de los cursos configurados.
- Verificar que se muestra el modo actual (profesor) y que puede alternar a coordinador si corresponde.
- Confirmar que un alumno puro (sin rol teacher) ve solo los dashboards y no la sección de gestión.
- En el primer login Google puede solicitar permisos adicionales (Scopes de Classroom y roster); aceptarlos para completar la autorización.

### 2. Dashboards
- Validar que los gráficos cargan y muestran métricas.
- Cambiar selección de células y modo; confirmar actualización inmediata.
- Revisar que los estados coincidan con los registros de Classroom.

### 3. Listado de Alumnos
- Verificar que se muestran los alumnos de las células seleccionadas.
- Abrir enlaces a Classroom y confirmar que redirigen a la tarea correcta.
- Revisar indicador de retraso (`late`).

### 4. Manejo de Errores
- Probar con scopes insuficientes: revocar permisos desde Google y reintentar.
- Validar mensajes cuando no hay asignaciones configuradas.
- Verificar que las respuestas 403 aparecen al intentar gestionar células sin permisos.

### 5. Responsividad
- Probar en móvil y tablet (modo responsive del navegador).
- Confirmar que tablas y gráficos se adaptan sin desbordes.

## Métricas de Aceptación
- Profesor identifica alumnos con tareas pendientes en menos de 1 minuto.
- Coordinador obtiene métricas consolidadas en un vistazo sin cambios manuales.

## Recomendaciones
- Generar un dataset de prueba en Classroom y Sheets para demo.
- Grabar el flujo completo para el video de presentación.

