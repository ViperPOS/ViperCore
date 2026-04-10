import ipcService from '@/services/ipcService';

export async function exportToExcel({ filename, columns, rows }) {
  const XLSX = await import('xlsx');

  const sheetData = [columns.map((c) => c.header)];
  for (const row of rows) {
    sheetData.push(columns.map((c) => {
      const val = c.accessor(row);
      return val == null ? '' : val;
    }));
  }

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const defaultPath = `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`;

  const filePath = await ipcService.invoke('show-save-dialog', defaultPath);
  if (!filePath) return false;

  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filePath.split(/[/\\]/).pop() || defaultPath;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}