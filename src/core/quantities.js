// ============================================================================
// quantities.js
// Quantitativo de materiais por especificação (material + diâmetro + PN).
// ============================================================================

export function acumularQuantitativo(itens, lengthKey = 'l') {
  const acc = {};
  itens.forEach(item => {
    const key = `${item.mat} DE ${item.deMm}mm PN ${item.pn}`;
    acc[key] = (acc[key] || 0) + item[lengthKey];
  });
  return acc;
}
