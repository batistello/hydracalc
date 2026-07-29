// ============================================================================
// tables.js
// Gerenciamento genérico de linhas dinâmicas em tabelas de entrada.
// Cada tabela declara suas colunas (tipo + valor padrão) explicitamente,
// em vez de "adivinhar" o tipo pelo texto do cabeçalho (bug da v1.8).
// ============================================================================

import { MATERIAIS, DIAMETROS_COMERCIAIS_MM } from '../core/constants.js';

function celulaMaterial(valorPadrao) {
  const opts = MATERIAIS.map(m => `<option value="${m.id}" ${m.id === valorPadrao ? 'selected' : ''}>${m.nome}</option>`).join('');
  return `<select data-field="mat">${opts}</select>`;
}

function celulaDiametro(valorPadrao) {
  const opts = DIAMETROS_COMERCIAIS_MM.map(d => `<option value="${d}" ${d === valorPadrao ? 'selected' : ''}>${d}</option>`).join('');
  return `<select data-field="deMm">${opts}</select>`;
}

export const COLUNAS_TRECHO = [
  { field: 'de', label: 'De', tipo: 'text', padrao: '-' },
  { field: 'para', label: 'Para', tipo: 'text', padrao: '-' },
  { field: 'l', label: 'Comp. (m)', tipo: 'number', padrao: 50 },
  { field: 'mat', label: 'Material', tipo: 'material', padrao: 'PEAD' },
  { field: 'deMm', label: 'Ø Ext (mm)', tipo: 'diametro', padrao: 50 },
  { field: 'espMm', label: 'Esp. (mm)', tipo: 'number', padrao: 3.0 },
  { field: 'pn', label: 'Classe (PN, bar)', tipo: 'number', padrao: 8 },
  { field: 'c', label: 'C (H-W)', tipo: 'number', padrao: 140 },
  { field: 'ajuste', label: 'Ajuste (m)', tipo: 'number', padrao: 0 }
];

export const COLUNAS_ADUTORA = [
  { field: 'id', label: 'Trecho', tipo: 'text', padrao: 'Recalque 01' },
  { field: 'l', label: 'Comp. (m)', tipo: 'number', padrao: 250 },
  { field: 'mat', label: 'Material', tipo: 'material', padrao: 'PVC' },
  { field: 'deMm', label: 'Ø Ext (mm)', tipo: 'diametro', padrao: 60 },
  { field: 'espMm', label: 'Esp. (mm)', tipo: 'number', padrao: 3.3 },
  { field: 'pn', label: 'Classe (PN, bar)', tipo: 'number', padrao: 10 },
  { field: 'c', label: 'C (H-W)', tipo: 'number', padrao: 140 }
];

export const COLUNAS_NO = [
  { field: 'id', label: 'ID Nó', tipo: 'text', padrao: '-' },
  { field: 'cota', label: 'Cota Terreno (m)', tipo: 'number', padrao: 100 },
  { field: 'nResidencias', label: 'Nº Residências', tipo: 'number', padrao: 0 }
];

export const COLUNAS_ACESSORIO = [
  { field: 'item', label: 'Acessório', tipo: 'text', padrao: 'União PEAD' },
  { field: 'diametro', label: 'Diâmetro', tipo: 'text', padrao: '25mm' },
  { field: 'qtd', label: 'Quantidade', tipo: 'number', padrao: 1 },
  { field: 'unidade', label: 'Unid.', tipo: 'text', padrao: 'un.' }
];

function celulaPorTipo(col) {
  switch (col.tipo) {
    case 'material': return celulaMaterial(col.padrao);
    case 'diametro': return celulaDiametro(col.padrao);
    case 'text': return `<input type="text" data-field="${col.field}" value="${col.padrao}">`;
    default: return `<input type="number" data-field="${col.field}" value="${col.padrao}" step="any">`;
  }
}

export function montarCabecalho(colunas) {
  return colunas.map(c => `<th>${c.label}</th>`).join('') + '<th>Ações</th>';
}

export function montarLinha(colunas) {
  const celulas = colunas.map(c => `<td>${celulaPorTipo(c)}</td>`).join('');
  return `<tr>${celulas}<td><button type="button" class="btn-remove" data-action="remove-row">✕</button></td></tr>`;
}

export function adicionarLinha(tbody, colunas) {
  tbody.insertAdjacentHTML('beforeend', montarLinha(colunas));
}

export function lerLinhas(tbody, colunas) {
  const tipoPorCampo = Object.fromEntries(colunas.map(c => [c.field, c.tipo]));
  return Array.from(tbody.querySelectorAll('tr')).map(tr => {
    const obj = {};
    tr.querySelectorAll('[data-field]').forEach(el => {
      const tipo = tipoPorCampo[el.dataset.field];
      obj[el.dataset.field] = (tipo === 'text' || tipo === 'material') ? el.value : parseFloat(el.value);
    });
    return obj;
  });
}

export function inicializarRemocaoLinha(container) {
  container.addEventListener('click', (e) => {
    if (e.target.dataset.action === 'remove-row') {
      e.target.closest('tr').remove();
    }
  });
}
