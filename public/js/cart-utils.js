// cart-utils.js - Funções utilitárias para gerenciamento do carrinho (localStorage)

const Cart = {
  // Chave do localStorage
  STORAGE_KEY: 'carrinho',

  // Retorna todos os itens do carrinho
  getItems() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  // Salva os itens no localStorage
  saveItems(items) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    this.updateBadge();
  },

  // Adiciona um produto ao carrinho
  addItem(product) {
    const items = this.getItems();
    const existing = items.find(item => item.id === product.id);

    if (existing) {
      existing.quantidade += 1;
    } else {
      items.push({
        id: product.id,
        nome: product.nome,
        preco: product.preco,
        imagem_url: product.imagem_url,
        quantidade: 1
      });
    }

    this.saveItems(items);
    return items;
  },

  // Remove um item do carrinho
  removeItem(productId) {
    let items = this.getItems();
    items = items.filter(item => item.id !== productId);
    this.saveItems(items);
    return items;
  },

  // Atualiza a quantidade de um item
  updateQuantity(productId, delta) {
    const items = this.getItems();
    const item = items.find(i => i.id === productId);

    if (item) {
      item.quantidade += delta;
      if (item.quantidade <= 0) {
        return this.removeItem(productId);
      }
    }

    this.saveItems(items);
    return items;
  },

  // Calcula o total do carrinho
  getTotal() {
    return this.getItems().reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
  },

  // Retorna a quantidade total de itens
  getCount() {
    return this.getItems().reduce((sum, item) => sum + item.quantidade, 0);
  },

  // Limpa o carrinho
  clear() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.updateBadge();
  },

  // Atualiza o badge do carrinho na navbar
  updateBadge() {
    const badge = document.getElementById('cart-count');
    if (badge) {
      const count = this.getCount();
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline' : 'none';
    }
  }
};

// Formata valor em reais
function formatCurrency(value) {
  return 'R$ ' + value.toFixed(2).replace('.', ',');
}

// Mostra um alerta na página
function showAlert(message, type = 'success') {
  const container = document.getElementById('alert-container');
  if (!container) return;

  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  container.innerHTML = '';
  container.appendChild(alert);

  // Remove após 3 segundos
  setTimeout(() => alert.remove(), 3000);
}

// Atualiza o badge ao carregar qualquer página
document.addEventListener('DOMContentLoaded', () => {
  Cart.updateBadge();
});
