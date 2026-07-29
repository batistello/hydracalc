// ============================================================================
// seed-admin.mjs
// Cria o usuário admin inicial, se ainda não existir. Rodar uma vez após o
// primeiro deploy: node server/seed-admin.mjs
// Pode sobrescrever o email/senha padrão via variáveis de ambiente:
//   ADMIN_EMAIL=outro@email.com ADMIN_PASSWORD='outraSenha' node server/seed-admin.mjs
// ============================================================================

import { criarUsuario, buscarUsuarioPorEmail } from './users.js';

const email = process.env.ADMIN_EMAIL || 'admin@dendev.com.br';
const senha = process.env.ADMIN_PASSWORD || 'Bascara18!';

if (buscarUsuarioPorEmail(email)) {
  console.log(`Usuário "${email}" já existe — nada a fazer. Use o script alterar-senha.mjs se quiser trocar a senha.`);
} else {
  const resultado = criarUsuario(email, senha, 'admin');
  if (resultado.criado) {
    console.log(`Usuário admin "${email}" criado com sucesso (role: admin).`);
    console.log('IMPORTANTE: troque essa senha depois do primeiro login.');
  } else {
    console.log('Não foi possível criar o usuário:', resultado.motivo);
  }
}
