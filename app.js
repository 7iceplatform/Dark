document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('data/alliance.json?t=' + new Date().getTime());
        if (!response.ok) throw new Error('Ошибка сети');
        
        const data = await response.json();
        
        // Извлекаем данные. Если tracker нет, используем пустой объект
        const baseData = data.base || {};
        const trackerData = data.tracker || {};

        renderAllianceData(baseData, trackerData);
        
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        document.getElementById('alliance-name').textContent = 'Ошибка загрузки данных';
    }
});

function renderAllianceData(baseData, trackerData) {
    // Берем инфу из базы, если ее нет — пытаемся взять из трекера
    document.getElementById('alliance-tag').textContent = baseData.tag || trackerData.tag || 'TAG';
    document.getElementById('alliance-name').textContent = baseData.name || trackerData.name || 'Alliance Name';
    
    document.getElementById('alliance-server').textContent = `Сервер: ${baseData.server || trackerData.server || '-'}`;
    
    // Участники: считаем из базы, или берем из трекера, если там есть точное число
    const membersCount = baseData.roster ? baseData.roster.length : (trackerData.memberCount || 0);
    document.getElementById('alliance-members').textContent = `Участники: ${membersCount}/100`;

    // Карточки статистики (приоритет у трекера, так как он может считать точнее)
    const totalPower = trackerData.power || baseData.power || 0;
    const totalKills = trackerData.kills || baseData.kills || 0;

    document.getElementById('total-power').textContent = formatNumber(totalPower);
    document.getElementById('total-kills').textContent = formatNumber(totalKills);

    // Таблица (используем ростер из базы, так как он самый актуальный)
    const rosterBody = document.getElementById('roster-body');
    rosterBody.innerHTML = '';
    
    const roster = baseData.roster || trackerData.roster || [];
    
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

    renderChart(baseData, trackerData);
}

function renderChart(baseData, trackerData) {
    const ctx = document.getElementById('powerChart').getContext('2d');
    
    let labels = ['Сейчас'];
    let chartData = [trackerData.power || baseData.power || 0];

    // Ищем историю в данных трекера (если API ее отдает)
    // Предполагаем, что она лежит в trackerData.history (нужно проверить по документации)
    const history = trackerData.history || baseData.powerHistory;

    if (history && Array.isArray(history) && history.length > 0) {
        labels = history.map(item => {
            // В зависимости от формата времени (timestamp или строка)
            const date = new Date(item.timestamp || item[0] * 1000);
            return `${date.getDate()}.${date.getMonth()+1} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
        });
        chartData = history.map(item => item.power || item[1]);
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
                x: { grid: { display: false }, ticks: { color: '#708499', font: { size: 10 } } },
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

function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}
