// ============================================================================
// pdf-report.js
// Geração do memorial técnico em PDF. Corrige o bug da v1.8 (doc.save()
// chamado duas vezes, baixando o arquivo incompleto na primeira vez).
// Todas as notas técnicas do rodapé refletem o que foi REALMENTE calculado
// (fórmulas escolhidas por trecho, K1/K2 aplicados, % de perdas localizadas).
//
// Layout em 2 páginas (paisagem A4):
//   Página 1 — identificação, resumo da adutora, disponibilidade hídrica,
//              tabela da adutora, e a rede de distribuição em duas tabelas
//              empilhadas (hidráulica | cotas e pressões) pra caber na
//              largura da folha sem cortar coluna.
//   Página 2 — quantitativo consolidado, parâmetros/notas técnicas, assinatura.
// ============================================================================

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { verificarPressaoGraduada, pnParaMca } from '../core/pressure.js';

const M = 10; // margem (mm) — respeitada em toda tabela/texto

const CORES_SEVERIDADE = {
  ok: null,
  amarelo: { bg: [254, 243, 199], texto: [146, 97, 10] },
  laranja: { bg: [255, 228, 204], texto: [185, 83, 10] },
  vermelho: { bg: [254, 226, 226], texto: [185, 28, 28] },
  alta: { bg: [251, 230, 225], texto: [194, 59, 34] }
};

function severidadePonto(pressaoMca, pn, pMinNo) {
  if (pressaoMca > pnParaMca(pn)) return 'alta';
  return verificarPressaoGraduada(pressaoMca, pMinNo).status;
}

export function gerarMemorialPDF({ proj, parametros }) {
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  // ---------- Cabeçalho ----------
  doc.setFontSize(14);
  doc.text('MEMORIAL TÉCNICO DE CÁLCULO HIDRÁULICO', M, 15);
  doc.setFontSize(9);
  doc.text('HydraCalc v2.6 — ' + new Date().toLocaleDateString(), M, 20);

  const id = proj.identificacao || {};
  doc.setFontSize(8);
  doc.text(`Cliente: ${id.cliente || '-'}   |   Local: ${id.local || '-'}   |   Município: ${id.municipio || '-'}   |   Data: ${id.data || '-'}`, M, 25);

  doc.setFillColor(240, 240, 240);
  doc.rect(M, 29, pageWidth - 2 * M, 20, 'F');
  doc.setFont(undefined, 'bold');
  doc.text('RESUMO DO SISTEMA DE RECALQUE (ADUTORA):', M + 4, 35);
  doc.setFont(undefined, 'normal');
  doc.text(`Vazão de dimensionamento: ${proj.adut.trechos[0]?.qM3h.toFixed(2) ?? '-'} m³/h (K1=${parametros.k1}, ${parametros.horasBombeamento}h de bombeamento/dia)`, M + 4, 41);
  doc.setFont(undefined, 'bold');
  doc.text(`AMT NECESSÁRIA: ${proj.adut.amt.toFixed(2)} mca`, M + 4, 47);
  doc.setFont(undefined, 'normal');
  doc.text(`(altura geométrica ${proj.adut.alturaGeometrica.toFixed(2)} m + perda de carga total ${proj.adut.hfTotal.toFixed(2)} m, incl. ${parametros.percLocalizadas}% de perdas localizadas)`, M + 96, 47);

  const dh = proj.disponibilidadeHidrica;
  doc.setFillColor(dh.suficiente ? 227 : 251, dh.suficiente ? 246 : 230, dh.suficiente ? 234 : 225);
  doc.rect(M, 51, pageWidth - 2 * M, 7, 'F');
  doc.setFont(undefined, 'bold');
  doc.text(
    `DISPONIBILIDADE HÍDRICA: explotação do poço ${proj.vazaoExplotacaoM3h.toFixed(2)} m³/h vs. vazão exigida ${(proj.adut.trechos[0]?.qM3h ?? 0).toFixed(2)} m³/h — ` +
    `${dh.suficiente ? `margem de ${dh.margemPercentual.toFixed(0)}%` : `DÉFICIT DE ${Math.abs(dh.margemPercentual).toFixed(0)}%`}.`,
    M + 4, 55.5
  );
  doc.setFont(undefined, 'normal');

  // ---------- Tabela: Rede Adutora ----------
  const bodyAdut = proj.adut.trechos.map(a => ([
    a.id, a.l, a.mat, a.pn,
    a.qM3h.toFixed(2), (a.qM3s * 1000).toFixed(3),
    a.deMm, (a.di * 1000).toFixed(1),
    a.v.toFixed(2), a.hfPorKm.toFixed(2), a.hf.toFixed(3),
    a.formulaUsada, a.celeridade.toFixed(0), a.sobrepressao.toFixed(1)
  ]));

  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('REDE ADUTORA (RECALQUE)', M, 61);
  doc.setFont(undefined, 'normal');
  doc.autoTable({
    startY: 64,
    margin: { left: M, right: M },
    head: [['Trecho', 'L(m)', 'Material', 'PN', 'Q(m³/h)', 'Q(L/s)', 'Ø Ext(mm)', 'Ø Int(mm)', 'V(m/s)', 'hf(m/km)', 'hf(m)', 'Fórmula', 'Celerid.(m/s)', 'Sobrepr.(mca)']],
    body: bodyAdut,
    styles: { fontSize: 6.5, halign: 'center', cellPadding: 1 },
    headStyles: { fillColor: [30, 58, 138], fontSize: 6.5 },
    columnStyles: { 0: { fontStyle: 'bold' } }
  });

  // ---------- Tabela: Rede de Distribuição — Hidráulica ----------
  const bodyDistHidraulica = proj.links.map(l => ([
    l.m + '-' + l.j, l.l, l.mat, l.pn,
    (l.q_jus * 1000).toFixed(3), (l.q_mar * 1000).toFixed(3), (l.q_mon * 1000).toFixed(3), (l.q_fic * 1000).toFixed(3),
    l.deMm, (l.diCalculado * 1000).toFixed(1),
    l.v.toFixed(2), l.hfPorKm.toFixed(2), l.hf.toFixed(2)
  ]));

  let y = doc.lastAutoTable.finalY + 9;
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('REDE DE DISTRIBUIÇÃO — Vazões, Diâmetros e Perda de Carga', M, y);
  doc.setFont(undefined, 'normal');
  doc.autoTable({
    startY: y + 3,
    margin: { left: M, right: M },
    head: [['Trecho', 'L(m)', 'Material', 'PN', 'Q Jus.(L/s)', 'Q Mar.(L/s)', 'Q Mon.(L/s)', 'Q Fic.(L/s)', 'Ø Ext(mm)', 'Ø Int(mm)', 'V(m/s)', 'hf(m/km)', 'hf(m)']],
    body: bodyDistHidraulica,
    styles: { fontSize: 6.5, halign: 'center', cellPadding: 1 },
    headStyles: { fillColor: [30, 58, 138], fontSize: 6.5 },
    columnStyles: { 0: { fontStyle: 'bold' } }
  });

  // ---------- Tabela: Rede de Distribuição — Cotas, Pressões e Ajustes ----------
  const bodyDistPressoes = proj.links.map(l => ([
    l.m + '-' + l.j,
    l.cp_m.toFixed(2), l.cp_j.toFixed(2),
    l.cotaTerrenoM.toFixed(2), (l.cotaTerrenoJ ?? 0).toFixed(2),
    l.p_m.toFixed(2), l.p_j.toFixed(2),
    (l.desnivelM ?? 0).toFixed(2), (l.desnivelJ ?? 0).toFixed(2),
    l.ajuste ? l.ajuste.toFixed(2) : '0.00',
    l.obs || (l.ajuste ? '(sem obs.)' : '-')
  ]));
  const severidadesPressao = proj.links.map(l => ({
    mon: severidadePonto(l.p_m, l.pn, proj.nodes[l.m]?.pressaoMin),
    jus: severidadePonto(l.p_j, l.pn, proj.nodes[l.j]?.pressaoMin)
  }));

  y = doc.lastAutoTable.finalY + 9;
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('REDE DE DISTRIBUIÇÃO — Cotas, Pressões e Ajustes', M, y);
  doc.setFont(undefined, 'normal');
  doc.autoTable({
    startY: y + 3,
    margin: { left: M, right: M },
    head: [['Trecho', 'CP Mon.(m)', 'CP Jus.(m)', 'Terreno Mon.(m)', 'Terreno Jus.(m)', 'Pressão Mon.(mca)', 'Pressão Jus.(mca)', 'Desnível Mon.(m)', 'Desnível Jus.(m)', 'Ajuste(m)', 'Observação (ajuste)']],
    body: bodyDistPressoes,
    styles: { fontSize: 6.5, halign: 'center', cellPadding: 1 },
    headStyles: { fillColor: [30, 58, 138], fontSize: 6.5 },
    columnStyles: { 0: { fontStyle: 'bold' }, 10: { halign: 'left' } },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const sev = severidadesPressao[data.row.index];
      if (!sev) return;
      const status = data.column.index === 5 ? sev.mon : data.column.index === 6 ? sev.jus : null;
      if (!status) return;
      const cor = CORES_SEVERIDADE[status];
      if (cor) {
        data.cell.styles.fillColor = cor.bg;
        data.cell.styles.textColor = cor.texto;
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  doc.setFontSize(7);
  doc.text('Fórmula de perda de carga por trecho (distribuição): ' + proj.links.map(l => `${l.m}-${l.j}=${l.formulaUsada}`).join('; '), M, doc.lastAutoTable.finalY + 5, { maxWidth: pageWidth - 2 * M });
  doc.text('Legenda pressão: branco = OK (>=100% da mínima do nó) · amarelo = 70-100% · laranja = 40-70% · vermelho = <40% (crítico, avaliar ajuste) · vermelho-escuro "alta" = acima da PN do tubo.', M, doc.lastAutoTable.finalY + 9, { maxWidth: pageWidth - 2 * M });

  // ---------- Página 2: Quantitativo + Parâmetros/Notas + Assinatura ----------
  doc.addPage();

  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('QUANTITATIVO GERAL DE MATERIAIS', M, 15);
  doc.setFont(undefined, 'normal');

  const bodyQuant = [
    ...Object.entries(proj.quantAdut).map(([k, v]) => ['Adutora', k, v.toFixed(1) + ' m']),
    ...Object.entries(proj.quantDist).map(([k, v]) => ['Distribuição', k, v.toFixed(1) + ' m']),
    ['Ligação Domiciliar', proj.ligacaoDomiciliar.especificacao, proj.ligacaoDomiciliar.comprimentoTotal.toFixed(1) + ' m'],
    ...proj.acessorios.map(a => ['Acessório', `${a.item} ${a.diametro}`, `${a.qtd} ${a.unidade}`]),
    ['TOTAL GERAL', 'Tubulação (distr. + adutora + ligação)', proj.quantitativoGeral.totalGeral.toFixed(1) + ' m']
  ];
  doc.autoTable({
    startY: 20,
    margin: { left: M, right: M },
    head: [['Sistema', 'Especificação do Material / Item', 'Quantidade Total']],
    body: bodyQuant,
    styles: { fontSize: 8 }
  });

  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.text('PARÂMETROS E NOTAS TÉCNICAS ADOTADOS NESTE CÁLCULO:', M, finalY);
  doc.setFont(undefined, 'normal');
  const notas = [
    `- Coeficientes de consumo: K1 = ${parametros.k1} (dia de maior consumo), K2 = ${parametros.k2} (hora de maior consumo).`,
    `- Perda de carga distribuída: Hazen-Williams (Ø >= 50mm) ou Fair-Whipple-Hsiao (Ø < 50mm), aplicada trecho a trecho — ver nota "Fórmula de perda de carga por trecho" na página 1.`,
    `- Perdas de carga localizadas: ${parametros.percLocalizadas}% sobre a perda distribuída de cada trecho.`,
    `- Faixa de velocidade verificada: ${parametros.vMin} a ${parametros.vMax} m/s (trechos fora da faixa foram destacados na tela).`,
    `- Pressão dinâmica mínima verificada POR NÓ (cadastrada na aba "02 · Rede de Distribuição", padrão ${parametros.pMinDinamica} mca); pressão máxima limitada pela classe (PN) de cada tubo. Ver legenda de cores na página 1.`,
    `- Golpe de aríete: celeridade de Allievi (coeficiente k tabelado por material) + sobrepressão de Joukowsky p/ fechamento instantâneo.`,
    `  Estimativa preliminar; não substitui análise transiente completa em adutoras de maior porte ou criticidade.`,
    `- Ligação domiciliar: ${proj.ligacaoDomiciliar.comprimentoPadraoM} m por economia (${proj.ligacaoDomiciliar.totalResidencias} economias).`,
    `- Rede de distribuição resolvida como topologia ramificada (sem anéis/loops).`
  ];
  notas.forEach((linha, i) => doc.text(linha, M, finalY + 5 + i * 4));

  const assinaturaY = finalY + 5 + notas.length * 4 + 15;
  doc.text('_________________________________', pageWidth - M - 97, assinaturaY);
  doc.text('Assinatura Responsável Técnico', pageWidth - M - 97, assinaturaY + 5);
  doc.text('CREA:', pageWidth - M - 97, assinaturaY + 10);

  doc.save('Memorial_Hidraulico_HydraCalc.pdf');
}
