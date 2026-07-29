# Requisitos — HydraCalc

## Servidor (VPS)

| Requisito | Versão testada | Observação |
|---|---|---|
| Node.js | v22 / v24 | Precisa suportar ES Modules nativo (`"type": "module"`) |
| npm | v10+ | Vem junto com o Node |
| PM2 | v7+ | Mantém o processo do servidor rodando e reinicia sozinho se cair |
| Nginx | qualquer versão recente | Faz proxy reverso pra porta do Node (padrão 3030) |
| Certbot / Let's Encrypt | — | Certificado SSL do domínio já configurado |
| Porta livre | 3030 (padrão) | Ajustável em `ecosystem.config.cjs` e na config do Nginx, se já estiver em uso por outro processo |

Checar rapidamente o que já está instalado:

```bash
node -v
npm -v
pm2 -v
nginx -v
```

## Dependências do projeto (Node)

Instaladas via `npm install`, listadas em `package.json`:

**Frontend**
- `vite` — build do app
- `jspdf`, `jspdf-autotable` — geração do memorial em PDF

**Servidor**
- `express` — servidor HTTP
- `express-session` — sessão de login
- `bcryptjs` — hash de senha (puro JS, sem compilação nativa — funciona em qualquer VPS sem precisar de build tools)
- `helmet` — cabeçalhos de segurança HTTP
- `express-rate-limit` — limite de tentativas de login

## Portas usadas no VPS (pra não conflitar com outros projetos)

Conferido nos outros sites do servidor (`novastyller`, `saas-poco`, `zapflow`, etc.): 3010, 8001, 8002. O HydraCalc usa **3030** — se em algum momento outro projeto também usar essa porta, muda em `ecosystem.config.cjs` (campo `PORT`) e no `proxy_pass` do Nginx (`/etc/nginx/sites-available/calc.hidrosulpocos.com.br`).
