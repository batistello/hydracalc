// ============================================================================
// service-connection.js
// Ligação domiciliar (ramal do tubo principal até o cavalete de cada economia)
// e verificação de disponibilidade hídrica (vazão de explotação do poço vs.
// vazão de dimensionamento exigida pelo projeto).
// ============================================================================

/**
 * Comprimento total de ligação domiciliar = nº de economias × comprimento
 * padrão por ligação (prática usual: um pequeno ramal do tubo principal até
 * o cavalete de cada residência).
 */
export function calcularLigacaoDomiciliar({ totalResidencias, comprimentoPadraoM, material, deMm, pn }) {
  const comprimentoTotal = totalResidencias * comprimentoPadraoM;
  return {
    totalResidencias,
    comprimentoPadraoM,
    comprimentoTotal,
    especificacao: `${material} DE ${deMm}mm PN ${pn}`
  };
}

/**
 * Verifica se o poço/manancial tem capacidade (explotação) suficiente para
 * atender a vazão de dimensionamento do projeto.
 */
export function verificarDisponibilidadeHidrica({ vazaoExplotacaoM3h, vazaoDimensionamentoM3h }) {
  const margemPercentual = ((vazaoExplotacaoM3h - vazaoDimensionamentoM3h) / vazaoDimensionamentoM3h) * 100;
  return {
    suficiente: vazaoExplotacaoM3h >= vazaoDimensionamentoM3h,
    margemPercentual
  };
}

/**
 * Vazão média necessária se o sistema operasse em regime contínuo (24h/dia),
 * métrica complementar usada para dimensionar reservatório/fonte mesmo
 * quando o bombeamento real ocorre em menos horas.
 */
export function vazaoContinua24h_Lh(volumeDiarioM3) {
  return (volumeDiarioM3 * 1000) / 24;
}
