// ============================================================================
// pdf-report.js
// Geração do memorial técnico em PDF. Corrige o bug da v1.8 (doc.save()
// chamado duas vezes, baixando o arquivo incompleto na primeira vez).
// Todas as notas técnicas do rodapé refletem o que foi REALMENTE calculado
// (fórmulas escolhidas por trecho, K1/K2 aplicados, % de perdas localizadas).
// ============================================================================

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export function gerarMemorialPDF({ proj, parametros }) {
  const doc = new jsPDF('l', 'mm', 'a4');

  doc.setFontSize(14);
  doc.text('MEMORIAL TÉCNICO DE CÁLCULO HIDRÁULICO', 14, 15);
  doc.setFontSize(9);
  doc.text('HydraCalc v2.2 — ' + new Date().toLocaleDateString(), 14, 20);

  const id = proj.identificacao || {};
  doc.setFontSize(8);
  doc.text(`Cliente: ${id.cliente || '-'}   |   Local: ${id.local || '-'}   |   Município: ${id.municipio || '-'}   |   Data: ${id.data || '-'}`, 14, 25);

  doc.setFillColor(240, 240, 240);
  doc.rect(14, 29, 270, 20, 'F');
  doc.setFont(undefined, 'bold');
  doc.text('RESUMO DO SISTEMA DE RECALQUE (ADUTORA):', 18, 35);
  doc.setFont(undefined, 'normal');
  doc.text(`Vazão de dimensionamento: ${proj.adut.trechos[0]?.qM3h.toFixed(2) ?? '-'} m³/h (K1=${parametros.k1}, ${parametros.horasBombeamento}h de bombeamento/dia)`, 18, 41);
  doc.setFont(undefined, 'bold');
  doc.text(`AMT NECESSÁRIA: ${proj.adut.amt.toFixed(2)} mca`, 18, 47);
  doc.setFont(undefined, 'normal');
  doc.text(`(altura geométrica ${proj.adut.alturaGeometrica.toFixed(2)} m + perda de carga total ${proj.adut.hfTotal.toFixed(2)} m, incl. ${parametros.percLocalizadas}% de perdas localizadas)`, 110, 47);

  const dh = proj.disponibilidadeHidrica;
  doc.setFillColor(dh.suficiente ? 227 : 251, dh.suficiente ? 246 : 230, dh.suficiente ? 234 : 225);
  doc.rect(14, 51, 270, 7, 'F');
  doc.setFont(undefined, 'bold');
  doc.text(
    `DISPONIBILIDADE HÍDRICA: explotação do poço ${proj.vazaoExplotacaoM3h.toFixed(2)} m³/h vs. vazão exigida ${(proj.adut.trechos[0]?.qM3h ?? 0).toFixed(2)} m³/h — ` +
    `${dh.suficiente ? `margem de ${dh.margemPercentual.toFixed(0)}%` : `DÉFICIT DE ${Math.abs(dh.margemPercentual).toFixed(0)}%`}.`,
    18, 55.5
  );
  doc.setFont(undefined, 'normal');

  const bodyAdut = proj.adut.trechos.map(a => ([
    '[AD] ' + a.id, a.l, a.mat, a.pn,
    '-', '-', (a.qM3s * 1000).toFixed(3), (a.qM3s * 1000).toFixed(3),
    a.deMm, (a.di * 1000).toFixed(1),
    a.v.toFixed(2), a.hfPorKm.toFixed(2), a.hf.toFixed(2),
    '-', '-', '-', '-', '-', '-', '-', '-'
  ]));
  const bodyDist = proj.links.map(l => ([
    l.m + '-' + l.j, l.l, l.mat, l.pn,
    (l.q_jus * 1000).toFixed(3), (l.q_mar * 1000).toFixed(3), (l.q_mon * 1000).toFixed(3), (l.q_fic * 1000).toFixed(3),
    l.deMm, (l.diCalculado * 1000).toFixed(1),
    l.v.toFixed(2), l.hfPorKm.toFixed(2), l.hf.toFixed(2),
    l.cp_m.toFixed(2), l.cp_j.toFixed(2),
    l.cotaTerrenoM.toFixed(2), (l.cotaTerrenoJ ?? 0).toFixed(2),
    l.p_m.toFixed(2), l.p_j.toFixed(2),
    (l.desnivelM ?? 0).toFixed(2), (l.desnivelJ ?? 0).toFixed(2)
  ]));

  doc.autoTable({
    startY: 62,
    head: [[
      'Trecho', 'L(m)', 'Material', 'PN',
      'Q Jus.(L/s)', 'Q Mar.(L/s)', 'Q Mon.(L/s)', 'Q Fic.(L/s)',
      'Ø Ext(mm)', 'Ø Int(mm)',
      'V(m/s)', 'hf(m/km)', 'hf(m)',
      'CP Mon.(m)', 'CP Jus.(m)',
      'Terreno Mon.(m)', 'Terreno Jus.(m)',
      'Pressão Mon.(mca)', 'Pressão Jus.(mca)',
      'Desnível Mon.(m)', 'Desnível Jus.(m)'
    ]],
    body: [...bodyAdut, ...bodyDist],
    styles: { fontSize: 5.5, halign: 'center', cellPadding: 0.8 },
    headStyles: { fillColor: [30, 58, 138], fontSize: 5.5 },
    columnStyles: { 0: { fontStyle: 'bold' } }
  });

  doc.setFontSize(7);
  doc.text('Fórmula de perda de carga por trecho: ' + [...proj.adut.trechos.map(a => `${a.id}=${a.formulaUsada}`), ...proj.links.map(l => `${l.m}-${l.j}=${l.formulaUsada}`)].join('; '), 14, doc.lastAutoTable.finalY + 5, { maxWidth: 270 });
  doc.text('Golpe de aríete (adutora): ' + proj.adut.trechos.map(a => `${a.id}: celeridade ${a.celeridade.toFixed(0)} m/s, sobrepressão ${a.sobrepressao.toFixed(1)} mca`).join('; '), 14, doc.lastAutoTable.finalY + 9, { maxWidth: 270 });

  const bodyQuant = [
    ...Object.entries(proj.quantAdut).map(([k, v]) => ['Adutora', k, v.toFixed(1) + ' m']),
    ...Object.entries(proj.quantDist).map(([k, v]) => ['Distribuição', k, v.toFixed(1) + ' m']),
    ['Ligação Domiciliar', proj.ligacaoDomiciliar.especificacao, proj.ligacaoDomiciliar.comprimentoTotal.toFixed(1) + ' m'],
    ...proj.acessorios.map(a => ['Acessório', `${a.item} ${a.diametro}`, `${a.qtd} ${a.unidade}`]),
    ['TOTAL GERAL', 'Tubulação (distr. + adutora + ligação)', proj.quantitativoGeral.totalGeral.toFixed(1) + ' m']
  ];
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 15,
    head: [['Sistema', 'Especificação do Material / Item', 'Quantidade Total']],
    body: bodyQuant,
    styles: { fontSize: 8 }
  });

  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.text('PARÂMETROS E NOTAS TÉCNICAS ADOTADOS NESTE CÁLCULO:', 14, finalY);
  doc.setFont(undefined, 'normal');
  const notas = [
    `- Coeficientes de consumo: K1 = ${parametros.k1} (dia de maior consumo), K2 = ${parametros.k2} (hora de maior consumo).`,
    `- Perda de carga distribuída: Hazen-Williams (Ø >= 50mm) ou Fair-Whipple-Hsiao (Ø < 50mm), aplicada trecho a trecho — ver nota "Fórmula de perda de carga por trecho" acima.`,
    `- Perdas de carga localizadas: ${parametros.percLocalizadas}% sobre a perda distribuída de cada trecho.`,
    `- Faixa de velocidade verificada: ${parametros.vMin} a ${parametros.vMax} m/s (trechos fora da faixa foram destacados na tela).`,
    `- Pressão dinâmica mínima verificada: ${parametros.pMinDinamica} mca; pressão máxima limitada pela classe (PN) de cada tubo.`,
    `- Golpe de aríete: celeridade de Allievi (coeficiente k tabelado por material) + sobrepressão de Joukowsky p/ fechamento instantâneo.`,
    `  Estimativa preliminar; não substitui análise transiente completa em adutoras de maior porte ou criticidade.`,
    `- Ligação domiciliar: ${proj.ligacaoDomiciliar.comprimentoPadraoM} m por economia (${proj.ligacaoDomiciliar.totalResidencias} economias).`,
    `- Rede de distribuição resolvida como topologia ramificada (sem anéis/loops).`
  ];
  notas.forEach((linha, i) => doc.text(linha, 14, finalY + 5 + i * 4));

  const assinaturaY = finalY + 5 + notas.length * 4 + 15;
  doc.text('_________________________________', 180, assinaturaY);
  doc.text('Assinatura Responsável Técnico', 180, assinaturaY + 5);
  doc.text('CREA:', 180, assinaturaY + 10);

  doc.save('Memorial_Hidraulico_HydraCalc.pdf');
}
