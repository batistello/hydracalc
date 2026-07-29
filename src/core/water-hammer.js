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
 * k = 10^10 / E, com E = módulo de elasticidade do material em kgf/m².
 * Os catálogos de material costumam informar E em kgf/cm² — por isso
 * convertemos aqui (1 kgf/cm² = 10.000 kgf/m²) em vez de exigir que quem
 * cadastra o material já saiba fazer essa conversão.
 * diM: diâmetro interno (m); espMm: espessura da parede (mm).
 */
export function celeridadeAllievi(diM, espMm, eKgfCm2) {
  const eKgfM2 = eKgfCm2 * 1e4;
  const diMm = diM * 1000;
  const k = 1e10 / eKgfM2;
  return 9900 / Math.sqrt(48.3 + k * (diMm / espMm));
}

/**
 * Sobrepressão de Joukowsky (mca) para fechamento instantâneo de válvula/bomba.
 * ΔH = a * v / g
 */
export function sobrepressaoJoukowsky(celeridadeMs, velocidadeMs) {
  return (celeridadeMs * velocidadeMs) / G;
}
