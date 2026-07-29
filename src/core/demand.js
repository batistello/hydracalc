// ============================================================================
// demand.js
// Cálculo de vazões de dimensionamento a partir do consumo per capita,
// aplicando os coeficientes de variação de consumo (K1, K2).
// ============================================================================

/**
 * Vazão média de um nó (m³/s) a partir do consumo per capita.
 * qHabDiaL: consumo em L/hab/dia
 * habPorResidencia: número médio de habitantes por residência/economia
 * nResidencias: número de residências/economias atendidas pelo nó
 */
export function vazaoMediaNo_m3s(qHabDiaL, habPorResidencia, nResidencias) {
  const litrosPorDia = qHabDiaL * habPorResidencia * nResidencias;
  return litrosPorDia / 86_400_000; // 1000 L/m³ * 86400 s/dia
}

/**
 * Vazão de dimensionamento da rede de distribuição, na hora de maior
 * consumo do dia de maior consumo: Qdim = Qmed * K1 * K2
 */
export function vazaoDimensionamentoDistribuicao(qMedia_m3s, k1, k2) {
  return qMedia_m3s * k1 * k2;
}

/**
 * Vazão de dimensionamento da adutora de recalque: o volume do dia de maior
 * consumo (Qmedia * K1) precisa ser bombeado em um número reduzido de horas
 * por dia (regime de operação da elevatória), daí o fator 24/horasBombeamento.
 */
export function vazaoDimensionamentoAdutora(qMediaDiaria_m3s, k1, horasBombeamento) {
  return qMediaDiaria_m3s * k1 * (24 / horasBombeamento);
}
