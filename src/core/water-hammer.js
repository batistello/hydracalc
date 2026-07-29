// ============================================================================
// water-hammer.js
// Verificação PRELIMINAR de golpe de aríete (fenômeno transitório).
// Esta é uma estimativa simplificada de referência (celeridade de Allievi +
// sobrepressão de Joukowsky para fechamento instantâneo). NÃO substitui uma
// análise transiente completa (ex.: método das características) exigida em
// adutoras de maior porte ou criticidade — use como triagem inicial.
// ============================================================================

const G = 9.81; // m/s²

/**
 * Celeridade da onda de pressão (m/s) — fórmula de Allievi.
 * a = 9900 / sqrt(48,3 + k * (D/e))
 * k = coeficiente tabelado por material (Azevedo Netto), consolidado na
 * prática de projetos de saneamento: Aço ≈ 0,5; Ferro Fundido ≈ 1,0;
 * Cimento-Amianto ≈ 4,4; Concreto ≈ 5,0; PVC/PEAD ≈ 18.
 * diM: diâmetro interno (m); espMm: espessura da parede (mm); k adimensional.
 */
export function celeridadeAllievi(diM, espMm, k) {
  const diMm = diM * 1000;
  return 9900 / Math.sqrt(48.3 + k * (diMm / espMm));
}

/**
 * Sobrepressão de Joukowsky (mca) para fechamento instantâneo de válvula/bomba.
 * ΔH = a * v / g
 */
export function sobrepressaoJoukowsky(celeridadeMs, velocidadeMs) {
  return (celeridadeMs * velocidadeMs) / G;
}
