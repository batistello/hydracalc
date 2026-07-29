import { vazaoMediaNo_m3s, vazaoDimensionamentoDistribuicao, vazaoDimensionamentoAdutora } from './src/core/demand.js';
import { resolverRede } from './src/core/network-solver.js';
import { calcularAdutora } from './src/core/pumping-main.js';
import { acumularQuantitativo } from './src/core/quantities.js';

// Cenário equivalente ao exemplo padrão da v1.8
const qHab = 200, habRes = 4, k1 = 1.2, k2 = 1.5;

const nodes = {
  CR: { id: 'CR', cota: 100, marcha: vazaoDimensionamentoDistribuicao(vazaoMediaNo_m3s(qHab, habRes, 0), k1, k2), h: 0 },
  A: { id: 'A', cota: 95, marcha: vazaoDimensionamentoDistribuicao(vazaoMediaNo_m3s(qHab, habRes, 10), k1, k2), h: 0 }
};

const links = [
  { m: 'CR', j: 'A', l: 100, mat: 'PEAD', deMm: 50, espMm: 3.0, pn: 8, c: 140, ajuste: 0, q_jus:0,q_mar:0,q_mon:0,q_fic:0,v:0,hf:0,cp_m:0,cp_j:0,p_m:0,p_j:0 }
];

const { nodes: n2, links: l2 } = resolverRede({ nodes, links, idReservatorio: 'CR', nivelReservatorio: 2, percLocalizadas: 10 });
console.log('--- Distribuição ---');
console.log('Vazão nó A (dimensionamento, L/s):', (n2.A.marcha * 1000).toFixed(3));
console.log('Trecho CR-A:', JSON.stringify(l2[0], null, 2));

const volDiaM3 = 86.4;
const qMediaDiaria = volDiaM3 / 86400;
const qM3s = vazaoDimensionamentoAdutora(qMediaDiaria, k1, 20);
const qM3h = qM3s * 3600;

const resultadoAdutora = calcularAdutora({
  trechos: [{ id: 'Recalque 01', l: 250, mat: 'PVC', deMm: 60, espMm: 3.3, pn: 10, c: 140 }],
  qM3s, qM3h,
  cotaPoco: 80, cotaReservatorio: 120,
  percLocalizadas: 10,
  limites: { vMin: 0.6, vMax: 3.0 }
});

console.log('\n--- Adutora ---');
console.log('Q dimensionamento (m³/h):', qM3h.toFixed(2));
console.log('AMT:', resultadoAdutora.amt.toFixed(2), 'mca');
console.log('Trecho:', JSON.stringify(resultadoAdutora.trechos[0], null, 2));

console.log('\n--- Quantitativo ---');
console.log(acumularQuantitativo(resultadoAdutora.trechos));
