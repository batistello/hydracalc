// ============================================================================
// project-io.js
// Serializa todo o estado do formulário (identificação, nós, trechos,
// adutora, ligação domiciliar, acessórios, parâmetros) em um objeto plano —
// usado tanto pra salvar no navegador quanto pra exportar/importar .json.
// ============================================================================

import { COLUNAS_TRECHO, COLUNAS_ADUTORA, COLUNAS_NO, COLUNAS_ACESSORIO, lerLinhas, preencherTabela } from './tables.js';

const CAMPOS_SIMPLES = [
  'proj_cliente', 'proj_local', 'proj_municipio', 'proj_data',
  'q_hab', 'hab_res', 'id_res', 'nivel_cr',
  'adut_vol_dia', 'adut_c_poco', 'adut_c_res', 'adut_explotacao',
  'lig_comprimento', 'lig_material', 'lig_diametro', 'lig_pn',
  'param_k1', 'param_k2', 'param_horas_bomb', 'param_v_min', 'param_v_max', 'param_p_min', 'param_perc_localizadas'
];

export function serializarProjeto() {
  const dados = { _versao: 1, _salvoEm: new Date().toISOString() };

  CAMPOS_SIMPLES.forEach(id => {
    const el = document.getElementById(id);
    if (el) dados[id] = el.value;
  });

  dados.nodes = lerLinhas(document.querySelector('#table-nodes tbody'), COLUNAS_NO);
  dados.links = lerLinhas(document.querySelector('#body-dist'), COLUNAS_TRECHO);
  dados.adutora = lerLinhas(document.querySelector('#body-adut'), COLUNAS_ADUTORA);
  dados.acessorios = lerLinhas(document.querySelector('#body-acessorios'), COLUNAS_ACESSORIO);

  return dados;
}

export function carregarProjeto(dados) {
  CAMPOS_SIMPLES.forEach(id => {
    const el = document.getElementById(id);
    if (el && dados[id] !== undefined) el.value = dados[id];
  });

  preencherTabela(document.querySelector('#table-nodes tbody'), COLUNAS_NO, dados.nodes);
  preencherTabela(document.querySelector('#body-dist'), COLUNAS_TRECHO, dados.links);
  preencherTabela(document.querySelector('#body-adut'), COLUNAS_ADUTORA, dados.adutora);
  preencherTabela(document.querySelector('#body-acessorios'), COLUNAS_ACESSORIO, dados.acessorios);

  // Resultados antigos não valem mais até recalcular
  document.getElementById('resultado-geral')?.classList.add('hide');
  document.getElementById('btn-pdf').style.display = 'none';
}
