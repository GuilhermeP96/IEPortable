// ============================================
// IE Portable - Renderer Process
// ============================================

// Script do polyfill ActiveX (inline para funcionar sem nodeIntegration)
const ACTIVEX_POLYFILL_SCRIPT = `
(function() {
  // Se já existe ActiveXObject real (IE) ou já foi injetado, não fazer nada
  if ((window.ActiveXObject && !window.ActiveXObject.__polyfill) || window.__iePortableActiveXPolyfill) {
    return;
  }

  console.log('[IE Portable] ActiveX Polyfill carregado na página');

  // CLSIDs conhecidos de DVRs
  const KNOWN_CLSIDS = {
    'E0DA039D-992F-4187-A105-C699A71F5F06': { brand: 'Qualvision/Tecvoz', type: 'video-player' },
    '55F88890-DE29-4E36-B13B-E0774CAC9C5A': { brand: 'Hikvision', type: 'video-player' },
    '4B3476C6-3A85-4F86-8418-D1130C952B05': { brand: 'Dahua', type: 'video-player' }
  };

  // Métodos comuns de players de DVR
  const DVR_PLAYER_METHODS = {
    Login: function(ip, port, user, pass) {
      console.log('[ActiveX] Login:', ip, port, user);
      this._connectionInfo = { ip, port, user, pass };
      this._connected = true;
      return 1;
    },
    Logout: function() { this._connected = false; return 1; },
    Connect: function(ip, port, user, pass) { return this.Login(ip, port, user, pass); },
    Disconnect: function() { return this.Logout(); },
    Play: function(channel) {
      console.log('[ActiveX] Play canal:', channel);
      this._playing = true;
      window.postMessage({ type: 'ACTIVEX_PLAY', clsid: this._clsid, channel: channel, connectionInfo: this._connectionInfo }, '*');
      return 1;
    },
    Stop: function() {
      this._playing = false;
      window.postMessage({ type: 'ACTIVEX_STOP', clsid: this._clsid }, '*');
      return 1;
    },
    StartRealPlay: function(ch) { return this.Play(ch); },
    StopRealPlay: function() { return this.Stop(); },
    SetChannelNum: function(n) { this._channelNum = n; },
    GetChannelNum: function() { return this._channelNum || 0; },
    SetVisible: function(v) { this._visible = v; },
    SetWndNum: function(n) { this._wndNum = n; },
    PTZControl: function(cmd, p1, p2) { console.log('[ActiveX] PTZ:', cmd); return 1; }
  };

  // Criar objeto fake ActiveX
  window.ActiveXObject = function(progId) {
    console.log('[ActiveX] Criando objeto:', progId);
    let clsid = null;
    const match = progId.match(/{([A-F0-9-]+)}/i);
    if (match) clsid = match[1].toUpperCase();
    
    window.postMessage({ type: 'ACTIVEX_CREATED', progId: progId, clsid: clsid }, '*');
    
    return Object.assign({
      _progId: progId,
      _clsid: clsid,
      _connected: false,
      _playing: false
    }, DVR_PLAYER_METHODS);
  };
  window.ActiveXObject.__polyfill = true;

  // Interceptar tags <object> com CLSIDs
  function processObjectTags() {
    document.querySelectorAll('object, embed').forEach(function(el) {
      if (el.dataset.ieProcessed) return;
      el.dataset.ieProcessed = 'true';
      
      var classid = el.getAttribute('classid') || el.getAttribute('clsid') || '';
      var match = classid.match(/{?([A-F0-9-]{36})}?/i);
      
      if (match) {
        var clsid = match[1].toUpperCase();
        console.log('[ActiveX] Tag object detectada, CLSID:', clsid);
        window.postMessage({ type: 'ACTIVEX_OBJECT_TAG', clsid: clsid }, '*');
        
        // Criar placeholder visual
        var info = KNOWN_CLSIDS[clsid] || { brand: 'Desconhecido' };
        var placeholder = document.createElement('div');
        placeholder.style.cssText = 'background:#1a1a2e;border:2px solid #0f3460;border-radius:8px;color:#e94560;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:200px;padding:20px;text-align:center;font-family:Arial;';
        placeholder.innerHTML = '<div style="font-size:48px">📹</div><div style="font-size:18px;font-weight:bold;margin:10px 0">Plugin ActiveX: ' + info.brand + '</div><div style="font-size:12px;color:#888">CLSID: ' + clsid.substring(0,8) + '...</div><button onclick="window.postMessage({type:\\'ACTIVEX_SHOW_PLAYER\\',clsid:\\'' + clsid + '\\'},\\'*\\')" style="background:#e94560;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;margin-top:15px;font-size:14px">🎬 Abrir Player Alternativo</button>';
        
        if (el.width) placeholder.style.width = el.width + 'px';
        if (el.height) placeholder.style.height = el.height + 'px';
        if (el.parentNode) {
          el.parentNode.insertBefore(placeholder, el);
          el.style.display = 'none';
        }
      }
    });
  }

  // Observar DOM para novos elementos
  var observer = new MutationObserver(function() { processObjectTags(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  
  // Processar elementos existentes
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', processObjectTags);
  } else {
    processObjectTags();
  }

  window.__iePortableActiveXPolyfill = true;
  console.log('[IE Portable] ActiveX Polyfill ativo');
})();
`;

// Função para injetar o polyfill no webview
async function injectActiveXPolyfill(webview) {
  try {
    await webview.executeJavaScript(ACTIVEX_POLYFILL_SCRIPT);
    console.log('[Renderer] ActiveX Polyfill injetado');
    return true;
  } catch (error) {
    console.error('[Renderer] Erro ao injetar polyfill:', error);
    return false;
  }
}

// Elementos DOM
const elements = {
  urlInput: document.getElementById('url-input'),
  webview: document.getElementById('webview'),
  startPage: document.getElementById('start-page'),
  btnBack: document.getElementById('btn-back'),
  btnForward: document.getElementById('btn-forward'),
  btnRefresh: document.getElementById('btn-refresh'),
  btnStop: document.getElementById('btn-stop'),
  btnHome: document.getElementById('btn-home'),
  btnGo: document.getElementById('btn-go'),
  btnFavorite: document.getElementById('btn-favorite'),
  btnFavoritesMenu: document.getElementById('btn-favorites-menu'),
  btnPlugins: document.getElementById('btn-plugins'),
  btnSettings: document.getElementById('btn-settings'),
  statusText: document.getElementById('status-text'),
  statusZone: document.getElementById('status-zone'),
  securityIndicator: document.getElementById('security-indicator'),
  ieVersionText: document.getElementById('ie-version-text'),
  loadingOverlay: document.getElementById('loading-overlay'),
  quickAccessItems: document.getElementById('quick-access-items'),
  
  // Modais
  favoritesModal: document.getElementById('favorites-modal'),
  favName: document.getElementById('fav-name'),
  favUrl: document.getElementById('fav-url'),
  favSave: document.getElementById('fav-save'),
  favCancel: document.getElementById('fav-cancel'),
  
  settingsModal: document.getElementById('settings-modal'),
  settingHomepage: document.getElementById('setting-homepage'),
  settingIEVersion: document.getElementById('setting-ie-version'),
  settingsSave: document.getElementById('settings-save'),
  settingsCancel: document.getElementById('settings-cancel'),
  settingsApply: document.getElementById('settings-apply'),
  
  // Painel de favoritos
  favoritesPanel: document.getElementById('favorites-panel'),
  favoritesList: document.getElementById('favorites-list'),
  
  // Modais de Plugin/Stream
  pluginModal: document.getElementById('plugin-modal'),
  pluginName: document.getElementById('plugin-name'),
  pluginBrand: document.getElementById('plugin-brand'),
  streamConfigModal: document.getElementById('stream-config-modal'),
  urlsModal: document.getElementById('urls-modal'),
  urlsList: document.getElementById('urls-list'),
  streamPlayerContainer: document.getElementById('stream-player-container')
};

// Estado da aplicação
let currentZoom = 1;
let isLoading = false;
let currentUrl = 'about:blank';
let settings = {};

// Instâncias dos handlers
let activeXHandler = null;
let streamPlayer = null;
let detectedPluginInfo = null;
let currentHost = null;

// ============================================
// Inicialização
// ============================================

async function init() {
  // Carregar configurações
  settings = await window.iePortable.getSettings();
  elements.ieVersionText.textContent = settings.ieVersion?.toUpperCase() || 'IE11';
  
  // Configurar User-Agent do webview
  const userAgent = await window.iePortable.getUserAgent();
  elements.webview.setAttribute('useragent', userAgent);
  
  // Inicializar handlers
  activeXHandler = new ActiveXHandler();
  streamPlayer = new StreamPlayer(elements.streamPlayerContainer);
  
  // Expor streamPlayer globalmente para callbacks
  window.streamPlayer = streamPlayer;
  
  // Carregar favoritos no quick access
  await loadQuickAccess();
  
  // Configurar event listeners
  setupEventListeners();
  setupIPCListeners();
  setupWebviewListeners();
  setupPluginHandlers();
  
  // Mostrar página inicial
  showStartPage();
  
  // Foco na barra de endereço
  setTimeout(() => elements.urlInput.focus(), 100);
}

// ============================================
// Navegação
// ============================================

function navigate(url) {
  if (!url || url.trim() === '') {
    showStartPage();
    return;
  }
  
  // Normalizar URL
  url = normalizeUrl(url);
  
  // Esconder página inicial
  hideStartPage();
  
  // Navegar
  elements.webview.src = url;
  elements.urlInput.value = url;
  currentUrl = url;
  
  // Adicionar ao histórico
  window.iePortable.addToHistory({ url, title: url });
}

function normalizeUrl(url) {
  url = url.trim();
  
  // Se for about:blank ou about:home
  if (url.startsWith('about:')) {
    return url;
  }
  
  // Se for um IP local ou hostname
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?/.test(url)) {
    return 'http://' + url;
  }
  
  // Se não tem protocolo
  if (!url.match(/^https?:\/\//i)) {
    // Se parece ser um domínio
    if (url.includes('.') || url.includes(':')) {
      return 'http://' + url;
    }
    // Caso contrário, é uma busca
    return 'https://www.google.com/search?q=' + encodeURIComponent(url);
  }
  
  return url;
}

function goBack() {
  if (elements.webview.canGoBack()) {
    elements.webview.goBack();
  }
}

function goForward() {
  if (elements.webview.canGoForward()) {
    elements.webview.goForward();
  }
}

function reload(force = false) {
  if (currentUrl === 'about:blank') {
    return;
  }
  if (force) {
    elements.webview.reloadIgnoringCache();
  } else {
    elements.webview.reload();
  }
}

function stopLoading() {
  elements.webview.stop();
}

function goHome() {
  const homepage = settings.homepage || 'about:blank';
  if (homepage === 'about:blank') {
    showStartPage();
    elements.urlInput.value = '';
    currentUrl = 'about:blank';
  } else {
    navigate(homepage);
  }
}

function showStartPage() {
  elements.startPage.classList.remove('hidden');
  elements.webview.src = 'about:blank';
}

function hideStartPage() {
  elements.startPage.classList.add('hidden');
}

// ============================================
// Zoom
// ============================================

function zoomIn() {
  currentZoom = Math.min(currentZoom + 0.1, 3);
  elements.webview.setZoomFactor(currentZoom);
  updateStatus(`Zoom: ${Math.round(currentZoom * 100)}%`);
}

function zoomOut() {
  currentZoom = Math.max(currentZoom - 0.1, 0.25);
  elements.webview.setZoomFactor(currentZoom);
  updateStatus(`Zoom: ${Math.round(currentZoom * 100)}%`);
}

function zoomReset() {
  currentZoom = 1;
  elements.webview.setZoomFactor(currentZoom);
  updateStatus('Zoom: 100%');
}

// ============================================
// Favoritos
// ============================================

async function loadQuickAccess() {
  const favorites = await window.iePortable.getFavorites();
  elements.quickAccessItems.innerHTML = '';
  
  if (favorites.length === 0) {
    elements.quickAccessItems.innerHTML = '<p style="opacity: 0.7;">Nenhum favorito ainda. Pressione Ctrl+D para adicionar.</p>';
    return;
  }
  
  favorites.slice(0, 8).forEach(fav => {
    const item = document.createElement('div');
    item.className = 'quick-item';
    item.innerHTML = `
      <div class="quick-item-icon"></div>
      <span class="quick-item-title">${escapeHtml(fav.title)}</span>
    `;
    item.onclick = () => navigate(fav.url);
    elements.quickAccessItems.appendChild(item);
  });
}

async function loadFavoritesList() {
  const favorites = await window.iePortable.getFavorites();
  elements.favoritesList.innerHTML = '';
  
  if (favorites.length === 0) {
    elements.favoritesList.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">Nenhum favorito salvo.</p>';
    return;
  }
  
  favorites.forEach(fav => {
    const item = document.createElement('div');
    item.className = 'favorite-item';
    item.innerHTML = `
      <svg class="favorite-item-icon" viewBox="0 0 24 24" width="16" height="16">
        <path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
      </svg>
      <div class="favorite-item-info">
        <div class="favorite-item-title">${escapeHtml(fav.title)}</div>
        <div class="favorite-item-url">${escapeHtml(fav.url)}</div>
      </div>
      <button class="favorite-item-delete" title="Remover">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    `;
    
    item.querySelector('.favorite-item-info').onclick = () => {
      navigate(fav.url);
      closeFavoritesPanel();
    };
    
    item.querySelector('.favorite-item-delete').onclick = async (e) => {
      e.stopPropagation();
      await window.iePortable.removeFavorite(fav.url);
      loadFavoritesList();
      loadQuickAccess();
    };
    
    elements.favoritesList.appendChild(item);
  });
}

function showAddFavoriteModal() {
  const title = elements.webview.getTitle() || currentUrl;
  elements.favName.value = title;
  elements.favUrl.value = currentUrl;
  elements.favoritesModal.classList.remove('hidden');
  elements.favName.focus();
  elements.favName.select();
}

function closeAddFavoriteModal() {
  elements.favoritesModal.classList.add('hidden');
}

async function saveFavorite() {
  const title = elements.favName.value.trim();
  const url = elements.favUrl.value;
  
  if (!title || !url || url === 'about:blank') {
    return;
  }
  
  await window.iePortable.addFavorite({ title, url });
  closeAddFavoriteModal();
  loadQuickAccess();
  updateStatus('Favorito adicionado');
}

function toggleFavoritesPanel() {
  if (elements.favoritesPanel.classList.contains('hidden')) {
    loadFavoritesList();
    elements.favoritesPanel.classList.remove('hidden');
  } else {
    closeFavoritesPanel();
  }
}

function closeFavoritesPanel() {
  elements.favoritesPanel.classList.add('hidden');
}

// ============================================
// Configurações
// ============================================

async function showSettingsModal() {
  settings = await window.iePortable.getSettings();
  elements.settingHomepage.value = settings.homepage || '';
  elements.settingIEVersion.value = settings.ieVersion || 'ie11';
  elements.settingsModal.classList.remove('hidden');
}

// ============================================
// Gerenciador de Plugins
// ============================================

function openPluginManager() {
  window.iePortable.openPluginManager();
  updateStatus('Abrindo Gerenciador de Plugins...');
}

function closeSettingsModal() {
  elements.settingsModal.classList.add('hidden');
}

async function applySettings() {
  const newSettings = {
    homepage: elements.settingHomepage.value.trim(),
    ieVersion: elements.settingIEVersion.value
  };
  
  await window.iePortable.saveSettings(newSettings);
  settings = newSettings;
  
  elements.ieVersionText.textContent = newSettings.ieVersion.toUpperCase();
  updateStatus('Configurações aplicadas');
}

async function saveSettings() {
  await applySettings();
  closeSettingsModal();
}

// ============================================
// Tabs de configuração
// ============================================

function setupSettingsTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(`tab-${tabId}`).classList.add('active');
    });
  });
}

// ============================================
// Status e UI
// ============================================

function updateStatus(text) {
  elements.statusText.textContent = text;
}

function updateSecurityIndicator(url) {
  const indicator = elements.securityIndicator;
  indicator.classList.remove('secure', 'insecure');
  
  if (url.startsWith('https://')) {
    indicator.classList.add('secure');
    indicator.title = 'Conexão segura';
  } else if (url.startsWith('http://')) {
    indicator.classList.add('insecure');
    indicator.title = 'Conexão não segura';
  } else {
    indicator.title = 'Informações de segurança';
  }
}

function updateNavigationButtons() {
  elements.btnBack.disabled = !elements.webview.canGoBack();
  elements.btnForward.disabled = !elements.webview.canGoForward();
}

function showLoading() {
  isLoading = true;
  elements.btnRefresh.style.display = 'none';
  elements.btnStop.style.display = 'flex';
}

function hideLoading() {
  isLoading = false;
  elements.btnRefresh.style.display = 'flex';
  elements.btnStop.style.display = 'none';
}

// ============================================
// Event Listeners
// ============================================

function setupEventListeners() {
  // Barra de endereço
  elements.urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      navigate(elements.urlInput.value);
    }
    if (e.key === 'Escape') {
      elements.urlInput.value = currentUrl;
      elements.urlInput.blur();
    }
  });
  
  elements.urlInput.addEventListener('focus', () => {
    elements.urlInput.select();
  });
  
  // Botões de navegação
  elements.btnBack.addEventListener('click', goBack);
  elements.btnForward.addEventListener('click', goForward);
  elements.btnRefresh.addEventListener('click', () => reload());
  elements.btnStop.addEventListener('click', stopLoading);
  elements.btnHome.addEventListener('click', goHome);
  elements.btnGo.addEventListener('click', () => navigate(elements.urlInput.value));
  
  // Botões de ação
  elements.btnFavorite.addEventListener('click', showAddFavoriteModal);
  elements.btnFavoritesMenu.addEventListener('click', toggleFavoritesPanel);
  elements.btnPlugins.addEventListener('click', openPluginManager);
  elements.btnSettings.addEventListener('click', showSettingsModal);
  
  // Modal de favoritos
  elements.favSave.addEventListener('click', saveFavorite);
  elements.favCancel.addEventListener('click', closeAddFavoriteModal);
  elements.favName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveFavorite();
    if (e.key === 'Escape') closeAddFavoriteModal();
  });
  
  // Modal de configurações
  elements.settingsSave.addEventListener('click', saveSettings);
  elements.settingsCancel.addEventListener('click', closeSettingsModal);
  elements.settingsApply.addEventListener('click', applySettings);
  
  // Fechar modais pelo X
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal').classList.add('hidden');
    });
  });
  
  // Fechar painel de favoritos
  document.querySelector('.panel-close').addEventListener('click', closeFavoritesPanel);
  
  // Fechar modais clicando fora
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });
  
  // Atalhos de teclado
  document.addEventListener('keydown', (e) => {
    // Ctrl+L - focar barra de endereço
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      elements.urlInput.focus();
    }
    
    // Ctrl+D - adicionar favorito
    if (e.ctrlKey && e.key === 'd') {
      e.preventDefault();
      showAddFavoriteModal();
    }
    
    // F5 - recarregar
    if (e.key === 'F5') {
      e.preventDefault();
      reload(e.ctrlKey);
    }
    
    // Escape - parar carregamento
    if (e.key === 'Escape' && isLoading) {
      stopLoading();
    }
    
    // Alt+Left - voltar
    if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      goBack();
    }
    
    // Alt+Right - avançar
    if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      goForward();
    }
  });
  
  // Setup tabs de configuração
  setupSettingsTabs();
}

// ============================================
// IPC Listeners (comunicação com main process)
// ============================================

function setupIPCListeners() {
  window.iePortable.onFocusUrlBar(() => {
    elements.urlInput.focus();
    elements.urlInput.select();
  });
  
  window.iePortable.onReloadPage(() => reload());
  window.iePortable.onForceReloadPage(() => reload(true));
  
  window.iePortable.onZoomIn(() => zoomIn());
  window.iePortable.onZoomOut(() => zoomOut());
  window.iePortable.onZoomReset(() => zoomReset());
  
  window.iePortable.onNavigateTo((event, url) => navigate(url));
  
  window.iePortable.onPrintPage(() => {
    elements.webview.print();
  });
  
  window.iePortable.onShowSettings(() => showSettingsModal());
  
  window.iePortable.onAddFavorite(() => showAddFavoriteModal());
  window.iePortable.onManageFavorites(() => toggleFavoritesPanel());
  
  window.iePortable.onIEVersionChanged(async (event, version) => {
    elements.ieVersionText.textContent = version.toUpperCase();
    const userAgent = await window.iePortable.getUserAgent();
    // Note: Para aplicar o novo User-Agent, a página precisa ser recarregada
  });
}

// ============================================
// WebView Event Listeners
// ============================================

function setupWebviewListeners() {
  // Início do carregamento
  elements.webview.addEventListener('did-start-loading', () => {
    showLoading();
    updateStatus('Conectando...');
  });
  
  // Fim do carregamento
  elements.webview.addEventListener('did-stop-loading', () => {
    hideLoading();
    updateStatus('Pronto');
    updateNavigationButtons();
  });
  
  // Página carregada
  elements.webview.addEventListener('did-finish-load', async () => {
    hideLoading();
    updateStatus('Pronto');
    
    // Injetar polyfill ActiveX para emular ActiveXObject
    try {
      await injectActiveXPolyfill(elements.webview);
      console.log('ActiveX Polyfill injetado com sucesso');
      
      // Verificar se há ActiveX na página após um pequeno delay
      setTimeout(() => detectActiveXInPage(), 500);
    } catch (err) {
      console.error('Erro ao injetar ActiveX Polyfill:', err);
    }
  });
  
  // Navegação iniciada
  elements.webview.addEventListener('did-start-navigation', (e) => {
    if (e.isMainFrame) {
      currentUrl = e.url;
      elements.urlInput.value = e.url;
      updateSecurityIndicator(e.url);
      updateStatus('Carregando...');
      
      if (e.url !== 'about:blank') {
        hideStartPage();
      }
    }
  });
  
  // Título alterado
  elements.webview.addEventListener('page-title-updated', (e) => {
    document.title = e.title ? `${e.title} - IE Portable` : 'IE Portable';
  });
  
  // Falha no carregamento
  elements.webview.addEventListener('did-fail-load', (e) => {
    if (e.errorCode !== -3) { // Ignorar ERR_ABORTED
      hideLoading();
      updateStatus(`Erro: ${e.errorDescription}`);
    }
  });
  
  // Novo popup/janela
  elements.webview.addEventListener('new-window', (e) => {
    // Abrir na mesma janela
    navigate(e.url);
  });
  
  // Requisição de permissão
  elements.webview.addEventListener('permission-request', (e) => {
    // Permitir todas as permissões (necessário para alguns DVRs)
    e.request.allow();
  });
  
  // Console do webview (debug) - também captura mensagens do ActiveX Polyfill
  elements.webview.addEventListener('console-message', (e) => {
    console.log('WebView:', e.message);
    
    // Detectar mensagens do polyfill ActiveX
    if (e.message.includes('[ActiveX]') || e.message.includes('[IE Portable]')) {
      console.log('📌 ActiveX Polyfill:', e.message);
    }
  });
  
  // Interceptar mensagens postMessage do polyfill via script injetado
  elements.webview.addEventListener('did-finish-load', () => {
    // Configurar bridge para receber mensagens do polyfill e enviar para o renderer
    elements.webview.executeJavaScript(`
      window.addEventListener('message', function(event) {
        if (event.data && event.data.type && event.data.type.startsWith('ACTIVEX_')) {
          console.log('[ActiveX-Bridge] Evento:', event.data.type, JSON.stringify(event.data));
        }
      });
    `).catch(() => {});
  });
  
  // Listener para console messages que podem conter eventos do polyfill
  elements.webview.addEventListener('console-message', (e) => {
    // Capturar eventos do bridge ActiveX
    if (e.message.includes('[ActiveX-Bridge] Evento:')) {
      try {
        // Extrair o tipo e dados do evento
        const match = e.message.match(/\[ActiveX-Bridge\] Evento: (\w+) (.+)/);
        if (match) {
          const eventType = match[1];
          const eventData = JSON.parse(match[2]);
          handleActiveXPolyfillEvent(eventType, eventData);
        }
      } catch (err) {
        console.warn('Erro ao processar evento ActiveX:', err);
      }
    }
  });
  
  // Interceptar downloads - detectar plugins ActiveX
  elements.webview.addEventListener('will-download', (e) => {
    const url = e.url;
    if (activeXHandler && activeXHandler.isPluginDownload(url)) {
      e.preventDefault();
      handlePluginDownload(url);
    }
  });
}

// ============================================
// Handlers de Plugin ActiveX
// ============================================

function setupPluginHandlers() {
  // Botões do modal de plugin
  document.getElementById('btn-try-stream').addEventListener('click', () => {
    elements.pluginModal.classList.add('hidden');
    tryAutoStream();
  });
  
  document.getElementById('btn-show-urls').addEventListener('click', () => {
    elements.pluginModal.classList.add('hidden');
    showKnownUrls();
  });
  
  document.getElementById('btn-manual-stream').addEventListener('click', () => {
    elements.pluginModal.classList.add('hidden');
    showStreamConfigModal();
  });
  
  document.getElementById('btn-continue-anyway').addEventListener('click', () => {
    elements.pluginModal.classList.add('hidden');
  });
  
  // Modal de configuração de stream
  document.getElementById('stream-connect').addEventListener('click', () => {
    connectManualStream();
  });
  
  document.getElementById('stream-cancel').addEventListener('click', () => {
    elements.streamConfigModal.classList.add('hidden');
  });
  
  // Fechar modais com X
  elements.pluginModal.querySelector('.modal-close').addEventListener('click', () => {
    elements.pluginModal.classList.add('hidden');
  });
  
  elements.streamConfigModal.querySelector('.modal-close').addEventListener('click', () => {
    elements.streamConfigModal.classList.add('hidden');
  });
  
  elements.urlsModal.querySelector('.modal-close').addEventListener('click', () => {
    elements.urlsModal.classList.add('hidden');
  });
}

/**
 * Manipula eventos do polyfill ActiveX
 */
function handleActiveXPolyfillEvent(eventType, eventData) {
  console.log('ActiveX Event:', eventType, eventData);
  
  switch (eventType) {
    case 'ACTIVEX_CREATED':
      // Um objeto ActiveX foi criado via JavaScript
      console.log(`ActiveX criado: ${eventData.progId}, CLSID: ${eventData.clsid}`);
      if (eventData.clsid) {
        const info = activeXHandler.identifyByCLSID(eventData.clsid);
        if (info) {
          detectedPluginInfo = { ...info, clsid: eventData.clsid };
          updateStatus(`Plugin ActiveX detectado: ${info.brand}`);
        }
      }
      break;
      
    case 'ACTIVEX_OBJECT_TAG':
      // Tag <object> com CLSID foi detectada na página
      console.log(`Tag <object> detectada, CLSID: ${eventData.clsid}`);
      
      try {
        currentHost = new URL(currentUrl).host;
      } catch (e) {
        currentHost = currentUrl;
      }
      
      const info = activeXHandler.identifyByCLSID(eventData.clsid);
      detectedPluginInfo = info ? { ...info, clsid: eventData.clsid } : {
        brand: 'ActiveX Desconhecido',
        clsid: eventData.clsid,
        rtspPort: 554,
        rtspPath: '/stream1'
      };
      
      updateStatus(`Plugin ActiveX na página: ${detectedPluginInfo.brand}`);
      break;
      
    case 'ACTIVEX_SHOW_PLAYER':
      // Usuário clicou no botão para abrir player alternativo
      console.log('Abrindo player alternativo para CLSID:', eventData.clsid);
      
      try {
        currentHost = new URL(currentUrl).host;
      } catch (e) {
        currentHost = currentUrl;
      }
      
      const playerInfo = activeXHandler.identifyByCLSID(eventData.clsid);
      detectedPluginInfo = playerInfo || { 
        brand: 'Desconhecido', 
        clsid: eventData.clsid,
        rtspPort: 554, 
        rtspPath: '/stream1' 
      };
      
      // Mostrar modal de configuração
      showActiveXDetectedModal(eventData.clsid, detectedPluginInfo);
      break;
      
    case 'ACTIVEX_PLAY':
      // O JavaScript da página tentou fazer Play
      console.log('ActiveX Play chamado:', eventData);
      
      // Se temos informações de conexão, usar para tentar stream
      if (eventData.connectionInfo) {
        const { ip, port, user, pass } = eventData.connectionInfo;
        currentHost = ip;
        document.getElementById('stream-user').value = user || 'admin';
        document.getElementById('stream-pass').value = pass || '';
      }
      
      // Mostrar modal para configurar stream
      showActiveXDetectedModal(eventData.clsid, detectedPluginInfo || { brand: 'DVR' });
      break;
      
    case 'ACTIVEX_STOP':
      // O JavaScript da página tentou fazer Stop
      if (streamPlayer) {
        streamPlayer.stop();
      }
      break;
  }
}

/**
 * Manipula tentativa de download de plugin ActiveX
 */
function handlePluginDownload(url) {
  console.log('Plugin detectado:', url);
  
  // Identificar o plugin
  detectedPluginInfo = activeXHandler.identifyPlugin(url);
  
  // Extrair o host atual
  try {
    currentHost = new URL(currentUrl).host;
  } catch (e) {
    currentHost = currentUrl;
  }
  
  // Preencher modal
  const filename = url.split('/').pop().split('?')[0];
  elements.pluginName.textContent = filename;
  elements.pluginBrand.textContent = detectedPluginInfo.brand;
  
  // Pré-preencher configuração de stream
  document.getElementById('stream-url').value = `rtsp://${currentHost}:${detectedPluginInfo.rtspPort}${detectedPluginInfo.rtspPath}`;
  document.getElementById('stream-user').value = 'admin';
  document.getElementById('stream-pass').value = '';
  
  // Mostrar modal
  elements.pluginModal.classList.remove('hidden');
  
  updateStatus('Plugin ActiveX detectado - Alternativas disponíveis');
}

/**
 * Detecta CLSIDs de ActiveX no conteúdo HTML da página
 */
async function detectActiveXInPage() {
  try {
    // Executar script no webview para pegar o HTML
    const html = await elements.webview.executeJavaScript('document.documentElement.outerHTML');
    const clsids = activeXHandler.detectCLSIDInHtml(html);
    
    if (clsids.length > 0) {
      console.log('CLSIDs detectados na página:', clsids);
      
      // Extrair host atual
      try {
        currentHost = new URL(currentUrl).host;
      } catch (e) {
        currentHost = currentUrl;
      }
      
      // Verificar se algum é reconhecido
      for (const clsid of clsids) {
        const info = activeXHandler.identifyByCLSID(clsid);
        if (info) {
          console.log(`CLSID ${clsid} identificado como ${info.brand}`);
          detectedPluginInfo = {
            ...info,
            clsid: clsid
          };
          
          // Mostrar notificação na barra de status
          updateStatus(`Plugin ActiveX detectado: ${info.brand} - Clique no ícone 🔌 para alternativas`);
          
          // Mostrar modal automaticamente se não estiver escondido
          showActiveXDetectedModal(clsid, info);
          
          return clsids;
        }
      }
      
      // Se não reconheceu nenhum, ainda salva o primeiro
      detectedPluginInfo = {
        brand: 'ActiveX Desconhecido',
        clsid: clsids[0],
        rtspPort: 554,
        rtspPath: '/stream1'
      };
      
      // Mostrar modal para CLSID desconhecido também
      showActiveXDetectedModal(clsids[0], detectedPluginInfo);
      
      return clsids;
    }
  } catch (e) {
    console.warn('Erro ao detectar ActiveX:', e);
  }
  return [];
}

/**
 * Mostra modal quando ActiveX é detectado na página
 */
function showActiveXDetectedModal(clsid, info) {
  // Preencher informações no modal
  elements.pluginName.textContent = `ActiveX CLSID: ${clsid.substring(0, 8)}...`;
  elements.pluginBrand.textContent = info.brand || 'Desconhecido';
  
  // Pré-preencher configuração de stream com base no DVR detectado
  const rtspPort = info.rtspPort || 554;
  const rtspPath = info.rtspPaths ? info.rtspPaths[0] : (info.rtspPath || '/stream1');
  
  document.getElementById('stream-url').value = `rtsp://${currentHost}:${rtspPort}${rtspPath}`;
  document.getElementById('stream-user').value = 'admin';
  document.getElementById('stream-pass').value = '';
  
  // Mostrar modal
  elements.pluginModal.classList.remove('hidden');
  
  console.log('Modal ActiveX exibido para:', clsid, info.brand);
}

/**
 * Tenta conectar automaticamente ao stream
 */
async function tryAutoStream() {
  if (!currentHost) return;
  
  updateStatus('Buscando streams disponíveis...');
  
  const username = document.getElementById('stream-user').value || 'admin';
  const password = document.getElementById('stream-pass').value || 'admin';
  
  // Tentar detectar CLSID na página para obter URLs mais precisas
  await detectActiveXInPage();
  
  // Determinar o CLSID para usar
  const clsid = detectedPluginInfo?.clsid || null;
  
  // Construir URL base com protocolo e porta
  let baseUrl;
  try {
    const urlObj = new URL(currentUrl);
    baseUrl = `${urlObj.protocol}//${urlObj.host}`;
  } catch (e) {
    baseUrl = currentHost;
  }
  
  // Gerar URLs possíveis (usa CLSID se disponível)
  let snapshotUrls;
  if (clsid) {
    const dvrInfo = activeXHandler.getDvrInfo(baseUrl, clsid, username, password);
    snapshotUrls = dvrInfo.snapshotUrls;
    
    if (dvrInfo.detected) {
      updateStatus(`Marca detectada: ${dvrInfo.brand}. Testando URLs...`);
    }
  } else {
    snapshotUrls = activeXHandler.generateSnapshotUrls(baseUrl, username, password);
  }
  
  // Ordenar por prioridade se disponível
  snapshotUrls.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[a.priority] ?? 1;
    const bPriority = priorityOrder[b.priority] ?? 1;
    return aPriority - bPriority;
  });
  
  // Tentar snapshots
  for (const urlInfo of snapshotUrls.slice(0, 8)) {
    const url = typeof urlInfo === 'string' ? urlInfo : urlInfo.url;
    const brand = typeof urlInfo === 'string' ? '' : urlInfo.brand;
    
    try {
      const displayUrl = url.replace(/:([^:@]+)@/, ':****@');
      updateStatus(`Testando ${brand}: ${displayUrl.substring(0, 50)}...`);
      
      const img = new Image();
      const result = await new Promise((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        setTimeout(() => resolve(false), 5000);
        img.src = url;
      });
      
      if (result) {
        // Encontrou! Abrir player com refresh de imagem
        streamPlayer.play({
          url: url,
          type: 'image',
          username,
          password
        });
        updateStatus(`Stream encontrado! (${brand})`);
        return;
      }
    } catch (e) {
      continue;
    }
  }
  
  // Se não encontrou snapshot, mostrar opções RTSP
  updateStatus('Snapshots não encontrados. Mostrando URLs RTSP...');
  showKnownUrls();
}

/**
 * Mostra lista de URLs conhecidas
 */
async function showKnownUrls() {
  if (!currentHost) return;
  
  const username = document.getElementById('stream-user').value || 'admin';
  const password = document.getElementById('stream-pass').value || 'admin';
  
  // Tentar detectar CLSID se ainda não foi detectado
  if (!detectedPluginInfo?.clsid) {
    await detectActiveXInPage();
  }
  
  const clsid = detectedPluginInfo?.clsid || null;
  
  // Construir URL base
  let baseUrl;
  try {
    const urlObj = new URL(currentUrl);
    baseUrl = `${urlObj.protocol}//${urlObj.host}`;
  } catch (e) {
    baseUrl = currentHost;
  }
  
  let snapshotUrls, rtspUrls;
  
  if (clsid) {
    const dvrInfo = activeXHandler.getDvrInfo(baseUrl, clsid, username, password);
    snapshotUrls = dvrInfo.snapshotUrls;
    rtspUrls = dvrInfo.rtspUrls.length > 0 ? dvrInfo.rtspUrls : activeXHandler.generateRtspUrls(currentHost, username, password);
  } else {
    snapshotUrls = activeXHandler.generateSnapshotUrls(baseUrl, username, password);
    rtspUrls = activeXHandler.generateRtspUrls(currentHost, username, password);
  }
  
  // Popular lista
  elements.urlsList.innerHTML = '';
  
  // Mostrar marca detectada se disponível
  if (detectedPluginInfo?.brand) {
    const brandInfo = document.createElement('div');
    brandInfo.className = 'brand-info';
    brandInfo.innerHTML = `<strong>🔍 Marca detectada:</strong> ${escapeHtml(detectedPluginInfo.brand)}`;
    brandInfo.style.cssText = 'padding: 8px 12px; background: #e3f2fd; border-radius: 4px; margin-bottom: 12px; color: #1565c0;';
    elements.urlsList.appendChild(brandInfo);
  }
  
  // Adicionar seção RTSP
  const rtspHeader = document.createElement('h4');
  rtspHeader.textContent = '📹 URLs RTSP (usar VLC ou ffmpeg)';
  rtspHeader.style.margin = '16px 0 8px 0';
  elements.urlsList.appendChild(rtspHeader);
  
  // Para URLs RTSP, mostrar as específicas da marca primeiro
  const rtspToShow = rtspUrls.slice(0, 10);
  rtspToShow.forEach(urlInfo => {
    const url = typeof urlInfo === 'string' ? urlInfo : urlInfo.url;
    const brand = typeof urlInfo === 'string' ? '' : urlInfo.brand;
    addUrlItem(url, 'rtsp', brand);
  });
  
  // Adicionar seção HTTP/Snapshot
  const httpHeader = document.createElement('h4');
  httpHeader.textContent = '📷 URLs de Snapshot/MJPEG';
  httpHeader.style.margin = '16px 0 8px 0';
  elements.urlsList.appendChild(httpHeader);
  
  // Ordenar snapshots por prioridade
  snapshotUrls.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[a.priority] ?? 1;
    const bPriority = priorityOrder[b.priority] ?? 1;
    return aPriority - bPriority;
  });
  
  snapshotUrls.forEach(urlInfo => {
    const url = typeof urlInfo === 'string' ? urlInfo : urlInfo.url;
    const brand = typeof urlInfo === 'string' ? '' : urlInfo.brand;
    const priority = typeof urlInfo === 'string' ? '' : urlInfo.priority;
    addUrlItem(url, 'http', brand, priority);
  });
  
  elements.urlsModal.classList.remove('hidden');
}

/**
 * Adiciona item de URL na lista
 */
function addUrlItem(url, type, brand = '', priority = '') {
  const item = document.createElement('div');
  item.className = 'url-item';
  
  // Esconder credenciais na exibição
  const displayUrl = url.replace(/:([^:@]+)@/, ':****@');
  
  // Indicador de prioridade
  let priorityBadge = '';
  if (priority === 'high') {
    priorityBadge = '<span class="priority-badge high">★</span>';
  }
  
  // Badge da marca
  let brandBadge = '';
  if (brand) {
    brandBadge = `<span class="brand-badge">${escapeHtml(brand)}</span>`;
  }
  
  item.innerHTML = `
    <span class="url-item-icon">${type === 'rtsp' ? '🎬' : '🖼️'}</span>
    ${priorityBadge}
    ${brandBadge}
    <span class="url-item-text">${escapeHtml(displayUrl)}</span>
    <button class="url-item-copy" title="Copiar">📋</button>
    <button class="url-item-test" title="Testar">▶️</button>
  `;
  
  // Estilo para badges
  const brandBadgeEl = item.querySelector('.brand-badge');
  if (brandBadgeEl) {
    brandBadgeEl.style.cssText = 'font-size: 10px; background: #e0e0e0; padding: 2px 6px; border-radius: 3px; margin-right: 4px;';
  }
  
  const priorityBadgeEl = item.querySelector('.priority-badge');
  if (priorityBadgeEl) {
    priorityBadgeEl.style.cssText = 'color: #ffc107; margin-right: 4px;';
  }
  
  // Clique para tentar conectar
  item.querySelector('.url-item-test').addEventListener('click', (e) => {
    e.stopPropagation();
    elements.urlsModal.classList.add('hidden');
    
    if (type === 'rtsp') {
      // Para RTSP, mostrar no player com instruções
      streamPlayer.play({
        url: url,
        type: 'rtsp',
        username: document.getElementById('stream-user').value,
        password: document.getElementById('stream-pass').value
      });
    } else {
      // Para HTTP, tentar diretamente
      streamPlayer.play({
        url: url,
        type: 'auto',
        username: document.getElementById('stream-user').value,
        password: document.getElementById('stream-pass').value
      });
    }
  });
  
  // Clique no texto também testa
  item.querySelector('.url-item-text').addEventListener('click', () => {
    item.querySelector('.url-item-test').click();
  });
  
  // Botão copiar
  item.querySelector('.url-item-copy').addEventListener('click', (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url).then(() => {
      updateStatus('URL copiada!');
    });
  });
  
  elements.urlsList.appendChild(item);
}

/**
 * Mostra modal de configuração manual de stream
 */
function showStreamConfigModal() {
  elements.streamConfigModal.classList.remove('hidden');
  document.getElementById('stream-url').focus();
}

/**
 * Conecta ao stream configurado manualmente
 */
function connectManualStream() {
  const url = document.getElementById('stream-url').value.trim();
  const username = document.getElementById('stream-user').value.trim();
  const password = document.getElementById('stream-pass').value;
  const type = document.getElementById('stream-type').value;
  
  if (!url) {
    alert('Por favor, insira a URL do stream.');
    return;
  }
  
  elements.streamConfigModal.classList.add('hidden');
  
  streamPlayer.play({
    url: url,
    type: type === 'auto' ? undefined : type,
    username,
    password
  });
}

// ============================================
// Utilitários
// ============================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// Iniciar
// ============================================

document.addEventListener('DOMContentLoaded', init);
