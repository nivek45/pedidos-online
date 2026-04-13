// database.js - Configuração do banco SQLite usando sql.js (JavaScript puro)
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'pedidos.db');

let db = null;

// Gera hash SHA-256 da senha
function hashSenha(senha) {
  return crypto.createHash('sha256').update(senha).digest('hex');
}

// Inicializa o banco de dados
async function initDB() {
  const SQL = await initSqlJs();

  // Tenta carregar banco existente, senão cria um novo
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log('📂 Banco de dados carregado de', DB_PATH);
  } else {
    db = new SQL.Database();
    console.log('🆕 Novo banco de dados criado.');
  }

  // Cria as tabelas se não existirem
  db.run(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descricao TEXT DEFAULT '',
      preco REAL NOT NULL,
      imagem_url TEXT DEFAULT '',
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha TEXT NOT NULL,
      endereco TEXT DEFAULT '',
      role TEXT DEFAULT 'user',
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_nome TEXT NOT NULL,
      cliente_endereco TEXT NOT NULL,
      total REAL NOT NULL,
      status TEXT DEFAULT 'pendente',
      usuario_id INTEGER DEFAULT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pedido_itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL,
      produto_id INTEGER NOT NULL,
      quantidade INTEGER NOT NULL,
      preco_unitario REAL NOT NULL,
      FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
      FOREIGN KEY (produto_id) REFERENCES produtos(id)
    )
  `);

  // Adiciona coluna usuario_id se não existir (para bancos antigos)
  try {
    db.run('SELECT usuario_id FROM pedidos LIMIT 1');
  } catch (e) {
    db.run('ALTER TABLE pedidos ADD COLUMN usuario_id INTEGER DEFAULT NULL');
    console.log('🔄 Coluna usuario_id adicionada à tabela pedidos.');
  }

  // Cria admin padrão se não existir nenhum admin
  const adminCount = db.exec("SELECT COUNT(*) as total FROM usuarios WHERE role = 'admin'");
  const totalAdmins = adminCount[0].values[0][0];

  if (totalAdmins === 0) {
    const stmt = db.prepare('INSERT INTO usuarios (nome, email, senha, role) VALUES (?, ?, ?, ?)');
    stmt.run(['Administrador', 'admin@admin.com', hashSenha('admin123'), 'admin']);
    stmt.free();
    console.log('👤 Admin padrão criado (email: admin@admin.com, senha: admin123)');
  }

  // Insere produtos de exemplo se a tabela estiver vazia
  const count = db.exec('SELECT COUNT(*) as total FROM produtos');
  const total = count[0].values[0][0];

  if (total === 0) {
    const produtosExemplo = [
      ['Camiseta Básica', 'Camiseta 100% algodão, confortável e durável.', 49.90, 'https://placehold.co/400x300/2563eb/ffffff?text=Camiseta'],
      ['Calça Jeans', 'Calça jeans slim fit com elastano.', 129.90, 'https://placehold.co/400x300/1e40af/ffffff?text=Calca+Jeans'],
      ['Tênis Esportivo', 'Tênis leve e confortável para o dia a dia.', 199.90, 'https://placehold.co/400x300/7c3aed/ffffff?text=Tenis'],
      ['Boné Ajustável', 'Boné com aba curva e fechamento ajustável.', 39.90, 'https://placehold.co/400x300/059669/ffffff?text=Bone'],
      ['Mochila Casual', 'Mochila resistente com compartimento para notebook.', 149.90, 'https://placehold.co/400x300/dc2626/ffffff?text=Mochila'],
      ['Relógio Digital', 'Relógio digital à prova d\'água com cronômetro.', 89.90, 'https://placehold.co/400x300/ca8a04/ffffff?text=Relogio'],
    ];

    const stmt = db.prepare('INSERT INTO produtos (nome, descricao, preco, imagem_url) VALUES (?, ?, ?, ?)');
    for (const p of produtosExemplo) {
      stmt.run(p);
    }
    stmt.free();
    saveDB();
    console.log('✅ Produtos de exemplo inseridos no banco de dados.');
  }

  saveDB();
  return db;
}

// Salva o banco de dados em disco
function saveDB() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// Retorna a instância do banco
function getDB() {
  return db;
}

// Funções auxiliares para facilitar consultas
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);

  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function runSQL(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.run(params);
  else stmt.run();
  stmt.free();
  saveDB();
}

function getLastInsertId() {
  const result = db.exec('SELECT last_insert_rowid() as id');
  return result[0].values[0][0];
}

module.exports = { initDB, getDB, saveDB, queryAll, queryOne, runSQL, getLastInsertId, hashSenha };
