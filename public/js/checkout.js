// checkout.js - Lógica da página de finalização de pedido

document.addEventListener('DOMContentLoaded', async () => {
  const items = Cart.getItems();
  const form = document.getElementById('checkout-form');
  const orderSummary = document.getElementById('order-summary');
  const orderTotal = document.getElementById('order-total');
  const successPanel = document.getElementById('order-success');
  const checkoutContent = document.getElementById('checkout-content');
  const loginRequired = document.getElementById('login-required');

  // Se carrinho vazio, redireciona
  if (items.length === 0) {
    window.location.href = '/cart.html';
    return;
  }

  // Verifica se o usuário está logado
  if (!Auth.isLoggedIn()) {
    checkoutContent.style.display = 'none';
    loginRequired.style.display = 'block';
    return;
  }

  // Verifica se token é válido
  const valido = await Auth.verify();
  if (!valido) {
    checkoutContent.style.display = 'none';
    loginRequired.style.display = 'block';
    return;
  }

  // Pré-preenche dados do perfil
  const user = Auth.getUser();
  if (user) {
    document.getElementById('nome').value = user.nome || '';
    document.getElementById('endereco').value = user.endereco || '';
  }

  // Renderiza resumo do pedido
  orderSummary.innerHTML = items.map(item => `
    <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--gray-200); font-size:0.9rem;">
      <span>${item.nome} × ${item.quantidade}</span>
      <strong>${formatCurrency(item.preco * item.quantidade)}</strong>
    </div>
  `).join('');

  orderTotal.textContent = formatCurrency(Cart.getTotal());

  // Submit do formulário
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('nome').value.trim();
    const endereco = document.getElementById('endereco').value.trim();
    const btnSubmit = document.getElementById('btn-submit');

    if (!nome || !endereco) {
      showAlert('Preencha todos os campos.', 'error');
      return;
    }

    // Desabilita o botão durante o envio
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Enviando...';

    try {
      const response = await fetch('/api/pedidos', {
        method: 'POST',
        headers: Auth.headers(),
        body: JSON.stringify({
          cliente_nome: nome,
          cliente_endereco: endereco,
          itens: items.map(item => ({
            produto_id: item.id,
            quantidade: item.quantidade
          }))
        })
      });

      const data = await response.json();

      if (response.status === 401) {
        Auth.clear();
        checkoutContent.style.display = 'none';
        loginRequired.style.display = 'block';
        return;
      }

      if (!response.ok) {
        throw new Error(data.erro || 'Erro ao enviar pedido.');
      }

      // Sucesso: limpa carrinho e mostra confirmação
      Cart.clear();

      checkoutContent.style.display = 'none';
      successPanel.style.display = 'block';
      document.getElementById('order-id').textContent = `#${data.pedido_id}`;

    } catch (err) {
      showAlert(err.message, 'error');
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Confirmar Pedido';
    }
  });
});
