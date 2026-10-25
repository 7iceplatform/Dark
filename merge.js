import fs from 'fs/promises';
import path from 'path';

// ID вашего альянса
const ALLIANCE_ID = '67172519';
// Ваш сервер и тег (замените на актуальные для трекера, если нужно)
const SERVER = '67172519'; // или номер сервера, если требуется API
const TAG = 'DARK'; 

async function fetchData() {
    const mergedData = {};

    // 1. Получаем базовые данные с официального API игры
    try {
        console.log('Fetching from lastasylum.gg...');
        const res1 = await fetch(`https://lastasylum.gg/api/alliance/${ALLIANCE_ID}`);
        if (!res1.ok) throw new Error(`HTTP error! status: ${res1.status}`);
        mergedData.base = await res1.json();
    } catch (e) {
        console.error('Ошибка при запросе к lastasylum.gg:', e.message);
        process.exit(1); // Если база не загрузилась, нет смысла продолжать
    }

    // 2. Получаем расширенные данные с Tracker API
    const TRACKER_API_KEY = process.env.TRACKER_API_KEY;
    if (!TRACKER_API_KEY) {
        console.warn('TRACKER_API_KEY не найден в секретах. Пропускаем Tracker API.');
    } else {
        try {
            console.log('Fetching from lastasylumtracker.com...');
            // Внимание: проверьте точный URL в документации API трекера!
            // Обычно это что-то вроде /v1/alliances/{server}/{tag} или /v1/alliances/{id}
            const res2 = await fetch(`https://api.lastasylumtracker.com/v1/alliances/${SERVER}/${TAG}`, {
                headers: {
                    'Authorization': `Bearer ${TRACKER_API_KEY}`,
                    'Accept': 'application/json'
                }
            });
            
            if (res2.ok) {
                mergedData.tracker = await res2.json();
            } else {
                console.error(`Tracker API вернул ошибку: ${res2.status}`);
            }
        } catch (e) {
            console.error('Ошибка при запросе к Tracker API:', e.message);
        }
    }

    // 3. Сохраняем объединенный файл
    await fs.mkdir('data', { recursive: true });
    await fs.writeFile(
        path.join('data', 'alliance.json'), 
        JSON.stringify(mergedData, null, 2)
    );
    console.log('Данные успешно объединены и сохранены в data/alliance.json');
}

fetchData();
