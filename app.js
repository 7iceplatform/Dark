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
        document.getElementById('alliance-name').textContent = 'Ошибка загрузки';
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
    
    const serverId = tracker.members?.[0]?.kid || tracker.server || base.server || '-';
    document.getElementById('alliance-server').textContent = `Сервер: ${serverId}`;
    
    // Общее количество участников
    const membersCount = (tracker.members && tracker.members.length) ? tracker.members.length : (base.roster ? base.roster.length : 0);
    document.getElementById('alliance-members').textContent = `Участники: ${membersCount}/100`;

    // --- СТАТИСТИКА ---
    document.getElementById('total-power').textContent = formatNumber(tracker.power || base.power);
    document.getElementById('total-kills').textContent = formatNumber(tracker.kills || base.kills);

    // --- КАРТОЧКИ УЧАСТНИКОВ ---
    const rosterList = document.getElementById('roster-list');
    rosterList.innerHTML = '';
    
    // ГЛАВНОЕ ИСПРАВЛЕНИЕ: Берем список напрямую из tracker.members, так как там есть ВСЕ данные
    let roster = [];
    
    if (tracker.members && tracker.members.length > 0) {
        // Если трекер ответил, используем его богатые данные
        roster = tracker.members.map(m => ({
            name: m.nick_name,
            power: m.power,
            rank: m.rank_label ? m.rank_label.split(' ')[0] : 'R1', // Извлекаем "R4" из "R4 · Recruiter"
            sanctuary: m.lv,
            x: m.x,
            y: m.y,
            avatar: m.avatar_url,
            server: m.kid
        }));
    } else if (base.roster) {
        // Если трекер упал, делаем запасной вариант из базы
        roster = base.roster.map(p => ({
            name: p.name,
            power: p.power,
            rank: p.rank,
            sanctuary: null,
            x: p.x,
            y: p.y,
            avatar: null,
            server: base.server
        }));
    }

    if (roster.length > 0) {
        roster.sort((a, b) => (b.power || 0) - (a.power || 0));

        roster.forEach(player => {
            let detailParts = [];
            if (player.server) detailParts.push(`S${player.server}`);
            if (player.sanctuary) detailParts.push(`Sanctuary ${player.sanctuary}`);
            const detailString = detailParts.join(' · ');

            // Аватарка (если ссылка битая, сработает onerror и покажет букву)
            let avatarHtml = '';
            if (player.avatar) {
                avatarHtml = `<img src="${player.avatar}" alt="avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`;
                avatarHtml += `<div class="avatar-placeholder" style="display:none;">${player.name.charAt(0).toUpperCase()}</div>`;
            } else {
                avatarHtml = `<div class="avatar-placeholder">${player.name.charAt(0).toUpperCase()}</div>`;
            }

            const card = document.createElement('div');
            card.className = 'member-card';
            
            card.innerHTML = `
                <div class="member-left">
                    <div class="rank-badge">${player.rank}</div>
                    <div class="avatar-container">
                        ${avatarHtml}
                    </div>
                    <div class="member-info">
                        <div class="member-name">${player.name}</div>
                        <div class="member-details">
                            ${detailString ? `<span>${detailString}</span>` : ''}
                            ${player.x ? `<span class="coord-x">x ${player.x}</span>` : ''}
                            ${player.y ? `<span class="coord-y">y ${player.y}</span>` : ''}
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
