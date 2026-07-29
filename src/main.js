// ============================================================================
// main.js — orquestração: liga UI, cálculo de engenharia e relatório PDF.
// ============================================================================

import { inicializarTabs } from './ui/tabs.js';
import {
  COLUNAS_TRECHO, COLUNAS_ADUTORA, COLUNAS_NO,
  montarCabecalho, montarLinha, adicionarLinha, lerLinhas, inicializarRemocaoLinha
} from './ui/tables.js';
import { renderResultados } from './ui/render.js';
import { vazaoMediaNo_m3s, vazaoDimensionamentoDistribuicao, vazaoDimensionamentoAdutora } from './core/demand.js';
import { resolverRede } from './core/network-solver.js';
import { calcularAdutora } from './core/pumping-main.js';
import { acumularQuantitativo } from './core/quantities.js';
import { gerarMemorialPDF } from './report/pdf-report.js';

inicializarTabs(document);

// --- Monta cabeçalhos e linha inicial das tabelas dinâmicas ---
document.querySelector('#table-links thead').innerHTML = `<tr>${montarCabecalho(COLUNAS_TRECHO)}</tr>`;
document.querySelector('#body-dist').innerHTML = montarLinha(COLUNAS_TRECHO);

document.querySelector('#table-adutora thead').innerHTML = `<tr>${montarCabecalho(COLUNAS_ADUTORA)}</tr>`;
document.querySelector('#body-adut').innerHTML = montarLinha(COLUNAS_ADUTORA);

inicializarRemocaoLinha(document.querySelector('#table-nodes tbody'));
inicializarRemocaoLinha(document.querySelector('#body-dist'));
inicializarRemocaoLinha(document.querySelector('#body-adut'));

document.getElementById('btn-add-node').addEventListener('click', () => adicionarLinha(document.querySelector('#table-nodes tbody'), COLUNAS_NO));
document.getElementById('btn-add-link').addEventListener('click', () => adicionarLinha(document.querySelector('#body-dist'), COLUNAS_TRECHO));
document.getElementById('btn-add-adut').addEventListener('click', () => adicionarLinha(document.querySelector('#body-adut'), COLUNAS_ADUTORA));

let ultimoProjeto = null;
let ultimosParametros = null;

function lerParametros() {
  return {
    k1: parseFloat(document.getElementById('param_k1').value),
    k2: parseFloat(document.getElementById('param_k2').value),
    horasBombeamento: parseFloat(document.getElementById('param_horas_bomb').value),
    vMin: parseFloat(document.getElementById('param_v_min').value),
    vMax: parseFloat(document.getElementById('param_v_max').value),
    pMinDinamica: parseFloat(document.getElementById('param_p_min').value),
    percLocalizadas: parseFloat(document.getElementById('param_perc_localizadas').value)
  };
}

function processarProjeto() {
  const parametros = lerParametros();

  const qHab = parseFloat(document.getElementById('q_hab').value);
  const habRes = parseFloat(document.getElementById('hab_res').value);
  const idRes = document.getElementById('id_res').value;
  const nivelCr = parseFloat(document.getElementById('nivel_cr').value);

  // --- Nós (aplicando K1*K2 na vazão de dimensionamento de cada nó) ---
  const nodesInput = lerLinhas(document.querySelector('#table-nodes tbody'), COLUNAS_NO);
  const nodes = {};
  nodesInput.forEach(n => {
    const qMedia = vazaoMediaNo_m3s(qHab, habRes, n.nResidencias);
    nodes[n.id] = {
      id: n.id,
      cota: n.cota,
      marcha: vazaoDimensionamentoDistribuicao(qMedia, parametros.k1, parametros.k2),
      h: 0
    };
  });

  // --- Trechos de distribuição ---
  const links = lerLinhas(document.querySelector('#body-dist'), COLUNAS_TRECHO).map(t => ({
    m: t.de, j: t.para, l: t.l, mat: t.mat, deMm: t.deMm, espMm: t.espMm, pn: t.pn, c: t.c, ajuste: t.ajuste,
    q_jus: 0, q_mar: 0, q_mon: 0, q_fic: 0, v: 0, hf: 0, cp_m: 0, cp_j: 0, p_m: 0, p_j: 0
  }));

  // Aviso (não bloqueia o cálculo): trecho aponta pra um nó que não foi
  // cadastrado na tabela "Cadastro de Nós" — o sistema trata a demanda desse
  // nó como zero, o que silenciosamente zera a vazão de toda a rede a
  // jusante dele. Melhor avisar do que deixar passar batido.
  const idsNaoCadastrados = new Set();
  links.forEach(l => {
    if (!nodes[l.m]) idsNaoCadastrados.add(l.m);
    if (!nodes[l.j]) idsNaoCadastrados.add(l.j);
  });
  if (idsNaoCadastrados.size > 0) {
    alert(
      `Atenção: os seguintes IDs aparecem em trechos mas não foram cadastrados na tabela "Cadastro de Nós": ${[...idsNaoCadastrados].join(', ')}.\n\n` +
      `Sem cadastro, o sistema assume cota e demanda ZERO para esses nós — isso zera a vazão de qualquer trecho a jusante deles. Cadastre-os na tabela de nós se eles têm residências/cota real.`
    );
  }

  const { nodes: nodesResolvidos, links: linksResolvidos } = resolverRede({
    nodes, links, idReservatorio: idRes, nivelReservatorio: nivelCr, percLocalizadas: parametros.percLocalizadas
  });

  const quantDist = acumularQuantitativo(linksResolvidos);

  // --- Adutora: vazão de dimensionamento a partir do volume diário / horas de bombeamento ---
  const volDiaM3 = parseFloat(document.getElementById('adut_vol_dia').value);
  const qMediaDiaria = volDiaM3 / 86400;
  const qM3s = vazaoDimensionamentoAdutora(qMediaDiaria, parametros.k1, parametros.horasBombeamento);
  const qM3h = qM3s * 3600;

  const trechosAdutInput = lerLinhas(document.querySelector('#body-adut'), COLUNAS_ADUTORA);
  const cotaPoco = parseFloat(document.getElementById('adut_c_poco').value);
  const cotaRes = parseFloat(document.getElementById('adut_c_res').value);

  const resultadoAdutora = calcularAdutora({
    trechos: trechosAdutInput,
    qM3s, qM3h,
    cotaPoco, cotaReservatorio: cotaRes,
    percLocalizadas: parametros.percLocalizadas,
    limites: { vMin: parametros.vMin, vMax: parametros.vMax }
  });

  const quantAdut = acumularQuantitativo(resultadoAdutora.trechos);

  const proj = {
    nodes: nodesResolvidos,
    links: linksResolvidos,
    adut: resultadoAdutora,
    quantDist,
    quantAdut,
    idReservatorio: idRes
  };

  ultimoProjeto = proj;
  ultimosParametros = parametros;

  renderResultados({ proj, limites: parametros });
}

document.getElementById('btn-calcular').addEventListener('click', () => {
  try {
    processarProjeto();
  } catch (err) {
    alert('Erro ao calcular o projeto: ' + err.message);
    console.error(err);
  }
});

document.getElementById('btn-pdf').addEventListener('click', () => {
  if (!ultimoProjeto) return;
  gerarMemorialPDF({ proj: ultimoProjeto, parametros: ultimosParametros });
});
