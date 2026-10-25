const tg = window.Telegram?.WebApp;
if (tg) {
    tg.expand();
    tg.setHeaderColor('#17212b');
    tg.setBackgroundColor('#17212b');
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM загружен, начинаем загрузку данных...");
    try {
        const response = await fetch('data/alliance.json?t=' + new Date().getTime());
        console.log("Ответ от сервера получен, статус:", response.status);
        
        if (!response.ok) throw new Error('Файл JSON не найден (404)');
        
        const data = await response.json();
        console.log("Данные успешно прочитаны:", data);
        
        renderAllianceData(data);
        
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        document.getElementById('alliance-name').textContent = 'Ошибка загрузки';
        document.getElementById('roster-list').innerHTML = `<div style="color: red; padding: 20px; text-align: center;">Ошибка: ${error.message}</div>`;
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
    
    // Ищем ID сервера
    const serverId = (tracker.members && tracker.members[0]?.kid) || tracker.server || base.server || '-';
    document.getElementById('alliance-server').textContent = `Сервер: ${serverId}`;
    
    const membersCount = (base.roster && base.roster.length) ? base.roster.length : (tracker.member_count || 0);
    document.getElementById('alliance-members').textContent = `Участники: ${membersCount}/100`;

    // --- СТАТИСТИКА ---
    document.getElementById('total-power').textContent = formatNumber(tracker.power || base.power);
    document.getElementById('total-kills').textContent = formatNumber(tracker.kills || base.kills);

    // --- КАРТОЧКИ УЧАСТНИКОВ ---
    const rosterList = document.getElementById('roster-list');
    if (!rosterList) {
        console.error("КРИТИЧЕСКАЯ ОШИБКА: Не найден элемент с id='roster-list'. Вы точно обновили index.html?");
        return;
    }
    rosterList.innerHTML = '';
    
    // Берем список либо из базы, либо из трекера
    let roster = (base.roster && base.roster.length > 0) ? base.roster : (tracker.members || []);
    
    if (roster.length > 0) {
        // Сортируем по силе
        roster.sort((a, b) => (b.power || 0) - (a.power || 0));

        roster.forEach(player => {
            // Если данные из базы, ищем доп инфу в трекере
            const trackerMember = (tracker.members || []).find(m => m.uid === player.uid) || {};
            
            // Собираем данные, учитывая разные названия полей
            const serverNum = trackerMember.kid || base.server || '';
            const sanctuaryLv = trackerMember.lv || trackerMember.sanctuary_lv;
            const x = trackerMember.x || player.x;
            const y = trackerMember.y || player.y;
            const avatarUrl = trackerMember.avatar_url || player.avatar_url;
            
            const rank = player.rank || (trackerMember.rank_label ? trackerMember.rank_label.split(' ')[0] : 'R1');
            const playerName = trackerMember.nick_name || player.name || player.nick_name || 'Unknown';

            let detailParts = [];
            if (serverNum) detailParts.push(`S${serverNum}`);
            if (sanctuaryLv) detailParts.push(`Sanctuary ${sanctuaryLv}`);
            const detailString = detailParts.join(' · ');

            let avatarHtml = '';
            if (avatarUrl) {
                avatarHtml = `<img src="${avatarUrl}" alt="avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`;
                avatarHtml += `<div class="avatar-placeholder" style="display:none;">${playerName.charAt(0).toUpperCase()}</div>`;
            } else {
                avatarHtml = `<div class="avatar-placeholder">${playerName.charAt(0).toUpperCase()}</div>`;
            }

            const card = document.createElement('div');
            card.className = 'member-card';
            
            card.innerHTML = `
                <div class="member-left">
                    <div class="rank-badge">${rank}</div>
                    <div class="avatar-container">
                        ${avatarHtml}
                    </div>
                    <div class="member-info">
                        <div class="member-name">${playerName}</div>
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

    renderChart(history);
}

// ... функция renderChart остается без изменений ...
function renderChart(history) {
    const ctx = document.getElementById('powerChart');
    if (!ctx) return;
    
    let labels = [];
    let chartData = [];

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
                pointRadius: 3,
                pointBackgroundColor: '#5288c1'
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
