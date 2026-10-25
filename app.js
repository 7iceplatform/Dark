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
    document.getElementById('alliance-tag').textContent = tracker.abbreviation || base.tag || 'TAG';
    document.getElementById('alliance-name').textContent = tracker.name || base.name || 'Alliance Name';
    document.getElementById('alliance-server').textContent = `Сервер: ${tracker.server || base.server || '-'}`;
    
    const membersCount = base.roster ? base.roster.length : (tracker.member_count || 0);
    document.getElementById('alliance-members').textContent = `Участники: ${membersCount}/100`;

    // --- СТАТИСТИКА ---
    document.getElementById('total-power').textContent = formatNumber(tracker.power || base.power);
    document.getElementById('total-kills').textContent = formatNumber(tracker.kills || base.kills);

    // --- КАРТОЧКИ УЧАСТНИКОВ ---
    const rosterList = document.getElementById('roster-list');
    rosterList.innerHTML = '';
    
    let roster = base.roster || [];
    
    if (roster.length > 0) {
        roster.sort((a, b) => (b.power || 0) - (a.power || 0));

        roster.forEach(player => {
            // Ищем данные игрока в массиве трекера
            const trackerMember = tracker.members?.find(m => m.uid === player.uid) || {};
            
            // Формируем детали (Сервер · Святилище)
            const serverNum = tracker.server || base.server || '';
            const sanctuaryLv = trackerMember.sanctuary_lv;
            
            let detailParts = [];
            if (serverNum) detailParts.push(`S${serverNum}`);
            if (sanctuaryLv) detailParts.push(`Sanctuary ${sanctuaryLv}`);
            
            const detailString = detailParts.join(' · ');

            // Координаты
            const x = trackerMember.x || player.x;
            const y = trackerMember.y || player.y;

            // Заглушка для аватара
            const initial = player.name ? player.name.charAt(0).toUpperCase() : '?';

            const card = document.createElement('div');
            card.className = 'member-card';
            
            card.innerHTML = `
                <div class="member-left">
                    <div class="rank-badge">${player.rank || 'R1'}</div>
                    <div class="avatar-container">
                        <div class="avatar-placeholder">${initial}</div>
                    </div>
                    <div class="member-info">
                        <div class="member-name">${player.name || 'Unknown'}</div>
                        <div class="member-details">
                            ${detailString ? `<span>${detailString}</span>` : ''}
                            ${x ? `<span class="coord-x">x ${x}</span>` : ''}
                            ${y ? `<span class="coord-y">y ${y}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="member-power">${formatNumber(player.power)}</div>
            `;
            
            rosterList.appendChild(card);
        });
    } else {
        rosterList.innerHTML = '<div class="loading-text">Нет данных о составе</div>';
    }

    // --- ГРАФИК ---
    renderChart(history);
}

function renderChart(history) {
    const ctx = document.getElementById('powerChart').getContext('2d');
    
    let labels = [];
    let chartData = [];

    // Фильтруем историю, чтобы убрать битые данные (NaN)
    const validHistory = history.filter(item => {
        if (!item.time || !item.power) return false;
        const date = new Date(item.time);
        return !isNaN(date.getTime());
    });

    if (validHistory.length > 0) {
        labels = validHistory.map(item => {
            const date = new Date(item.time);
            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        });
        chartData = validHistory.map(item => item.power);
    } else {
        labels = ['Нет данных'];
        chartData = [0]; // Чтобы график не ломался
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
                x: { grid: { display: false }, ticks: { color: '#708499', font: { size: 10 }, maxTicksLimit: 6 } },
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
