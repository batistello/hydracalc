// ============================================================================
// project-storage.js
// Persistência de projetos salvos no navegador (localStorage). Não é um
// banco de dados — fica só neste navegador/computador. Por isso também
// oferecemos exportar/importar .json (project-io.js + main.js) pra levar
// o projeto entre computadores ou como backup.
// ============================================================================

const CHAVE = 'hydracalc:projetos';

function lerTodos() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) || '{}');
  } catch {
    return {};
  }
}

function salvarTodos(mapa) {
  localStorage.setItem(CHAVE, JSON.stringify(mapa));
}

export function listarProjetos() {
  const mapa = lerTodos();
  return Object.entries(mapa)
    .map(([nome, dados]) => ({ nome, salvoEm: dados._salvoEm }))
    .sort((a, b) => (b.salvoEm || '').localeCompare(a.salvoEm || ''));
}

export function salvarProjeto(nome, dados) {
  const mapa = lerTodos();
  mapa[nome] = dados;
  salvarTodos(mapa);
}

export function carregarProjetoPorNome(nome) {
  const mapa = lerTodos();
  return mapa[nome] || null;
}

export function excluirProjeto(nome) {
  const mapa = lerTodos();
  delete mapa[nome];
  salvarTodos(mapa);
}
