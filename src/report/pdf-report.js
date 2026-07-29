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
  doc.text('HydraCalc v2.1 — ' + new Date().toLocaleDateString(), 14, 20);

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
    '[AD] ' + a.id, a.l, a.qM3h.toFixed(2), (a.qM3s * 1000).toFixed(2), (a.di * 1000).toFixed(1), a.v.toFixed(2), a.hf.toFixed(2), a.hfPorKm.toFixed(2),
    a.formulaUsada, `${a.celeridade.toFixed(0)} m/s / ${a.sobrepressao.toFixed(1)} mca`
  ]));
  const bodyDist = proj.links.map(l => ([
    l.m + '-' + l.j, l.l, (l.q_mon * 3600).toFixed(2), (l.q_mon * 1000).toFixed(2), (l.diCalculado * 1000).toFixed(1), l.v.toFixed(2), l.hf.toFixed(2), l.hfPorKm.toFixed(2),
    l.formulaUsada, `CP ${l.cp_m.toFixed(2)} -> ${l.cp_j.toFixed(2)} / P ${l.p_m.toFixed(2)} -> ${l.p_j.toFixed(2)}`
  ]));

  doc.autoTable({
    startY: 62,
    head: [['Trecho', 'L(m)', 'Q(m³/h)', 'Q(L/s)', 'Ø int(mm)', 'V(m/s)', 'hf(m)', 'hf(m/km)', 'Fórmula', 'Observações']],
    body: [...bodyAdut, ...bodyDist],
    styles: { fontSize: 7, halign: 'center' },
    headStyles: { fillColor: [30, 58, 138] }
  });

  const bodyQuant = [
    ...Object.entries(proj.quantAdut).map(([k, v]) => ['Adutora', k, v.toFixed(1) + ' m']),
    ...Object.entries(proj.quantDist).map(([k, v]) => ['Distribuição', k, v.toFixed(1) + ' m']),
    ['Ligação Domiciliar', proj.ligacaoDomiciliar.especificacao, proj.ligacaoDomiciliar.comprimentoTotal.toFixed(1) + ' m'],
    ...proj.acessorios.map(a => ['Acessório', `${a.item} ${a.diametro}`, `${a.qtd} ${a.unidade}`]),
    ['TOTAL GERAL', 'Tubulação (distr. + adutora + ligação)', proj.quantitativoGeral.totalGeral.toFixed(1) + ' m']
  ];
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 10,
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
    `- Perda de carga distribuída: Hazen-Williams (Ø >= 50mm) ou Fair-Whipple-Hsiao (Ø < 50mm), aplicada trecho a trecho — ver coluna "Fórmula".`,
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
