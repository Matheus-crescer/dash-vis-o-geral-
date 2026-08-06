// compute.js — pure data-transformation logic (no xlsx dependency here).
// Input: `orders` = array of objects:
//   { dataKey:'YYYY-MM-DD', dataLabel:'dd/mm', diaSemana, cidade, uf, pagamento, canal, entrega, status, cupom, itens:Number, valor:Number, frete:Number }
// Optional `extra` = { produtos, courrier, descontos, freteInsight, periodLabel }
'use strict';

function round2(n){ return Math.round((n + Number.EPSILON) * 100) / 100; }
function fmtBRL(v){ return 'R$ ' + Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function median(arr){
  if(!arr.length) return 0;
  const s = [...arr].sort((a,b)=>a-b);
  const mid = Math.floor(s.length/2);
  return s.length%2 ? s[mid] : (s[mid-1]+s[mid])/2;
}
function sum(arr, fn){ return arr.reduce((a,x)=>a+(fn?fn(x):x),0); }
function mean(arr, fn){ return arr.length ? sum(arr,fn)/arr.length : 0; }
function isCartao(pagamento){ return pagamento==='Mastercard' || pagamento==='Visa'; }
function normStatus(s){
  const v = (s||'Faturado').toString().trim();
  return v || 'Faturado';
}
function groupBy(arr, keyFn){
  const m = new Map();
  for(const o of arr){
    const k = keyFn(o) || '—';
    if(!m.has(k)) m.set(k, []);
    m.get(k).push(o);
  }
  return m;
}

function computeFromOrders(orders, extra){
  extra = extra || {};
  const ALL = orders;
  const REV = orders.filter(o => normStatus(o.status) !== 'Cancelado');
  const CANC = orders.filter(o => normStatus(o.status) === 'Cancelado');
  const PIX = REV.filter(o=>o.pagamento==='Pix');
  const CARTAO = REV.filter(o=>isCartao(o.pagamento));

  const faturamento = round2(sum(REV, o=>o.valor));
  const pedidosTotal = ALL.length;
  const pedidosFaturados = REV.length;
  const pedidosCancelados = CANC.length;
  const pctCancelado = pedidosTotal ? round2(pedidosCancelados/pedidosTotal*100) : 0;
  const ticketMedio = round2(mean(REV, o=>o.valor));
  const ticketMediano = round2(median(REV.map(o=>o.valor)));
  const itensPedido = REV.length ? round2(sum(REV,o=>o.itens)/REV.length) : 0;
  const pedidosPix = PIX.length;
  const pctPix = REV.length ? round2(pedidosPix/REV.length*100) : 0;
  const ticketCartao = round2(mean(CARTAO, o=>o.valor));
  const ticketPix = round2(mean(PIX, o=>o.valor));
  const diasDistintos = new Set(REV.map(o=>o.dataKey)).size || 1;
  const mediaDiaria = round2(REV.length/diasDistintos);
  const pedidosCupom = ALL.filter(o=>o.cupom).length;
  const pctCupom = pedidosTotal ? round2(pedidosCupom/pedidosTotal*100) : 0;
  const receitaPerdida = round2(sum(CANC, o=>o.valor));
  const pctCartaoFat = faturamento ? round2(sum(CARTAO,o=>o.valor)/faturamento*100) : 0;
  const ratioCartaoPix = ticketPix ? Math.round(ticketCartao/ticketPix*10)/10 : 0;

  const kpis = {
    faturamento, pedidosTotal, pedidosFaturados, pedidosCancelados, pctCancelado,
    ticketMedio, ticketMediano, itensPedido, pedidosPix, pctPix, ticketCartao, ticketPix,
    mediaDiaria, pedidosCupom, pctCupom, receitaPerdida
  };

  // ---- CIDADES ----
  const cidadeGroups = groupBy(REV, o=>o.cidade);
  let cidadesArr = [...cidadeGroups.entries()].map(([cidade, list])=>{
    const fat = round2(sum(list,o=>o.valor));
    const pedidos = list.length;
    const pix = list.filter(o=>o.pagamento==='Pix').length;
    const cartao = list.filter(o=>isCartao(o.pagamento)).length;
    return {
      cidade, fat, pedidos, ticket: round2(fat/pedidos),
      pix, cartao,
      pctPix: pedidos? round2(pix/pedidos*100):0,
      pctCartao: pedidos? round2(cartao/pedidos*100):0,
      pctFat: faturamento? round2(fat/faturamento*100):0
    };
  }).sort((a,b)=>b.fat-a.fat);
  let cidades = cidadesArr.slice(0,10);
  if(cidadesArr.length>10){
    const outras = cidadesArr.slice(10);
    const fat = round2(sum(outras,o=>o.fat));
    const pedidos = sum(outras,o=>o.pedidos);
    const pix = sum(outras,o=>o.pix);
    const cartao = sum(outras,o=>o.cartao);
    cidades.push({
      cidade:'Outras cidades', fat, pedidos, ticket: pedidos?round2(fat/pedidos):0,
      pix, cartao, pctPix: pedidos?round2(pix/pedidos*100):0, pctCartao: pedidos?round2(cartao/pedidos*100):0,
      pctFat: faturamento?round2(fat/faturamento*100):0
    });
  }

  // ---- RECOS (heuristic, per top-5 cidade) ----
  const top5ForReco = cidades.filter(c=>c.cidade!=='Outras cidades').slice(0,5);
  const maxTicketTop5 = top5ForReco.length ? Math.max(...top5ForReco.map(x=>x.ticket)) : 0;
  const recos = top5ForReco.map(c=>{
    let texto;
    if(c.pctPix >= 85) texto = 'Altíssima adesão ao Pix — cupom exclusivo Pix pode elevar o ticket médio.';
    else if(c.ticket === maxTicketTop5) texto = 'Maior ticket médio do grupo — público com potencial para produtos premium.';
    else if(c.pctCartao >= 35) texto = 'Boa parcela em cartão — manter parcelamento sem juros para reter esse público.';
    else texto = 'Base relevante de pedidos — campanha de fidelidade e cross-sell.';
    return {cidade:c.cidade, texto};
  });

  // ---- PAGAMENTOS ----
  const pagGroups = groupBy(REV, o=>o.pagamento);
  const pagamentos = [...pagGroups.entries()].map(([metodo, list])=>{
    const fat = round2(sum(list,o=>o.valor));
    const vals = list.map(o=>o.valor);
    return {
      metodo, fat, pedidos:list.length,
      pctPedidos: REV.length? round2(list.length/REV.length*100):0,
      ticket: round2(fat/list.length),
      min: round2(Math.min(...vals)), max: round2(Math.max(...vals)),
      pctFat: faturamento? round2(fat/faturamento*100):0
    };
  }).sort((a,b)=>b.fat-a.fat);

  const pagamentosInsights = (function(){
    const pix = pagamentos.find(p=>p.metodo==='Pix') || {pctPedidos:0,pctFat:0,ticket:0};
    const cartaoPedidos = pagamentos.filter(p=>isCartao(p.metodo));
    const cartaoPedidosCount = sum(cartaoPedidos,p=>p.pedidos);
    const cartaoFat = sum(cartaoPedidos,p=>p.fat);
    const cartaoTicket = cartaoPedidosCount? round2(cartaoFat/cartaoPedidosCount):0;
    return [
      `Pix: ${pix.pctPedidos.toFixed(1)}% dos pedidos, ${pix.pctFat.toFixed(1)}% do faturamento. Ticket médio ${fmtBRL(pix.ticket)}.`,
      `Cartões: ${(REV.length?round2(cartaoPedidosCount/REV.length*100):0).toFixed(1)}% dos pedidos, ${(faturamento?round2(cartaoFat/faturamento*100):0).toFixed(1)}% do faturamento. Ticket médio ${fmtBRL(cartaoTicket)}.`,
      `Cartões geram ${pix.ticket? Math.round(cartaoTicket/pix.ticket*10)/10:0}x mais receita por pedido que o Pix.`,
      `Estratégia sugerida: cupom Pix de desconto para pedidos acima do ticket médio, incentivando o meio de pagamento mais usado.`,
    ];
  })();

  // ---- CROSS (top5 cidade x metodo) ----
  const cross = top5ForReco.map(c=>{
    const list = cidadeGroups.get(c.cidade) || [];
    const total = list.length;
    const pix = list.filter(o=>o.pagamento==='Pix').length;
    const master = list.filter(o=>o.pagamento==='Mastercard').length;
    const visa = list.filter(o=>o.pagamento==='Visa').length;
    const outros = total-pix-master-visa;
    const pct = n => total? Math.round(n/total*100):0;
    return {
      cidade:c.cidade, total,
      pix:`${pix} (${pct(pix)}%)`, master:`${master} (${pct(master)}%)`,
      visa:`${visa} (${pct(visa)}%)`, outros:`${outros} (${pct(outros)}%)`
    };
  });

  // ---- CANAIS (only orders with a known canal) ----
  const comCanal = REV.filter(o=>o.canal && o.canal!=='—');
  const semCanalCount = REV.length - comCanal.length;
  const pctSemCanal = REV.length? round2(semCanalCount/REV.length*100):0;
  const canalGroups = groupBy(comCanal, o=>o.canal);
  const canais = [...canalGroups.entries()].map(([canal,list])=>{
    const fat = round2(sum(list,o=>o.valor));
    return {
      canal, fat, pedidos:list.length,
      pct: comCanal.length? round2(list.length/comCanal.length*100):0,
      ticket: round2(fat/list.length)
    };
  }).sort((a,b)=>b.fat-a.fat);

  // ---- SLA (entrega) ----
  const slaGroups = groupBy(REV, o=>o.entrega);
  const sla = [...slaGroups.entries()].map(([tipo,list])=>{
    const fat = round2(sum(list,o=>o.valor));
    return { tipo, fat, pedidos:list.length, pct: REV.length?round2(list.length/REV.length*100):0, ticket: round2(fat/list.length) };
  }).sort((a,b)=>b.fat-a.fat);

  const canaisInsights = (function(){
    const top2 = canais.slice(0,2);
    const bySla = [...sla].sort((a,b)=>b.ticket-a.ticket);
    const arr = [];
    if(top2[0]) arr.push(`${top2[0].canal}: ${top2[0].pct.toFixed(1)}% dos pedidos com canal identificado, ticket ${fmtBRL(top2[0].ticket)}.`);
    if(top2[1]) arr.push(`${top2[1].canal}: ${top2[1].pct.toFixed(1)}% dos pedidos, ticket ${fmtBRL(top2[1].ticket)}.`);
    arr.push(`${pctSemCanal.toFixed(1)}% dos pedidos estão sem canal identificado (UtmSource) — oportunidade de rastreamento.`);
    if(bySla[0]) arr.push(`${bySla[0].tipo}: maior ticket médio entre os métodos de entrega (${fmtBRL(bySla[0].ticket)}).`);
    return arr;
  })();

  // ---- EVOLUCAO (por dia) ----
  const diaGroups = groupBy(REV, o=>o.dataKey);
  let evolucao = [...diaGroups.entries()].map(([key,list])=>{
    const fat = round2(sum(list,o=>o.valor));
    const first = list[0];
    return { dataKey:key, dataLabel:first.dataLabel, dia:first.diaSemana, fat, pedidos:list.length, ticket: round2(fat/list.length) };
  }).sort((a,b)=> a.dataKey < b.dataKey ? -1 : a.dataKey>b.dataKey?1:0);

  const evolucaoInsights = (function(){
    if(!evolucao.length) return [];
    const maxDay = [...evolucao].sort((a,b)=>b.fat-a.fat)[0];
    const maxTicketDay = [...evolucao].sort((a,b)=>b.ticket-a.ticket)[0];
    const weekday = evolucao.filter(d=>{ const dow = new Date(d.dataKey+'T00:00:00').getDay(); return dow>=1 && dow<=5; });
    const weekend = evolucao.filter(d=>{ const dow = new Date(d.dataKey+'T00:00:00').getDay(); return dow===0 || dow===6; });
    const weekdayAvg = mean(weekday, d=>d.pedidos);
    const weekendAvg = mean(weekend, d=>d.pedidos);
    const arr = [
      `Maior faturamento: ${maxDay.dataLabel} — ${fmtBRL(maxDay.fat)} (${maxDay.pedidos} pedidos).`,
      `Média diária: ${fmtBRL(mean(evolucao,d=>d.fat))} (${round2(mean(evolucao,d=>d.pedidos))} pedidos).`,
      `Melhor ticket diário: ${fmtBRL(maxTicketDay.ticket)}, em ${maxTicketDay.dataLabel}.`,
    ];
    if(weekday.length && weekend.length){
      arr.push(weekendAvg < weekdayAvg
        ? 'Finais de semana têm menor volume que dias úteis — campanha de fim de semana pode reverter a tendência.'
        : 'Finais de semana têm volume igual ou maior que dias úteis — bom momento para reforçar estoque e equipe.');
    }
    return arr;
  })();

  // ---- STATUS & CANCELAMENTOS ----
  const statusGroups = groupBy(ALL, o=>normStatus(o.status));
  const statusSummary = [...statusGroups.entries()].map(([status,list])=>{
    const fat = round2(sum(list,o=>o.valor));
    const tag = status==='Cancelado' ? 'critico' : (status==='Faturado' ? 'ok' : 'alto');
    return {
      status, fat, pedidos:list.length,
      pctTotal: pedidosTotal? round2(list.length/pedidosTotal*100):0,
      ticket: round2(fat/list.length),
      pctFat: faturamento? round2(fat/faturamento*100):0,
      tag
    };
  }).sort((a,b)=>b.pedidos-a.pedidos);

  const cancelCidadeGroups = groupBy(CANC, o=>o.cidade);
  const cancelCidade = [...cancelCidadeGroups.entries()].map(([cidade,list])=>({
    cidade, cancelados:list.length, pct: CANC.length? round2(list.length/CANC.length*100):0
  })).sort((a,b)=>b.cancelados-a.cancelados);

  const cancelPagGroups = groupBy(CANC, o=>o.pagamento);
  const cancelPagamento = [...cancelPagGroups.entries()].map(([pagamento,list])=>({
    pagamento, cancelados:list.length, pct: CANC.length? round2(list.length/CANC.length*100):0
  })).sort((a,b)=>b.cancelados-a.cancelados);

  const statusRecos = (function(){
    const arr = [`${pctCancelado.toFixed(1)}% dos pedidos são cancelados — impacto de ${fmtBRL(receitaPerdida)} na receita potencial.`];
    if(cancelCidade[0]) arr.push(`${cancelCidade[0].cidade} concentra o maior número de cancelamentos (${cancelCidade[0].cancelados}) — investigar causa local (estoque, entrega, atendimento).`);
    if(cancelPagamento[0]) arr.push(`${cancelPagamento[0].pagamento} é o método mais cancelado — revisar fluxo de checkout para esse meio de pagamento.`);
    arr.push('Implementar recuperação de carrinho/pedido abandonado com contato automático.');
    arr.push('Oferecer desconto de retomada (5–10%) para clientes que cancelaram recentemente.');
    return arr;
  })();

  // ---- CUPONS & DESCONTOS ----
  const comCupomAll = ALL.filter(o=>o.cupom);
  const comCupomRev = REV.filter(o=>o.cupom);
  const semCupomRev = REV.filter(o=>!o.cupom);
  const fatComCupom = round2(sum(comCupomRev,o=>o.valor));
  const ticketComCupom = round2(mean(comCupomRev,o=>o.valor));
  const ticketSemCupom = round2(mean(semCupomRev,o=>o.valor));
  const cuponsSummary = {
    comCupom: comCupomAll.length,
    pctComCupom: pedidosTotal? round2(comCupomAll.length/pedidosTotal*100):0,
    semCupom: pedidosTotal-comCupomAll.length,
    pctSemCupom: pedidosTotal? round2((pedidosTotal-comCupomAll.length)/pedidosTotal*100):0,
    fatComCupom, ticketComCupom, ticketSemCupom,
    diferenca: round2(ticketComCupom-ticketSemCupom)
  };

  const cupomGroups = groupBy(comCupomRev, o=>o.cupom);
  const topCupons = [...cupomGroups.entries()].map(([cupom,list])=>{
    const fat = round2(sum(list,o=>o.valor));
    const cidadeCount = groupBy(list, o=>o.cidade);
    let topCidade = '—', topN = 0;
    for(const [cid, l] of cidadeCount.entries()){ if(l.length>topN){ topN=l.length; topCidade=cid; } }
    return { cupom, pedidos:list.length, pct: comCupomAll.length? round2(list.length/comCupomAll.length*100):0, fat, ticket: round2(fat/list.length), cidade: topCidade };
  }).sort((a,b)=>b.pedidos-a.pedidos).slice(0,8);

  const cuponsInsights = (function(){
    const arr = [];
    if(cuponsSummary.ticketSemCupom){
      const pct = round2((cuponsSummary.ticketComCupom-cuponsSummary.ticketSemCupom)/cuponsSummary.ticketSemCupom*100);
      arr.push(`Pedidos com cupom têm ticket ${pct>=0?'+':''}${pct.toFixed(0)}% em relação aos sem cupom (${fmtBRL(cuponsSummary.ticketComCupom)} vs ${fmtBRL(cuponsSummary.ticketSemCupom)}).`);
    }
    if(topCupons[0]) arr.push(`${topCupons[0].cupom} é o cupom mais usado (${topCupons[0].pedidos} pedidos).`);
    arr.push('Considerar cupom de retomada para pedidos cancelados recentemente.');
    arr.push(`${cuponsSummary.pctComCupom.toFixed(1)}% dos pedidos já usam cupom — explorar mais para clientes sem desconto.`);
    return arr;
  })();

  // ---- INSIGHTS (overview) ----
  const ufGroups = groupBy(REV, o=>o.uf);
  const ufArr = [...ufGroups.entries()].map(([uf,list])=>({uf, fat: round2(sum(list,o=>o.valor))})).sort((a,b)=>b.fat-a.fat);
  const topUF = ufArr[0] || {uf:'—',fat:0};
  const topCidade = cidades[0] || {cidade:'—', pctFat:0};
  const topCanal = canais[0] || {canal:'—', pct:0};

  const insights = [
    `Pix domina com ${kpis.pctPix.toFixed(1)}% dos pedidos. Cartões geram ${pctCartaoFat.toFixed(1)}% do faturamento com ticket médio ${ratioCartaoPix}x maior.`,
    `${topCidade.cidade} concentra ${topCidade.pctFat.toFixed(1)}% do faturamento.`,
    `${kpis.pctCancelado.toFixed(1)}% dos pedidos foram cancelados (${kpis.pedidosCancelados} de ${kpis.pedidosTotal}) — impacto de ${fmtBRL(kpis.receitaPerdida)} na receita potencial.`,
    `${kpis.pctCupom.toFixed(1)}% dos pedidos usaram cupom (${fmtBRL(fatComCupom)} em receita com desconto).`,
    `${topCanal.canal} é o canal principal (${topCanal.pct.toFixed(1)}% dos pedidos com canal identificado).`,
    `${pctSemCanal.toFixed(1)}% dos pedidos estão sem canal identificado (UtmSource) — oportunidade de rastreamento.`,
    `${topUF.uf} responde por ${(faturamento?round2(topUF.fat/faturamento*100):0).toFixed(1)}% do faturamento.`
  ];

  return {
    kpis, insights, cidades, recos, pagamentos, pagamentosInsights, cross,
    canais, sla, canaisInsights, evolucao, evolucaoInsights,
    statusSummary, cancelCidade, cancelPagamento, statusRecos,
    cuponsSummary, topCupons, cuponsInsights,
    produtos: extra.produtos || [],
    courrier: extra.courrier || [],
    descontos: extra.descontos || [],
    freteInsight: extra.freteInsight || null,
    periodLabel: extra.periodLabel || null,
    orders: orders.map(o=>[o.dataLabel,o.cidade,o.uf,o.pagamento,o.canal||'—',o.entrega,normStatus(o.status),o.cupom||'—',o.itens,round2(o.valor),round2(o.frete||0)]),
    generatedAt: new Date().toISOString()
  };
}

module.exports = { computeFromOrders };
