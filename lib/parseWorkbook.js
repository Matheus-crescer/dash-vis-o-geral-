// parseWorkbook.js — turns a parsed SheetJS workbook into the `orders` array
// and supplementary extras (produtos, courrier, descontos, freteInsight, periodLabel)
// consumed by lib/compute.js. Written to be tolerant of column shuffles: it maps
// columns by header NAME, not fixed position, so small layout changes in future
// spreadsheet exports don't break it.
'use strict';

const XLSX = require('xlsx');

const WEEKDAYS_PT = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];

function normCell(v){ return (v==null?'':String(v)).trim(); }
function normLower(v){ return normCell(v).toLowerCase(); }

function findSheetName(wb, candidates){
  const names = wb.SheetNames;
  for(const cand of candidates){
    const hit = names.find(n => normLower(n) === normLower(cand));
    if(hit) return hit;
  }
  for(const cand of candidates){
    const hit = names.find(n => normLower(n).includes(normLower(cand)));
    if(hit) return hit;
  }
  return null;
}

function sheetMatrix(wb, name){
  if(!name) return null;
  const ws = wb.Sheets[name];
  if(!ws) return null;
  return XLSX.utils.sheet_to_json(ws, {header:1, raw:true, defval:null, blankrows:true});
}

function findHeaderRow(matrix, mustHaveCell){
  for(let i=0; i<Math.min(matrix.length, 20); i++){
    const row = matrix[i] || [];
    if(row.some(c => normLower(c) === normLower(mustHaveCell))) return i;
  }
  return -1;
}

function mapColumns(headerRow, aliasMap){
  // aliasMap: { key: ['alias1','alias2',...] }
  const map = {};
  (headerRow||[]).forEach((cell, idx) => {
    const norm = normLower(cell);
    if(!norm) return;
    for(const key in aliasMap){
      if(aliasMap[key].some(a => normLower(a) === norm)) map[key] = idx;
    }
  });
  return map;
}

function excelValueToDate(v){
  if(v instanceof Date) return v;
  if(typeof v === 'number'){
    // Excel serial date -> JS Date (days since 1899-12-30)
    const ms = Math.round((v - 25569) * 86400 * 1000);
    return new Date(ms);
  }
  if(typeof v === 'string'){
    const m = v.match(/(\d{4})-(\d{2})-(\d{2})/);
    if(m) return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
    const m2 = v.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if(m2) return new Date(`${m2[3]}-${m2[2]}-${m2[1]}T00:00:00`);
  }
  return null;
}

function pad2(n){ return String(n).padStart(2,'0'); }

function parseDadosDetalhados(wb){
  const sheetName = findSheetName(wb, ['Dados Detalhados','Dados','Detalhado']);
  const matrix = sheetMatrix(wb, sheetName);
  if(!matrix) return [];
  const headerRowIdx = findHeaderRow(matrix, 'Pedido');
  if(headerRowIdx === -1) return [];
  const headerRow = matrix[headerRowIdx];
  const cols = mapColumns(headerRow, {
    pedido: ['Pedido'],
    data: ['Data'],
    cidade: ['Cidade'],
    uf: ['UF'],
    pagamento: ['Pagamento'],
    canal: ['Canal'],
    entrega: ['Entrega'],
    status: ['Status'],
    cupom: ['Cupom'],
    itens: ['Itens'],
    valor: ['Valor Total','ValorTotal','Valor'],
    frete: ['Frete']
  });
  if(cols.pedido === undefined || cols.data === undefined || cols.valor === undefined) return [];

  const orders = [];
  for(let r = headerRowIdx+1; r < matrix.length; r++){
    const row = matrix[r];
    if(!row) continue;
    const pedidoVal = row[cols.pedido];
    if(pedidoVal === null || pedidoVal === undefined || normCell(pedidoVal) === '') continue;
    const dateObj = excelValueToDate(row[cols.data]);
    if(!dateObj || isNaN(dateObj.getTime())) continue;
    const dataKey = `${dateObj.getFullYear()}-${pad2(dateObj.getMonth()+1)}-${pad2(dateObj.getDate())}`;
    const dataLabel = `${pad2(dateObj.getDate())}/${pad2(dateObj.getMonth()+1)}`;
    const diaSemana = WEEKDAYS_PT[dateObj.getDay()];
    const canalRaw = cols.canal !== undefined ? normCell(row[cols.canal]) : '';
    const cupomRaw = cols.cupom !== undefined ? normCell(row[cols.cupom]) : '';
    const statusRaw = cols.status !== undefined ? normCell(row[cols.status]) : '';
    orders.push({
      dataKey, dataLabel, diaSemana,
      cidade: normCell(row[cols.cidade]) || '—',
      uf: normCell(row[cols.uf]) || '—',
      pagamento: normCell(row[cols.pagamento]) || '—',
      canal: (canalRaw && canalRaw !== '—') ? canalRaw : null,
      entrega: normCell(row[cols.entrega]) || '—',
      status: statusRaw || 'Faturado',
      cupom: (cupomRaw && cupomRaw !== '—') ? cupomRaw : null,
      itens: Number(row[cols.itens]) || 0,
      valor: Number(row[cols.valor]) || 0,
      frete: cols.frete !== undefined ? (Number(row[cols.frete]) || 0) : 0
    });
  }
  return orders;
}

function parseTopProdutos(wb){
  const sheetName = findSheetName(wb, ['Top Produtos','Produtos']);
  const matrix = sheetMatrix(wb, sheetName);
  if(!matrix) return [];
  const headerRowIdx = findHeaderRow(matrix, 'Produto');
  if(headerRowIdx === -1) return [];
  const headerRow = matrix[headerRowIdx];
  const cols = mapColumns(headerRow, {
    rank: ['#'],
    produto: ['Produto'],
    faturamento: ['Faturamento'],
    qtd: ['Qtd','Quantidade'],
    pedidos: ['Pedidos'],
    precoMedio: ['Preço Médio','Preco Medio']
  });
  if(cols.produto === undefined) return [];
  const out = [];
  for(let r = headerRowIdx+1; r < matrix.length; r++){
    const row = matrix[r];
    if(!row) continue;
    const nome = normCell(row[cols.produto]);
    if(!nome) break;
    out.push([
      Number(row[cols.rank]) || out.length+1,
      nome,
      Math.round((Number(row[cols.faturamento]) || 0) * 100) / 100,
      Number(row[cols.qtd]) || 0,
      Number(row[cols.pedidos]) || 0,
      Math.round((Number(row[cols.precoMedio]) || 0) * 100) / 100
    ]);
  }
  return out;
}

function extractLabeledSection(matrix, sectionLabel, headerMustHave, colAliases, maxRows){
  const startIdx = matrix.findIndex(row => (row||[]).some(c => normLower(c).includes(normLower(sectionLabel))));
  if(startIdx === -1) return [];
  const headerIdx = findHeaderRow(matrix.slice(startIdx, startIdx + (maxRows||6)).map((r,i)=>r), headerMustHave);
  const realHeaderIdx = startIdx + (headerIdx === -1 ? 1 : headerIdx);
  const headerRow = matrix[realHeaderIdx];
  const cols = mapColumns(headerRow, colAliases);
  const firstKey = Object.keys(colAliases)[0];
  if(cols[firstKey] === undefined) return { cols:null, rows: [] };
  const rows = [];
  for(let r = realHeaderIdx+1; r < matrix.length; r++){
    const row = matrix[r];
    if(!row || row.every(c=>c===null || c==='')) break;
    const firstVal = normCell(row[cols[firstKey]]);
    if(!firstVal) break;
    rows.push(row);
  }
  return { cols, rows };
}

function parseCourrier(wb){
  const sheetName = findSheetName(wb, ['Canais e SLA','Canais']);
  const matrix = sheetMatrix(wb, sheetName);
  if(!matrix) return [];
  const { cols, rows } = extractLabeledSection(matrix, 'DETALHAMENTO POR COURRIER', 'Courrier', {
    courrier: ['Courrier'], pedidos: ['Pedidos'], pct: ['% Total']
  });
  if(!cols) return [];
  return rows.map(row => ({
    nome: normCell(row[cols.courrier]),
    pedidos: Number(row[cols.pedidos]) || 0,
    pct: Math.round((Number(row[cols.pct])||0) * 10000) / 100 // fraction -> %
  }));
}

function parseDescontos(wb){
  const sheetName = findSheetName(wb, ['Cupons e Descontos','Cupons']);
  const matrix = sheetMatrix(wb, sheetName);
  if(!matrix) return [];
  const { cols, rows } = extractLabeledSection(matrix, 'TIPOS DE DESCONTO', 'Tipo de Desconto', {
    tipo: ['Tipo de Desconto'], pedidos: ['Pedidos'], fat: ['Faturamento'], pct: ['% Total']
  });
  if(!cols) return [];
  return rows.map(row => ({
    tipo: normCell(row[cols.tipo]),
    pedidos: Number(row[cols.pedidos]) || 0,
    fat: Number(row[cols.fat]) || 0,
    pct: Math.round((Number(row[cols.pct])||0) * 10000) / 100
  }));
}

function parseFreteInsight(wb){
  const sheetName = findSheetName(wb, ['Frete']);
  const matrix = sheetMatrix(wb, sheetName);
  if(!matrix) return null;
  let best = null;
  for(const row of matrix){
    for(const cell of (row||[])){
      const s = normCell(cell);
      if(s.length > 80 && (!best || s.length > best.length)) best = s;
    }
  }
  return best;
}

function parsePeriodLabel(orders){
  if(!orders.length) return null;
  const sorted = [...orders].sort((a,b)=> a.dataKey < b.dataKey ? -1 : 1);
  const first = sorted[0], last = sorted[sorted.length-1];
  return `${first.dataLabel} – ${last.dataLabel} ${last.dataKey.slice(0,4)}`;
}

function parseWorkbookBuffer(buffer){
  const wb = XLSX.read(buffer, {type:'buffer', cellDates:true});
  const orders = parseDadosDetalhados(wb);
  const extra = {
    produtos: parseTopProdutos(wb),
    courrier: parseCourrier(wb),
    descontos: parseDescontos(wb),
    freteInsight: parseFreteInsight(wb),
    periodLabel: parsePeriodLabel(orders)
  };
  return { orders, extra };
}

module.exports = { parseWorkbookBuffer };
