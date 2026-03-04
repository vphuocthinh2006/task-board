/* ========================================
   CS221 TASK BOARD — APP LOGIC
   Firebase Realtime DB + Drag & Drop + CRUD
   ======================================== */

// ─── Firebase Config ───
const firebaseConfig = {
    apiKey: "AIzaSyCWhKtptm1oYFxQCYHE-ZE8CmvPDEKViaA",
    authDomain: "task-board-30c3a.firebaseapp.com",
    databaseURL: "https://task-board-30c3a-default-rtdb.firebaseio.com",
    projectId: "task-board-30c3a",
    storageBucket: "task-board-30c3a.firebasestorage.app",
    messagingSenderId: "967561410136",
    appId: "1:967561410136:web:58ba6e15bac51591a03c2d",
    measurementId: "G-R70PDXDR4S"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const tasksRef = db.ref('tasks_new');

// ─── Team Members ───
const MEMBERS = [
    { id: 'member1', name: 'Thành viên 1', initials: 'T1', color: '#4f8cff' },
    { id: 'member2', name: 'Thành viên 2', initials: 'T2', color: '#a855f7' },
    { id: 'member3', name: 'Thành viên 3', initials: 'T3', color: '#ec4899' },
    { id: 'member4', name: 'Thành viên 4', initials: 'T4', color: '#22c55e' },
];

const MODULES = ['Frontend', 'Backend', 'RAG', 'ML/AI', 'DevOps', 'Data', 'Design', 'Docs'];

// ─── Default Tasks (CS221 Project) ───
const DEFAULT_TASKS = [];



// ─── State ───
let tasks = [];
let activeFilters = { members: [], modules: [] };
let editingTaskId = null;
let draggedId = null;
let firebaseReady = false;

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
    renderTeamAvatars();
    renderMemberSelect();
    renderFilters();
    initFirebase();
});

// ─── Firebase Init & Real-time Listener ───
function initFirebase() {
    // Listen for real-time changes
    tasksRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Convert Firebase object to array
            tasks = Object.values(data);
        } else {
            // First time: seed default tasks
            tasks = JSON.parse(JSON.stringify(DEFAULT_TASKS));
            saveTasksToFirebase();
        }
        firebaseReady = true;
        renderBoard();
        updateStats();
    }, (error) => {
        console.error('Firebase read error:', error);
        // Fallback to localStorage if Firebase fails
        loadTasksFromLocalStorage();
        renderBoard();
        updateStats();
    });
}

function saveTasksToFirebase() {
    // Save as object keyed by task id for efficient updates
    const tasksObj = {};
    tasks.forEach(t => { tasksObj[t.id] = t; });
    tasksRef.set(tasksObj).catch(err => {
        console.error('Firebase write error:', err);
    });
}

function saveTaskToFirebase(task) {
    // Update single task (more efficient)
    tasksRef.child(task.id).set(task).catch(err => {
        console.error('Firebase write error:', err);
    });
}

function deleteTaskFromFirebase(taskId) {
    tasksRef.child(taskId).remove().catch(err => {
        console.error('Firebase delete error:', err);
    });
}

// ─── LocalStorage Fallback ───
function loadTasksFromLocalStorage() {
    const saved = localStorage.getItem('cs221_tasks_new');
    if (saved) {
        tasks = JSON.parse(saved);
    } else {
        tasks = JSON.parse(JSON.stringify(DEFAULT_TASKS));
    }
}

// ─── Render Team Avatars ───
function renderTeamAvatars() {
    const container = document.getElementById('teamAvatars');
    container.innerHTML = MEMBERS.map(m => `
        <div class="team-avatar" style="background: ${m.color}" onclick="toggleMemberFilter('${m.id}')">
            ${m.initials}
            <span class="tooltip">${m.name}</span>
        </div>
    `).join('');
}

// ─── Member Select in Form ───
function renderMemberSelect() {
    const select = document.getElementById('taskMember');
    MEMBERS.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name;
        select.appendChild(opt);
    });
}

// ─── Filters ───
function renderFilters() {
    const memberContainer = document.getElementById('memberFilters');
    const moduleContainer = document.getElementById('moduleFilters');

    memberContainer.innerHTML = `<div class="filter-chip active" onclick="clearFilter('members')">Tất cả</div>` +
        MEMBERS.map(m => `
            <div class="filter-chip" data-member="${m.id}" onclick="toggleMemberFilter('${m.id}')">
                <span style="color:${m.color}">●</span> ${m.name}
            </div>
        `).join('');

    moduleContainer.innerHTML = `<div class="filter-chip active" onclick="clearFilter('modules')">Tất cả</div>` +
        MODULES.map(mod => `
            <div class="filter-chip" data-module="${mod}" onclick="toggleModuleFilter('${mod}')">${mod}</div>
        `).join('');
}

function toggleMemberFilter(id) {
    const idx = activeFilters.members.indexOf(id);
    if (idx === -1) activeFilters.members.push(id);
    else activeFilters.members.splice(idx, 1);
    updateFilterChips();
    renderBoard();
}

function toggleModuleFilter(mod) {
    const idx = activeFilters.modules.indexOf(mod);
    if (idx === -1) activeFilters.modules.push(mod);
    else activeFilters.modules.splice(idx, 1);
    updateFilterChips();
    renderBoard();
}

function clearFilter(type) {
    activeFilters[type] = [];
    updateFilterChips();
    renderBoard();
}

function updateFilterChips() {
    document.querySelectorAll('#memberFilters .filter-chip').forEach(chip => {
        const memberId = chip.dataset.member;
        if (!memberId) {
            chip.classList.toggle('active', activeFilters.members.length === 0);
        } else {
            chip.classList.toggle('active', activeFilters.members.includes(memberId));
        }
    });

    document.querySelectorAll('#moduleFilters .filter-chip').forEach(chip => {
        const mod = chip.dataset.module;
        if (!mod) {
            chip.classList.toggle('active', activeFilters.modules.length === 0);
        } else {
            chip.classList.toggle('active', activeFilters.modules.includes(mod));
        }
    });
}

// ─── Render Board ───
function renderBoard() {
    const statuses = ['todo', 'in-progress', 'review', 'done'];
    const filtered = tasks.filter(t => {
        if (activeFilters.members.length > 0 && !activeFilters.members.includes(t.member)) return false;
        if (activeFilters.modules.length > 0 && !activeFilters.modules.includes(t.module)) return false;
        return true;
    });

    statuses.forEach(status => {
        const list = document.getElementById(`list-${status}`);
        const statusTasks = filtered.filter(t => t.status === status);
        document.getElementById(`count-${status}`).textContent = statusTasks.length;

        list.innerHTML = statusTasks.map((t, i) => {
            const member = MEMBERS.find(m => m.id === t.member);
            const moduleClass = `module-${(t.module || '').replace('/', '')}`;
            const deadlineInfo = getDeadlineInfo(t.deadline);

            return `
                <div class="task-card"
                     draggable="true"
                     ondragstart="dragStart(event, '${t.id}')"
                     ondragend="dragEnd(event)"
                     onclick="showDetail('${t.id}')"
                     style="animation-delay: ${i * 0.05}s">
                    <div class="task-card-top">
                        ${t.module ? `<span class="task-module ${moduleClass}">${t.module}</span>` : '<span></span>'}
                        <span class="task-priority priority-${t.priority}">${getPriorityIcon(t.priority)}</span>
                    </div>
                    <div class="task-name">${escapeHtml(t.name)}</div>
                    ${t.desc ? `<div class="task-desc">${escapeHtml(t.desc)}</div>` : ''}
                    <div class="task-card-bottom">
                        <div class="task-assignee">
                            <div class="task-avatar" style="background: ${member ? member.color : '#666'}">${member ? member.initials : '?'}</div>
                            <span class="task-assignee-name">${member ? member.name : 'Unassigned'}</span>
                        </div>
                        ${t.deadline ? `<span class="task-deadline ${deadlineInfo.class}">📅 ${deadlineInfo.text}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    });

    updateStats();
}

function getPriorityIcon(p) {
    return { high: '🔴 Cao', medium: '🟡 TB', low: '🟢 Thấp' }[p] || p;
}

function getDeadlineInfo(deadline) {
    if (!deadline) return { text: '', class: '' };
    const d = new Date(deadline);
    const now = new Date();
    const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
    const text = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

    if (diff < 0) return { text, class: 'overdue' };
    if (diff <= 3) return { text, class: 'soon' };
    return { text, class: '' };
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ─── Stats ───
function updateStats() {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    document.getElementById('stats').innerHTML = `
        <div class="stat-item">📊 Tổng: <span class="stat-value">${total}</span></div>
        <div class="stat-item">🔨 Đang làm: <span class="stat-value">${inProgress}</span></div>
        <div class="stat-item">✅ Xong: <span class="stat-value">${done}/${total}</span> (${pct}%)</div>
    `;
}

// ─── Drag & Drop ───
function dragStart(e, id) {
    draggedId = id;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
}

function dragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.task-list').forEach(el => el.classList.remove('drag-over'));
    draggedId = null;
}

function allowDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function dragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function drop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const id = e.dataTransfer.getData('text/plain');
    const status = e.currentTarget.id.replace('list-', '');
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.status = status;
        // Sync to Firebase (real-time update for all users)
        saveTaskToFirebase(task);
    }
}

// ─── Modal: Add / Edit ───
function openModal(taskId = null) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('taskForm');

    form.reset();
    editingTaskId = taskId;

    if (taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        title.textContent = 'Chỉnh sửa Task';
        document.getElementById('taskName').value = task.name;
        document.getElementById('taskDesc').value = task.desc || '';
        document.getElementById('taskMember').value = task.member;
        document.getElementById('taskPriority').value = task.priority;
        document.getElementById('taskModule').value = task.module || '';
        document.getElementById('taskDeadline').value = task.deadline || '';
        document.getElementById('taskStatus').value = task.status;
        document.getElementById('taskId').value = task.id;
    } else {
        title.textContent = 'Thêm Task Mới';
        document.getElementById('taskId').value = '';
    }

    overlay.classList.add('active');
    setTimeout(() => document.getElementById('taskName').focus(), 200);
}

function closeModal(e) {
    if (e && e.target !== e.currentTarget && !e.currentTarget.classList.contains('modal-close')) return;
    document.getElementById('modalOverlay').classList.remove('active');
    editingTaskId = null;
}

function saveTask(e) {
    e.preventDefault();

    const name = document.getElementById('taskName').value.trim();
    const desc = document.getElementById('taskDesc').value.trim();
    const member = document.getElementById('taskMember').value;
    const priority = document.getElementById('taskPriority').value;
    const module = document.getElementById('taskModule').value;
    const deadline = document.getElementById('taskDeadline').value;
    const status = document.getElementById('taskStatus').value;
    const id = document.getElementById('taskId').value;

    if (id) {
        // Edit existing task
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.name = name;
            task.desc = desc;
            task.member = member;
            task.priority = priority;
            task.module = module;
            task.deadline = deadline;
            task.status = status;
            saveTaskToFirebase(task);
        }
    } else {
        // Add new task
        const newTask = {
            id: 'task_' + Date.now(),
            name, desc, member, priority, module, deadline, status
        };
        saveTaskToFirebase(newTask);
    }

    closeModal();
}

// ─── Task Detail ───
function showDetail(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const member = MEMBERS.find(m => m.id === task.member);
    const overlay = document.getElementById('detailOverlay');
    const moduleClass = `module-${(task.module || '').replace('/', '')}`;

    document.getElementById('detailTitle').textContent = task.name;
    document.getElementById('detailContent').innerHTML = `
        ${task.desc ? `<div class="detail-desc">${escapeHtml(task.desc)}</div>` : ''}
        <div class="detail-row">
            <span class="detail-label">Phân công</span>
            <span class="detail-value">
                <span style="display:inline-flex;align-items:center;gap:6px">
                    <span class="task-avatar" style="background:${member ? member.color : '#666'};width:20px;height:20px;font-size:9px;">${member ? member.initials : '?'}</span>
                    ${member ? member.name : 'N/A'}
                </span>
            </span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Độ ưu tiên</span>
            <span class="detail-value"><span class="task-priority priority-${task.priority}">${getPriorityIcon(task.priority)}</span></span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Module</span>
            <span class="detail-value">${task.module ? `<span class="task-module ${moduleClass}">${task.module}</span>` : 'N/A'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Trạng thái</span>
            <span class="detail-value">${getStatusLabel(task.status)}</span>
        </div>
        ${task.deadline ? `
        <div class="detail-row">
            <span class="detail-label">Deadline</span>
            <span class="detail-value">📅 ${new Date(task.deadline).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
        </div>` : ''}
    `;

    document.getElementById('detailDeleteBtn').onclick = () => {
        if (confirm(`Xóa task "${task.name}"?`)) {
            deleteTaskFromFirebase(id);
            closeDetail();
        }
    };

    document.getElementById('detailEditBtn').onclick = () => {
        closeDetail();
        setTimeout(() => openModal(id), 200);
    };

    overlay.classList.add('active');
}

function getStatusLabel(status) {
    return { 'todo': '📋 To Do', 'in-progress': '🔨 In Progress', 'review': '👀 Review', 'done': '✅ Done' }[status] || status;
}

function closeDetail(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('detailOverlay').classList.remove('active');
}

// ─── Keyboard Shortcuts ───
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        closeDetail();
    }
    if (e.key === 'n' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'SELECT') {
        e.preventDefault();
        openModal();
    }
});
