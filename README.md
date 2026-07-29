# HydraCalc v2.0

Dimensionamento de redes de água (distribuição ramificada + adutora de recalque), com memorial técnico em PDF.

## O que mudou da v1.8 pra v2.0

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
- Golpe de aríete: celeridade calculada de verdade pela fórmula de Allievi (a partir do módulo de elasticidade do material) + sobrepressão de Joukowsky — antes era um número fixo, decorativo, no rodapé do PDF.
- Corrigido bug do `doc.save()` chamado duas vezes na geração do PDF (baixava o arquivo incompleto na primeira vez).

**Limitação que continua existindo (documentada, não escondida):** o solver de rede de distribuição resolve apenas topologia **ramificada (árvore, sem anéis)**. Para redes malhadas seria necessário um método tipo Hardy-Cross — fora do escopo desta versão.

⚠️ **Os valores normativos (K1, K2, faixas de velocidade/pressão, % de perdas localizadas, módulos de elasticidade) são referências usuais da literatura técnica brasileira, ficam editáveis na tela "03 · Parâmetros Normativos" e devem ser conferidos pelo responsável técnico contra a norma vigente (NBR 12211, NBR 12218, NBR 5626) antes de qualquer memorial assinado.**

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
