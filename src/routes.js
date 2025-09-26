const express = require('express');
const { resolveUserContext } = require('./authService');
const { fetchAllData } = require('./classroomService');
const { aggregateData } = require('./aggregationService');
const {
  getCellsWithMembers,
  createCell,
  addCellMember,
  removeCellMember,
  getTeacherCellIds
} = require('./db');

const router = express.Router();

router.post('/auth/login', async (req, res) => {
  try {
    console.log('🔑 Intento de login recibido');
    const { idToken, accessToken, mode, selectedCells } = req.body;
    
    if (!idToken || !accessToken) {
      console.log('❌ Faltan tokens:', { hasIdToken: !!idToken, hasAccessToken: !!accessToken });
      return res.status(400).json({ message: 'Faltan tokens de autenticación' });
    }
    
    console.log('✅ Tokens recibidos, procesando contexto del usuario...');
    const context = await resolveUserContext({ idToken, accessToken, mode, selectedCells });
    
    console.log('✅ Usuario autenticado:', context.user.email, 'Rol:', context.user.classroomRoles);
    res.json({
      user: context.user,
      availableCells: context.availableCells
    });
  } catch (error) {
    console.error('❌ Error en login:', error.message);
    res.status(400).json({ message: error.message });
  }
});

router.post('/auth/logout', (_req, res) => {
  res.json({ message: 'Sesión cerrada' });
});

// Endpoint de callback OAuth para manejar redirecciones
router.get('/oauth/callback', (req, res) => {
  // Redirigir de vuelta a la página principal después del OAuth
  res.redirect('/');
});

router.get('/api/cells', async (req, res) => {
  try {
    const { idToken, accessToken } = extractTokens(req);
    const context = await resolveUserContext({ idToken, accessToken, mode: 'coordinator' });

    if (!context.user.canManage) {
      return res.status(403).json({ message: 'No tienes permisos para gestionar células' });
    }

    const cells = getCellsWithMembers(context.allowedCellIds);
    res.json({ cells });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/api/cells', async (req, res) => {
  try {
    const { idToken, accessToken } = extractTokens(req);
    const context = await resolveUserContext({ idToken, accessToken, mode: 'coordinator' });

    if (!context.user.canManage) {
      return res.status(403).json({ message: 'No tienes permisos para crear células' });
    }

    const { name } = req.body;
    const cell = createCell(name);

    addCellMember({
      cellId: cell.id,
      email: context.user.email,
      name: context.user.name,
      role: 'teacher'
    });

    const cells = getCellsWithMembers(getTeacherCellIds(context.user.email));
    res.status(201).json({ cell, cells });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/api/cells/:cellId/assignments', async (req, res) => {
  try {
    const { idToken, accessToken } = extractTokens(req);
    const context = await resolveUserContext({ idToken, accessToken, mode: 'coordinator' });

    if (!context.user.canManage) {
      return res.status(403).json({ message: 'No tienes permisos para asignar miembros' });
    }

    const { cellId } = req.params;
    const numericCellId = Number(cellId);

    if (!context.allowedCellIds.includes(numericCellId)) {
      return res.status(403).json({ message: 'No puedes modificar esta célula' });
    }

    const { email, name, role } = req.body;
    const result = addCellMember({ cellId: numericCellId, email, name, role });
    const cells = getCellsWithMembers(context.allowedCellIds);
    res.status(201).json({ assignmentId: result.id, cells });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/api/cells/:cellId/assignments/:assignmentId', async (req, res) => {
  try {
    const { idToken, accessToken } = extractTokens(req);
    const context = await resolveUserContext({ idToken, accessToken, mode: 'coordinator' });

    if (!context.user.canManage) {
      return res.status(403).json({ message: 'No tienes permisos para modificar asignaciones' });
    }

    const { cellId, assignmentId } = req.params;
    const numericCellId = Number(cellId);

    if (!context.allowedCellIds.includes(numericCellId)) {
      return res.status(403).json({ message: 'No puedes modificar esta célula' });
    }

    const success = removeCellMember(Number(assignmentId));
    if (!success) {
      return res.status(404).json({ message: 'Asignación no encontrada' });
    }

    const cells = getCellsWithMembers(context.allowedCellIds);
    res.json({ message: 'Asignación eliminada', cells });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/api/dashboard/summary', async (req, res) => {
  try {
    const { idToken, accessToken, mode, selectedCells } = req.body || {};

    const context = await resolveUserContext({ idToken, accessToken, mode, selectedCells });

    const classroomData = await fetchAllData(context.googleApis.classroom, context.user.email);

    const summary = aggregateData({
      classroomData,
      assignments: context.assignments
    });

    res.json({
      summary,
      user: context.user,
      allowedCellIds: context.allowedCellIds,
      cells: getCellsWithMembers(context.allowedCellIds)
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;

function extractTokens(req) {
  return {
    idToken: req.headers['x-id-token'] || req.body?.idToken,
    accessToken: req.headers['x-access-token'] || req.body?.accessToken
  };
}

