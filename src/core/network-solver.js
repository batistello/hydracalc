// ============================================================================
// network-solver.js
// Resolução de rede RAMIFICADA (topologia em árvore, sem anéis/loops) pelo
// método da vazão fictícia: cada nó tem uma demanda concentrada; cada trecho
// carrega a vazão de todos os nós a jusante (q_jusante) mais a demanda do
// próprio nó de jusante (q_marcha); a vazão fictícia (q_fic = q_jusante +
// q_marcha/2) aproxima o efeito de uma demanda distribuída ao longo do tubo
// para fins de cálculo de perda de carga.
//
// Limitação conhecida (documentar no memorial): este método NÃO resolve
// redes malhadas (com anéis). Para redes com anéis, seria necessário Hardy-
// Cross ou um método de elementos finitos hidráulico — fora do escopo atual.
// ============================================================================

import { diametroInterno_m, velocidade_ms, calcularPerdaDistribuida, aplicarPerdasLocalizadas } from './pipe-hydraulics.js';

/**
 * @param {Object} nodes - mapa id -> { id, cota, marcha (m³/s) }
 * @param {Array} links - lista de trechos { m, j, l, mat, deMm, espMm, pn, c, ajuste }
 * @param {string} idReservatorio
 * @param {number} nivelReservatorio - lâmina d'água acima da cota do reservatório (m)
 * @param {number} percLocalizadas - % de perdas localizadas sobre a distribuída
 * @returns {Object} nodes e links atualizados com vazões, hf, cota piezométrica e pressão
 */
export function resolverRede({ nodes, links, idReservatorio, nivelReservatorio, percLocalizadas }) {
  // 1) Vazões (recursivo, assume árvore — sem ciclos)
  function resolverVazao(id, visitados) {
    if (visitados.has(id)) {
      throw new Error(`Loop detectado na rede envolvendo o nó "${id}". Este solver só suporta redes ramificadas (sem anéis).`);
    }
    visitados.add(id);
    let soma = nodes[id] ? nodes[id].marcha : 0;
    links.filter(l => l.m === id).forEach(l => {
      l.q_mar = nodes[l.j] ? nodes[l.j].marcha : 0;
      l.q_jus = resolverVazao(l.j, visitados);
      l.q_mon = l.q_jus + l.q_mar;
      l.q_fic = l.q_jus + l.q_mar / 2;
      soma += l.q_mon;
    });
    visitados.delete(id);
    return soma;
  }

  if (nodes[idReservatorio]) {
    resolverVazao(idReservatorio, new Set());
  }

  // 2) Perda de carga, velocidade e propagação de cota piezométrica (BFS a partir do reservatório)
  if (nodes[idReservatorio]) {
    nodes[idReservatorio].h = nodes[idReservatorio].cota + nivelReservatorio;
    const fila = [idReservatorio];
    while (fila.length > 0) {
      const u = fila.shift();
      links.filter(l => l.m === u).forEach(l => {
        const diM = diametroInterno_m(l.deMm, l.espMm);

        if (l.q_fic > 0) {
          l.v = velocidade_ms(l.q_mon, diM);
          const { hf, formula } = calcularPerdaDistribuida({ qM3s: l.q_fic, lM: l.l, cCoef: l.c, diM, deMm: l.deMm });
          const { hfLocalizada, hfTotal } = aplicarPerdasLocalizadas(hf, percLocalizadas);
          l.hfDistribuida = hf;
          l.hfLocalizada = hfLocalizada;
          l.hf = hfTotal;
          l.formulaUsada = formula;
        } else {
          l.v = 0; l.hf = 0; l.hfDistribuida = 0; l.hfLocalizada = 0; l.formulaUsada = '-';
        }

        l.cp_m = nodes[u].h;
        l.cp_j = l.cp_m - l.hf + (l.ajuste || 0);

        if (nodes[l.j]) {
          nodes[l.j].h = l.cp_j;
          l.p_m = l.cp_m - nodes[l.m].cota;
          l.p_j = l.cp_j - nodes[l.j].cota;
          fila.push(l.j);
        }
      });
    }
  }

  return { nodes, links };
}
