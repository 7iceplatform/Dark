document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('data/alliance.json?t=' + new Date().getTime());
        if (!response.ok) throw new Error('Ошибка сети');
        
        const data = await response.json();
        
        // Данные лежат прямо в корне объекта
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
    // --- ШАПКА ---
    document.getElementById('alliance-tag').textContent = data.tag || 'TAG';
    document.getElementById('alliance-name').textContent = data.name || 'Alliance Name';
    document.getElementById('alliance-server').textContent = `Сервер: ${data.server || '-'}`;
    
    const membersCount = data.roster ? data.roster.length : (data.members || 0);
    document.getElementById('alliance-members').textContent = `Участники: ${membersCount}/100`;

    // --- СТАТИСТИКА ---
    document.getElementById('total-power').textContent = formatNumber(data.power);
    document.getElementById('total-kills').textContent = formatNumber(data.kills);

    // --- ТАБЛИЦА УЧАСТНИКОВ ---
    const rosterBody = document.getElementById('roster-body');
    rosterBody.innerHTML = '';
    
    const roster = data.roster || [];
    
    if (roster.length > 0) {
        const sortedRoster = [...roster].sort((a, b) => (b.power || 0) - (a.power || 0));

        sortedRoster.forEach(player => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="role-badge">${player.rank || 'R1'}</span></td>
                <td>${player.name || 'Unknown'}</td>
                <td><strong>${formatNumber(player.power)}</strong></td>
            `;
            rosterBody.appendChild(tr);
        });
    } else {
        rosterBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Нет данных о составе</td></tr>';
    }

    // --- ГРАФИК ---
    renderChart(data.powerHistory);
}

function renderChart(history) {
    const ctx = document.getElementById('powerChart').getContext('2d');
    
    let labels = ['Сейчас'];
    let chartData = [0];

    if (history && Array.isArray(history) && history.length > 0) {
        // history имеет формат [[timestamp, power], ...]
        const recent = history.slice(-24); // последние 24 точки
        labels = recent.map(item => {
            const date = new Date(item[0] * 1000);
            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        });
        chartData = recent.map(item => item[1]);
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
