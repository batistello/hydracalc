// ============================================================================
// constants.js
// Base técnica do HydraCalc. Valores marcados como "típico" são referências
// usuais da literatura de saneamento/hidráulica — SEMPRE confira a norma
// vigente (NBR 12211, NBR 12218, NBR 5626) e a concessionária local antes de
// assinar um memorial técnico com estes parâmetros.
// ============================================================================

// Coeficiente de rugosidade de Hazen-Williams (C).
// Valores típicos para tubo novo; tendem a cair com o tempo de uso (incrustação).
export const MATERIAIS = [
  { id: 'PEAD', nome: 'PEAD (Polietileno)', C: 150, E_kgf_cm2: 9000 },
  { id: 'PVC', nome: 'PVC rígido', C: 140, E_kgf_cm2: 30000 },
  { id: 'FoFo', nome: 'Ferro Fundido', C: 130, E_kgf_cm2: 1000000 },
  { id: 'ACO', nome: 'Aço Carbono', C: 120, E_kgf_cm2: 2100000 },
  { id: 'CA', nome: 'Concreto Armado', C: 130, E_kgf_cm2: 300000 }
];

export function getMaterial(id) {
  return MATERIAIS.find(m => m.id === id) || MATERIAIS[0];
}

// Diâmetros comerciais externos (mm) mais comuns em PEAD/PVC — usado como
// sugestão no seletor, mas o campo continua editável (nem todo projeto usa
// diâmetro comercial "redondo").
export const DIAMETROS_COMERCIAIS_MM = [20, 25, 32, 40, 50, 60, 75, 90, 110, 160, 200, 250, 300];

// Limite de diâmetro (mm) abaixo do qual usamos Fair-Whipple-Hsiao em vez de
// Hazen-Williams. Este é o critério prático mais usado no Brasil para ramais
// e sub-ramais prediais (NBR 5626); redes de distribuição costumam usar
// Hazen-Williams mesmo em diâmetros um pouco menores — ajuste se sua bibliografia
// de referência indicar outro corte.
export const LIMITE_FWH_MM = 50;

// Coeficientes de variação de consumo (NBR 12211 — valores típicos adotados
// na prática brasileira de saneamento). K1 = dia de maior consumo,
// K2 = hora de maior consumo.
export const K1_PADRAO = 1.2;
export const K2_PADRAO = 1.5;

// Horas de bombeamento por dia (define a vazão de dimensionamento da adutora
// de recalque a partir do volume diário). Ajustável conforme regime de
// operação real da elevatória.
export const HORAS_BOMBEAMENTO_PADRAO = 20;

// Faixa normativa de velocidade em condutos de água (m/s) — valores usuais.
export const V_MIN_PADRAO = 0.6;
export const V_MAX_PADRAO = 3.0;

// Pressão dinâmica mínima usual em rede de distribuição predial (mca).
export const P_MIN_DINAMICA_PADRAO = 10;

// Percentual de perdas de carga localizadas sobre a perda distribuída
// (simplificação usual quando não se detalha cada conexão/registro/curva).
export const PERC_PERDAS_LOCALIZADAS_PADRAO = 10;

// Conversão PN -> pressão máxima de trabalho aproximada em mca.
// PN é dado em bar; 1 bar ≈ 10,197 mca. Aplicamos também um fator de
// segurança/serviço (padrão 1,0 = sem margem extra) editável pelo usuário.
export const BAR_PARA_MCA = 10.197;
