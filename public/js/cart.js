// cart.js - Lógica da página do carrinho de compras

document.addEventListener('DOMContentLoaded', () => {
  renderCart();
});

function renderCart() {
  const cartItemsEl = document.getElementById('cart-items');
  const cartSummary = document.getElementById('cart-summary');
  const emptyState = document.getElementById('empty-state');
  const cartContainer = document.getElementById('cart-container');
  const cartTotal = document.getElementById('cart-total');

  const items = Cart.getItems();

  // Se o carrinho está vazio
  if (items.length === 0) {
    cartContainer.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  cartContainer.style.display = 'block';
  emptyState.style.display = 'none';
  cartSummary.style.display = 'flex';

  // Renderiza os itens
  cartItemsEl.innerHTML = items.map(item => {
    const imgSrc = item.imagem_url || 'https://placehold.co/80x80/e5e7eb/6b7280?text=Img';
    return `
      <div class="cart-item">
        <img src="${imgSrc}" alt="${item.nome}">
        <div class="cart-item-info">
          <h4>${item.nome}</h4>
          <p class="price">${formatCurrency(item.preco)}</p>
        </div>
        <div class="cart-item-qty">
          <button onclick="changeQty(${item.id}, -1)" title="Diminuir">−</button>
          <span>${item.quantidade}</span>
          <button onclick="changeQty(${item.id}, 1)" title="Aumentar">+</button>
        </div>
        <button class="btn btn-danger btn-sm" onclick="removeFromCart(${item.id})" title="Remover">
          Remover
        </button>
      </div>
    `;
  }).join('');

  // Atualiza total
  cartTotal.textContent = formatCurrency(Cart.getTotal());
}

// Altera a quantidade de um item
function changeQty(productId, delta) {
  Cart.updateQuantity(productId, delta);
  renderCart();
}

// Remove um item do carrinho
function removeFromCart(productId) {
  Cart.removeItem(productId);
  renderCart();
  showAlert('Item removido do carrinho.');
}
