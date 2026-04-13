// meus-pedidos.js - Lógica da página "Meus Pedidos"

document.addEventListener('DOMContentLoaded', async () => {
  // Verifica se está logado
  if (!Auth.isLoggedIn()) {
    window.location.href = '/login.html?redirect=meus-pedidos.html';
    return;
  }

  const valido = await Auth.verify();
  if (!valido) {
    window.location.href = '/login.html?redirect=meus-pedidos.html';
    return;
  }

  loadMyOrders();
});

async function loadMyOrders() {
  const ordersList = document.getElementById('orders-list');
  const emptyEl = document.getElementById('empty-orders');
  const loadingEl = document.getElementById('loading-orders');

  try {
    const response = await fetch('/api/meus-pedidos', {
      headers: Auth.headers()
    });

    if (response.status === 401) {
      Auth.clear();
      window.location.href = '/login.html?redirect=meus-pedidos.html';
      return;
    }

    const pedidos = await response.json();

    if (loadingEl) loadingEl.style.display = 'none';

    if (pedidos.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }

    emptyEl.style.display = 'none';

    ordersList.innerHTML = pedidos.map(pedido => {
      const dataCriacao = pedido.criado_em ? new Date(pedido.criado_em).toLocaleString('pt-BR') : '—';
      const itensHtml = pedido.itens.map(item =>
        `<li>${item.produto_nome} × ${item.quantidade} — ${formatCurrency(item.preco_unitario * item.quantidade)}</li>`
      ).join('');

      const statusClass = pedido.status || 'pendente';
      const statusLabel = {
        'pendente': '⏳ Pendente',
        'em_preparo': '🔧 Em Preparo',
        'enviado': '📦 Enviado',
        'entregue': '✅ Entregue',
        'cancelado': '❌ Cancelado'
      }[statusClass] || statusClass;

      return `
        <div class="my-order-card">
          <div class="my-order-header">
            <div class="my-order-id">
              <span class="order-hash">#${pedido.id}</span>
              <span class="order-date">${dataCriacao}</span>
            </div>
            <span class="order-status-pill ${statusClass}">${statusLabel}</span>
          </div>
          <div class="my-order-items">
            <ul>${itensHtml}</ul>
          </div>
          <div class="my-order-footer">
            <span class="my-order-total">Total: <strong>${formatCurrency(pedido.total)}</strong></span>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Erro ao carregar pedidos:', err);
    if (loadingEl) loadingEl.style.display = 'none';
    ordersList.innerHTML = '<p style="color:var(--danger); text-align:center; padding:24px;">Erro ao carregar seus pedidos.</p>';
  }
}
