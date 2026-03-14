import XLSX from 'xlsx';
import * as fs from 'fs';

const excelPath = 'C:\\Users\\000367\\OneDrive - 株式会社フルタイムシステム\\H5でアナログからDialPadに変更可能な物件（メンテ月追記）.xlsx';

try {
    const workbook = XLSX.readFile(excelPath);

    console.log('Sheet Names:', workbook.SheetNames);

    // Analyze Sheet 1 (Projects)
    const sheet1 = workbook.Sheets[workbook.SheetNames[0]];
    const data1 = XLSX.utils.sheet_to_json(sheet1);
    console.log('Sheet 1 Columns:', data1.length > 0 ? Object.keys(data1[0]) : 'Empty');

    // Analyze Sheet 2 (Completion results)
    if (workbook.SheetNames.length > 1) {
        const sheet2 = workbook.Sheets[workbook.SheetNames[1]];
        const data2 = XLSX.utils.sheet_to_json(sheet2);
        console.log('Sheet 2 Columns:', data2.length > 0 ? Object.keys(data2[0]) : 'Empty');
        console.log('Sheet 2 Sample Row:', data2[0]);
    }
} catch (error) {
    console.error('Error:', error);
}
