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
  const tbodyAdut = document.querySelector('#res-adutora tbody');
  tbodyAdut.innerHTML = '';
  proj.adut.trechos.forEach(a => {
    const vCheck = a.velocidadeCheck;
    tbodyAdut.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${a.id}</td><td>${a.l}</td><td>${a.mat}</td><td>${a.pn}</td>
        <td>${a.qM3h.toFixed(2)}</td><td>${(a.qM3s * 1000).toFixed(3)}</td>
        <td>${a.deMm}</td><td>${(a.di * 1000).toFixed(1)}</td>
        <td>${a.v.toFixed(2)} ${badge(vCheck.status === 'ok' ? 'ok' : vCheck.status)}</td>
        <td>${a.hfPorKm.toFixed(2)}</td><td>${a.hf.toFixed(3)} <span class="hint">(${a.formulaUsada})</span></td>
        <td>${a.celeridade.toFixed(0)}</td><td>${a.sobrepressao.toFixed(1)}</td>
      </tr>
    `);
  });

  const tbody = document.querySelector('#res-final tbody');
  tbody.innerHTML = '';
  const statusPorTrecho = {};

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
        <td>${(l.diCalculado * 1000).toFixed(1)}</td>
        <td>${l.v.toFixed(2)} ${badge(vCheck.status)}</td>
        <td>${l.hf.toFixed(3)} <span class="hint">(${l.formulaUsada})</span></td>
        <td>${l.hfPorKm.toFixed(2)}</td>
        <td>${l.cotaTerrenoM.toFixed(2)}</td><td>${(l.cotaTerrenoJ ?? 0).toFixed(2)}</td>
        <td>${l.cp_m.toFixed(2)}</td><td>${l.cp_j.toFixed(2)}</td>
        <td>${(l.desnivelM ?? 0).toFixed(2)}</td><td>${(l.desnivelJ ?? 0).toFixed(2)}</td>
        <td>${l.p_m.toFixed(2)} ${badge(pCheckMon.status)}</td>
        <td>${l.p_j.toFixed(2)} ${badge(pCheckJus.status)}</td>
        <td>${l.ajuste ? `<b class="${l.ajuste < 0 ? 'texto-alerta' : 'texto-ok'}">${l.ajuste > 0 ? '+' : ''}${l.ajuste.toFixed(2)}</b>` : '0.00'}</td>
        <td class="celula-obs">${l.obs || (l.ajuste ? '<span class="hint">(sem observação preenchida)</span>' : '')}</td>
      </tr>
    `);
  });

  const qd = document.querySelector('#q-dist tbody');
  qd.innerHTML = Object.entries(proj.quantDist).map(([k, v]) => `<tr><td>${k}</td><td><b>${v.toFixed(1)} m</b></td></tr>`).join('');
  const qa = document.querySelector('#q-adut tbody');
  qa.innerHTML = Object.entries(proj.quantAdut).map(([k, v]) => `<tr><td>${k}</td><td><b>${v.toFixed(1)} m</b></td></tr>`).join('');
  const ql = document.querySelector('#q-lig tbody');
  ql.innerHTML = `<tr><td>${proj.ligacaoDomiciliar.especificacao}</td><td><b>${proj.ligacaoDomiciliar.comprimentoTotal.toFixed(1)} m</b></td></tr>
    <tr><td class="hint">(${proj.ligacaoDomiciliar.totalResidencias} economias × ${proj.ligacaoDomiciliar.comprimentoPadraoM} m)</td><td></td></tr>`;
  const qac = document.querySelector('#q-acessorios tbody');
  qac.innerHTML = proj.acessorios.length
    ? proj.acessorios.map(a => `<tr><td>${a.item} ${a.diametro}</td><td><b>${a.qtd} ${a.unidade}</b></td></tr>`).join('')
    : '<tr><td colspan="2" class="hint">Nenhum acessório cadastrado (aba "04 · Ligação Domiciliar &amp; Acessórios")</td></tr>';

  document.getElementById('total-geral-rede').innerHTML = `
    <strong>TOTAL GERAL DE TUBULAÇÃO:</strong> ${proj.quantitativoGeral.totalGeral.toFixed(1)} m
    <span class="hint">(distribuição ${proj.quantitativoGeral.categorias[0].subtotal.toFixed(1)} m +
    adutora ${proj.quantitativoGeral.categorias[1].subtotal.toFixed(1)} m +
    ligação domiciliar ${proj.quantitativoGeral.categorias[2].subtotal.toFixed(1)} m)</span>
  `;

  document.getElementById('calculo-bomba').innerHTML = `
    <strong>MEMORIAL DA ADUTORA:</strong>
    Vazão de dimensionamento: ${(proj.adut.trechos[0]?.qM3h ?? 0).toFixed(2)} m³/h —
    Altura geométrica: ${proj.adut.alturaGeometrica.toFixed(2)} m —
    Perda de carga total (com localizadas): ${proj.adut.hfTotal.toFixed(2)} m —
    <b>AMT: ${proj.adut.amt.toFixed(2)} mca</b>
  `;

  const dh = proj.disponibilidadeHidrica;
  const dispEl = document.getElementById('disponibilidade-hidrica');
  dispEl.className = 'result-summary ' + (dh.suficiente ? 'status-ok' : 'status-alerta');
  dispEl.innerHTML = `
    <strong>DISPONIBILIDADE HÍDRICA:</strong>
    Explotação do poço: ${proj.vazaoExplotacaoM3h.toFixed(2)} m³/h vs. vazão exigida: ${(proj.adut.trechos[0]?.qM3h ?? 0).toFixed(2)} m³/h
    — ${dh.suficiente ? `margem de ${dh.margemPercentual.toFixed(0)}%` : `DÉFICIT de ${Math.abs(dh.margemPercentual).toFixed(0)}% — poço não atende a demanda de projeto`}.
    <span class="hint">Vazão equivalente em regime contínuo (24h): ${proj.vazao24h.toFixed(1)} L/h.</span>
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
