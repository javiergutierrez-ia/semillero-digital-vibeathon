const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const userInfo = document.getElementById('user-info');
const logoutBtn = document.getElementById('logout-btn');
const cellFilter = document.getElementById('cell-filter');
const studentsTableBody = document.getElementById('students-table-body');
const modeToggle = document.getElementById('mode-toggle');
const cellManagementSection = document.getElementById('cell-management');
const cellsList = document.getElementById('cells-list');
const createCellForm = document.getElementById('create-cell-form');
const cellNameInput = document.getElementById('cell-name');
const assignMemberForm = document.getElementById('assign-member-form');
const assignCellSelect = document.getElementById('assign-cell-select');
const assignRoleSelect = document.getElementById('assign-role-select');
const assignEmailInput = document.getElementById('assign-email');
const assignNameInput = document.getElementById('assign-name');

let currentUser = null;
let availableCells = [];
let charts = {};
let latestCells = [];

window.handleCredentialResponse = async (response) => {
  const { credential } = response;
  const accessToken = await promptAccessToken();

  if (!credential || !accessToken) {
    alert('No fue posible obtener los tokens de Google.');
    return;
  }

  sessionStorage.setItem('idToken', credential);
  sessionStorage.setItem('accessToken', accessToken);
  sessionStorage.setItem('mode', 'teacher');

  const loginResponse = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: credential, accessToken, mode: 'teacher' })
  });

  if (!loginResponse.ok) {
    const error = await loginResponse.json();
    console.error('Error en el login:', error);
    alert(`Error al iniciar sesión: ${error.message || 'Error desconocido'}\nVerifica que tu cuenta esté registrada en Google Classroom como profesor.`);
    return;
  }

  const data = await loginResponse.json();
  currentUser = data.user;
  availableCells = data.availableCells;

  renderDashboard();
  await loadSummary();
  if (currentUser.canManage) {
    await loadCells();
  }
};

async function promptAccessToken() {
  return new Promise((resolve) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: 'TU_GOOGLE_CLIENT_ID_AQUI',
      scope: 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.rosters.readonly https://www.googleapis.com/auth/classroom.student-submissions.students.readonly https://www.googleapis.com/auth/classroom.profile.emails https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid',
      callback: (tokenResponse) => {
        resolve(tokenResponse.access_token);
      }
    });

    client.requestAccessToken();
  });
}

function renderDashboard() {
  loginSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');

  const roleInfo = currentUser.classroomRoles ? currentUser.classroomRoles.join(', ') : 'Usuario';
  const modeInfo = currentUser.mode === 'coordinator' ? 'Modo Coordinador' : 'Modo Profesor';
  userInfo.textContent = `${currentUser.name || currentUser.email} · ${roleInfo} · ${modeInfo}`;

  cellFilter.innerHTML = '';

  availableCells.forEach((cell) => {
    const option = document.createElement('option');
    option.value = cell.id;
    option.textContent = cell.name;
    option.selected = true;
    cellFilter.appendChild(option);
  });

  if (availableCells.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Sin células disponibles';
    cellFilter.appendChild(option);
  }

  if (currentUser.canManage) {
    modeToggle.classList.remove('hidden');
    cellManagementSection.classList.toggle('hidden', currentUser.mode !== 'coordinator');
    updateModeButtons();
  } else {
    modeToggle.classList.add('hidden');
    cellManagementSection.classList.add('hidden');
  }
}

async function loadSummary() {
  const selectedCells = Array.from(cellFilter.selectedOptions).map((opt) => Number(opt.value));

  const response = await fetch('/api/dashboard/summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken: sessionStorage.getItem('idToken'),
      accessToken: sessionStorage.getItem('accessToken'),
      mode: sessionStorage.getItem('mode') || 'teacher',
      selectedCells
    })
  });

  if (!response.ok) {
    const error = await response.json();
    alert(error.message || 'Error al cargar datos');
    return;
  }

  const { summary, user, cells } = await response.json();
  currentUser = user;
  latestCells = cells || [];
  renderDashboard();
  renderCharts(summary);
  renderStudents(summary.students);
  renderCellsList();
  syncAssignCellSelect();
}

function renderCharts(summary) {
  if (!summary) {
    return;
  }

  if (!charts.totals) {
    charts.totals = new Chart(document.getElementById('chart-totals'), {
      type: 'doughnut',
      data: {
        labels: summary.totals.map((entry) => entry.status),
        datasets: [
          {
            data: summary.totals.map((entry) => entry.count),
            backgroundColor: ['#FF6B6B', '#FFD166', '#06D6A0', '#4ECDC4', '#A26BFF']
          }
        ]
      }
    });
  } else {
    charts.totals.data.datasets[0].data = summary.totals.map((entry) => entry.count);
    charts.totals.update();
  }

  renderStackedBar('chart-by-task', 'byTask', summary.byTask, 'taskTitle');
  renderStackedBar('chart-by-cell', 'byCell', summary.byCell, 'cellName');
}

function renderStackedBar(elementId, key, data, labelKey) {
  const labels = data.map((entry) => entry[labelKey]);
  const datasets = buildStackedDatasets(data);

  if (!charts[key]) {
    charts[key] = new Chart(document.getElementById(elementId), {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
        scales: { x: { stacked: true }, y: { stacked: true } }
      }
    });
  } else {
    charts[key].data.labels = labels;
    charts[key].data.datasets = datasets;
    charts[key].update();
  }
}

function buildStackedDatasets(data) {
  const statuses = ['NEW', 'CREATED', 'TURNED_IN', 'RETURNED', 'RECLAIMED_BY_STUDENT'];
  const colors = ['#FF6B6B', '#FFD166', '#06D6A0', '#4ECDC4', '#A26BFF'];

  return statuses.map((status, index) => ({
    label: status,
    data: data.map((entry) => {
      const match = entry.totals.find((item) => item.status === status);
      return match ? match.count : 0;
    }),
    backgroundColor: colors[index]
  }));
}

function renderStudents(students) {
  studentsTableBody.innerHTML = '';

  if (!summaryHasData(students)) {
    studentsTableBody.innerHTML = '<tr><td colspan="7">Sin datos disponibles</td></tr>';
    return;
  }

  students.forEach((student) => {
    student.submissions.forEach((submission) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${student.studentName}</td>
        <td>${student.cellName}</td>
        <td>${submission.taskTitle}</td>
        <td>${submission.state}</td>
        <td>${submission.late ? 'Sí' : 'No'}</td>
        <td>${new Date(submission.updatedAt).toLocaleString()}</td>
        <td><a href="${submission.alternateLink}" target="_blank">Abrir</a></td>
      `;
      studentsTableBody.appendChild(row);
    });
  });
}

function summaryHasData(students) {
  return Array.isArray(students) && students.some((student) => Array.isArray(student.submissions) && student.submissions.length);
}

logoutBtn.addEventListener('click', async () => {
  await fetch('/auth/logout', { method: 'POST' });
  sessionStorage.removeItem('idToken');
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('mode');
  window.location.reload();
});

cellFilter.addEventListener('change', () => {
  loadSummary();
});

modeToggle.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-mode]');
  if (!button) {
    return;
  }

  const selectedMode = button.dataset.mode;
  sessionStorage.setItem('mode', selectedMode);

  await loadSummary();
  if (selectedMode === 'coordinator') {
    await loadCells();
  }
});

createCellForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = cellNameInput.value.trim();
  if (!name) {
    return;
  }

  const response = await fetch('/api/cells', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-id-token': sessionStorage.getItem('idToken'),
      'x-access-token': sessionStorage.getItem('accessToken')
    },
    body: JSON.stringify({ name })
  });

  if (!response.ok) {
    const error = await response.json();
    alert(error.message || 'Error al crear célula');
    return;
  }

  cellNameInput.value = '';
  await loadCells();
  await loadSummary();
});

assignMemberForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const body = {
    email: assignEmailInput.value.trim(),
    name: assignNameInput.value.trim(),
    role: assignRoleSelect.value
  };

  const cellId = assignCellSelect.value;

  const response = await fetch(`/api/cells/${cellId}/assignments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-id-token': sessionStorage.getItem('idToken'),
      'x-access-token': sessionStorage.getItem('accessToken')
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json();
    alert(error.message || 'Error al asignar miembro');
    return;
  }

  assignEmailInput.value = '';
  assignNameInput.value = '';
  await loadCells();
  await loadSummary();
});

cellsList?.addEventListener('click', async (event) => {
  if (event.target.tagName !== 'BUTTON') {
    return;
  }
  const memberId = event.target.dataset.memberId;
  if (!memberId) {
    return;
  }

  const cellCard = event.target.closest('.cell-card');
  const cellId = cellCard?.dataset.cellId;
  if (!cellId) {
    return;
  }

  const response = await fetch(`/api/cells/${cellId}/assignments/${memberId}`, {
    method: 'DELETE',
    headers: {
      'x-id-token': sessionStorage.getItem('idToken'),
      'x-access-token': sessionStorage.getItem('accessToken')
    }
  });

  if (!response.ok) {
    const error = await response.json();
    alert(error.message || 'Error al quitar miembro');
    return;
  }

  await loadCells();
  await loadSummary();
});

async function loadCells() {
  const response = await fetch('/api/cells', {
    headers: {
      'x-id-token': sessionStorage.getItem('idToken'),
      'x-access-token': sessionStorage.getItem('accessToken')
    }
  });

  if (!response.ok) {
    const error = await response.json();
    console.warn('Error al cargar células', error.message);
    return;
  }

  const data = await response.json();
  latestCells = data.cells || [];
  availableCells = latestCells.map((cell) => ({ id: cell.id, name: cell.name }));
  renderDashboard();
  renderCellsList();
  syncAssignCellSelect();
}

function renderCellsList() {
  if (!cellsList) {
    return;
  }

  cellsList.innerHTML = '';

  latestCells.forEach((cell) => {
    const card = document.createElement('div');
    card.className = 'cell-card';
    card.dataset.cellId = cell.id;
    card.innerHTML = `
      <h4>${cell.name}</h4>
      <strong>Profesores</strong>
      <div class="members-list">
        ${renderMembers(cell.teachers)}
      </div>
      <strong>Alumnos</strong>
      <div class="members-list">
        ${renderMembers(cell.students)}
      </div>
    `;
    cellsList.appendChild(card);
  });
}

function renderMembers(members = []) {
  if (!members.length) {
    return '<p>Sin miembros</p>';
  }

  return members
    .map(
      (member) => `
        <div class="member-item">
          <span>${member.name || member.email}</span>
          <button data-member-id="${member.id}">Quitar</button>
        </div>
      `
    )
    .join('');
}

function syncAssignCellSelect() {
  assignCellSelect.innerHTML = '';
  latestCells.forEach((cell) => {
    const option = document.createElement('option');
    option.value = cell.id;
    option.textContent = cell.name;
    assignCellSelect.appendChild(option);
  });
}

function updateModeButtons() {
  const buttons = modeToggle.querySelectorAll('button[data-mode]');
  const mode = sessionStorage.getItem('mode') || 'teacher';
  buttons.forEach((button) => {
    button.classList.toggle('active', button.dataset.mode === mode);
  });
}

function initializeGoogle() {
  if (!window.google || !google.accounts || !google.accounts.id) {
    setTimeout(initializeGoogle, 200);
    return;
  }

  google.accounts.id.initialize({
    client_id: 'TU_GOOGLE_CLIENT_ID_AQUI',
    callback: window.handleCredentialResponse
  });

  google.accounts.id.renderButton(document.getElementById('google-signin'), {
    theme: 'filled_blue',
    size: 'large'
  });
}

initializeGoogle();

