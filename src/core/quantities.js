// ============================================================================
// quantities.js
// Quantitativo de materiais por especificação (material + diâmetro + PN).
// ============================================================================

export function acumularQuantitativo(itens, lengthKey = 'l') {
  const acc = {};
  itens.forEach(item => {
    const key = `${item.mat} DE ${item.deMm}mm PN ${item.pn}`;
    acc[key] = (acc[key] || 0) + item[lengthKey];
  });
  return acc;
}

/**
 * Consolida o quantitativo por categoria (Distribuição / Adutora / Ligação
 * Domiciliar), com subtotal por categoria e total geral da rede — no mesmo
 * formato que um memorial de saneamento tradicional apresenta.
 */
export function consolidarQuantitativoGeral({ quantDist, quantAdut, ligacaoDomiciliar }) {
  const subtotalDist = Object.values(quantDist).reduce((a, b) => a + b, 0);
  const subtotalAdut = Object.values(quantAdut).reduce((a, b) => a + b, 0);
  const subtotalLigacao = ligacaoDomiciliar.comprimentoTotal;
  const totalGeral = subtotalDist + subtotalAdut + subtotalLigacao;

  return {
    categorias: [
      { nome: 'Rede de Distribuição', itens: quantDist, subtotal: subtotalDist },
      { nome: 'Rede Adutora', itens: quantAdut, subtotal: subtotalAdut },
      { nome: 'Ligação Domiciliar', itens: { [ligacaoDomiciliar.especificacao]: subtotalLigacao }, subtotal: subtotalLigacao }
    ],
    totalGeral
  };
}
