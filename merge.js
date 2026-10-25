import fs from 'fs/promises';
import path from 'path';

// ID вашего альянса
const ALLIANCE_ID = '67172519';

async function fetchData() {
    const mergedData = { base: null, tracker: null, history: [] };

    // 1. Получаем базовые данные с официального API игры (список игроков)
    try {
        console.log('Fetching from lastasylum.gg...');
        const res1 = await fetch(`https://lastasylum.gg/api/alliance/${ALLIANCE_ID}`);
        if (!res1.ok) throw new Error(`HTTP error! status: ${res1.status}`);
        mergedData.base = await res1.json();
    } catch (e) {
        console.error('Ошибка при запросе к lastasylum.gg:', e.message);
        process.exit(1); 
    }

    // 2. Получаем расширенные данные с Tracker API
    const TRACKER_API_KEY = process.env.TRACKER_API_KEY;
    if (TRACKER_API_KEY) {
        try {
            console.log('Fetching from lastasylumtracker.com...');
            // Согласно документации, используем ID альянса
            const res2 = await fetch(`https://api.lastasylumtracker.com/v1/alliances/${ALLIANCE_ID}`, {
                headers: {
                    'Authorization': `Bearer ${TRACKER_API_KEY}`,
                    'Accept': 'application/json',
                    // Обязательно передаем User-Agent, чтобы не получить 403 от Cloudflare
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (res2.ok) {
                mergedData.tracker = await res2.json();
            } else {
                console.error(`Tracker API вернул ошибку: ${res2.status}`);
                const errText = await res2.text();
                console.error('Детали:', errText);
            }
        } catch (e) {
            console.error('Ошибка при запросе к Tracker API:', e.message);
        }
    } else {
        console.warn('TRACKER_API_KEY не найден. Используются только базовые данные.');
    }

    // 3. Работа с историей (чтобы рисовать графики)
    const filePath = path.join('data', 'alliance.json');
    let oldHistory = [];
    
    // Пытаемся прочитать старый файл, чтобы забрать оттуда историю
    try {
        const oldFile = await fs.readFile(filePath, 'utf-8');
        const oldData = JSON.parse(oldFile);
        if (oldData.history && Array.isArray(oldData.history)) {
            oldHistory = oldData.history;
        }
    } catch (e) {
        console.log('Старый файл не найден или поврежден. Создаем новый.');
    }

    // Берем текущую силу (приоритет у трекера, если он ответил)
    const currentPower = mergedData.tracker?.power || mergedData.base?.power || 0;
    
    if (currentPower > 0) {
        // Добавляем новую точку (текущее время и сила)
        oldHistory.push({
            time: new Date().toISOString(),
            power: currentPower
        });
    }

    // Ограничиваем историю последними 96 точками (24 часа * 4 раза в час = 96)
    // Это чтобы файл не разрастался до гигантских размеров
    mergedData.history = oldHistory.slice(-96);

    // 4. Сохраняем объединенный файл
    await fs.mkdir('data', { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(mergedData, null, 2));
    console.log('Данные успешно объединены, история обновлена.');
}

fetchData();
