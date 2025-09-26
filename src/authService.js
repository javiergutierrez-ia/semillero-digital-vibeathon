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

  const classroomProfile = await fetchClassroomProfile(googleApis.classroom, email, payload);

  if (!classroomProfile) {
    throw new Error('Tu cuenta no tiene permisos de profesor o estudiante en ningún curso activo de Google Classroom. Verifica que estés agregado como profesor en al menos un curso.');
  }

  const canManage = classroomProfile.roles.includes('teacher');
  const effectiveMode = mode === 'coordinator' && canManage ? 'coordinator' : 'teacher';

  let allowedCellIds = [];
  let teacherCells = getTeacherCellIds(email);

  if (teacherCells.length === 0 && canManage) {
    const userName = payload.name || classroomProfile.name || 'Profesor';
    console.log('🔧 Creando célula automática para profesor:', email, 'con nombre:', userName);
    teacherCells = ensureTeacherCell({ email, name: userName });
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
    console.log('ℹ️ No hay asignaciones para el profesor. Modo coordinador disponible.');
    // No arrojar error - permitir acceso en modo coordinador
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

async function fetchClassroomProfile(classroomClient, email, payload) {
  const normalizedEmail = email.toLowerCase();
  console.log('🔍 Buscando usuario en Classroom:', normalizedEmail);
  console.log('🆔 ID del usuario del token:', payload.sub);

  const roles = new Set();
  let name = '';

  try {
    const { data: coursesData } = await classroomClient.courses.list({ courseStates: ['ACTIVE'] });
    const courses = coursesData.courses || [];
    console.log('📚 Cursos encontrados:', courses.length);

    for (const course of courses) {
      console.log('🔎 Revisando curso:', course.name, '(ID:', course.id, ')');
      const courseId = course.id;
      
      const [teachers, students] = await Promise.all([
        listTeachers(classroomClient, courseId),
        listStudents(classroomClient, courseId)
      ]);

      console.log('👨‍🏫 Profesores en curso (estructura completa):', JSON.stringify(teachers, null, 2));
      console.log('👨‍🎓 Estudiantes en curso (estructura completa):', JSON.stringify(students, null, 2));
      console.log('👨‍🏫 Emails de profesores:', teachers.map(t => t.profile?.emailAddress || 'EMAIL_NO_ENCONTRADO'));
      console.log('👨‍🎓 Emails de estudiantes:', students.map(s => s.profile?.emailAddress || 'EMAIL_NO_ENCONTRADO'));

      const teacherMatch = teachers.find((teacher) => {
        const email = teacher.profile?.emailAddress || teacher.emailAddress;
        const userId = teacher.profile?.id || teacher.userId;
        
        // Primero intentamos comparar por email si está disponible
        if (email) {
          return email.toLowerCase() === normalizedEmail;
        }
        
        // Si no hay email, comparamos con el ID del usuario del token
        // Esto es un workaround temporal hasta que se corrijan los scopes
        console.log('⚠️ Email no disponible, comparando userId:', userId, 'con payload sub:', payload.sub);
        return userId === payload.sub;
      });
      if (teacherMatch) {
        console.log('✅ Usuario encontrado como PROFESOR en:', course.name);
        roles.add('teacher');
        name = teacherMatch.profile?.name?.fullName || teacherMatch.name?.fullName || teacherMatch.displayName || name;
      }

      const studentMatch = students.find((student) => {
        const email = student.profile?.emailAddress || student.emailAddress;
        return email?.toLowerCase() === normalizedEmail;
      });
      if (studentMatch) {
        console.log('✅ Usuario encontrado como ESTUDIANTE en:', course.name);
        roles.add('student');
        name = studentMatch.profile?.name?.fullName || studentMatch.name?.fullName || studentMatch.displayName || name;
      }
    }

    if (!roles.size) {
      console.log('❌ Usuario NO encontrado en ningún curso de Classroom');
      console.log('📧 Email buscado:', normalizedEmail);
      console.log('📚 Total de cursos revisados:', courses.length);
      return null;
    }

    console.log('✅ Usuario encontrado con roles:', Array.from(roles));
    return {
      roles: Array.from(roles),
      name
    };
  } catch (error) {
    console.error('❌ Error al acceder a Classroom API:', error.message);
    throw error;
  }
}

async function listTeachers(classroomClient, courseId) {
  try {
    console.log('🔍 Listando profesores para curso:', courseId);
    const { data } = await classroomClient.courses.teachers.list({ courseId });
    console.log('📋 Datos brutos de profesores:', JSON.stringify(data, null, 2));
    return data.teachers || [];
  } catch (error) {
    console.error('❌ Error al listar profesores:', error.message);
    if (error.code === 404) {
      console.log('ℹ️ Curso no encontrado o sin profesores');
      return [];
    }
    throw error;
  }
}

async function listStudents(classroomClient, courseId) {
  try {
    console.log('🔍 Listando estudiantes para curso:', courseId);
    const { data } = await classroomClient.courses.students.list({ courseId });
    console.log('📋 Datos brutos de estudiantes:', JSON.stringify(data, null, 2));
    return data.students || [];
  } catch (error) {
    console.error('❌ Error al listar estudiantes:', error.message);
    if (error.code === 404) {
      console.log('ℹ️ Curso no encontrado o sin estudiantes');
      return [];
    }
    throw error;
  }
}

module.exports = {
  resolveUserContext
};

