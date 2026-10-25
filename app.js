const tg = window.Telegram?.WebApp;
if (tg) {
    tg.expand();
    tg.setHeaderColor('#17212b');
    tg.setBackgroundColor('#17212b');
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('data/alliance.json?t=' + new Date().getTime());
        if (!response.ok) throw new Error('Ошибка сети');
        
        const data = await response.json();
        
        renderAllianceData(data);
        
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        document.getElementById('alliance-name').textContent = 'Ошибка загрузки данных';
    }
});

function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function renderAllianceData(data) {
    const base = data.base || {};
    const tracker = data.tracker || {};
    const history = data.history || [];

    // --- ШАПКА ---
    // В трекере тег может называться 'abbreviation', а имя 'name'
    document.getElementById('alliance-tag').textContent = tracker.abbreviation || base.tag || 'TAG';
    document.getElementById('alliance-name').textContent = tracker.name || base.name || 'Alliance Name';
    
    document.getElementById('alliance-server').textContent = `Сервер: ${tracker.server || base.server || '-'}`;
    
    const membersCount = base.roster ? base.roster.length : (tracker.member_count || 0);
    document.getElementById('alliance-members').textContent = `Участники: ${membersCount}/100`;

    // --- СТАТИСТИКА ---
    // Берем данные из трекера, если там пусто - из базы
    const totalPower = tracker.power || base.power || 0;
    const totalKills = tracker.kills || base.kills || 0;

    document.getElementById('total-power').textContent = formatNumber(totalPower);
    document.getElementById('total-kills').textContent = formatNumber(totalKills);

    // --- ТАБЛИЦА УЧАСТНИКОВ ---
    const rosterBody = document.getElementById('roster-body');
    rosterBody.innerHTML = '';
    
    // Используем список из базы (он самый полный по именам и рангам)
    const roster = base.roster || [];
    
    if (roster.length > 0) {
        // Сортируем по силе
        const sortedRoster = [...roster].sort((a, b) => (b.power || 0) - (a.power || 0));

        sortedRoster.forEach(player => {
            const tr = document.createElement('tr');
            
            // Пытаемся найти этого игрока в данных трекера, чтобы взять оттуда доп. инфу (например, уровень святилища)
            // (В данном API список участников трекера лежит в tracker.members, если он пришел)
            const trackerMember = tracker.members?.find(m => m.uid === player.uid);
            const sanctuaryInfo = trackerMember ? ` (Ур. ${trackerMember.sanctuary_lv})` : '';

            tr.innerHTML = `
                <td><span class="role-badge">${player.rank || 'R1'}</span></td>
                <td>${player.name || 'Unknown'}</td>
                <td><strong>${formatNumber(player.power)}</strong>${sanctuaryInfo}</td>
            `;
            rosterBody.appendChild(tr);
        });
    } else {
        rosterBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Нет данных о составе</td></tr>';
    }

    renderChart(history);
}

function renderChart(history) {
    const ctx = document.getElementById('powerChart').getContext('2d');
    
    let labels = [];
    let chartData = [];

    if (history && history.length > 0) {
        // Превращаем ISO строки в читаемое время (ЧЧ:ММ)
        labels = history.map(item => {
            const date = new Date(item.time);
            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        });
        chartData = history.map(item => item.power);
    } else {
        labels = ['Нет данных'];
        chartData = [0];
    }

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Сила альянса',
                data: chartData,
                borderColor: '#5288c1',
                backgroundColor: 'rgba(82, 136, 193, 0.2)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { 
                    grid: { display: false }, 
                    ticks: { color: '#708499', font: { size: 10 }, maxTicksLimit: 6 } 
                },
                y: { 
                    grid: { color: '#232e3c' }, 
                    ticks: { 
                        color: '#708499', 
                        font: { size: 10 },
                        callback: function(value) {
                            if (value >= 1000000000) return (value / 1000000000).toFixed(1) + 'B';
                            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                            return value;
                        }
                    } 
                }
            }
        }
    });
}
