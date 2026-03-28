<<<<<<< HEAD
import * as XLSX from 'xlsx';

export const exportToExcel = (standings, tournamentName) => {
  const data = standings.map((p, i) => ({
    Rank: i + 1,
    Name: p.name,
    Score: p.score,
    'Buchholz Total': p.bh,
    'Buchholz Cut-1': p.bhCut1,
    'Status': p.active ? 'Active' : 'Withdrawn'
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Standings");
  XLSX.writeFile(wb, `${tournamentName}_Standings.xlsx`);
=======
import * as XLSX from 'xlsx';

export const exportToExcel = (standings, tournamentName) => {
  const data = standings.map((p, i) => ({
    Rank: i + 1,
    Name: p.name,
    Score: p.score,
    'Buchholz Total': p.bh,
    'Buchholz Cut-1': p.bhCut1,
    'Status': p.active ? 'Active' : 'Withdrawn'
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Standings");
  XLSX.writeFile(wb, `${tournamentName}_Standings.xlsx`);
>>>>>>> 2f2a1e6de3fce7566dc50d310af24a4ffcc80b09
};