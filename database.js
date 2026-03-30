// database.js - Configuração do banco SQLite usando sql.js (JavaScript puro)
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'pedidos.db');

let db = null;

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
    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_nome TEXT NOT NULL,
      cliente_endereco TEXT NOT NULL,
      total REAL NOT NULL,
      status TEXT DEFAULT 'pendente',
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
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

module.exports = { initDB, getDB, saveDB, queryAll, queryOne, runSQL, getLastInsertId };
