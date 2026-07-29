// ============================================================================
// pumping-main.js
// Cálculo da linha adutora de recalque: perda de carga por trecho, AMT
// (altura manométrica total) e verificação preliminar de golpe de aríete.
// ============================================================================

import { diametroInterno_m, velocidade_ms, calcularPerdaDistribuida, aplicarPerdasLocalizadas, verificarVelocidade } from './pipe-hydraulics.js';
import { celeridadeAllievi, sobrepressaoJoukowsky } from './water-hammer.js';
import { getMaterial } from './constants.js';

/**
 * @param {Array} trechos - [{ id, l, mat, deMm, espMm, pn, c }]
 * @param {number} qM3s - vazão de dimensionamento da adutora (m³/s)
 * @param {number} qM3h - vazão de dimensionamento (m³/h), só para exibição
 * @param {number} cotaPoco, cotaReservatorio - cotas geométricas (m)
 * @param {number} percLocalizadas
 * @param {Object} limites - { vMin, vMax }
 */
export function calcularAdutora({ trechos, qM3s, qM3h, cotaPoco, cotaReservatorio, percLocalizadas, limites }) {
  let hfTotal = 0;
  const resultados = trechos.map(t => {
    const diM = diametroInterno_m(t.deMm, t.espMm);
    const v = velocidade_ms(qM3s, diM);
    const { hf, formula } = calcularPerdaDistribuida({ qM3s, lM: t.l, cCoef: t.c, diM, deMm: t.deMm });
    const { hfLocalizada, hfTotal: hfTrecho } = aplicarPerdasLocalizadas(hf, percLocalizadas);
    const velocidadeCheck = verificarVelocidade(v, limites.vMin, limites.vMax);

    const material = getMaterial(t.mat);
    const celeridade = celeridadeAllievi(diM, t.espMm, material.E_kgf_cm2);
    const sobrepressao = sobrepressaoJoukowsky(celeridade, v);

    hfTotal += hfTrecho;

    return {
      ...t, di: diM, v, hf: hfTrecho, hfDistribuida: hf, hfLocalizada, formulaUsada: formula,
      velocidadeCheck, celeridade, sobrepressao, qM3h
    };
  });

  const alturaGeometrica = cotaReservatorio - cotaPoco;
  const amt = alturaGeometrica + hfTotal;

  return { trechos: resultados, hfTotal, alturaGeometrica, amt };
}
