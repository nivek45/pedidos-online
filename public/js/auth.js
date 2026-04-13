// auth.js - Utilitários de autenticação para o frontend

const Auth = {
  TOKEN_KEY: 'auth_token',
  USER_KEY: 'auth_user',

  // Retorna o token salvo
  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  // Retorna dados do usuário salvo
  getUser() {
    const data = localStorage.getItem(this.USER_KEY);
    return data ? JSON.parse(data) : null;
  },

  // Verifica se está logado
  isLoggedIn() {
    return !!this.getToken();
  },

  // Verifica se é admin
  isAdmin() {
    const user = this.getUser();
    return user && user.role === 'admin';
  },

  // Salva token e dados do usuário
  save(token, usuario) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(usuario));
  },

  // Limpa dados de autenticação
  clear() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    // Limpar token admin antigo se existir
    localStorage.removeItem('admin_token');
  },

  // Headers com autenticação
  headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': this.getToken() || ''
    };
  },

  // Faz login
  async login(email, senha) {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.erro || 'Erro ao fazer login.');
    Cart.clearGuest();
    this.save(data.token, data.usuario);
    return data;
  },

  // Faz registro
  async register(nome, email, senha, endereco) {
    const response = await fetch('/api/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha, endereco })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.erro || 'Erro ao criar conta.');
    Cart.clearGuest();
    this.save(data.token, data.usuario);
    return data;
  },

  // Faz logout
  async logout() {
    const token = this.getToken();
    if (token) {
      try {
        await fetch('/api/logout', {
          method: 'POST',
          headers: { 'Authorization': token }
        });
      } catch (e) { /* ignora erros de rede */ }
    }
    Cart.clear();
    this.clear();
    window.location.href = '/';
  },

  // Verifica token no servidor
  async verify() {
    const token = this.getToken();
    if (!token) return false;

    try {
      const response = await fetch('/api/verificar-token', {
        headers: { 'Authorization': token }
      });
      if (!response.ok) {
        this.clear();
        return false;
      }
      const data = await response.json();
      // Atualiza dados do usuário
      if (data.usuario) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(data.usuario));
      }
      return true;
    } catch (e) {
      return false;
    }
  },

  // Atualiza a navbar com estado de login
  updateNavbar() {
    const navLinks = document.querySelector('.navbar-links');
    if (!navLinks) return;

    const user = this.getUser();
    const isLogged = this.isLoggedIn();
    const isAdmin = this.isAdmin();

    // Template da navbar baseado no estado
    let linksHTML = `
      <li><a href="/"${window.location.pathname === '/' || window.location.pathname === '/index.html' ? ' class="active"' : ''}>Catálogo</a></li>
      <li><a href="/cart.html"${window.location.pathname === '/cart.html' ? ' class="active"' : ''}>Carrinho <span class="cart-badge" id="cart-count">0</span></a></li>
    `;

    if (isLogged) {
      if (isAdmin) {
        linksHTML += `
          <li><a href="/admin.html"${window.location.pathname === '/admin.html' ? ' class="active"' : ''}>Admin</a></li>
        `;
      } else {
        linksHTML += `
          <li><a href="/meus-pedidos.html"${window.location.pathname === '/meus-pedidos.html' ? ' class="active"' : ''}>Meus Pedidos</a></li>
        `;
      }
      linksHTML += `
        <li class="nav-user-menu">
          <button class="nav-user-btn" id="nav-user-btn">
            <span class="nav-user-avatar">${user.nome.charAt(0).toUpperCase()}</span>
            <span class="nav-user-name">${user.nome.split(' ')[0]}</span>
          </button>
          <div class="nav-dropdown" id="nav-dropdown">
            <div class="nav-dropdown-header">
              <strong>${user.nome}</strong>
              <small>${user.email}</small>
              <span class="nav-role-badge ${user.role}">${user.role === 'admin' ? 'Admin' : 'Usuário'}</span>
            </div>
            <div class="nav-dropdown-divider"></div>
            ${!isAdmin ? '<a href="/meus-pedidos.html">📦 Meus Pedidos</a>' : '<a href="/admin.html">⚙️ Painel Admin</a>'}
            <a href="#" id="nav-logout-btn" style="color: var(--danger);">🚪 Sair</a>
          </div>
        </li>
      `;
    } else {
      linksHTML += `
        <li><a href="/login.html" class="btn-nav-login${window.location.pathname === '/login.html' ? ' active' : ''}">Entrar</a></li>
      `;
    }

    navLinks.innerHTML = linksHTML;

    // Atualiza badge do carrinho
    Cart.updateBadge();

    // Menu dropdown do usuário
    const userBtn = document.getElementById('nav-user-btn');
    const dropdown = document.getElementById('nav-dropdown');
    if (userBtn && dropdown) {
      userBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
      });
      document.addEventListener('click', () => {
        dropdown.classList.remove('show');
      });
    }

    // Botão de logout
    const logoutBtn = document.getElementById('nav-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        Auth.logout();
      });
    }
  }
};

// Atualiza a navbar ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  Auth.updateNavbar();
});
