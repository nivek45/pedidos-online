// catalog.js - Lógica da página de catálogo de produtos

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('product-grid');
  const emptyState = document.getElementById('empty-state');

  try {
    // Busca os produtos da API
    const response = await fetch('/api/produtos');
    const produtos = await response.json();

    if (produtos.length === 0) {
      grid.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    // Renderiza cada produto
    produtos.forEach(produto => {
      const card = document.createElement('div');
      card.className = 'product-card';

      const imgSrc = produto.imagem_url || 'https://placehold.co/400x300/e5e7eb/6b7280?text=Sem+Imagem';

      card.innerHTML = `
        <img src="${imgSrc}" alt="${produto.nome}" loading="lazy">
        <div class="product-card-body">
          <h3>${produto.nome}</h3>
          <p class="description">${produto.descricao || ''}</p>
          <p class="price">${formatCurrency(produto.preco)}</p>
          <button class="btn btn-primary btn-block btn-add-cart" data-id="${produto.id}">
            Adicionar ao carrinho
          </button>
        </div>
      `;

      grid.appendChild(card);
    });

    // Event listeners para os botões de adicionar ao carrinho
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-add-cart');
      if (!btn) return;

      const productId = parseInt(btn.dataset.id);
      const produto = produtos.find(p => p.id === productId);

      if (produto) {
        Cart.addItem(produto);
        showAlert(`"${produto.nome}" adicionado ao carrinho!`);

        // Feedback visual no botão
        btn.textContent = '✓ Adicionado';
        btn.style.background = 'var(--success)';
        setTimeout(() => {
          btn.textContent = 'Adicionar ao carrinho';
          btn.style.background = '';
        }, 1500);
      }
    });

  } catch (err) {
    console.error('Erro ao carregar produtos:', err);
    grid.innerHTML = '<p style="color:var(--danger);">Erro ao carregar produtos. Verifique se o servidor está rodando.</p>';
  }
});
