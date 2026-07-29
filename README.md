# HydraCalc v2.1

Dimensionamento de redes de água (distribuição ramificada + adutora de recalque), com memorial técnico em PDF.

## v2.1 — incorporado a partir da planilha de referência (10 anos de uso em campo)

- **Identificação do projeto** (Cliente, Local, Município, Data) — nova aba, aparece no cabeçalho do PDF.
- **Golpe de aríete via coeficiente k tabelado** (Azevedo Netto) em vez de módulo de elasticidade — mesmo método da planilha de referência. Validado: reproduz exatamente a celeridade de 337,92 m/s do projeto real (D=63mm, e=1,4mm, k=18).
- **Ø interno calculado e hf por km** exibidos na tabela de resultados (conferência clássica).
- **Cota terreno e desnível em relação ao reservatório**, por trecho, na tabela de resultados.
- **Ligação domiciliar** como categoria própria (comprimento padrão × nº de economias). Validado: reproduz exatamente os 186m do projeto real (31 economias × 6m).
- **Verificação de disponibilidade hídrica**: vazão de explotação do poço vs. vazão de dimensionamento, com alerta de déficit.
- **Quantitativo consolidado** com subtotal por categoria (distribuição / adutora / ligação domiciliar) + total geral.
- **Tabela de acessórios** editável (hidrômetros, registros, uniões, adaptadores, tês) com atalho pra sugerir nº de hidrômetros = nº de economias.
- **Aço Galvanizado (C=110)** adicionado à lista de materiais.

## v2.0 — o que mudou da v1.8

**Estrutura**
- Migrado de um único `index.html` monolítico para projeto com build (Vite), JS organizado em módulos por responsabilidade (`src/core` = engenharia pura, `src/ui` = interface, `src/report` = PDF).
- `src/core/*.js` não toca no DOM — pode ser testado isoladamente (ver `scripts/test-logic.mjs`).

**Cálculo — correções e adições**
- Fórmula de perda de carga agora escolhe automaticamente entre **Hazen-Williams** (Ø ≥ 50mm) e **Fair-Whipple-Hsiao** (Ø < 50mm) — antes o memorial *dizia* usar as duas, mas o código só usava Hazen-Williams pra tudo.
- Vazão de dimensionamento agora aplica **K1 (dia de maior consumo)** e **K2 (hora de maior consumo)** sobre a vazão média — antes usava vazão média direta, o que tende a subdimensionar a rede.
- Vazão da adutora agora é derivada do **volume diário ÷ horas de bombeamento**, em vez de digitada solta sem rastreabilidade.
- Verificação **real** de velocidade (faixa editável, padrão 0,6–3,0 m/s) — antes o PDF alegava isso mas não existia checagem nenhuma.
- Verificação **nova** de pressão dinâmica mínima e de pressão máxima contra a **classe PN de cada tubo** (não existia antes).
- Perdas de carga localizadas: percentual configurável sobre a perda distribuída (antes: zero).
- Corrigido bug do `doc.save()` chamado duas vezes na geração do PDF (baixava o arquivo incompleto na primeira vez).

**Limitação que continua existindo (documentada, não escondida):** o solver de rede de distribuição resolve apenas topologia **ramificada (árvore, sem anéis)**. Para redes malhadas seria necessário um método tipo Hardy-Cross — fora do escopo desta versão.

⚠️ **Os valores normativos (K1, K2, faixas de velocidade/pressão, % de perdas localizadas, coeficientes k) são referências usuais da literatura técnica brasileira, ficam editáveis na tela "05 · Parâmetros Normativos" e devem ser conferidos pelo responsável técnico contra a norma vigente (NBR 12211, NBR 12218, NBR 5626) antes de qualquer memorial assinado.**

## Rodando localmente

```bash
npm install
npm run dev        # ambiente de desenvolvimento
npm run build      # gera build de produção em dist/
npm run preview    # serve o build de produção localmente pra conferir
```

## Testando a lógica de engenharia sem abrir o navegador

```bash
node scripts/test-logic.mjs
```

## Deploy no VPS (Nginx em calc.hidrosulpocos.com.br)

O Nginx hoje serve arquivos estáticos direto da pasta `/var/www/hidrosulpocos/calc` (`root` + `index.html`). Isso não muda — só passa a apontar pro **build** gerado pelo Vite (pasta `dist/`), em vez do `index.html` escrito à mão.

**Opção recomendada — buildar no próprio VPS:**

```bash
# na primeira vez, checar se o Node existe no servidor
node -v || echo "precisa instalar Node"

cd /var/www/hidrosulpocos/calc-src   # pasta do código-fonte (git)
git pull
npm install
npm run build
rsync -a --delete dist/ /var/www/hidrosulpocos/calc/
```

Assim a pasta servida pelo Nginx (`/var/www/hidrosulpocos/calc`) continua sendo só o build final, e o código-fonte fica em outra pasta (ex. `calc-src`) — evita misturar `node_modules` com o que o Nginx expõe.

**Alternativa, se não quiser instalar Node no VPS:** builda local (sua máquina), e sobe só a pasta `dist/` pro servidor via `rsync`/`scp`.
