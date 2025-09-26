async function fetchCourseWork(classroomClient, courseId) {
  const { data } = await classroomClient.courses.courseWork.list({ courseId });
  return data.courseWork || [];
}

async function fetchStudents(classroomClient, courseId) {
  const { data } = await classroomClient.courses.students.list({ courseId });
  return data.students || [];
}

async function fetchStudentSubmissions(classroomClient, courseId, courseWorkId) {
  const { data } = await classroomClient.courses.courseWork.studentSubmissions.list({
    courseId,
    courseWorkId
  });
  return data.studentSubmissions || [];
}


async function fetchAllData(classroomClient, allowedTeacherEmail) {
  const summaries = [];

  const { data: coursesData } = await classroomClient.courses.list({
    courseStates: ['ACTIVE'],
    teacherId: allowedTeacherEmail
  });
  const courses = coursesData.courses || [];

  for (const course of courses) {
    const courseId = course.id;
    const [courseWork, students] = await Promise.all([
      fetchCourseWork(classroomClient, courseId),
      fetchStudents(classroomClient, courseId)
    ]);

    const studentsMap = new Map();
    students.forEach((student) => {
      const email = student.profile.emailAddress.toLowerCase();
      const entry = {
        email,
        userId: student.userId,
        name: student.profile.name.fullName,
        submissions: []
      };
      studentsMap.set(student.userId, entry);
      studentsMap.set(email, entry);
    });

    for (const work of courseWork) {
      const submissions = await fetchStudentSubmissions(classroomClient, courseId, work.id);

      submissions.forEach((submission) => {
        const student = studentsMap.get(submission.userId) || studentsMap.get(submission.user?.emailAddress?.toLowerCase());
        if (!student) {
          return;
        }
        student.submissions.push({
          courseId,
          courseWorkId: work.id,
          courseWorkTitle: work.title,
          courseWorkAlternateLink: work.alternateLink,
          state: submission.state,
          late: submission.late || false,
          updateTime: submission.updateTime
        });
      });
    }

    summaries.push({ courseId, students: Array.from(studentsMap.values()) });
  }

  return summaries;
}

module.exports = {
  fetchAllData
};

