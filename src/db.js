const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { getConfig } = require('./config');

const config = getConfig();

const dbDir = path.dirname(config.databasePath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(config.databasePath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS cells (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cell_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cell_id INTEGER NOT NULL,
    user_email TEXT NOT NULL,
    user_name TEXT DEFAULT '',
    role TEXT NOT NULL CHECK(role IN ('teacher','student')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cell_id, user_email, role),
    FOREIGN KEY (cell_id) REFERENCES cells(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_cell_members_email ON cell_members (user_email);
  CREATE INDEX IF NOT EXISTS idx_cell_members_cell_role ON cell_members (cell_id, role);

  CREATE TABLE IF NOT EXISTS seeds (
    key TEXT PRIMARY KEY,
    applied_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function getCellsWithMembers(cellIds = null) {
  const baseQuery = `
    SELECT c.id AS cellId,
           c.name AS cellName,
           m.id AS memberId,
           m.user_email AS userEmail,
           m.user_name AS userName,
           m.role AS role
    FROM cells c
    LEFT JOIN cell_members m ON m.cell_id = c.id
  `;

  let rows;
  if (Array.isArray(cellIds) && cellIds.length) {
    const placeholders = cellIds.map(() => '?').join(',');
    rows = db.prepare(`${baseQuery} WHERE c.id IN (${placeholders})`).all(...cellIds);
  } else {
    rows = db.prepare(baseQuery).all();
  }

  const cellsMap = new Map();

  rows.forEach((row) => {
    if (!cellsMap.has(row.cellId)) {
      cellsMap.set(row.cellId, {
        id: row.cellId,
        name: row.cellName,
        teachers: [],
        students: []
      });
    }

    if (!row.memberId) {
      return;
    }

    const target = row.role === 'teacher' ? 'teachers' : 'students';
    cellsMap.get(row.cellId)[target].push({
      id: row.memberId,
      email: row.userEmail,
      name: row.userName
    });
  });

  return Array.from(cellsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function ensureArrayNumbers(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.map((value) => Number(value)).filter((value) => !Number.isNaN(value));
}

function getTeacherCellIds(email) {
  const rows = db
    .prepare(
      `SELECT cell_id AS cellId FROM cell_members WHERE role = 'teacher' AND user_email = ?`
    )
    .all(normalizeEmail(email));
  return rows.map((row) => row.cellId);
}

function getStudentAssignments(cellIds = null) {
  const normalizedIds = ensureArrayNumbers(cellIds);
  if (normalizedIds.length === 0) {
    return [];
  }

  const placeholders = normalizedIds.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT m.id AS memberId,
              m.user_email AS studentEmail,
              m.user_name AS studentName,
              m.cell_id AS cellId,
              c.name AS cellName
       FROM cell_members m
       JOIN cells c ON c.id = m.cell_id
       WHERE m.role = 'student'
         AND m.cell_id IN (${placeholders})`
    )
    .all(...normalizedIds);

  return rows;
}

function getCellsByIds(cellIds) {
  const normalizedIds = ensureArrayNumbers(cellIds);
  if (!normalizedIds.length) {
    return [];
  }
  const placeholders = normalizedIds.map(() => '?').join(',');
  return db
    .prepare(`SELECT id, name FROM cells WHERE id IN (${placeholders})`)
    .all(...normalizedIds);
}

function getCellByName(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    return null;
  }
  return db.prepare(`SELECT id, name FROM cells WHERE name = ?`).get(trimmed) || null;
}

function createCell(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    throw new Error('El nombre de la célula no puede estar vacío');
  }

  const statement = db.prepare(`INSERT INTO cells (name) VALUES (?)`);
  const result = statement.run(trimmed);
  return { id: result.lastInsertRowid, name: trimmed };
}

function addCellMember({ cellId, email, name, role }) {
  const normalizedRole = role === 'teacher' ? 'teacher' : 'student';
  const normalizedEmail = normalizeEmail(email);
  if (!cellId || !normalizedEmail) {
    throw new Error('Datos incompletos para asignar miembro a la célula');
  }

  const statement = db.prepare(
    `INSERT INTO cell_members (cell_id, user_email, user_name, role) VALUES (?, ?, ?, ?)`
  );

  try {
    const result = statement.run(Number(cellId), normalizedEmail, name || '', normalizedRole);
    return { id: result.lastInsertRowid };
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('La persona ya está asignada a la célula con ese rol');
    }
    throw error;
  }
}

function removeCellMember(memberId) {
  const statement = db.prepare(`DELETE FROM cell_members WHERE id = ?`);
  const result = statement.run(memberId);
  return result.changes > 0;
}

function ensureTeacherCell({ email, name }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return [];
  }

  let teacherCells = getTeacherCellIds(normalizedEmail);
  if (teacherCells.length > 0) {
    return teacherCells;
  }

  const displayName = (name || normalizedEmail.split('@')[0] || normalizedEmail).trim();
  const cellName = `Célula de ${displayName}`;

  let cell = getCellByName(cellName);
  if (!cell) {
    cell = createCell(cellName);
  }

  try {
    addCellMember({ cellId: cell.id, email: normalizedEmail, name: displayName, role: 'teacher' });
  } catch (error) {
    if (!/ya está asignada/.test(error.message)) {
      throw error;
    }
  }

  teacherCells = getTeacherCellIds(normalizedEmail);
  return teacherCells;
}

module.exports = {
  getCellsWithMembers,
  getTeacherCellIds,
  getStudentAssignments,
  getCellsByIds,
  getCellByName,
  createCell,
  addCellMember,
  removeCellMember,
  ensureTeacherCell
};

