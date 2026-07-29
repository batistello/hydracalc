// ============================================================================
// tabs.js
// Troca de abas via data-attribute — corrige a v1.8, que identificava a aba
// ativa lendo o texto do botão (quebrava se o rótulo mudasse de idioma/texto).
// ============================================================================

export function inicializarTabs(root) {
  const botoes = root.querySelectorAll('[data-tab-target]');
  botoes.forEach(botao => {
    botao.addEventListener('click', () => {
      const alvo = botao.dataset.tabTarget;
      root.querySelectorAll('[data-tab-panel]').forEach(panel => {
        panel.classList.toggle('hide', panel.dataset.tabPanel !== alvo);
      });
      botoes.forEach(b => b.classList.toggle('active', b === botao));
    });
  });
}
