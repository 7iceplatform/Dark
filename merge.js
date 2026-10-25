import fs from 'fs/promises';
import path from 'path';

// Правильный ID для обоих API
const ALLIANCE_ID = '67172519'; 

async function fetchData() {
    const mergedData = { base: null, tracker: null, history: [] };

    // 1. Базовое API игры
    try {
        console.log('Fetching from lastasylum.gg...');
        const res1 = await fetch(`https://lastasylum.gg/api/alliance/${ALLIANCE_ID}`);
        if (!res1.ok) throw new Error(`HTTP error! status: ${res1.status}`);
        mergedData.base = await res1.json();
    } catch (e) {
        console.error('Ошибка при запросе к lastasylum.gg:', e.message);
        process.exit(1); 
    }

    // 2. API Трекера
    const TRACKER_API_KEY = process.env.TRACKER_API_KEY;
    if (TRACKER_API_KEY) {
        try {
            console.log('Fetching from lastasylumtracker.com...');
            const res2 = await fetch(`https://api.lastasylumtracker.com/v1/alliances/${ALLIANCE_ID}`, {
                headers: {
                    'Authorization': `Bearer ${TRACKER_API_KEY}`,
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (res2.ok) {
                mergedData.tracker = await res2.json();
                console.log('УСПЕХ: Данные трекера получены!');
                // Выводим первых двух участников в логи, чтобы проверить структуру
                console.log('Пример данных от трекера:', JSON.stringify(mergedData.tracker.members?.slice(0, 2), null, 2));
            } else {
                console.error(`Tracker API вернул ошибку: ${res2.status}`);
            }
        } catch (e) {
            console.error('Ошибка при запросе к Tracker API:', e.message);
        }
    }

    // 3. Работа с историей
    const filePath = path.join('data', 'alliance.json');
    let oldHistory = [];
    
    try {
        const oldFile = await fs.readFile(filePath, 'utf-8');
        const oldData = JSON.parse(oldFile);
        if (oldData.history && Array.isArray(oldData.history)) {
            oldHistory = oldData.history.filter(item => item.time && item.power);
        }
    } catch (e) {}

    const currentPower = mergedData.tracker?.power || mergedData.base?.power || 0;
    
    if (currentPower > 0) {
        oldHistory.push({
            time: new Date().toISOString(),
            power: currentPower
        });
    }

    mergedData.history = oldHistory.slice(-96);

    await fs.mkdir('data', { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(mergedData, null, 2));
    console.log('Файл data/alliance.json успешно перезаписан.');
}

fetchData();
