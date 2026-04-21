// ===== STATE =====
let workers = JSON.parse(localStorage.getItem('workers') || '[]');
let timesheet = JSON.parse(localStorage.getItem('timesheet') || '{}');
let payments = JSON.parse(localStorage.getItem('payments') || '[]');

const now = new Date();
let tsMonth = { y: now.getFullYear(), m: now.getMonth() };
let prMonth = { y: now.getFullYear(), m: now.getMonth() };
let pmMonth = { y: now.getFullYear(), m: now.getMonth() };

// ===== SAVE =====
function save() {
    localStorage.setItem('workers', JSON.stringify(workers));
    localStorage.setItem('timesheet', JSON.stringify(timesheet));
    localStorage.setItem('payments', JSON.stringify(payments));
}

// ===== UTILS =====
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function fmt(n) { return Number(n).toLocaleString('ru-RU') + ' ₽'; }
function monthKey(y, m) { return `${y}-${String(m + 1).padStart(2, '0')}`; }
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function isWeekend(y, m, d) { const day = new Date(y, m, d).getDay(); return day === 0 || day === 6; }
function monthLabel(y, m) {
    return new Date(y, m, 1).toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
}

function toast(msg, type = '') {
    const box = document.getElementById('toasts');
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// ===== TABS =====
function showTab(id, btn) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn, .bnav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + id).classList.add('active');
    // activate both top and bottom nav buttons for this tab
    document.querySelectorAll(`.nav-btn, .bnav-btn`).forEach(b => {
        if (b === btn || b.dataset.tab === id) b.classList.add('active');
    });
    if (id === 'dashboard') renderDashboard();
    if (id === 'workers') renderWorkers();
    if (id === 'timesheet') renderTimesheet();
    if (id === 'payroll') renderPayroll();
    if (id === 'payments') renderPayments();
}

// ===== MONTH NAV =====
function changeMonth(tab, dir) {
    const map = { ts: tsMonth, pr: prMonth, pm: pmMonth };
    const s = map[tab];
    s.m += dir;
    if (s.m > 11) { s.m = 0; s.y++; }
    if (s.m < 0) { s.m = 11; s.y--; }
    if (tab === 'ts') { tsWeekOffset = 0; renderTimesheet(); }
    if (tab === 'pr') renderPayroll();
    if (tab === 'pm') renderPaymentsMonth();
}

// ===== WORKERS =====
function openWorkerModal(id) {
    document.getElementById('w-edit-id').value = id || '';
    document.getElementById('modal-worker-title').textContent = id ? 'Редактировать' : 'Добавить сотрудника';
    const w = id ? workers.find(x => x.id === id) : null;
    document.getElementById('w-name').value = w ? w.name : '';
    document.getElementById('w-pos').value = w ? w.pos : '';
    document.getElementById('w-rate').value = w ? w.rate : '';
    document.getElementById('w-phone').value = w ? (w.phone || '') : '';
    document.getElementById('w-date').value = w ? (w.date || '') : '';
    document.getElementById('modal-worker').classList.add('active');
}

function saveWorker() {
    const name = document.getElementById('w-name').value.trim();
    const pos = document.getElementById('w-pos').value.trim();
    const rate = parseFloat(document.getElementById('w-rate').value);
    if (!name || !pos || !rate) return toast('Заполните обязательные поля', 'error');
    const id = document.getElementById('w-edit-id').value;
    const data = {
        name, pos, rate,
        phone: document.getElementById('w-phone').value.trim(),
        date: document.getElementById('w-date').value
    };
    if (id) {
        const i = workers.findIndex(x => x.id === id);
        workers[i] = { ...workers[i], ...data };
        toast('Сотрудник обновлён', 'success');
    } else {
        workers.push({ id: uid(), ...data });
        toast('Сотрудник добавлен', 'success');
    }
    save();
    closeModal('modal-worker');
    renderWorkers();
    updateSelects();
}

function deleteWorker(id) {
    const w = workers.find(x => x.id === id);
    document.getElementById('confirm-text').textContent = `Удалить сотрудника "${w.name}"? Все данные будут удалены.`;
    document.getElementById('confirm-btn').onclick = () => {
        workers = workers.filter(x => x.id !== id);
        save();
        closeModal('modal-confirm');
        renderWorkers();
        updateSelects();
        toast('Сотрудник удалён');
    };
    document.getElementById('modal-confirm').classList.add('active');
}

function renderWorkers() {
    const search = document.getElementById('w-search').value.toLowerCase();
    const posF = document.getElementById('w-pos-filter').value;
    const grid = document.getElementById('workers-grid');

    // update position filter
    const positions = [...new Set(workers.map(w => w.pos))];
    const pf = document.getElementById('w-pos-filter');
    const cur = pf.value;
    pf.innerHTML = '<option value="">Все должности</option>' +
        positions.map(p => `<option value="${p}" ${p === cur ? 'selected' : ''}>${p}</option>`).join('');

    const filtered = workers.filter(w =>
        (!search || w.name.toLowerCase().includes(search) || w.pos.toLowerCase().includes(search)) &&
        (!posF || w.pos === posF)
    );

    if (!filtered.length) {
        grid.innerHTML = '<div class="empty"><div class="ei">👷</div><h3>Нет сотрудников</h3><p>Добавьте первого сотрудника</p></div>';
        return;
    }

    grid.innerHTML = filtered.map(w => `
        <div class="worker-card">
            <div class="worker-actions">
                <button class="icon-btn edit" onclick="openWorkerModal('${w.id}')">✏️</button>
                <button class="icon-btn del" onclick="deleteWorker('${w.id}')">🗑️</button>
            </div>
            <div class="worker-avatar">${w.name[0]}</div>
            <div class="worker-name">${w.name}</div>
            <div class="worker-pos">${w.pos}</div>
            <div class="worker-rate">${fmt(w.rate)} <span>/ смена</span></div>
            ${w.phone ? `<div style="font-size:13px;color:var(--gray);margin-top:8px">📞 ${w.phone}</div>` : ''}
            ${w.date ? `<div style="font-size:13px;color:var(--gray);margin-top:4px">📅 с ${w.date}</div>` : ''}
        </div>
    `).join('');
}

// ===== TIMESHEET =====
function tsKey(wid, y, m, d) { return `${wid}_${y}_${m}_${d}`; }

function isMobile() { return window.innerWidth <= 768; }

// week offset for mobile timesheet (0 = current week)
let tsWeekOffset = 0;

function getWeekDays(y, m, weekOffset) {
    // find all days of month grouped by week (Mon-Sun)
    const firstDay = new Date(y, m, 1);
    // find Monday of the first week
    const startMonday = new Date(firstDay);
    const dow = (firstDay.getDay() + 6) % 7; // 0=Mon
    startMonday.setDate(1 - dow);
    // build week starting at weekOffset
    const weekStart = new Date(startMonday);
    weekStart.setDate(startMonday.getDate() + weekOffset * 7);
    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        days.push(d);
    }
    return days;
}

function getTotalWeeks(y, m) {
    const days = daysInMonth(y, m);
    const firstDow = (new Date(y, m, 1).getDay() + 6) % 7;
    return Math.ceil((days + firstDow) / 7);
}

function renderTimesheet() {
    const { y, m } = tsMonth;
    document.getElementById('ts-label').textContent = monthLabel(y, m);
    const totalDays = daysInMonth(y, m);
    const today = new Date();
    const filter = document.getElementById('ts-filter').value;

    const tf = document.getElementById('ts-filter');
    const cur = tf.value;
    tf.innerHTML = '<option value="">Все сотрудники</option>' +
        workers.map(w => `<option value="${w.id}" ${w.id === cur ? 'selected' : ''}>${w.name}</option>`).join('');

    const list = filter ? workers.filter(w => w.id === filter) : workers;

    if (!list.length) {
        document.getElementById('ts-container').innerHTML = '<div class="empty"><div class="ei">📅</div><h3>Нет сотрудников</h3></div>';
        return;
    }

    if (isMobile()) {
        // clamp week offset
        const totalWeeks = getTotalWeeks(y, m);
        if (tsWeekOffset < 0) tsWeekOffset = 0;
        if (tsWeekOffset >= totalWeeks) tsWeekOffset = totalWeeks - 1;

        const weekDays = getWeekDays(y, m, tsWeekOffset);
        const weekLabel = `Неделя ${tsWeekOffset + 1} / ${totalWeeks}`;

        const dayHeaders = weekDays.map(date => {
            const inMonth = date.getMonth() === m;
            const d = date.getDate();
            const we = date.getDay() === 0 || date.getDay() === 6;
            const isToday = date.toDateString() === today.toDateString();
            return `<th class="dh${we ? ' weekend' : ''}${isToday ? ' today' : ''}" style="${!inMonth ? 'opacity:.3' : ''}">${d}<br><span style="font-size:10px;opacity:.7">${['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][date.getDay()]}</span></th>`;
        }).join('');

        const rows = list.map(w => {
            const cells = weekDays.map(date => {
                const inMonth = date.getMonth() === m;
                const d = date.getDate();
                const wy = date.getFullYear(), wm = date.getMonth();
                const k = tsKey(w.id, wy, wm, d);
                const checked = timesheet[k] ? 'checked' : '';
                return `<td class="check-cell"><input type="checkbox" class="day-cb" ${checked} ${!inMonth ? 'disabled style="opacity:.3"' : ''} onchange="toggleDay('${w.id}',${wy},${wm},${d},this.checked)"></td>`;
            }).join('');
            const total = Array.from({ length: totalDays }, (_, i) => timesheet[tsKey(w.id, y, m, i + 1)] ? 1 : 0).reduce((a, b) => a + b, 0);
            return `<tr>
                <td class="emp-col"><strong>${w.name}</strong><br><span style="font-size:12px;color:var(--gray)">${w.pos}</span></td>
                ${cells}
                <td class="total-col total-days">${total}</td>
            </tr>`;
        }).join('');

        document.getElementById('ts-container').innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:var(--light);border-bottom:1px solid #ddd">
                <button class="btn btn-sm btn-outline" onclick="tsWeekOffset--;renderTimesheet()">&#8592;</button>
                <span style="font-weight:600;font-size:14px;color:var(--secondary)">${weekLabel}</span>
                <button class="btn btn-sm btn-outline" onclick="tsWeekOffset++;renderTimesheet()">&#8594;</button>
            </div>
            <table>
                <thead><tr>
                    <th class="emp-col dh">Сотрудник</th>
                    ${dayHeaders}
                    <th class="dh total-col">Итого</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>`;
    } else {
        const dayHeaders = Array.from({ length: totalDays }, (_, i) => {
            const d = i + 1;
            const we = isWeekend(y, m, d);
            const isToday = today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
            return `<th class="dh${we ? ' weekend' : ''}${isToday ? ' today' : ''}">${d}<br><span style="font-size:10px;opacity:.7">${['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][new Date(y,m,d).getDay()]}</span></th>`;
        }).join('');

        const rows = list.map(w => {
            const cells = Array.from({ length: totalDays }, (_, i) => {
                const d = i + 1;
                const k = tsKey(w.id, y, m, d);
                const checked = timesheet[k] ? 'checked' : '';
                return `<td class="check-cell"><input type="checkbox" class="day-cb" ${checked} onchange="toggleDay('${w.id}',${y},${m},${d},this.checked)"></td>`;
            }).join('');
            const total = Array.from({ length: totalDays }, (_, i) => timesheet[tsKey(w.id, y, m, i + 1)] ? 1 : 0).reduce((a, b) => a + b, 0);
            return `<tr>
                <td class="emp-col"><strong>${w.name}</strong><br><span style="font-size:12px;color:var(--gray)">${w.pos}</span></td>
                ${cells}
                <td class="total-col total-days">${total}</td>
            </tr>`;
        }).join('');

        document.getElementById('ts-container').innerHTML = `
            <table>
                <thead><tr>
                    <th class="emp-col dh">Сотрудник</th>
                    ${dayHeaders}
                    <th class="dh total-col">Итого</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>`;
    }
}

function toggleDay(wid, y, m, d, val) {
    const k = tsKey(wid, y, m, d);
    if (val) timesheet[k] = 1; else delete timesheet[k];
    save();
    // update total in row without full re-render
    const days = daysInMonth(y, m);
    const total = Array.from({ length: days }, (_, i) => timesheet[tsKey(wid, y, m, i + 1)] ? 1 : 0).reduce((a, b) => a + b, 0);
    // find and update total cell
    const cbs = document.querySelectorAll(`.day-cb`);
    // just re-render totals via full render is simpler
    renderTimesheet();
}

function markAllToday() {
    const { y, m } = tsMonth;
    const today = new Date();
    if (today.getFullYear() !== y || today.getMonth() !== m) return toast('Переключитесь на текущий месяц', 'warning');
    const d = today.getDate();
    workers.forEach(w => { timesheet[tsKey(w.id, y, m, d)] = 1; });
    save();
    renderTimesheet();
    toast('Все отмечены', 'success');
}

// ===== PAYROLL =====
function getWorkerStats(wid, y, m) {
    const days = daysInMonth(y, m);
    const worked = Array.from({ length: days }, (_, i) => timesheet[tsKey(wid, y, m, i + 1)] ? 1 : 0).reduce((a, b) => a + b, 0);
    const w = workers.find(x => x.id === wid);
    const accrued = worked * (w ? w.rate : 0);
    const mk = monthKey(y, m);
    const paid = payments.filter(p => p.wid === wid && p.month === mk);
    const advance = paid.filter(p => p.type === 'advance').reduce((a, p) => a + p.amount, 0);
    const bonus = paid.filter(p => p.type === 'bonus').reduce((a, p) => a + p.amount, 0);
    const fullPaid = paid.filter(p => p.type === 'full').reduce((a, p) => a + p.amount, 0);
    const totalPaid = advance + bonus + fullPaid;
    const debt = Math.max(0, accrued + bonus - totalPaid);
    return { worked, accrued, advance, bonus, fullPaid, totalPaid, debt, days };
}

function renderPayroll() {
    const { y, m } = prMonth;
    document.getElementById('pr-label').textContent = monthLabel(y, m);
    const workDays = Array.from({ length: daysInMonth(y, m) }, (_, i) => isWeekend(y, m, i + 1) ? 0 : 1).reduce((a, b) => a + b, 0);

    let totalAccrued = 0, totalAdvance = 0, totalDebt = 0;
    const rows = workers.map((w, i) => {
        const s = getWorkerStats(w.id, y, m);
        totalAccrued += s.accrued;
        totalAdvance += s.advance;
        totalDebt += s.debt;
        return `<tr>
            <td>${i + 1}</td>
            <td><strong>${w.name}</strong></td>
            <td>${w.pos}</td>
            <td>${fmt(w.rate)}</td>
            <td>${workDays}</td>
            <td><strong>${s.worked}</strong></td>
            <td><strong style="color:var(--accent)">${fmt(s.accrued)}</strong></td>
            <td>${fmt(s.advance)}</td>
            <td><strong style="color:var(--danger)">${fmt(s.debt)}</strong></td>
        </tr>`;
    }).join('');

    document.getElementById('pr-tbody').innerHTML = rows || '<tr><td colspan="9" class="empty">Нет сотрудников</td></tr>';
    document.getElementById('pr-summary').innerHTML = `
        <div class="ps orange"><div class="ps-label">Сотрудников</div><div class="ps-value">${workers.length}</div></div>
        <div class="ps green"><div class="ps-label">Начислено</div><div class="ps-value">${fmt(totalAccrued)}</div></div>
        <div class="ps"><div class="ps-label">Авансы</div><div class="ps-value">${fmt(totalAdvance)}</div></div>
        <div class="ps red"><div class="ps-label">К выплате</div><div class="ps-value">${fmt(totalDebt)}</div></div>`;
}

// ===== PAYMENTS =====
function renderPayments() {
    updateSelects();
    renderPayHistory();
    renderPaymentsMonth();
}

function renderPaymentsMonth() {
    const { y, m } = pmMonth;
    document.getElementById('pm-label').textContent = monthLabel(y, m);
    const rows = workers.map(w => {
        const s = getWorkerStats(w.id, y, m);
        const status = s.debt === 0 && s.accrued > 0
            ? '<span class="badge badge-success">Закрыт</span>'
            : s.totalPaid > 0
                ? '<span class="badge badge-warning">Частично</span>'
                : '<span class="badge badge-danger">Не выплачен</span>';
        return `<tr>
            <td><strong>${w.name}</strong></td>
            <td>${w.pos}</td>
            <td>${fmt(s.accrued)}</td>
            <td>${fmt(s.advance)}</td>
            <td>${fmt(s.bonus)}</td>
            <td>${fmt(s.totalPaid)}</td>
            <td><strong style="color:var(--danger)">${fmt(s.debt)}</strong></td>
            <td>${status}</td>
        </tr>`;
    }).join('');
    document.getElementById('pm-tbody').innerHTML = rows || '<tr><td colspan="8" class="empty">Нет сотрудников</td></tr>';
}

function addPayment() {
    const wid = document.getElementById('pay-worker').value;
    const month = document.getElementById('pay-month').value;
    const type = document.getElementById('pay-type').value;
    const amount = parseFloat(document.getElementById('pay-amount').value);
    const comment = document.getElementById('pay-comment').value.trim();
    if (!wid || !month || !amount || amount <= 0) return toast('Заполните все поля', 'error');
    payments.push({ id: uid(), wid, month, type, amount, comment, date: new Date().toISOString() });
    save();
    document.getElementById('pay-amount').value = '';
    document.getElementById('pay-comment').value = '';
    renderPayHistory();
    renderPaymentsMonth();
    renderDashboard();
    toast('Выплата зафиксирована', 'success');
}

function renderPayHistory() {
    const filter = document.getElementById('pay-hist-filter').value;
    const list = filter ? payments.filter(p => p.wid === filter) : payments;
    const sorted = [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
    const typeLabel = { advance: '💵 Аванс', full: '✅ Расчёт', bonus: '🎁 Премия' };
    const box = document.getElementById('pay-history');
    if (!sorted.length) {
        box.innerHTML = '<div class="empty"><div class="ei">💳</div><h3>Нет выплат</h3></div>';
        return;
    }
    box.innerHTML = sorted.map(p => {
        const w = workers.find(x => x.id === p.wid);
        return `<div class="pay-item ${p.type}">
            <div>
                <div style="font-weight:600;font-size:14px">${w ? w.name : '—'}</div>
                <div style="font-size:12px;color:var(--gray)">${typeLabel[p.type]} · ${p.month}${p.comment ? ' · ' + p.comment : ''}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
                <strong style="color:var(--accent)">${fmt(p.amount)}</strong>
                <button class="icon-btn del" onclick="deletePayment('${p.id}')">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

function deletePayment(id) {
    payments = payments.filter(p => p.id !== id);
    save();
    renderPayHistory();
    renderPaymentsMonth();
    renderDashboard();
    toast('Выплата удалена');
}

// ===== DASHBOARD =====
function renderDashboard() {
    const { y, m } = { y: now.getFullYear(), m: now.getMonth() };
    let totalShifts = 0, totalAccrued = 0, totalDebt = 0;
    const rows = workers.map(w => {
        const s = getWorkerStats(w.id, y, m);
        totalShifts += s.worked;
        totalAccrued += s.accrued;
        totalDebt += s.debt;
        const status = s.debt === 0 && s.accrued > 0
            ? '<span class="badge badge-success">Закрыт</span>'
            : s.totalPaid > 0
                ? '<span class="badge badge-warning">Частично</span>'
                : '<span class="badge badge-info">Открыт</span>';
        return `<tr>
            <td><strong>${w.name}</strong></td>
            <td>${w.pos}</td>
            <td>${fmt(w.rate)}</td>
            <td>${s.worked}</td>
            <td>${fmt(s.accrued)}</td>
            <td>${fmt(s.advance)}</td>
            <td><strong style="color:var(--danger)">${fmt(s.debt)}</strong></td>
            <td>${status}</td>
        </tr>`;
    }).join('');
    document.getElementById('d-workers').textContent = workers.length;
    document.getElementById('d-shifts').textContent = totalShifts;
    document.getElementById('d-accrued').textContent = fmt(totalAccrued);
    document.getElementById('d-debt').textContent = fmt(totalDebt);
    document.getElementById('d-tbody').innerHTML = rows || '<tr><td colspan="8" class="empty">Нет сотрудников</td></tr>';
}

// ===== SELECTS =====
function updateSelects() {
    ['pay-worker', 'pay-hist-filter'].forEach(id => {
        const el = document.getElementById(id);
        const cur = el.value;
        const placeholder = id === 'pay-worker' ? '<option value="">Выберите сотрудника</option>' : '<option value="">Все сотрудники</option>';
        el.innerHTML = placeholder + workers.map(w => `<option value="${w.id}" ${w.id === cur ? 'selected' : ''}>${w.name}</option>`).join('');
    });
}

// ===== MODAL =====
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
document.querySelectorAll('.overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) o.classList.remove('active'); }));

// ===== EXPORT =====
function exportCSV() {
    const { y, m } = prMonth;
    const rows = [['ФИО', 'Должность', 'Ставка', 'Отработано', 'Начислено', 'Аванс', 'К выплате']];
    workers.forEach(w => {
        const s = getWorkerStats(w.id, y, m);
        rows.push([w.name, w.pos, w.rate, s.worked, s.accrued, s.advance, s.debt]);
    });
    const csv = rows.map(r => r.join(';')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
    a.download = `payroll_${monthKey(y, m)}.csv`;
    a.click();
}

// ===== INIT =====
document.getElementById('headerDate').textContent = new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
document.getElementById('pay-month').value = monthKey(now.getFullYear(), now.getMonth());

// set initial week to current week
if (isMobile()) {
    const totalWeeks = getTotalWeeks(now.getFullYear(), now.getMonth());
    for (let i = 0; i < totalWeeks; i++) {
        const days = getWeekDays(now.getFullYear(), now.getMonth(), i);
        if (days.some(d => d.toDateString() === now.toDateString())) { tsWeekOffset = i; break; }
    }
}

window.addEventListener('resize', () => renderTimesheet());

updateSelects();
renderDashboard();
