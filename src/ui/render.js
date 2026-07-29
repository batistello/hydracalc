// ============================================================================
// render.js
// Renderização dos resultados: tabela de trechos, badges de verificação
// (velocidade/pressão), quantitativo e diagrama esquemático da rede.
// ============================================================================

import { renderNetworkDiagram } from './network-diagram.js';
import { verificarVelocidade } from '../core/pipe-hydraulics.js';
import { verificarPressao } from '../core/pressure.js';

function badge(status) {
  if (status === 'ok') return '<span class="badge badge-ok">OK</span>';
  if (status === 'baixa') return '<span class="badge badge-alerta">BAIXA</span>';
  if (status === 'alta') return '<span class="badge badge-alerta">ALTA</span>';
  return '<span class="badge">-</span>';
}

export function renderResultados({ proj, limites }) {
  const tbody = document.querySelector('#res-final tbody');
  tbody.innerHTML = '';
  const statusPorTrecho = {};

  proj.adut.trechos.forEach(a => {
    const vCheck = a.velocidadeCheck;
    tbody.insertAdjacentHTML('beforeend', `
      <tr class="row-adutora">
        <td><b>[AD]</b> ${a.id}</td><td>${a.l}</td>
        <td>${(a.qM3s * 1000).toFixed(3)}</td><td>-</td><td>${(a.qM3s * 1000).toFixed(3)}</td><td>${(a.qM3s * 1000).toFixed(3)}</td>
        <td>${a.v.toFixed(2)} ${badge(vCheck.status === 'ok' ? 'ok' : vCheck.status)}</td>
        <td>${a.hf.toFixed(3)}</td>
        <td colspan="4">${a.formulaUsada} · golpe de aríete ≈ ${a.sobrepressao.toFixed(1)} mca (celeridade ${a.celeridade.toFixed(0)} m/s)</td>
      </tr>
    `);
  });

  proj.links.forEach(l => {
    const vCheck = verificarVelocidade(l.v, limites.vMin, limites.vMax);
    const pCheckMon = verificarPressao(l.p_m, limites.pMinDinamica, l.pn);
    const pCheckJus = verificarPressao(l.p_j, limites.pMinDinamica, l.pn);
    const algumAlerta = !vCheck.ok || !pCheckMon.ok || !pCheckJus.ok;
    statusPorTrecho[`${l.m}-${l.j}`] = algumAlerta ? 'alerta' : 'ok';

    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${l.m}-${l.j}</td><td>${l.l}</td>
        <td>${(l.q_jus * 1000).toFixed(3)}</td><td>${(l.q_mar * 1000).toFixed(3)}</td>
        <td>${(l.q_mon * 1000).toFixed(3)}</td><td>${(l.q_fic * 1000).toFixed(3)}</td>
        <td>${l.v.toFixed(2)} ${badge(vCheck.status)}</td>
        <td>${l.hf.toFixed(3)} <span class="hint">(${l.formulaUsada})</span></td>
        <td>${l.cp_m.toFixed(2)}</td><td>${l.cp_j.toFixed(2)}</td>
        <td>${l.p_m.toFixed(2)} ${badge(pCheckMon.status)}</td>
        <td>${l.p_j.toFixed(2)} ${badge(pCheckJus.status)}</td>
      </tr>
    `);
  });

  const qd = document.querySelector('#q-dist tbody');
  qd.innerHTML = Object.entries(proj.quantDist).map(([k, v]) => `<tr><td>${k}</td><td><b>${v.toFixed(1)} m</b></td></tr>`).join('');
  const qa = document.querySelector('#q-adut tbody');
  qa.innerHTML = Object.entries(proj.quantAdut).map(([k, v]) => `<tr><td>${k}</td><td><b>${v.toFixed(1)} m</b></td></tr>`).join('');

  document.getElementById('calculo-bomba').innerHTML = `
    <strong>MEMORIAL DA ADUTORA:</strong>
    Vazão de dimensionamento: ${(proj.adut.trechos[0]?.qM3h ?? 0).toFixed(2)} m³/h —
    Altura geométrica: ${proj.adut.alturaGeometrica.toFixed(2)} m —
    Perda de carga total (com localizadas): ${proj.adut.hfTotal.toFixed(2)} m —
    <b>AMT: ${proj.adut.amt.toFixed(2)} mca</b>
  `;

  const diagramEl = document.getElementById('network-diagram');
  if (diagramEl) {
    diagramEl.innerHTML = renderNetworkDiagram({
      nodes: proj.nodes,
      links: proj.links,
      idReservatorio: proj.idReservatorio,
      statusPorTrecho
    });
  }

  document.getElementById('resultado-geral').classList.remove('hide');
  document.getElementById('btn-pdf').style.display = 'block';
}
