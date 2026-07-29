// ============================================================================
// users.js
// Armazenamento de usuários em arquivo JSON local. Simples de propósito —
// é um único admin por enquanto, não precisa de banco de dados de verdade.
// A SENHA NUNCA é armazenada em texto puro: só o hash bcrypt (custo 12).
// server/users.json é gitignored — não vai pro repositório.
// ============================================================================

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, 'users.json');

function lerUsuarios() {
  if (!fs.existsSync(USERS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function salvarUsuarios(usuarios) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(usuarios, null, 2), { mode: 0o600 });
}

export function buscarUsuarioPorEmail(email) {
  return lerUsuarios().find(u => u.email.toLowerCase() === String(email).toLowerCase());
}

export function criarUsuario(email, senhaPlana, role = 'user') {
  const usuarios = lerUsuarios();
  if (usuarios.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { criado: false, motivo: 'Usuário já existe.' };
  }
  const passwordHash = bcrypt.hashSync(senhaPlana, 12);
  usuarios.push({ email, passwordHash, role, criadoEm: new Date().toISOString() });
  salvarUsuarios(usuarios);
  return { criado: true };
}

/** Lista usuários SEM o hash da senha (nunca expor isso pra fora de users.js). */
export function listarUsuarios() {
  return lerUsuarios().map(u => ({ email: u.email, role: u.role || 'user', criadoEm: u.criadoEm }));
}

export function removerUsuario(email) {
  const usuarios = lerUsuarios();
  const idx = usuarios.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
  if (idx === -1) return { ok: false, motivo: 'Usuário não encontrado.' };
  usuarios.splice(idx, 1);
  salvarUsuarios(usuarios);
  return { ok: true };
}

export function contarAdmins() {
  return lerUsuarios().filter(u => (u.role || 'user') === 'admin').length;
}

export function verificarSenha(usuario, senhaPlana) {
  if (!usuario || !senhaPlana) return false;
  return bcrypt.compareSync(senhaPlana, usuario.passwordHash);
}

export function alterarSenha(email, novaSenha) {
  const usuarios = lerUsuarios();
  const usuario = usuarios.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!usuario) return { ok: false, motivo: 'Usuário não encontrado.' };
  usuario.passwordHash = bcrypt.hashSync(novaSenha, 12);
  salvarUsuarios(usuarios);
  return { ok: true };
}
