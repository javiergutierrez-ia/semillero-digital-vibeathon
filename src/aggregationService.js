const STATUS_ORDER = ['NEW', 'CREATED', 'TURNED_IN', 'RETURNED', 'RECLAIMED_BY_STUDENT'];

function normalizeState(state) {
  switch (state) {
    case 'NEW':
    case 'CREATED':
    case 'TURNED_IN':
    case 'RETURNED':
    case 'RECLAIMED_BY_STUDENT':
      return state;
    case 'DRAFT':
      return 'CREATED';
    case 'ASSIGNED':
      return 'NEW';
    default:
      return 'NEW';
  }
}

function aggregateData({ classroomData, assignments }) {
  const assignmentByEmail = new Map();

  assignments.forEach((assignment) => {
    const email = assignment.studentEmail?.toLowerCase();
    if (!email) {
      return;
    }
    assignmentByEmail.set(email, assignment);
  });

  const taskAggregation = new Map();
  const cellAggregation = new Map();
  const totals = new Map();
  const studentSummaries = [];

  for (const course of classroomData) {
    for (const student of course.students) {
      const assignment = assignmentByEmail.get(student.email);
      if (!assignment) {
        continue;
      }

      if (!cellAggregation.has(assignment.cellId)) {
        cellAggregation.set(assignment.cellId, {
          cellId: assignment.cellId,
          cellName: assignment.cellName,
          totals: initTotals()
        });
      }

      const summary = {
        studentEmail: student.email,
        studentName: assignment.studentName || student.name,
        cellId: assignment.cellId,
        cellName: assignment.cellName,
        submissions: []
      };

      student.submissions.forEach((submission) => {
        const state = normalizeState(submission.state);
        const taskKey = `${submission.courseWorkId}`;

        if (!taskAggregation.has(taskKey)) {
          taskAggregation.set(taskKey, {
            taskId: submission.courseWorkId,
            taskTitle: submission.courseWorkTitle,
            alternateLink: submission.courseWorkAlternateLink,
            totals: initTotals()
          });
        }

        incrementTotals(totals, state);
        incrementTotals(taskAggregation.get(taskKey).totals, state);
        incrementTotals(cellAggregation.get(assignment.cellId).totals, state);

        summary.submissions.push({
          taskId: submission.courseWorkId,
          taskTitle: submission.courseWorkTitle,
          state,
          late: submission.late,
          updatedAt: submission.updateTime,
          alternateLink: submission.courseWorkAlternateLink
        });
      });

      studentSummaries.push(summary);
    }
  }

  return {
    totals: mapToArray(totals),
    byTask: Array.from(taskAggregation.values()).map((entry) => ({
      taskId: entry.taskId,
      taskTitle: entry.taskTitle,
      alternateLink: entry.alternateLink,
      totals: mapToArray(entry.totals)
    })),
    byCell: Array.from(cellAggregation.values()).map((entry) => ({
      cellId: entry.cellId,
      cellName: entry.cellName,
      totals: mapToArray(entry.totals)
    })),
    students: studentSummaries
  };
}

function initTotals() {
  const totals = new Map();
  STATUS_ORDER.forEach((status) => totals.set(status, 0));
  return totals;
}

function incrementTotals(map, status) {
  if (!map.has(status)) {
    map.set(status, 0);
  }
  map.set(status, map.get(status) + 1);
}

function mapToArray(map) {
  return STATUS_ORDER.map((status) => ({
    status,
    count: map.get(status) || 0
  }));
}

module.exports = {
  aggregateData,
  STATUS_ORDER
};

