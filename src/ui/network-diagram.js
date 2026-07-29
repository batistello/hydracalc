// ============================================================================
// network-diagram.js
// Desenha um esquema em árvore da rede de distribuição: cada nó posicionado
// por nível (distância topológica ao reservatório), cada trecho colorido
// conforme o status de verificação (velocidade/pressão).
// ============================================================================

const COLOR_OK = 'var(--ok)';
const COLOR_ALERTA = 'var(--alerta)';
const COLOR_LINE = 'var(--line-muted)';

function calcularNiveis(nodes, links, idRaiz) {
  const niveis = {};
  const filhosPorNo = {};
  links.forEach(l => {
    (filhosPorNo[l.m] ||= []).push(l.j);
  });

  const fila = [[idRaiz, 0]];
  const visitados = new Set();
  while (fila.length) {
    const [id, nivel] = fila.shift();
    if (visitados.has(id)) continue;
    visitados.add(id);
    niveis[id] = nivel;
    (filhosPorNo[id] || []).forEach(filho => fila.push([filho, nivel + 1]));
  }
  return niveis;
}

export function renderNetworkDiagram({ nodes, links, idReservatorio, statusPorTrecho }) {
  if (!nodes[idReservatorio]) {
    return '<div class="diagram-empty">Cadastre o reservatório e calcule o projeto para ver o esquema da rede.</div>';
  }

  const niveis = calcularNiveis(nodes, links, idReservatorio);
  const porNivel = {};
  Object.entries(niveis).forEach(([id, nivel]) => {
    (porNivel[nivel] ||= []).push(id);
  });

  const colWidth = 160;
  const rowHeight = 70;
  const maxNivel = Math.max(0, ...Object.values(niveis));
  const maxLinhas = Math.max(1, ...Object.values(porNivel).map(a => a.length));
  const width = (maxNivel + 1) * colWidth + 80;
  const height = maxLinhas * rowHeight + 60;

  const pos = {};
  Object.entries(porNivel).forEach(([nivel, ids]) => {
    const n = Number(nivel);
    const offsetY = (height - (ids.length - 1) * rowHeight) / 2;
    ids.forEach((id, i) => {
      pos[id] = { x: 40 + n * colWidth, y: offsetY + i * rowHeight };
    });
  });

  let svgLinks = '';
  let svgNodes = '';

  links.forEach(l => {
    if (!pos[l.m] || !pos[l.j]) return;
    const a = pos[l.m], b = pos[l.j];
    const status = statusPorTrecho?.[`${l.m}-${l.j}`] || 'neutro';
    const cor = status === 'alerta' ? COLOR_ALERTA : status === 'ok' ? COLOR_OK : COLOR_LINE;
    const midX = (a.x + b.x) / 2;
    svgLinks += `
      <path d="M ${a.x} ${a.y} L ${midX} ${a.y} L ${midX} ${b.y} L ${b.x} ${b.y}"
            stroke="${cor}" stroke-width="2.5" fill="none" />
      <text x="${midX}" y="${(a.y + b.y) / 2 - 6}" class="diagram-label">${l.l}m</text>
    `;
  });

  Object.entries(pos).forEach(([id, p]) => {
    const isReservatorio = id === idReservatorio;
    svgNodes += `
      <g class="diagram-node ${isReservatorio ? 'is-reservoir' : ''}">
        <circle cx="${p.x}" cy="${p.y}" r="${isReservatorio ? 14 : 9}" />
        <text x="${p.x}" y="${p.y - (isReservatorio ? 22 : 16)}" class="diagram-node-label">${id}</text>
      </g>
    `;
  });

  return `
    <svg viewBox="0 0 ${width} ${height}" class="network-diagram-svg" xmlns="http://www.w3.org/2000/svg">
      ${svgLinks}
      ${svgNodes}
    </svg>
  `;
}
