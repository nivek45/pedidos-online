// server.js - Servidor Express principal
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB, queryAll, queryOne, runSQL, getLastInsertId, saveDB, getDB } = require('./database');

const app = express();
const PORT = 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// ROTAS DA API - PRODUTOS
// ============================================

// GET /api/produtos - Lista todos os produtos
app.get('/api/produtos', (req, res) => {
  try {
    const produtos = queryAll('SELECT * FROM produtos ORDER BY id DESC');
    res.json(produtos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar produtos.' });
  }
});

// GET /api/produtos/:id - Busca um produto por ID
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

// POST /api/produtos - Cadastra um novo produto (Admin)
app.post('/api/produtos', (req, res) => {
  const { nome, descricao, preco, imagem_url } = req.body;

  // Validação básica
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

// DELETE /api/produtos/:id - Remove um produto (Admin)
app.delete('/api/produtos/:id', (req, res) => {
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

// POST /api/pedidos - Cria um novo pedido (Checkout)
app.post('/api/pedidos', (req, res) => {
  const { cliente_nome, cliente_endereco, itens } = req.body;

  // Validação
  if (!cliente_nome || !cliente_endereco) {
    return res.status(400).json({ erro: 'Nome e endereço são obrigatórios.' });
  }
  if (!itens || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ erro: 'O pedido deve conter pelo menos um item.' });
  }

  try {
    // Calcula o total e valida os produtos
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

    // Insere o pedido
    runSQL(
      'INSERT INTO pedidos (cliente_nome, cliente_endereco, total) VALUES (?, ?, ?)',
      [cliente_nome, cliente_endereco, total]
    );
    const pedidoId = getLastInsertId();

    // Insere os itens do pedido
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

// GET /api/pedidos - Lista todos os pedidos (Admin)
app.get('/api/pedidos', (req, res) => {
  try {
    const pedidos = queryAll('SELECT * FROM pedidos ORDER BY id DESC');

    // Para cada pedido, busca os itens
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

// Inicia o servidor (aguarda o banco inicializar primeiro)
async function start() {
  await initDB();

  app.listen(PORT, () => {
    console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📦 Catálogo:  http://localhost:${PORT}`);
    console.log(`🛒 Carrinho:  http://localhost:${PORT}/cart.html`);
    console.log(`📋 Checkout:  http://localhost:${PORT}/checkout.html`);
    console.log(`⚙️  Admin:     http://localhost:${PORT}/admin.html`);
    console.log('');
  });
}

start();
