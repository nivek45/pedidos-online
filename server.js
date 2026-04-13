// server.js - Servidor Express principal
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const { initDB, queryAll, queryOne, runSQL, getLastInsertId, saveDB, getDB, hashSenha } = require('./database');

const app = express();
const PORT = 3000;

// Tokens ativos: Map de token → { id, nome, email, role }
const tokensAtivos = new Map();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// MIDDLEWARE DE AUTENTICAÇÃO (qualquer usuário logado)
// ============================================
function authMiddleware(req, res, next) {
  const token = req.headers['authorization'];

  if (!token || !tokensAtivos.has(token)) {
    return res.status(401).json({ erro: 'Não autorizado. Faça login.' });
  }

  req.user = tokensAtivos.get(token);
  next();
}

// ============================================
// MIDDLEWARE DE ADMIN (somente administradores)
// ============================================
function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ erro: 'Acesso negado. Permissão de administrador necessária.' });
  }
  next();
}

// ============================================
// ROTA DE REGISTRO (usuário comum)
// ============================================
app.post('/api/registro', (req, res) => {
  const { nome, email, senha, endereco } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios.' });
  }

  if (senha.length < 4) {
    return res.status(400).json({ erro: 'A senha deve ter pelo menos 4 caracteres.' });
  }

  // Verifica se email já existe
  const existente = queryOne('SELECT id FROM usuarios WHERE email = ?', [email.toLowerCase().trim()]);
  if (existente) {
    return res.status(409).json({ erro: 'Este email já está cadastrado.' });
  }

  try {
    runSQL(
      'INSERT INTO usuarios (nome, email, senha, endereco, role) VALUES (?, ?, ?, ?, ?)',
      [nome.trim(), email.toLowerCase().trim(), hashSenha(senha), endereco || '', 'user']
    );

    const id = getLastInsertId();
    const token = crypto.randomBytes(32).toString('hex');
    const userData = { id, nome: nome.trim(), email: email.toLowerCase().trim(), role: 'user', endereco: endereco || '' };
    tokensAtivos.set(token, userData);

    return res.status(201).json({
      token,
      usuario: userData,
      mensagem: 'Conta criada com sucesso!'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro ao criar conta.' });
  }
});

// ============================================
// ROTA DE LOGIN (unificada: admin e usuário)
// ============================================
app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'Email e senha são obrigatórios.' });
  }

  const usuario = queryOne(
    'SELECT * FROM usuarios WHERE email = ? AND senha = ?',
    [email.toLowerCase().trim(), hashSenha(senha)]
  );

  if (!usuario) {
    return res.status(401).json({ erro: 'Email ou senha incorretos.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const userData = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    role: usuario.role,
    endereco: usuario.endereco || ''
  };
  tokensAtivos.set(token, userData);

  return res.json({
    token,
    usuario: userData,
    mensagem: 'Login realizado com sucesso!'
  });
});

// POST /api/logout - Invalida o token
app.post('/api/logout', (req, res) => {
  const token = req.headers['authorization'];
  if (token) tokensAtivos.delete(token);
  res.json({ mensagem: 'Logout realizado.' });
});

// GET /api/verificar-token - Verifica se o token é válido
app.get('/api/verificar-token', (req, res) => {
  const token = req.headers['authorization'];
  if (token && tokensAtivos.has(token)) {
    const user = tokensAtivos.get(token);
    return res.json({ valido: true, usuario: user });
  }
  return res.status(401).json({ valido: false });
});

// GET /api/perfil - Retorna dados do perfil do usuário logado
app.get('/api/perfil', authMiddleware, (req, res) => {
  const usuario = queryOne('SELECT id, nome, email, endereco, role, criado_em FROM usuarios WHERE id = ?', [req.user.id]);
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  res.json(usuario);
});

// ============================================
// ROTAS DA API - PRODUTOS
// ============================================

// GET /api/produtos - Lista todos os produtos (público)
app.get('/api/produtos', (req, res) => {
  try {
    const produtos = queryAll('SELECT * FROM produtos ORDER BY id DESC');
    res.json(produtos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar produtos.' });
  }
});

// GET /api/produtos/:id - Busca um produto por ID (público)
app.get('/api/produtos/:id', (req, res) => {
  try {
    const produto = queryOne('SELECT * FROM produtos WHERE id = ?', [parseInt(req.params.id)]);
    if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });
    res.json(produto);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar produto.' });
  }
});

// POST /api/produtos - Cadastra um novo produto (Admin - PROTEGIDO)
app.post('/api/produtos', authMiddleware, adminMiddleware, (req, res) => {
  const { nome, descricao, preco, imagem_url } = req.body;

  if (!nome || preco === undefined || preco === null) {
    return res.status(400).json({ erro: 'Nome e preço são obrigatórios.' });
  }
  if (typeof preco !== 'number' || preco <= 0) {
    return res.status(400).json({ erro: 'Preço deve ser um número positivo.' });
  }

  try {
    runSQL(
      'INSERT INTO produtos (nome, descricao, preco, imagem_url) VALUES (?, ?, ?, ?)',
      [nome, descricao || '', preco, imagem_url || '']
    );

    const id = getLastInsertId();
    const novoProduto = queryOne('SELECT * FROM produtos WHERE id = ?', [id]);
    res.status(201).json(novoProduto);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao cadastrar produto.' });
  }
});

// DELETE /api/produtos/:id - Remove um produto (Admin - PROTEGIDO)
app.delete('/api/produtos/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const produto = queryOne('SELECT * FROM produtos WHERE id = ?', [parseInt(req.params.id)]);
    if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });

    runSQL('DELETE FROM produtos WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ mensagem: 'Produto removido com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao remover produto.' });
  }
});

// ============================================
// ROTAS DA API - PEDIDOS
// ============================================

// POST /api/pedidos - Cria um novo pedido (requer login de usuário)
app.post('/api/pedidos', authMiddleware, (req, res) => {
  const { cliente_nome, cliente_endereco, itens } = req.body;

  if (!cliente_nome || !cliente_endereco) {
    return res.status(400).json({ erro: 'Nome e endereço são obrigatórios.' });
  }
  if (!itens || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ erro: 'O pedido deve conter pelo menos um item.' });
  }

  try {
    let total = 0;
    const itensValidados = [];

    for (const item of itens) {
      const produto = queryOne('SELECT * FROM produtos WHERE id = ?', [parseInt(item.produto_id)]);
      if (!produto) {
        return res.status(400).json({ erro: `Produto ID ${item.produto_id} não encontrado.` });
      }
      const quantidade = parseInt(item.quantidade) || 1;
      total += produto.preco * quantidade;
      itensValidados.push({
        produto_id: produto.id,
        quantidade,
        preco_unitario: produto.preco
      });
    }

    runSQL(
      'INSERT INTO pedidos (cliente_nome, cliente_endereco, total, usuario_id) VALUES (?, ?, ?, ?)',
      [cliente_nome, cliente_endereco, total, req.user.id]
    );
    const pedidoId = getLastInsertId();

    for (const item of itensValidados) {
      runSQL(
        'INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)',
        [pedidoId, item.produto_id, item.quantidade, item.preco_unitario]
      );
    }

    res.status(201).json({ mensagem: 'Pedido criado com sucesso!', pedido_id: pedidoId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar pedido.' });
  }
});

// GET /api/meus-pedidos - Lista pedidos do usuário logado
app.get('/api/meus-pedidos', authMiddleware, (req, res) => {
  try {
    const pedidos = queryAll('SELECT * FROM pedidos WHERE usuario_id = ? ORDER BY id DESC', [req.user.id]);

    const pedidosComItens = pedidos.map(pedido => {
      const itens = queryAll(`
        SELECT pi.*, p.nome as produto_nome
        FROM pedido_itens pi
        JOIN produtos p ON pi.produto_id = p.id
        WHERE pi.pedido_id = ?
      `, [pedido.id]);
      return { ...pedido, itens };
    });

    res.json(pedidosComItens);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar seus pedidos.' });
  }
});

// GET /api/pedidos - Lista todos os pedidos (Admin - PROTEGIDO)
app.get('/api/pedidos', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const pedidos = queryAll('SELECT * FROM pedidos ORDER BY id DESC');

    const pedidosComItens = pedidos.map(pedido => {
      const itens = queryAll(`
        SELECT pi.*, p.nome as produto_nome
        FROM pedido_itens pi
        JOIN produtos p ON pi.produto_id = p.id
        WHERE pi.pedido_id = ?
      `, [pedido.id]);
      return { ...pedido, itens };
    });

    res.json(pedidosComItens);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar pedidos.' });
  }
});

// ============================================
// ROTA FALLBACK - Serve o index.html
// ============================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicia o servidor
async function start() {
  await initDB();

  app.listen(PORT, () => {
    console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📦 Catálogo:      http://localhost:${PORT}`);
    console.log(`🛒 Carrinho:      http://localhost:${PORT}/cart.html`);
    console.log(`📋 Checkout:      http://localhost:${PORT}/checkout.html`);
    console.log(`🔑 Login:         http://localhost:${PORT}/login.html`);
    console.log(`📦 Meus Pedidos:  http://localhost:${PORT}/meus-pedidos.html`);
    console.log(`🔒 Admin Login:   http://localhost:${PORT}/admin-login.html`);
    console.log(`⚙️  Admin:         http://localhost:${PORT}/admin.html`);
    console.log('');
  });
}

start();
