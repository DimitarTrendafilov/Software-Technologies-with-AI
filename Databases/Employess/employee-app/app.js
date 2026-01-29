
// Supabase Configuration
const SUPABASE_URL = 'https://vcakizqlzvykbdqxyvbd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYWtpenFsenZ5a2JkcXh5dmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDIwMTQsImV4cCI6MjA4NTg3ODAxNH0.W5ceg-OiZbcvo9w-2GSaqDZjPquT87L066y6lheHoDY';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State
let state = {
    employees: [],
    departments: [],
    currentSelectionType: null, // 'department' | 'manager' | 'dept-manager'
    itemToDelete: null // { type: 'employee'|'department', id: string }
};

// --- Initialization ---

document.addEventListener('DOMContentLoaded', async () => {
    await fetchDepartments();
    await fetchEmployees();
    renderEmployees();
    renderDepartments();
});

// --- Data Fetching ---

async function fetchEmployees() {
    showLoading(true);
    const { data, error } = await supabaseClient
        .from('employees')
        .select(`
            id, name, job_title, email, phone, department_id, manager_id,
            departments!employees_department_id_fkey (name),
            manager:employees!manager_id (name)
        `)
        .order('name');
    
    if (error) {
        showToast('Error fetching employees: ' + error.message, true);
    } else {
        state.employees = data;
    }
    showLoading(false);
}

async function fetchDepartments() {
    showLoading(true);
    const { data, error } = await supabaseClient
        .from('departments')
        .select(`
            id, name, description, manager_id,
            manager:employees!manager_id (name)
        `)
        .order('name');

    if (error) {
        showToast('Error fetching departments: ' + error.message, true);
    } else {
        state.departments = data;
    }
    showLoading(false);
}

// --- Rendering ---

function renderEmployees() {
    const tbody = document.querySelector('#employees-table tbody');
    tbody.innerHTML = '';
    
    state.employees.forEach(emp => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="font-weight:500">${escapeHtml(emp.name)}</div>
                <div style="font-size:0.85em; color:var(--secondary)">${escapeHtml(emp.email || '')}</div>
            </td>
            <td>${escapeHtml(emp.job_title)}</td>
            <td>${escapeHtml(emp.departments?.name || '-')}</td>
            <td>${escapeHtml(emp.manager?.name || '-')}</td>
            <td>
                <button class="icon-btn edit" onclick="editEmployee('${emp.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="icon-btn delete" onclick="confirmDelete('employee', '${emp.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderDepartments() {
    const tbody = document.querySelector('#departments-table tbody');
    tbody.innerHTML = '';

    state.departments.forEach(dept => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(dept.name)}</td>
            <td>${escapeHtml(dept.description || '-')}</td>
            <td>${escapeHtml(dept.manager?.name || '-')}</td>
            <td>
                <button class="icon-btn edit" onclick="editDepartment('${dept.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="icon-btn delete" onclick="confirmDelete('department', '${dept.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Tabs ---

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`${tabName}-tab`).classList.add('active');
    // Find button containing text or icon
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(btn => {
        if(btn.textContent.trim().toLowerCase().includes(tabName)) {
            btn.classList.add('active');
        }
    });
}

// --- Action Handling: Employees ---

function openEmployeeModal() {
    resetForm('employee-form');
    document.getElementById('emp-id').value = '';
    document.getElementById('employee-modal-title').textContent = 'Add Employee';
    updateSelectionDisplay('emp-dept', null);
    updateSelectionDisplay('emp-manager', null);
    openModal('employee-modal');
}

function editEmployee(id) {
    const emp = state.employees.find(e => e.id === id);
    if (!emp) return;

    document.getElementById('emp-id').value = emp.id;
    document.getElementById('emp-name').value = emp.name;
    document.getElementById('emp-job').value = emp.job_title;
    document.getElementById('emp-email').value = emp.email || '';
    document.getElementById('emp-phone').value = emp.phone || '';
    
    updateSelectionDisplay('emp-dept', emp.departments ? { id: emp.department_id, name: emp.departments.name } : null);
    updateSelectionDisplay('emp-manager', emp.manager ? { id: emp.manager_id, name: emp.manager.name } : null); // Fix: use emp.manager obj
    
    document.getElementById('employee-modal-title').textContent = 'Edit Employee';
    openModal('employee-modal');
}

async function handleEmployeeSubmit(event) {
    event.preventDefault();
    showLoading(true);

    const id = document.getElementById('emp-id').value;
    const employeeData = {
        name: document.getElementById('emp-name').value,
        job_title: document.getElementById('emp-job').value,
        email: document.getElementById('emp-email').value || null,
        phone: document.getElementById('emp-phone').value || null,
        department_id: document.getElementById('emp-dept-id').value || null,
        manager_id: document.getElementById('emp-manager-id').value || null
    };

    let result;
    if (id) {
        result = await supabaseClient.from('employees').update(employeeData).eq('id', id);
    } else {
        result = await supabaseClient.from('employees').insert([employeeData]);
    }

    if (result.error) {
        showToast('Error saving employee: ' + result.error.message, true);
    } else {
        showToast('Employee saved successfully');
        closeModal('employee-modal');
        await fetchEmployees();
        renderEmployees();
    }
    showLoading(false);
}

// --- Action Handling: Departments ---

function openDepartmentModal() {
    resetForm('department-form');
    document.getElementById('dept-id').value = '';
    document.getElementById('department-modal-title').textContent = 'Add Department';
    updateSelectionDisplay('dept-manager', null);
    openModal('department-modal');
}

function editDepartment(id) {
    const dept = state.departments.find(d => d.id === id);
    if (!dept) return;

    document.getElementById('dept-id').value = dept.id;
    document.getElementById('dept-name').value = dept.name;
    document.getElementById('dept-desc').value = dept.description || '';
    
    updateSelectionDisplay('dept-manager', dept.manager ? { id: dept.manager_id, name: dept.manager.name } : null);

    document.getElementById('department-modal-title').textContent = 'Edit Department';
    openModal('department-modal');
}

async function handleDepartmentSubmit(event) {
    event.preventDefault();
    showLoading(true);

    const id = document.getElementById('dept-id').value;
    const deptData = {
        name: document.getElementById('dept-name').value,
        description: document.getElementById('dept-desc').value || null,
        manager_id: document.getElementById('dept-manager-id').value || null
    };

    let result;
    if (id) {
        result = await supabaseClient.from('departments').update(deptData).eq('id', id);
    } else {
        result = await supabaseClient.from('departments').insert([deptData]);
    }

    if (result.error) {
        showToast('Error saving department: ' + result.error.message, true);
    } else {
        showToast('Department saved successfully');
        closeModal('department-modal');
        await fetchDepartments();
        renderDepartments();
    }
    showLoading(false);
}

// --- Deletion ---

function confirmDelete(type, id) {
    state.itemToDelete = { type, id };
    document.getElementById('delete-message').textContent = 
        `Are you sure you want to delete this ${type}? Dependent records will be updated to remove this reference.`;
    openModal('delete-modal');
}

document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
    if (!state.itemToDelete) return;
    showLoading(true);
    
    const { type, id } = state.itemToDelete;
    const table = type === 'employee' ? 'employees' : 'departments';
    
    const { error } = await supabaseClient.from(table).delete().eq('id', id);
    
    if (error) {
        showToast(`Error deleting ${type}: ` + error.message, true);
    } else {
        showToast(`${type} deleted successfully`);
        closeModal('delete-modal');
        // Refresh both as they might be linked
        await fetchEmployees();
        await fetchDepartments();
        renderEmployees();
        renderDepartments();
    }
    showLoading(false);
});

// --- Selection Modal Logic ---

function openSelectionModal(type) {
    state.currentSelectionType = type;
    const listContainer = document.getElementById('selection-list');
    const searchInput = document.getElementById('selection-search');
    
    searchInput.value = '';
    listContainer.innerHTML = '';
    
    let items = [];
    if (type === 'department') {
        document.getElementById('selection-title').textContent = 'Select Department';
        items = state.departments;
    } else { // manager or dept-manager
        document.getElementById('selection-title').textContent = 'Select Employee';
        items = state.employees;
        
        // Filter out self if editing an employee to prevent self-management loop (basic check)
        const currentEmpId = document.getElementById('emp-id').value;
        if (type === 'manager' && currentEmpId) {
            items = items.filter(e => e.id !== currentEmpId);
        }
    }

    renderSelectionList(items);
    openModal('selection-modal');
}

function renderSelectionList(items) {
    const listContainer = document.getElementById('selection-list');
    listContainer.innerHTML = '';
    
    if (items.length === 0) {
        listContainer.innerHTML = '<div style="padding:15px; text-align:center; color:#888">No items found</div>';
        return;
    }

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'selection-item';
        div.innerHTML = `
            <div style="font-weight:500">${escapeHtml(item.name)}</div>
            ${item.job_title ? `<div style="font-size:0.8em; color:#666">${escapeHtml(item.job_title)}</div>` : ''}
        `;
        div.onclick = () => selectItem(item);
        listContainer.appendChild(div);
    });
}

function filterSelectionList() {
    const query = document.getElementById('selection-search').value.toLowerCase();
    let items = [];
    
    if (state.currentSelectionType === 'department') {
        items = state.departments;
    } else {
        items = state.employees;
        // Same filter as above
        const currentEmpId = document.getElementById('emp-id').value;
        if (state.currentSelectionType === 'manager' && currentEmpId) {
            items = items.filter(e => e.id !== currentEmpId);
        }
    }

    const filtered = items.filter(item => 
        item.name.toLowerCase().includes(query) || 
        (item.job_title && item.job_title.toLowerCase().includes(query))
    );
    renderSelectionList(filtered);
}

function selectItem(item) {
    if (state.currentSelectionType === 'department') {
        updateSelectionDisplay('emp-dept', item);
    } else if (state.currentSelectionType === 'manager') {
        updateSelectionDisplay('emp-manager', item);
    } else if (state.currentSelectionType === 'dept-manager') {
        updateSelectionDisplay('dept-manager', item);
    }
    closeModal('selection-modal');
}

function updateSelectionDisplay(prefix, item) {
    const displayEl = document.getElementById(`${prefix}-display`);
    const inputEl = document.getElementById(`${prefix}-id`);
    const clearBtn = document.getElementById(`clear-${prefix}-btn`);

    if (item) {
        displayEl.textContent = item.name;
        displayEl.style.color = 'var(--text-color)';
        inputEl.value = item.id;
        if(clearBtn) clearBtn.style.display = 'block';
    } else {
        const typeLabel = prefix.includes('dept') ? 'Department' : 'Manager';
        displayEl.textContent = `Select a ${typeLabel}...`;
        displayEl.style.color = '#888';
        inputEl.value = '';
        if(clearBtn) clearBtn.style.display = 'none';
    }
}

function clearSelection(prefix) {
    updateSelectionDisplay(prefix, null);
}

// --- Utils ---

function openModal(id) {
    document.getElementById(id).classList.add('show');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('show');
}

function resetForm(id) {
    document.getElementById(id).reset();
}

function showLoading(show) {
    const el = document.getElementById('loading');
    if (show) el.classList.add('show');
    else el.classList.remove('show');
}

function showToast(msg, isError = false) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.style.backgroundColor = isError ? '#ef4444' : '#333';
    el.className = 'toast show';
    setTimeout(() => { el.className = el.className.replace('show', ''); }, 3000);
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
    }
}
