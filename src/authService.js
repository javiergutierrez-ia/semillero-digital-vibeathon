const { verifyIdToken, getGoogleApis } = require('./googleClient');
const {
  getTeacherCellIds,
  getStudentAssignments,
  getCellsByIds,
  ensureTeacherCell
} = require('./db');

async function resolveUserContext({ idToken, accessToken, mode = 'teacher', selectedCells = [] }) {
  if (!idToken || !accessToken) {
    throw new Error('Tokens de Google faltantes');
  }

  const payload = await verifyIdToken(idToken);
  const email = payload.email?.toLowerCase();

  if (!email) {
    throw new Error('El token de Google no contiene un email válido');
  }

  const googleApis = getGoogleApis(accessToken);

  const classroomProfile = await fetchClassroomProfile(googleApis.classroom, email);

  if (!classroomProfile) {
    throw new Error('No se encontró el usuario en Classroom');
  }

  const canManage = classroomProfile.roles.includes('teacher');
  const effectiveMode = mode === 'coordinator' && canManage ? 'coordinator' : 'teacher';

  let allowedCellIds = [];
  let teacherCells = getTeacherCellIds(email);

  if (teacherCells.length === 0 && canManage) {
    teacherCells = ensureTeacherCell({ email, name: payload.name || classroomProfile.name });
  }

  if (effectiveMode === 'teacher') {
    allowedCellIds = teacherCells;
  } else {
    const selection = selectedCells && selectedCells.length
      ? selectedCells.map((id) => Number(id))
      : teacherCells;
    allowedCellIds = selection.filter((id) => teacherCells.includes(id));
  }

  const assignments = getStudentAssignments(allowedCellIds);

  if (assignments.length === 0 && effectiveMode === 'teacher') {
    throw new Error('No hay asignaciones configuradas para tus células. Crea o asigna desde el modo coordinador.');
  }

  return {
    user: {
      email,
      name: payload.name || classroomProfile.name,
      picture: payload.picture,
      classroomRoles: classroomProfile.roles,
      mode: effectiveMode,
      canManage
    },
    googleApis,
    assignments: assignments.map((assignment) => ({
      studentEmail: assignment.studentEmail,
      studentName: assignment.studentName,
      cellId: assignment.cellId,
      cellName: assignment.cellName
    })),
    allowedCellIds,
    availableCells: getCellsByIds(allowedCellIds),
    tokens: {
      idToken,
      accessToken
    }
  };
}

async function fetchClassroomProfile(classroomClient, email) {
  const normalizedEmail = email.toLowerCase();

  const roles = new Set();
  let name = '';

  const { data: coursesData } = await classroomClient.courses.list({ courseStates: ['ACTIVE'] });
  const courses = coursesData.courses || [];

  for (const course of courses) {
    const courseId = course.id;
    const [teachers, students] = await Promise.all([
      listTeachers(classroomClient, courseId),
      listStudents(classroomClient, courseId)
    ]);

    const teacherMatch = teachers.find((teacher) => teacher.profile.emailAddress?.toLowerCase() === normalizedEmail);
    if (teacherMatch) {
      roles.add('teacher');
      name = teacherMatch.profile.name?.fullName || name;
    }

    const studentMatch = students.find((student) => student.profile.emailAddress?.toLowerCase() === normalizedEmail);
    if (studentMatch) {
      roles.add('student');
      name = studentMatch.profile.name?.fullName || name;
    }
  }

  if (!roles.size) {
    return null;
  }

  return {
    roles: Array.from(roles),
    name
  };
}

async function listTeachers(classroomClient, courseId) {
  try {
    const { data } = await classroomClient.courses.teachers.list({ courseId });
    return data.teachers || [];
  } catch (error) {
    if (error.code === 404) {
      return [];
    }
    throw error;
  }
}

async function listStudents(classroomClient, courseId) {
  try {
    const { data } = await classroomClient.courses.students.list({ courseId });
    return data.students || [];
  } catch (error) {
    if (error.code === 404) {
      return [];
    }
    throw error;
  }
}

module.exports = {
  resolveUserContext
};

