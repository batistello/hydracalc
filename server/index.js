// ============================================================================
// server/index.js
// Servidor do HydraCalc: serve o app buildado (dist/) e protege o acesso
// atrás de login. Substitui o Nginx servindo os arquivos estáticos direto —
// agora o Nginx faz proxy_pass pra este processo Node.
//
// Segurança aplicada:
// - Senha nunca em texto puro (bcrypt, custo 12) — ver users.js
// - Sessão em cookie httpOnly + secure (HTTPS) + sameSite=lax
// - Segredo de sessão gerado aleatoriamente e persistido fora do git
// - Rate limit no login (10 tentativas / 15 min por IP) contra força bruta
// - Mensagem de erro genérica no login (não revela se o email existe)
// - Sessão regenerada no login (evita session fixation)
// - Cabeçalhos de segurança via helmet
// ============================================================================

import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { buscarUsuarioPorEmail, verificarSenha, criarUsuario, listarUsuarios, removerUsuario, contarAdmins } from './users.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '..', 'dist');
const PORT = process.env.PORT || 3030;
const EM_PRODUCAO = process.env.NODE_ENV === 'production';

// ---------- Segredo de sessão: gerado uma vez, persistido fora do git ----------
const SECRET_FILE = path.join(__dirname, '.session-secret');
function obterSegredoSessao() {
  if (fs.existsSync(SECRET_FILE)) return fs.readFileSync(SECRET_FILE, 'utf-8').trim();
  const novo = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(SECRET_FILE, novo, { mode: 0o600 });
  return novo;
}

const app = express();

// Atrás do Nginx (proxy reverso) — necessário pra "secure cookie" funcionar
// corretamente a partir do cabeçalho X-Forwarded-Proto.
app.set('trust proxy', 1);

app.use(helmet({
  // CSP desligada: o app carrega fontes do Google Fonts e o jsPDF via CDN
  // (cdnjs). Uma CSP padrão do helmet bloquearia isso. Se quiser CSP
  // rígida depois, precisa listar esses domínios explicitamente.
  contentSecurityPolicy: false
}));

app.use(express.json());

app.use(session({
  name: 'hydracalc.sid',
  secret: obterSegredoSessao(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: EM_PRODUCAO,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 12 // 12 horas
  }
}));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas de login. Tente novamente em alguns minutos.' }
});

// ---------- Rotas de autenticação ----------
app.post('/api/login', loginLimiter, (req, res) => {
  const { email, senha } = req.body || {};
  if (!email || !senha) {
    return res.status(400).json({ erro: 'Informe email e senha.' });
  }

  const usuario = buscarUsuarioPorEmail(String(email).trim());
  const senhaOk = verificarSenha(usuario, senha);

  if (!senhaOk) {
    return res.status(401).json({ erro: 'Email ou senha inválidos.' });
  }

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ erro: 'Erro interno ao criar sessão.' });
    req.session.usuario = { email: usuario.email, role: usuario.role || 'user' };
    res.json({ ok: true });
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  if (req.session?.usuario) {
    return res.json({ autenticado: true, email: req.session.usuario.email, role: req.session.usuario.role || 'user' });
  }
  res.json({ autenticado: false });
});

// ---------- Administração de usuários (só quem é admin) ----------
function exigirAdmin(req, res, next) {
  if (req.session?.usuario?.role === 'admin') return next();
  res.status(403).json({ erro: 'Acesso restrito a administradores.' });
}

app.get('/api/admin/users', exigirAdmin, (req, res) => {
  res.json({ usuarios: listarUsuarios() });
});

app.post('/api/admin/users', exigirAdmin, (req, res) => {
  const { email, senha, role } = req.body || {};
  const emailValido = typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  if (!emailValido) return res.status(400).json({ erro: 'Email inválido.' });
  if (!senha || senha.length < 8) return res.status(400).json({ erro: 'A senha precisa ter no mínimo 8 caracteres.' });

  const papel = role === 'admin' ? 'admin' : 'user';
  const resultado = criarUsuario(email.trim(), senha, papel);

  if (!resultado.criado) return res.status(409).json({ erro: resultado.motivo });
  res.json({ ok: true });
});

app.delete('/api/admin/users/:email', exigirAdmin, (req, res) => {
  const emailAlvo = req.params.email;

  if (emailAlvo.toLowerCase() === req.session.usuario.email.toLowerCase()) {
    return res.status(400).json({ erro: 'Você não pode excluir seu próprio usuário enquanto estiver logado com ele.' });
  }

  const usuario = buscarUsuarioPorEmail(emailAlvo);
  if (usuario && (usuario.role || 'user') === 'admin' && contarAdmins() <= 1) {
    return res.status(400).json({ erro: 'Não é possível excluir o último administrador do sistema.' });
  }

  const resultado = removerUsuario(emailAlvo);
  if (!resultado.ok) return res.status(404).json({ erro: resultado.motivo });
  res.json({ ok: true });
});

// ---------- Arquivos estáticos (assets do build, login.html) ----------
// index:false porque a página principal (index.html) é protegida abaixo,
// não deve ser servida automaticamente pra quem não está logado.
app.use(express.static(DIST_DIR, { index: false }));

function exigirLogin(req, res, next) {
  if (req.session?.usuario) return next();
  res.redirect('/login.html');
}

app.get(['/', '/index.html'], exigirLogin, (req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`HydraCalc rodando na porta ${PORT} (${EM_PRODUCAO ? 'produção' : 'desenvolvimento'})`);
});
