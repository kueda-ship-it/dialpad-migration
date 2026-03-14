import XLSX from 'xlsx';

const excelPath = 'C:\\Users\\000367\\OneDrive - 株式会社フルタイムシステム\\H5でアナログからDialPadに変更可能な物件（メンテ月追記）.xlsx';

try {
    const workbook = XLSX.readFile(excelPath);
    console.log('Sheet Names:', workbook.SheetNames);

    workbook.SheetNames.forEach(name => {
        const sheet = workbook.Sheets[name];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (data.length > 0) {
            console.log(`\n--- Sheet: ${name} ---`);
            console.log('Columns:', data[0]);
            // Search for 'グローベルガーデン柴又レジデンス' to find its row and IDs
            data.forEach((row, i) => {
                if (row.some(cell => String(cell).includes('グローベルガーデン柴又レジデンス'))) {
                    console.log(`Match in ${name} at Row ${i + 1}:`, row);
                }
            });
        }
    });
} catch (error) {
    console.error('Error:', error);
}
