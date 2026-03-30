// admin.js - Lógica do painel administrativo

document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  loadOrders();

  // Formulário de cadastro de produto
  const form = document.getElementById('product-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('prod-nome').value.trim();
    const descricao = document.getElementById('prod-descricao').value.trim();
    const preco = parseFloat(document.getElementById('prod-preco').value);
    const imagem_url = document.getElementById('prod-imagem').value.trim();

    if (!nome || !preco || preco <= 0) {
      showAlert('Preencha o nome e um preço válido.', 'error');
      return;
    }

    try {
      const response = await fetch('/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, descricao, preco, imagem_url })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.erro || 'Erro ao cadastrar produto.');
      }

      showAlert(`Produto "${nome}" cadastrado com sucesso!`);
      form.reset();
      loadProducts(); // Recarrega a lista

    } catch (err) {
      showAlert(err.message, 'error');
    }
  });
});

// Carrega e renderiza a tabela de produtos
async function loadProducts() {
  const tableBody = document.getElementById('products-table');
  const emptyEl = document.getElementById('empty-products');

  try {
    const response = await fetch('/api/produtos');
    const produtos = await response.json();

    if (produtos.length === 0) {
      tableBody.innerHTML = '';
      emptyEl.style.display = 'block';
      return;
    }

    emptyEl.style.display = 'none';

    tableBody.innerHTML = produtos.map(p => `
      <tr>
        <td>${p.id}</td>
        <td>${p.nome}</td>
        <td>${formatCurrency(p.preco)}</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id}, '${p.nome.replace(/'/g, "\\'")}')">
            Excluir
          </button>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('Erro ao carregar produtos:', err);
    tableBody.innerHTML = '<tr><td colspan="4" style="color:var(--danger);">Erro ao carregar.</td></tr>';
  }
}

// Exclui um produto
async function deleteProduct(id, nome) {
  if (!confirm(`Deseja excluir o produto "${nome}"?`)) return;

  try {
    const response = await fetch(`/api/produtos/${id}`, { method: 'DELETE' });
    const data = await response.json();

    if (!response.ok) throw new Error(data.erro);

    showAlert(`Produto "${nome}" excluído.`);
    loadProducts();

  } catch (err) {
    showAlert(err.message, 'error');
  }
}

// Carrega e renderiza a lista de pedidos
async function loadOrders() {
  const ordersList = document.getElementById('orders-list');
  const emptyEl = document.getElementById('empty-orders');

  try {
    const response = await fetch('/api/pedidos');
    const pedidos = await response.json();

    if (pedidos.length === 0) {
      ordersList.innerHTML = '';
      emptyEl.style.display = 'block';
      return;
    }

    emptyEl.style.display = 'none';

    ordersList.innerHTML = pedidos.map(pedido => {
      const dataCriacao = new Date(pedido.criado_em).toLocaleString('pt-BR');
      const itensHtml = pedido.itens.map(item =>
        `<li>${item.produto_nome} × ${item.quantidade} — ${formatCurrency(item.preco_unitario * item.quantidade)}</li>`
      ).join('');

      return `
        <div class="order-card">
          <div class="order-card-header">
            <h3>Pedido #${pedido.id}</h3>
            <span class="order-status ${pedido.status}">${pedido.status}</span>
          </div>
          <p><strong>Cliente:</strong> ${pedido.cliente_nome}</p>
          <p><strong>Endereço:</strong> ${pedido.cliente_endereco}</p>
          <p><strong>Data:</strong> ${dataCriacao}</p>
          <ul style="margin:12px 0 0 20px; font-size:0.9rem;">${itensHtml}</ul>
          <p style="margin-top:12px; font-weight:700; color:var(--success);">Total: ${formatCurrency(pedido.total)}</p>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Erro ao carregar pedidos:', err);
    ordersList.innerHTML = '<p style="color:var(--danger);">Erro ao carregar pedidos.</p>';
  }
}
