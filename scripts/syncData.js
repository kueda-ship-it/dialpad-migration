import XLSX from 'xlsx';
import * as fs from 'fs';
import { createClient } from '@libsql/client';
import 'dotenv/config';

const excelPath = 'C:\\Users\\000367\\OneDrive - 株式会社フルタイムシステム\\H5でアナログからDialPadに変更可能な物件（メンテ月追記）.xlsx';

// Excel Serial Date to YYYY/MM/DD
function excelDateToJSDate(serial) {
    if (!serial || isNaN(serial)) return serial;
    const date = new Date((serial - 25569) * 86400 * 1000);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
}

async function sync() {
    const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
    const authToken = process.env.TURSO_AUTH_TOKEN;

    console.log(`Connecting to: ${url}`);
    const client = createClient({
        url: url,
        authToken: authToken,
    });

    try {
        const workbook = XLSX.readFile(excelPath);

        // --- Sheet 2: Maintenance Mapping ---
        const sheetMaintenance = workbook.Sheets['H5_EATHEでアナログ回線ありメンテ月'];
        const dataMaintRaw = XLSX.utils.sheet_to_json(sheetMaintenance, { header: 1 });
        const maintMap = {};

        // Indices for Maint Sheet:
        // 0: 号機, 3: 対応日, 4: 対応時間, 5: 回線停止日, 6-17: 1-12月
        dataMaintRaw.slice(1).forEach(row => {
            const id = String(row[0] || '').trim();
            if (!id) return;

            const activeMonths = [];
            for (let i = 0; i < 12; i++) {
                if (row[6 + i] == 1 || row[6 + i] == '1') {
                    activeMonths.push(i + 1);
                }
            }

            maintMap[id] = {
                maintMonth: activeMonths.join(','),
                supportDate: excelDateToJSDate(row[3]),
                supportTime: row[4] || '',
                lineStopDate: excelDateToJSDate(row[5])
            };
        });

        // --- Sheet 1: Main Project Data ---
        const sheet1 = workbook.Sheets['H5_EATHEでアナログ回線あり'];
        const data1Raw = XLSX.utils.sheet_to_json(sheet1, { header: 1 });

        // Indices for Sheet 1:
        // 0: 号機, 1: 電話番号, 2: 物件名, 21: 都道府県名, 22: 住所, 
        // 25: 回線タイプ, 29: ロッカー型, 30: ロッカー電話番号, 
        // 31: プログラムバージョン, 32: ロッカー契約, 33: 通話機能なし
        const idCounts = {};
        const projects = data1Raw.slice(1).map((row, index) => {
            let baseId = String(row[0] || '').trim();
            if (!baseId) baseId = `AUTO_${index + 1}`;

            let finalId = baseId;
            if (idCounts[baseId]) {
                idCounts[baseId]++;
                finalId = `${baseId}_${idCounts[baseId]}`;
            } else {
                idCounts[baseId] = 1;
            }

            const name = String(row[2] || 'Unknown').trim();
            const address = `${row[21] || ''}${row[22] || ''}`.trim();
            const maint = maintMap[baseId] || {};
            const status = maint.supportDate ? '対応済' : '未対応';

            const formatPhone = (val) => {
                let p = String(val || '').trim();
                if (p && !p.startsWith('0') && (p.length === 9 || p.length === 10)) {
                    return '0' + p;
                }
                return p;
            };

            const PREFECTURE_CENTERS = {
                '東京都': { lat: 35.6895, lng: 139.6917 },
                '神奈川県': { lat: 35.4433, lng: 139.6385 },
                '千葉県': { lat: 35.6074, lng: 140.1063 },
                '埼玉県': { lat: 35.8617, lng: 139.6455 }
            };

            const pref = Object.keys(PREFECTURE_CENTERS).find(k => address.startsWith(k));
            const center = pref ? PREFECTURE_CENTERS[pref] : { lat: 35.6895, lng: 139.6917 };

            let lat = center.lat + (Math.random() - 0.5) * 0.15;
            let lng = center.lng + (Math.random() - 0.5) * 0.15;

            if (baseId === '561898') { lat = 35.476117; lng = 139.626778; }
            if (baseId === '562491') { lat = 35.7271; lng = 139.5135; }

            return {
                id: finalId,
                name,
                address,
                phone: formatPhone(row[1]),
                line_type: String(row[25] || '').trim(),
                locker_type: String(row[29] || '').trim(),
                locker_phone: formatPhone(row[30]),
                program_version: String(row[31] || '').trim(),
                locker_contract: String(row[32] || '').trim(),
                no_call_function: String(row[33] || '').trim(),
                maintenance_month: maint.maintMonth || '',
                support_date: maint.supportDate || '',
                support_time: maint.supportTime || '',
                line_stop_date: maint.lineStopDate || '',
                status,
                completion_date: maint.supportDate || '',
                lat,
                lng
            };
        });

        // Re-create Table & Sync
        await client.execute(`DROP TABLE IF EXISTS projects`);
        await client.execute(`
            CREATE TABLE projects (
                id TEXT PRIMARY KEY,
                name TEXT,
                address TEXT,
                phone TEXT,
                line_type TEXT,
                locker_type TEXT,
                locker_phone TEXT,
                program_version TEXT,
                locker_contract TEXT,
                no_call_function TEXT,
                maintenance_month TEXT,
                support_date TEXT,
                support_time TEXT,
                line_stop_date TEXT,
                status TEXT,
                completion_date TEXT,
                lat REAL,
                lng REAL,
                master_update_done INTEGER DEFAULT 0
            )
        `);

        for (const p of projects) {
            await client.execute({
                sql: `INSERT INTO projects (
                    id, name, address, phone, line_type, locker_type, locker_phone, 
                    program_version, locker_contract, no_call_function, 
                    maintenance_month, support_date, support_time, line_stop_date, 
                    status, completion_date, lat, lng
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [
                    p.id, p.name, p.address, p.phone, p.line_type, p.locker_type, p.locker_phone,
                    p.program_version, p.locker_contract, p.no_call_function,
                    p.maintenance_month, p.support_date, p.support_time, p.line_stop_date,
                    p.status, p.completion_date, p.lat, p.lng
                ]
            });
        }

        console.log(`Successfully synced ${projects.length} projects.`);

        // Dashboard Stats
        const monthlyStats = Array.from({ length: 12 }, (_, i) => ({ month: `${i + 1}月`, completed: 0, total: 0 }));
        projects.forEach(p => {
            if (p.maintenance_month) {
                const months = p.maintenance_month.split(',');
                months.forEach(m => {
                    const idx = parseInt(m) - 1;
                    if (monthlyStats[idx]) {
                        monthlyStats[idx].total++;
                        if (p.status === '対応済') monthlyStats[idx].completed++;
                    }
                });
            }
        });

        fs.writeFileSync('src/utils/mockData.js', `export const MOCK_PROJECTS = ${JSON.stringify(projects, null, 2)};\nexport const MONTHLY_STATS = ${JSON.stringify(monthlyStats, null, 2)};\n`);

    } catch (error) {
        console.error('Sync Error:', error);
    } finally {
        client.close();
    }
}

sync();
