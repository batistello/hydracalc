#!/usr/bin/env bash
# ============================================================================
# install.sh — instala/atualiza o HydraCalc (frontend + servidor).
# Seguro rodar de novo a qualquer momento (idempotente): não recria o admin
# se ele já existir, não duplica o processo no PM2.
#
# Uso:
#   ./install.sh
# ============================================================================
set -e

echo "=== HydraCalc — instalação/atualização ==="
echo ""

# ---------- 1) Node.js ----------
if ! command -v node &> /dev/null; then
  echo "ERRO: Node.js não encontrado. Instale Node 18+ antes de continuar (ver REQUIREMENTS.md)."
  exit 1
fi
echo "Node encontrado: $(node -v)"

# ---------- 2) Dependências ----------
echo ""
echo "Instalando dependências (npm install)..."
npm install

# ---------- 3) Build do frontend ----------
echo ""
echo "Buildando o frontend (npm run build)..."
npm run build

# ---------- 4) Usuário admin / migração de roles ----------
echo ""
if [ ! -f server/users.json ]; then
  echo "Nenhum usuário encontrado — criando o admin inicial..."
  npm run seed:admin
else
  echo "server/users.json já existe — pulando criação do admin."
  echo "Rodando migração de roles (idempotente, seguro rodar sempre)..."
  node server/migrate-add-roles.mjs
fi

# ---------- 5) PM2 ----------
echo ""
if ! command -v pm2 &> /dev/null; then
  echo "PM2 não encontrado — instalando globalmente..."
  npm install -g pm2
fi

if pm2 describe hydracalc > /dev/null 2>&1; then
  echo "Processo 'hydracalc' já existe no PM2 — reiniciando..."
  pm2 restart hydracalc
else
  echo "Iniciando processo 'hydracalc' no PM2..."
  pm2 start ecosystem.config.cjs
fi
pm2 save

echo ""
echo "=== Concluído ==="
echo "Se esta é a primeira instalação, ainda falta configurar o Nginx como proxy"
echo "reverso pra porta 3030 — ver README.md, seção 'v3.0 — autenticação'."
