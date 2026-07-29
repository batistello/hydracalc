// ============================================================================
// main.js — orquestração: liga UI, cálculo de engenharia e relatório PDF.
// ============================================================================

import { inicializarTabs } from './ui/tabs.js';
import {
  COLUNAS_TRECHO, COLUNAS_ADUTORA, COLUNAS_NO, COLUNAS_ACESSORIO,
  montarCabecalho, montarLinha, adicionarLinha, lerLinhas, inicializarRemocaoLinha
} from './ui/tables.js';
import { renderResultados } from './ui/render.js';
import { vazaoMediaNo_m3s, vazaoDimensionamentoDistribuicao, vazaoDimensionamentoAdutora } from './core/demand.js';
import { resolverRede } from './core/network-solver.js';
import { calcularAdutora } from './core/pumping-main.js';
import { acumularQuantitativo, consolidarQuantitativoGeral } from './core/quantities.js';
import { calcularLigacaoDomiciliar, verificarDisponibilidadeHidrica, vazaoContinua24h_Lh } from './core/service-connection.js';
import { MATERIAIS } from './core/constants.js';
import { gerarMemorialPDF } from './report/pdf-report.js';
import { serializarProjeto, carregarProjeto } from './ui/project-io.js';
import { listarProjetos, salvarProjeto, carregarProjetoPorNome, excluirProjeto } from './ui/project-storage.js';

inicializarTabs(document);

// Data padrão = hoje
document.getElementById('proj_data').value = new Date().toISOString().slice(0, 10);

// Select de material da ligação domiciliar
document.getElementById('lig_material').innerHTML = MATERIAIS.map(m => `<option value="${m.id}" ${m.id === 'PEAD' ? 'selected' : ''}>${m.nome}</option>`).join('');

// --- Monta cabeçalhos e linha inicial das tabelas dinâmicas ---
document.querySelector('#table-links thead').innerHTML = `<tr>${montarCabecalho(COLUNAS_TRECHO)}</tr>`;
document.querySelector('#body-dist').innerHTML = montarLinha(COLUNAS_TRECHO);

document.querySelector('#table-adutora thead').innerHTML = `<tr>${montarCabecalho(COLUNAS_ADUTORA)}</tr>`;
document.querySelector('#body-adut').innerHTML = montarLinha(COLUNAS_ADUTORA);

document.querySelector('#table-acessorios thead').innerHTML = `<tr>${montarCabecalho(COLUNAS_ACESSORIO)}</tr>`;

inicializarRemocaoLinha(document.querySelector('#table-nodes tbody'));
inicializarRemocaoLinha(document.querySelector('#body-dist'));
inicializarRemocaoLinha(document.querySelector('#body-adut'));
inicializarRemocaoLinha(document.querySelector('#body-acessorios'));

document.getElementById('btn-add-node').addEventListener('click', () => adicionarLinha(document.querySelector('#table-nodes tbody'), COLUNAS_NO));
document.getElementById('btn-add-link').addEventListener('click', () => adicionarLinha(document.querySelector('#body-dist'), COLUNAS_TRECHO));
document.getElementById('btn-add-adut').addEventListener('click', () => adicionarLinha(document.querySelector('#body-adut'), COLUNAS_ADUTORA));
document.getElementById('btn-add-acessorio').addEventListener('click', () => adicionarLinha(document.querySelector('#body-acessorios'), COLUNAS_ACESSORIO));

document.getElementById('btn-sugerir-hidrometros').addEventListener('click', () => {
  const totalResidencias = lerLinhas(document.querySelector('#table-nodes tbody'), COLUNAS_NO)
    .reduce((soma, n) => soma + (n.nResidencias || 0), 0);
  const tbody = document.querySelector('#body-acessorios');
  const jaTemHidrometro = Array.from(tbody.querySelectorAll('[data-field="item"]')).some(el => el.value.toLowerCase().includes('hidrômetro'));
  if (jaTemHidrometro) {
    alert('Já existe uma linha de hidrômetro na tabela de acessórios — ajuste a quantidade manualmente se necessário.');
    return;
  }
  adicionarLinha(tbody, COLUNAS_ACESSORIO);
  const ultimaLinha = tbody.lastElementChild;
  ultimaLinha.querySelector('[data-field="item"]').value = 'Hidrômetro + kit';
  ultimaLinha.querySelector('[data-field="diametro"]').value = '3/4"';
  ultimaLinha.querySelector('[data-field="qtd"]').value = totalResidencias;
  ultimaLinha.querySelector('[data-field="unidade"]').value = 'un.';
});

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
    m: t.de, j: t.para, l: t.l, mat: t.mat, deMm: t.deMm, espMm: t.espMm, pn: t.pn, c: t.c, ajuste: t.ajuste, obs: t.obs,
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

  // --- Ligação domiciliar ---
  const totalResidencias = nodesInput.reduce((soma, n) => soma + (n.nResidencias || 0), 0);
  const ligacaoDomiciliar = calcularLigacaoDomiciliar({
    totalResidencias,
    comprimentoPadraoM: parseFloat(document.getElementById('lig_comprimento').value),
    material: document.getElementById('lig_material').value,
    deMm: parseFloat(document.getElementById('lig_diametro').value),
    pn: parseFloat(document.getElementById('lig_pn').value)
  });

  // --- Disponibilidade hídrica ---
  const vazaoExplotacaoM3h = parseFloat(document.getElementById('adut_explotacao').value);
  const disponibilidadeHidrica = verificarDisponibilidadeHidrica({
    vazaoExplotacaoM3h,
    vazaoDimensionamentoM3h: qM3h
  });
  const vazao24h = vazaoContinua24h_Lh(volDiaM3);

  // --- Acessórios ---
  const acessorios = lerLinhas(document.querySelector('#body-acessorios'), COLUNAS_ACESSORIO);

  // --- Quantitativo consolidado ---
  const quantitativoGeral = consolidarQuantitativoGeral({ quantDist, quantAdut, ligacaoDomiciliar });

  const proj = {
    identificacao: {
      cliente: document.getElementById('proj_cliente').value,
      local: document.getElementById('proj_local').value,
      municipio: document.getElementById('proj_municipio').value,
      data: document.getElementById('proj_data').value
    },
    nodes: nodesResolvidos,
    links: linksResolvidos,
    adut: resultadoAdutora,
    quantDist,
    quantAdut,
    ligacaoDomiciliar,
    disponibilidadeHidrica,
    vazaoExplotacaoM3h,
    vazao24h,
    acessorios,
    quantitativoGeral,
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

// --- Projetos salvos (localStorage do navegador) ---

function atualizarListaProjetos() {
  const select = document.getElementById('lista-projetos');
  const projetos = listarProjetos();
  select.innerHTML = '<option value="">— selecionar —</option>' +
    projetos.map(p => `<option value="${p.nome}">${p.nome}</option>`).join('');
}
atualizarListaProjetos();

document.getElementById('btn-salvar-projeto').addEventListener('click', () => {
  const nomeSugerido = document.getElementById('proj_cliente').value || 'Projeto sem nome';
  const nome = prompt('Nome pra salvar este projeto:', nomeSugerido);
  if (!nome) return;
  salvarProjeto(nome, serializarProjeto());
  atualizarListaProjetos();
  document.getElementById('lista-projetos').value = nome;
  alert(`Projeto "${nome}" salvo neste navegador. Lembre-se: isso não sai deste computador/navegador — use "Exportar .json" se quiser um backup ou levar pra outro lugar.`);
});

document.getElementById('btn-carregar-projeto').addEventListener('click', () => {
  const nome = document.getElementById('lista-projetos').value;
  if (!nome) { alert('Selecione um projeto na lista primeiro.'); return; }
  const dados = carregarProjetoPorNome(nome);
  if (!dados) { alert('Projeto não encontrado.'); return; }
  carregarProjeto(dados);
  alert(`Projeto "${nome}" carregado. Clique em "Calcular Projeto" pra gerar os resultados.`);
});

document.getElementById('btn-excluir-projeto').addEventListener('click', () => {
  const nome = document.getElementById('lista-projetos').value;
  if (!nome) { alert('Selecione um projeto na lista primeiro.'); return; }
  if (!confirm(`Excluir o projeto "${nome}" salvo neste navegador? Essa ação não pode ser desfeita.`)) return;
  excluirProjeto(nome);
  atualizarListaProjetos();
});

document.getElementById('btn-exportar-projeto').addEventListener('click', () => {
  const dados = serializarProjeto();
  const nomeArquivo = (document.getElementById('proj_cliente').value || 'projeto_hydracalc').replace(/[^a-z0-9]+/gi, '_');
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nomeArquivo}.hydracalc.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('btn-importar-projeto').addEventListener('click', () => {
  document.getElementById('input-importar-projeto').click();
});

document.getElementById('input-importar-projeto').addEventListener('change', (e) => {
  const arquivo = e.target.files[0];
  if (!arquivo) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const dados = JSON.parse(reader.result);
      carregarProjeto(dados);
      alert('Projeto importado. Clique em "Calcular Projeto" pra gerar os resultados. Use "Salvar Projeto" se quiser guardá-lo neste navegador também.');
    } catch (err) {
      alert('Não consegui ler esse arquivo como projeto do HydraCalc: ' + err.message);
    }
  };
  reader.readAsText(arquivo);
  e.target.value = '';
});
