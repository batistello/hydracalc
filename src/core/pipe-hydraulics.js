// ============================================================================
// pipe-hydraulics.js
// Fórmulas de perda de carga distribuída e verificação de velocidade/pressão.
// Todas as funções trabalham em unidades SI: vazão em m³/s, diâmetro em m,
// comprimento em m. A conversão para L/s ou mm acontece só na camada de UI.
// ============================================================================

import { LIMITE_FWH_MM } from './constants.js';

/** Diâmetro interno (m) a partir do diâmetro externo e espessura, em mm. */
export function diametroInterno_m(deMm, espMm) {
  const di = (deMm - 2 * espMm) / 1000;
  if (!(di > 0)) {
    throw new Error(`Diâmetro interno inválido (Ø ext=${deMm}mm, esp=${espMm}mm resulta em Di<=0)`);
  }
  return di;
}

/** Área da seção (m²) a partir do diâmetro interno (m). */
export function areaSecao_m2(diM) {
  return Math.PI * Math.pow(diM, 2) / 4;
}

/** Velocidade (m/s) a partir da vazão (m³/s) e diâmetro interno (m). */
export function velocidade_ms(qM3s, diM) {
  return qM3s / areaSecao_m2(diM);
}

/**
 * Perda de carga distribuída — Hazen-Williams.
 * hf = 10,67 * L * Q^1.852 / (C^1.852 * D^4.87)
 * Q em m³/s, D em m, L em m. Válida principalmente para condutos de
 * diâmetro médio/grande (Ø >= ~50mm nesta aplicação).
 */
export function hfHazenWilliams(qM3s, lM, cCoef, diM) {
  return 10.67 * lM * Math.pow(Math.abs(qM3s), 1.852) / (Math.pow(cCoef, 1.852) * Math.pow(diM, 4.87));
}

/**
 * Perda de carga distribuída — Fair-Whipple-Hsiao.
 * J = 8,69 * Q^1.75 * D^-4.75 (perda unitária, m/m) -> hf = J * L
 * Fórmula adotada pela NBR 5626 para tubulações prediais de água fria,
 * tipicamente aplicada a diâmetros menores (< 50mm). O coeficiente 8,69 é
 * calibrado para tubos lisos (PVC/cobre) — confirme aplicabilidade para
 * outros materiais.
 */
export function hfFairWhippleHsiao(qM3s, lM, diM) {
  const j = 8.69 * Math.pow(Math.abs(qM3s), 1.75) * Math.pow(diM, -4.75);
  return j * lM;
}

/**
 * Calcula a perda de carga distribuída escolhendo automaticamente a fórmula
 * conforme o diâmetro externo do trecho, e retorna também qual fórmula foi
 * usada (para deixar isso explícito no memorial — nada de "caixa preta").
 */
export function calcularPerdaDistribuida({ qM3s, lM, cCoef, diM, deMm }) {
  const usaFWH = deMm < LIMITE_FWH_MM;
  const hf = usaFWH
    ? hfFairWhippleHsiao(qM3s, lM, diM)
    : hfHazenWilliams(qM3s, lM, cCoef, diM);
  return { hf, formula: usaFWH ? 'Fair-Whipple-Hsiao' : 'Hazen-Williams' };
}

/** Aplica o percentual de perdas localizadas sobre a perda distribuída. */
export function aplicarPerdasLocalizadas(hfDistribuida, percLocalizadas) {
  const hfLocalizada = hfDistribuida * (percLocalizadas / 100);
  return { hfLocalizada, hfTotal: hfDistribuida + hfLocalizada };
}

/** Verificação de velocidade contra faixa admissível. */
export function verificarVelocidade(vMs, vMin, vMax) {
  if (vMs < vMin) return { status: 'baixa', ok: false };
  if (vMs > vMax) return { status: 'alta', ok: false };
  return { status: 'ok', ok: true };
}
