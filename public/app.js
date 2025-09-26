// Semillero Digital Dashboard v2.1 - Fixed spinners and alerts
// Elements
const loginSection = document.getElementById('login-section');
const modeSelectionSection = document.getElementById('mode-selection');
const dashboardSection = document.getElementById('dashboard-section');
const dashboardView = document.getElementById('dashboard-view');
const managementView = document.getElementById('management-view');

// User info and controls
const userInfo = document.getElementById('user-info');
const userWelcome = document.getElementById('user-welcome');
const logoutBtn = document.getElementById('logout-btn');
const logoutBtnMode = document.getElementById('logout-btn-mode');
const modeSwitchBtn = document.getElementById('mode-switch-btn');

// Navigation
const navItems = document.querySelectorAll('.nav-item');
const managementNav = document.getElementById('management-nav');

// Dashboard elements
const cellFilter = document.getElementById('cell-filter');
const teacherFilter = document.getElementById('teacher-filter');
const statusFilter = document.getElementById('status-filter');
const studentsTableBody = document.getElementById('students-table-body');

// Spinners
const loginSpinner = document.getElementById('login-spinner');
const dashboardSpinner = document.getElementById('dashboard-spinner');
const cellsSpinner = document.getElementById('cells-spinner');
const studentsSpinner = document.getElementById('students-spinner');
// Individual chart spinners
const chartTotalsSpinner = document.getElementById('chart-totals-spinner');
const chartTasksSpinner = document.getElementById('chart-tasks-spinner');
const chartCellsSpinner = document.getElementById('chart-cells-spinner');

// Management elements
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

// Robust spinner functions using inline styles
function showSpinner(spinnerId) {
  try {
    const spinner = document.getElementById(spinnerId);
    if (spinner) {
      spinner.style.display = 'flex';
      spinner.classList.remove('hidden');
    }
  } catch (error) {
    console.log('Error showing spinner:', error);
  }
}

function hideSpinner(spinnerId) {
  try {
    const spinner = document.getElementById(spinnerId);
    if (spinner) {
      spinner.style.display = 'none';
      spinner.classList.add('hidden');
    }
  } catch (error) {
    console.log('Error hiding spinner:', error);
  }
}

function showLoginSpinner() {
  showSpinner('login-spinner');
  try {
    const googleSignin = document.getElementById('google-signin');
    if (googleSignin) {
      googleSignin.style.display = 'none';
    }
  } catch (error) {
    console.log('Error managing login UI:', error);
  }
}

function hideLoginSpinner() {
  hideSpinner('login-spinner');
  try {
    const googleSignin = document.getElementById('google-signin');
    if (googleSignin) {
      googleSignin.style.display = 'block';
    }
  } catch (error) {
    console.log('Error managing login UI:', error);
  }
}

window.handleCredentialResponse = async (response) => {
  try {
    showLoginSpinner();
    
    const { credential } = response;
    const accessToken = await promptAccessToken();

    if (!credential || !accessToken) {
      hideLoginSpinner();
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

    if (loginResponse.ok) {
      const data = await loginResponse.json();
      currentUser = data.user;
      availableCells = data.availableCells;

      // Show mode selection
      loginSection.classList.add('hidden');
      modeSelectionSection.classList.remove('hidden');
      updateUserWelcome();
    } else {
      console.log('Login error:', loginResponse.status);
    }
    
  } catch (error) {
    console.log('Login error:', error);
  } finally {
    hideLoginSpinner();
  }
};

async function promptAccessToken() {
  return new Promise((resolve) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: '977103222873-81pu160gcqstk82qm608kj8esdalmaaa.apps.googleusercontent.com',
      scope: 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.rosters.readonly https://www.googleapis.com/auth/classroom.student-submissions.students.readonly https://www.googleapis.com/auth/classroom.profile.emails https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid',
      callback: (tokenResponse) => {
        resolve(tokenResponse.access_token);
      }
    });

    client.requestAccessToken();
  });
}

function renderDashboard() {
  // Dashboard visibility managed by selectMode() function

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
    managementNav.classList.remove('hidden');
  } else {
    managementNav.classList.add('hidden');
  }
}

async function loadSummary() {
  // Simple check for tokens
  const idToken = sessionStorage.getItem('idToken');
  const accessToken = sessionStorage.getItem('accessToken');
  
  if (!idToken || !accessToken) {
    console.log('No hay tokens, saltando carga');
    return;
  }
  
  console.log('Iniciando loadSummary...');
  
  // Show individual chart spinners
  showSpinner('chart-totals-spinner');
  showSpinner('chart-tasks-spinner');  
  showSpinner('chart-cells-spinner');
  showSpinner('students-spinner');
  
  // Safety timeout to hide spinners if something goes wrong
  const timeoutId = setTimeout(() => {
    console.log('Timeout: Ocultando spinners por seguridad');
    hideSpinner('chart-totals-spinner');
    hideSpinner('chart-tasks-spinner');
    hideSpinner('chart-cells-spinner');
    hideSpinner('students-spinner');
  }, 10000); // 10 seconds timeout
  
  try {
    // Safe way to get selected filters
    let selectedCells = [];
    let selectedTeachers = [];
    let selectedStatuses = [];
    
    try {
      if (cellFilter && cellFilter.selectedOptions) {
        selectedCells = Array.from(cellFilter.selectedOptions).map((opt) => Number(opt.value));
      }
      if (teacherFilter && teacherFilter.selectedOptions) {
        selectedTeachers = Array.from(teacherFilter.selectedOptions)
          .map((opt) => opt.value)
          .filter(value => value !== ''); // Remove empty values
      }
      if (statusFilter && statusFilter.selectedOptions) {
        selectedStatuses = Array.from(statusFilter.selectedOptions)
          .map((opt) => opt.value)
          .filter(value => value !== ''); // Remove empty values
      }
    } catch (e) {
      console.log('Error obteniendo filtros:', e);
    }

    const response = await fetch('/api/dashboard/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken,
        accessToken,
        mode: sessionStorage.getItem('mode') || 'teacher',
        selectedCells,
        selectedTeachers,
        selectedStatuses
      })
    });

    if (response.ok) {
      const { summary, user, cells } = await response.json();
      console.log('📊 Datos recibidos del servidor:');
      console.log('- Summary:', summary);
      console.log('- User:', user);
      console.log('- Cells:', cells);
      console.log('- Students count:', summary?.students?.length || 0);
      console.log('- Students data:', summary?.students);
      
      currentUser = user;
      latestCells = cells || [];
      renderDashboard();
      renderChartsWithSpinner(summary);
      renderStudentsWithSpinner(summary.students);
      renderCellsList();
      populateTeacherFilter(summary);
      syncAssignCellSelect();
      console.log('loadSummary completado exitosamente');
    } else {
      console.log('Error del servidor:', response.status);
    }
    
  } catch (error) {
    console.log('Error en loadSummary:', error);
  }
  
  // Force hide spinners regardless of what happened
  clearTimeout(timeoutId);
  console.log('Ocultando spinners específicos...');
  hideSpinner('chart-totals-spinner');
  hideSpinner('chart-tasks-spinner');
  hideSpinner('chart-cells-spinner');
  hideSpinner('students-spinner');
}

function renderChartsWithSpinner(summary) {
  try {
    renderChartsIndividually(summary);
  } catch (error) {
    console.log('Error renderizando gráficos:', error);
    // Hide all chart spinners on error
    hideSpinner('chart-totals-spinner');
    hideSpinner('chart-tasks-spinner');
    hideSpinner('chart-cells-spinner');
  }
}

function renderChartsIndividually(summary) {
  console.log('📊 Renderizando gráficos individualmente...');
  
  if (!summary) {
    console.log('❌ No hay summary para gráficos');
    hideSpinner('chart-totals-spinner');
    hideSpinner('chart-tasks-spinner');
    hideSpinner('chart-cells-spinner');
    return;
  }
  
  // Render each chart individually and hide its spinner
  setTimeout(() => {
    try {
      renderTotalsChart(summary);
      hideSpinner('chart-totals-spinner');
    } catch (error) {
      console.log('Error en gráfico totals:', error);
      hideSpinner('chart-totals-spinner');
    }
  }, 100);
  
  setTimeout(() => {
    try {
      renderTasksChart(summary);
      hideSpinner('chart-tasks-spinner');
    } catch (error) {
      console.log('Error en gráfico tasks:', error);
      hideSpinner('chart-tasks-spinner');
    }
  }, 200);
  
  setTimeout(() => {
    try {
      renderCellsChart(summary);
      hideSpinner('chart-cells-spinner');
    } catch (error) {
      console.log('Error en gráfico cells:', error);
      hideSpinner('chart-cells-spinner');
    }
  }, 300);
}

function renderStudentsWithSpinner(students) {
  try {
    renderStudents(students);
    hideSpinner('students-spinner');
  } catch (error) {
    console.log('Error renderizando estudiantes:', error);
    hideSpinner('students-spinner');
  }
}

function populateTeacherFilter(summary) {
  if (!teacherFilter || !summary) {
    return;
  }
  
  // Get unique teachers from the data
  const teachers = new Set();
  
  if (summary.students) {
    summary.students.forEach(student => {
      if (student.teacherName) {
        teachers.add(student.teacherName);
      }
    });
  }
  
  // Clear existing options except the first one
  teacherFilter.innerHTML = '<option value="">Todos los profesores</option>';
  
  // Add teacher options
  Array.from(teachers).sort().forEach(teacher => {
    const option = document.createElement('option');
    option.value = teacher;
    option.textContent = `👨‍🏫 ${teacher}`;
    teacherFilter.appendChild(option);
  });
}

// Individual chart render functions
function renderTotalsChart(summary) {
  console.log('📊 Renderizando gráfico de totales...');
  
  if (!summary || !summary.totals || summary.totals.length === 0) {
    console.log('❌ No hay datos de totales');
    return;
  }

  if (!charts.totals) {
    charts.totals = new Chart(document.getElementById('chart-totals'), {
      type: 'doughnut',
      data: {
        labels: summary.totals.map((entry) => statusTranslations[entry.status] || entry.status),
        datasets: [
          {
            data: summary.totals.map((entry) => entry.count),
            backgroundColor: ['#FF6B6B', '#FFD166', '#06D6A0', '#4ECDC4', '#A26BFF']
          }
        ]
      }
    });
  } else {
    charts.totals.data.labels = summary.totals.map((entry) => statusTranslations[entry.status] || entry.status);
    charts.totals.data.datasets[0].data = summary.totals.map((entry) => entry.count);
    charts.totals.update();
  }
}

function renderTasksChart(summary) {
  console.log('📋 Renderizando gráfico por tareas...');
  
  if (!summary || !summary.byTask || summary.byTask.length === 0) {
    console.log('❌ No hay datos de tareas');
    return;
  }
  
  renderStackedBar('chart-by-task', 'byTask', summary.byTask, 'taskTitle');
}

function renderCellsChart(summary) {
  console.log('🏢 Renderizando gráfico por células...');
  
  if (!summary || !summary.byCell || summary.byCell.length === 0) {
    console.log('❌ No hay datos de células');
    return;
  }
  
  renderStackedBar('chart-by-cell', 'byCell', summary.byCell, 'cellName');
}

// Legacy function - now calls individual functions
function renderCharts(summary) {
  console.log('📊 Renderizando todos los gráficos (legacy)...');
  renderTotalsChart(summary);
  renderTasksChart(summary);
  renderCellsChart(summary);
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
  const statusTranslations = {
    'NEW': 'Nuevo',
    'CREATED': 'Creado', 
    'TURNED_IN': 'Entregado',
    'RETURNED': 'Devuelto',
    'RECLAIMED_BY_STUDENT': 'Recuperado'
  };
  const colors = ['#FF6B6B', '#FFD166', '#06D6A0', '#4ECDC4', '#A26BFF'];

  return statuses.map((status, index) => ({
    label: statusTranslations[status] || status,
    data: data.map((entry) => {
      const match = entry.totals.find((item) => item.status === status);
      return match ? match.count : 0;
    }),
    backgroundColor: colors[index]
  }));
}

function renderStudents(students) {
  console.log('🎓 Renderizando estudiantes...');
  console.log('- Students recibidos:', students);
  console.log('- Es array?', Array.isArray(students));
  console.log('- Length:', students?.length);
  
  studentsTableBody.innerHTML = '';

  if (!summaryHasData(students)) {
    console.log('❌ No hay datos de estudiantes disponibles');
    studentsTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
          📋 <strong>No hay estudiantes asignados a células</strong><br><br>
          Para ver datos aquí necesitas:<br>
          1. Asignar estudiantes a células usando "Gestión → Asignar Miembro"<br>
          2. Los estudiantes deben tener el mismo email en Classroom y en la asignación<br>
          3. Los estudiantes deben tener tareas asignadas en Classroom
        </td>
      </tr>
    `;
    return;
  }
  
  console.log('✅ Hay datos, procesando estudiantes...');

  students.forEach((student) => {
    student.submissions.forEach((submission) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${student.studentName}</td>
        <td>${student.cellName}</td>
        <td>${submission.taskTitle}</td>
        <td><span class="status-badge status-${submission.state.toLowerCase().replace('_', '-')}">${submission.stateSpanish || submission.state}</span></td>
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

// Logout function 
async function logout() {
  await fetch('/auth/logout', { method: 'POST' });
  sessionStorage.removeItem('idToken');
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('mode');
  window.location.reload();
}

// Logout event listeners
logoutBtn.addEventListener('click', logout);
if (logoutBtnMode) {
  logoutBtnMode.addEventListener('click', logout);
}

// MVP Filter Events - Required for hackathon compliance
cellFilter.addEventListener('change', () => {
  loadSummary();
});

teacherFilter.addEventListener('change', () => {
  loadSummary();
});

statusFilter.addEventListener('change', () => {
  loadSummary();
});

// Mode toggle functionality moved to selectMode() function

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
  console.log('Cargando células...');
  showSpinner('cells-spinner');
  
  // Safety timeout for cells spinner
  const timeoutId = setTimeout(() => {
    console.log('Timeout: Ocultando spinner de células por seguridad');
    hideSpinner('cells-spinner');
  }, 10000);
  
  try {
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
    console.log('Células cargadas exitosamente');
    
  } catch (error) {
    console.log('Error en loadCells:', error);
  }
  
  // Always hide spinner
  clearTimeout(timeoutId);
  console.log('Ocultando spinner de células...');
  hideSpinner('cells-spinner');
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

// updateModeButtons function no longer needed - mode selection handled by new UI

function initializeGoogle() {
  if (!window.google || !google.accounts || !google.accounts.id) {
    setTimeout(initializeGoogle, 200);
    return;
  }

  google.accounts.id.initialize({
    client_id: '977103222873-81pu160gcqstk82qm608kj8esdalmaaa.apps.googleusercontent.com',
    callback: window.handleCredentialResponse
  });

  google.accounts.id.renderButton(document.getElementById('google-signin'), {
    theme: 'filled_blue',
    size: 'large'
  });
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Ensure all spinners start hidden
  hideSpinner('login-spinner');
  hideSpinner('dashboard-spinner');
  hideSpinner('cells-spinner');
  hideSpinner('students-spinner');
  hideSpinner('chart-totals-spinner');
  hideSpinner('chart-tasks-spinner');
  hideSpinner('chart-cells-spinner');
  
  // Initialize Google after DOM is ready
  initializeGoogle();
});

// Navigation functions
function selectMode(mode) {
  if (!currentUser) {
    console.log('No hay usuario, cancelando selección de modo');
    return;
  }
  
  sessionStorage.setItem('mode', mode);
  currentUser.mode = mode;
  
  modeSelectionSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  
  // Show/hide management nav based on mode
  if (mode === 'coordinator') {
    managementNav.classList.remove('hidden');
  } else {
    managementNav.classList.add('hidden');
  }
  
  renderDashboard();
  
  // Load data after a small delay to allow UI to render
  setTimeout(() => {
    loadSummary();
    if (mode === 'coordinator') {
      loadCells();
    }
  }, 100);
}

function showModeSelection() {
  dashboardSection.classList.add('hidden');
  modeSelectionSection.classList.remove('hidden');
}

function switchView(view) {
  // Update navigation
  navItems.forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-view') === view);
  });
  
  // Switch views
  if (view === 'dashboard') {
    dashboardView.classList.remove('hidden');
    managementView.classList.add('hidden');
  } else if (view === 'management') {
    dashboardView.classList.add('hidden');
    managementView.classList.remove('hidden');
    loadCells(); // Load cells when entering management view
  }
}

function updateUserWelcome() {
  if (currentUser && userWelcome) {
    userWelcome.textContent = `¡Hola, ${currentUser.user.name}! Selecciona cómo quieres trabajar hoy.`;
  }
}

// Event listeners for new navigation
if (modeSwitchBtn) {
  modeSwitchBtn.addEventListener('click', showModeSelection);
}

navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    const view = e.target.getAttribute('data-view');
    switchView(view);
  });
});

// Make functions global for HTML onclick
window.selectMode = selectMode;
window.showModeSelection = showModeSelection;

