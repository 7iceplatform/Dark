import fs from 'fs/promises';
import path from 'path';

// ID для базового API игры
const GAME_ALLIANCE_ID = '67172519';
// ID для API Трекера (из ссылки lastasylumtracker.com/alliance/29233)
const TRACKER_ALLIANCE_ID = '67172519'; 

async function fetchData() {
    const mergedData = { base: null, tracker: null, history: [] };

    // 1. Базовое API игры (список игроков)
    try {
        console.log('Fetching from lastasylum.gg...');
        const res1 = await fetch(`https://lastasylum.gg/api/alliance/${GAME_ALLIANCE_ID}`);
        if (!res1.ok) throw new Error(`HTTP error! status: ${res1.status}`);
        mergedData.base = await res1.json();
    } catch (e) {
        console.error('Ошибка при запросе к lastasylum.gg:', e.message);
        process.exit(1); 
    }

    // 2. API Трекера (расширенные данные)
    const TRACKER_API_KEY = process.env.TRACKER_API_KEY;
    if (TRACKER_API_KEY) {
        try {
            console.log('Fetching from lastasylumtracker.com...');
            const res2 = await fetch(`https://api.lastasylumtracker.com/v1/alliances/${TRACKER_ALLIANCE_ID}`, {
                headers: {
                    'Authorization': `Bearer ${TRACKER_API_KEY}`,
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (res2.ok) {
                mergedData.tracker = await res2.json();
                console.log('Tracker data successfully fetched.');
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
            // Очищаем историю от битых записей (NaN)
            oldHistory = oldData.history.filter(item => item.time && item.power);
        }
    } catch (e) {
        console.log('Старый файл не найден. Создаем новый.');
    }

    const currentPower = mergedData.tracker?.power || mergedData.base?.power || 0;
    
    if (currentPower > 0) {
        oldHistory.push({
            time: new Date().toISOString(),
            power: currentPower
        });
    }

    mergedData.history = oldHistory.slice(-96); // Оставляем последние 96 точек (24 часа)

    await fs.mkdir('data', { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(mergedData, null, 2));
    console.log('Данные успешно сохранены.');
}

fetchData();
