// ============================================================================
// migrate-add-roles.mjs
// Migração única: usuários criados antes do sistema de papéis (role) não
// têm esse campo no JSON. Este script marca qualquer usuário sem role como
// "admin" (era o único cenário possível antes desta versão — só existia o
// usuário admin inicial). Rodar uma vez: node server/migrate-add-roles.mjs
// ============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, 'users.json');

if (!fs.existsSync(USERS_FILE)) {
  console.log('server/users.json não existe ainda — nada a migrar (rode seed-admin.mjs primeiro).');
  process.exit(0);
}

const usuarios = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
let mudou = false;
usuarios.forEach(u => {
  if (!u.role) {
    u.role = 'admin';
    mudou = true;
    console.log(`- "${u.email}" marcado como admin (não tinha role definido).`);
  }
});

if (mudou) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(usuarios, null, 2), { mode: 0o600 });
  console.log('Migração aplicada.');
} else {
  console.log('Nenhum usuário precisava de migração.');
}
