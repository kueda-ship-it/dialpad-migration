import { createClient } from '@libsql/client';
import * as fs from 'fs';
import 'dotenv/config';

// 待機用関数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function geocode() {
    const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
    const authToken = process.env.TURSO_AUTH_TOKEN;

    const client = createClient({ url, authToken });

    try {
        const result = await client.execute("SELECT id, name, address, lat, lng FROM projects");
        const projects = result.rows;

        console.log(`Geocoding ${projects.length} projects using GSI API...`);
        let updatedCount = 0;

        for (const p of projects) {
            // 既にハードコーディング済みの特定物件はスキップ（もしあれば）
            if (p.id === '561898' || p.id === '562491') continue;

            // 住所文字列の調整
            let searchAddress = p.address;

            // "ジオ京都姉小路" は特殊対応（正確な住所）
            if (p.name.includes('ジオ京都姉小路')) {
                searchAddress = '京都府京都市中京区姉小路通堀川東入鍛冶町';
            }

            // 国土地理院 (GSI) アドレスマッチングAPI
            const endpoint = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(searchAddress)}`;

            try {
                const response = await fetch(endpoint);
                const data = await response.json();

                if (data && data.length > 0) {
                    // GSI returns coordinates as [longitude, latitude]
                    const lng = parseFloat(data[0].geometry.coordinates[0]);
                    const lat = parseFloat(data[0].geometry.coordinates[1]);

                    await client.execute({
                        sql: `UPDATE projects SET lat = ?, lng = ? WHERE id = ?`,
                        args: [lat, lng, p.id]
                    });
                    updatedCount++;
                    if (updatedCount % 20 === 0) console.log(`Progress: ${updatedCount} / ${projects.length}`);
                } else {
                    console.log(`[NOT FOUND] ${p.id} ${p.name} - ${searchAddress}`);
                }
            } catch (err) {
                console.log(`[ERROR] ${p.id} ${p.name} - ${err.message}`);
            }

            // GSIサーバーに負荷をかけないよう少し待機 (100ms)
            await delay(100);
        }

        console.log(`Updated ${updatedCount} properties with real coordinates.`);

        // JSONモックデータ (mockData.js) にも反映させる
        console.log("Regenerating mockData.js with updated coordinates...");
        const allProjects = await client.execute("SELECT * FROM projects");

        const monthlyStats = Array.from({ length: 12 }, (_, i) => ({ month: `${i + 1}月`, completed: 0, total: 0 }));
        allProjects.rows.forEach(p => {
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

        fs.writeFileSync('src/utils/mockData.js', `export const MOCK_PROJECTS = ${JSON.stringify(allProjects.rows, null, 2)};\nexport const MONTHLY_STATS = ${JSON.stringify(monthlyStats, null, 2)};\n`);
        console.log("mockData.js successfully updated.");

    } catch (e) {
        console.error("Geocoding failed:", e);
    } finally {
        client.close();
    }
}

geocode();
