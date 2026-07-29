// ============================================================================
// alterar-senha.mjs
// Uso: node server/alterar-senha.mjs email@exemplo.com "NovaSenha123!"
// ============================================================================

import { alterarSenha, buscarUsuarioPorEmail } from './users.js';

const [, , email, novaSenha] = process.argv;

if (!email || !novaSenha) {
  console.log('Uso: node server/alterar-senha.mjs email@exemplo.com "NovaSenha"');
  process.exit(1);
}

if (!buscarUsuarioPorEmail(email)) {
  console.log(`Usuário "${email}" não encontrado.`);
  process.exit(1);
}

const resultado = alterarSenha(email, novaSenha);
console.log(resultado.ok ? `Senha de "${email}" alterada com sucesso.` : `Erro: ${resultado.motivo}`);
