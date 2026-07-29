// ============================================================================
// pressure.js
// Verificação de pressão dinâmica mínima e pressão máxima admissível
// (comparada com a classe de pressão nominal, PN, do próprio tubo).
// ============================================================================

import { BAR_PARA_MCA } from './constants.js';

/** Converte PN (bar) em pressão máxima de trabalho aproximada (mca). */
export function pnParaMca(pn) {
  return pn * BAR_PARA_MCA;
}

/**
 * Verifica a pressão dinâmica (mca) de um ponto contra o mínimo exigido
 * e contra o limite da classe PN do trecho.
 */
export function verificarPressao(pressaoMca, pMinDinamica, pnTrecho) {
  const pMaxTrecho = pnParaMca(pnTrecho);
  const abaixoMinima = pressaoMca < pMinDinamica;
  const acimaMaxima = pressaoMca > pMaxTrecho;
  let status = 'ok';
  if (abaixoMinima) status = 'baixa';
  else if (acimaMaxima) status = 'alta';
  return { status, ok: !abaixoMinima && !acimaMaxima, pMaxTrecho };
}
