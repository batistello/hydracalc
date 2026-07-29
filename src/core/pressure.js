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

/**
 * Verificação GRADUADA da pressão mínima em um ponto específico, contra o
 * limite mínimo definido para AQUELE nó (não um valor único global — cada
 * ponto da rede pode ter uma exigência diferente).
 *
 * Severidade (percentual da pressão mínima exigida no nó):
 *   >= 100%           -> ok       (verde)
 *   70% a 100%        -> amarelo  (abaixo do mínimo, mas próximo)
 *   40% a 70%          -> laranja  (bem abaixo do mínimo)
 *   < 40%              -> vermelho (crítico — indica necessidade de ajuste)
 */
export function verificarPressaoGraduada(pressaoMca, pMinNo) {
  if (!pMinNo || pMinNo <= 0) return { status: 'ok', percentual: null };
  const percentual = (pressaoMca / pMinNo) * 100;
  let status;
  if (percentual >= 100) status = 'ok';
  else if (percentual >= 70) status = 'amarelo';
  else if (percentual >= 40) status = 'laranja';
  else status = 'vermelho';
  return { status, percentual };
}
