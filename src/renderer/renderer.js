// ============================================
// IE Portable - Renderer Process
// ============================================

// Polyfill ActiveX - carregado via preload (eliminando template literals)
let ACTIVEX_POLYFILL_SCRIPT = '';

// Função para injetar o polyfill no webview
async function injectActiveXPolyfill(webview) {
  if (!ACTIVEX_POLYFILL_SCRIPT) {
    // Carregar do preload na primeira chamada
    try {
      ACTIVEX_POLYFILL_SCRIPT = window.iePortable.getActiveXPolyfill();
      console.log('[Renderer] Polyfill carregado via preload, tamanho:', ACTIVEX_POLYFILL_SCRIPT.length);
    } catch(e) {
      console.error('[Renderer] Falha ao obter polyfill:', e);
      return false;
    }
  }
  if (!ACTIVEX_POLYFILL_SCRIPT) {
    console.error('[Renderer] Polyfill vazio');
    return false;
  }
  try {
    await webview.executeJavaScript(ACTIVEX_POLYFILL_SCRIPT);
    console.log('[Renderer] ActiveX Polyfill injetado');
    return true;
  } catch (error) {
    console.error('[Renderer] Erro ao injetar polyfill:', error);
    return false;
  }
}

// Elementos DOM - inicializados após DOMContentLoaded
let elements = {};

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
let activeRtspStreams = []; // IDs dos streams RTSP ativos
let previewInjected = false; // Evitar reinjetar na mesma sessão

// Função para inicializar referências aos elementos DOM
function initElements() {
  elements = {
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
    streamPlayerContainer: document.getElementById('stream-player-container'),

    // Modal RTSP Credentials
    rtspCredentialsModal: document.getElementById('rtsp-credentials-modal'),
    rtspHost: document.getElementById('rtsp-host'),
    rtspPort: document.getElementById('rtsp-port'),
    rtspUser: document.getElementById('rtsp-user'),
    rtspPass: document.getElementById('rtsp-pass'),
    rtspChannels: document.getElementById('rtsp-channels'),
    rtspQuality: document.getElementById('rtsp-quality'),
    rtspStatusMsg: document.getElementById('rtsp-status-msg')
  };
}

// ============================================
// Inicialização
// ============================================

async function init() {
  console.log('[Renderer] init() chamada');
  
  // Inicializar referências aos elementos DOM
  initElements();
  console.log('[Renderer] Elementos inicializados:', Object.keys(elements).length, 'elementos');
  console.log('[Renderer] webview:', elements.webview);
  console.log('[Renderer] urlInput:', elements.urlInput);
  
  // Carregar configurações
  console.log('[Renderer] Carregando configurações...');
  settings = await window.iePortable.getSettings();
  console.log('[Renderer] Configurações carregadas:', settings);
  
  elements.ieVersionText.textContent = settings.ieVersion?.toUpperCase() || 'IE11';
  console.log('[Renderer] IE Version configurada');
  
  // Configurar User-Agent do webview
  console.log('[Renderer] Obtendo User-Agent...');
  const userAgent = await window.iePortable.getUserAgent();
  console.log('[Renderer] User-Agent:', userAgent);
  elements.webview.setAttribute('useragent', userAgent);
  
  // Inicializar handlers
  console.log('[Renderer] Inicializando ActiveXHandler...');
  activeXHandler = new ActiveXHandler();
  console.log('[Renderer] Inicializando StreamPlayer...');
  streamPlayer = new StreamPlayer(elements.streamPlayerContainer);
  
  // Expor streamPlayer globalmente para callbacks
  window.streamPlayer = streamPlayer;
  
  // Carregar favoritos no quick access
  console.log('[Renderer] Carregando Quick Access...');
  await loadQuickAccess();
  
  // Configurar event listeners
  console.log('[Renderer] setupEventListeners...');
  setupEventListeners();
  console.log('[Renderer] setupIPCListeners...');
  setupIPCListeners();
  console.log('[Renderer] setupWebviewListeners...');
  setupWebviewListeners();
  console.log('[Renderer] setupPluginHandlers...');
  setupPluginHandlers();
  console.log('[Renderer] Todos os handlers configurados');
  
  // Mostrar página inicial
  console.log('[Renderer] Mostrando página inicial...');
  showStartPage();
  
  // Foco na barra de endereço
  setTimeout(() => elements.urlInput.focus(), 100);
  console.log('[Renderer] init() concluída');
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

  // Navegação in-page (hash changes em SPAs como Hikvision)
  elements.webview.addEventListener('did-navigate-in-page', (e) => {
    if (e.isMainFrame) {
      currentUrl = e.url;
      elements.urlInput.value = e.url;
      console.log('[Renderer] SPA navigation:', e.url);
      checkForPreviewPage(e.url);
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
  document.getElementById('btn-try-webconfig').addEventListener('click', () => {
    elements.pluginModal.classList.add('hidden');
    tryWebConfigInterface();
  });
  
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

  // Modal RTSP Credentials
  document.getElementById('rtsp-connect').addEventListener('click', () => {
    connectRtspPreview();
  });
  document.getElementById('rtsp-cancel').addEventListener('click', () => {
    elements.rtspCredentialsModal.classList.add('hidden');
  });
  elements.rtspCredentialsModal.querySelector('.modal-close').addEventListener('click', () => {
    elements.rtspCredentialsModal.classList.add('hidden');
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
 * Tenta acessar a interface web de configuração (sem ActiveX)
 */
async function tryWebConfigInterface() {
  if (!currentHost) {
    updateStatus('Erro: Host não identificado');
    return;
  }
  
  updateStatus('Buscando interface web alternativa...');
  
  // URLs conhecidas de interfaces web que funcionam sem ActiveX
  const webConfigUrls = [
    // Hikvision
    '/doc/page/config.asp',
    '/doc/page/login.asp', 
    '/ISAPI/System/capabilities',
    '/SDK/capabilities',
    
    // Dahua
    '/cgi-bin/configManager.cgi?action=getConfig&name=General',
    '/RPC2_Login',
    
    // Genérico
    '/cgi-bin/main.cgi',
    '/cgi-bin/viewer/video.jpg',
    '/config/index.html',
    '/web/index.html',
    '/login.html',
    '/admin.html',
    '/index2.html',
    
    // ONVIF
    '/onvif/device_service',
    
    // Mobile interfaces (geralmente sem ActiveX)
    '/mobile.html',
    '/m/index.html',
    '/phone/index.html',
  ];
  
  // Adicionar URLs específicas do fabricante detectado
  if (detectedPluginInfo) {
    const brand = detectedPluginInfo.brand?.toLowerCase() || '';
    
    if (brand.includes('hikvision')) {
      webConfigUrls.unshift('/doc/page/config.asp', '/doc/page/preview.asp', '/doc/page/main.asp');
    } else if (brand.includes('dahua') || brand.includes('intelbras')) {
      webConfigUrls.unshift('/cgi-bin/configManager.cgi?action=getConfig&name=General');
    } else if (brand.includes('tecvoz')) {
      webConfigUrls.unshift(
        '/Pages/login.htm', '/view2.html', '/Login.htm',
        '/cgi-bin/configManager.cgi?action=getConfig&name=General',
        '/doc/page/login.asp', '/login.htm'
      );
    } else if (brand.includes('ipega') || brand.includes('qualvision')) {
      webConfigUrls.unshift('/Pages/login.htm', '/view2.html', '/Login.htm');
    }
  }
  
  // Mostrar lista de URLs para o usuário tentar
  const baseUrl = `http://${currentHost}`;
  
  let html = '<div class="urls-container">';
  html += '<p>Clique em uma URL para tentar acessar:</p>';
  html += '<div class="urls-list">';
  
  webConfigUrls.forEach(path => {
    const fullUrl = baseUrl + path;
    html += `<div class="url-item" onclick="navigate('${fullUrl}')">${fullUrl}</div>`;
  });
  
  html += '</div>';
  html += '<p style="margin-top:15px; font-size:12px; opacity:0.8;">💡 Dica: Se nenhuma funcionar, o DVR pode não ter interface web alternativa. Tente usar um software como IVMS-4200 (Hikvision) ou SmartPSS (Dahua) para acessar as configurações.</p>';
  html += '</div>';
  
  elements.urlsList.innerHTML = html;
  elements.urlsModal.querySelector('h2').textContent = '🌐 Interfaces Web Alternativas';
  elements.urlsModal.classList.remove('hidden');
  
  updateStatus('Selecione uma interface para tentar');
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
// Preview Page RTSP Injection
// ============================================

/**
 * Verifica se a URL é uma página preview de DVR e oferece RTSP
 */
function checkForPreviewPage(url) {
  if (!url) return;
  const lo = url.toLowerCase();
  // Hikvision: #/preview, #/portal/preview
  // Tecvoz/Dahua: #/realplay, #/live
  const isPreview = lo.includes('#/preview') || lo.includes('#/realplay') ||
                    lo.includes('#/live') || lo.includes('/preview.asp') ||
                    lo.includes('/liveview');
  if (!isPreview) return;

  console.log('[Renderer] Preview page detected:', url);
  previewInjected = false; // Reset para nova navegação

  // Extrair host e porta do DVR
  try {
    const urlObj = new URL(url);
    elements.rtspHost.value = urlObj.hostname || '';
    currentHost = urlObj.host;
  } catch(e) {
    elements.rtspHost.value = '';
  }

  // Mostrar modal de credenciais RTSP após pequeno delay (esperar SPA carregar)
  setTimeout(() => {
    showRtspCredentialsModal();
  }, 1500);
}

/**
 * Mostra o modal de credenciais RTSP
 */
function showRtspCredentialsModal() {
  setRtspStatusMsg('', '');
  elements.rtspCredentialsModal.classList.remove('hidden');
  elements.rtspPass.focus();
}

/**
 * Define mensagem de status no modal RTSP
 */
function setRtspStatusMsg(text, type) {
  const el = elements.rtspStatusMsg;
  if (!text) {
    el.style.display = 'none';
    return;
  }
  el.style.display = 'block';
  el.textContent = text;
  if (type === 'error') {
    el.style.background = '#ffebee';
    el.style.color = '#c62828';
  } else if (type === 'success') {
    el.style.background = '#e8f5e9';
    el.style.color = '#2e7d32';
  } else {
    el.style.background = '#e3f2fd';
    el.style.color = '#1565c0';
  }
}

/**
 * Conecta streams RTSP e injeta no webview
 */
async function connectRtspPreview() {
  const host = elements.rtspHost.value.trim();
  const rtspPort = elements.rtspPort.value.trim() || '554';
  const user = elements.rtspUser.value.trim() || 'admin';
  const pass = elements.rtspPass.value;
  const channels = parseInt(elements.rtspChannels.value) || 4;
  const quality = elements.rtspQuality.value; // 'main' ou 'sub'

  if (!host) {
    setRtspStatusMsg('Informe o host do DVR.', 'error');
    return;
  }

  setRtspStatusMsg('Verificando proxy RTSP (ffmpeg)...', 'info');

  // Verificar se o proxy RTSP está disponível
  try {
    const status = await window.electronAPI.rtspProxyStatus();
    if (!status.available) {
      setRtspStatusMsg('ffmpeg não encontrado! Instale ffmpeg para usar streams RTSP. Tentando snapshot/MJPEG...', 'error');
      // Fallback - tentar snapshot ISAPI direto no webview
      await injectSnapshotPreview(host, rtspPort, user, pass, channels);
      elements.rtspCredentialsModal.classList.add('hidden');
      return;
    }
  } catch(e) {
    setRtspStatusMsg('Erro ao verificar proxy RTSP: ' + e.message, 'error');
  }

  // Parar streams anteriores
  await stopAllRtspStreams();

  setRtspStatusMsg(`Conectando ${channels} canais via RTSP...`, 'info');

  // Determinar paths RTSP baseado na marca detectada
  const brand = detectedPluginInfo?.brand || 'Hikvision';
  const rtspPaths = buildRtspChannelPaths(brand, channels, quality);

  const connectedStreams = [];
  let firstFailed = null;

  for (let i = 0; i < rtspPaths.length; i++) {
    const rtspUrl = `rtsp://${host}:${rtspPort}${rtspPaths[i]}`;
    setRtspStatusMsg(`Canal ${i + 1}/${rtspPaths.length}: Conectando...`, 'info');

    try {
      // Tentar HLS (melhor qualidade)
      const result = await window.electronAPI.rtspStartHls(rtspUrl, user, pass);
      if (result.success) {
        connectedStreams.push({
          channel: i + 1,
          streamId: result.streamId,
          hlsUrl: result.hlsUrl,
          type: 'hls'
        });
        activeRtspStreams.push(result.streamId);
        continue;
      }

      // Fallback para MJPEG
      const mjResult = await window.electronAPI.rtspStartMjpeg(rtspUrl, user, pass);
      if (mjResult.success) {
        connectedStreams.push({
          channel: i + 1,
          streamId: mjResult.streamId,
          mjpegUrl: mjResult.mjpegUrl,
          type: 'mjpeg'
        });
        activeRtspStreams.push(mjResult.streamId);
        continue;
      }

      if (!firstFailed) firstFailed = result.error || mjResult.error || 'Falha desconhecida';
    } catch(e) {
      if (!firstFailed) firstFailed = e.message;
    }
  }

  if (connectedStreams.length === 0) {
    setRtspStatusMsg(`Nenhum canal conectado. Erro: ${firstFailed}. Tentando snapshot fallback...`, 'error');
    await injectSnapshotPreview(host, rtspPort, user, pass, channels);
    elements.rtspCredentialsModal.classList.add('hidden');
    return;
  }

  setRtspStatusMsg(`${connectedStreams.length} canais conectados! Injetando no preview...`, 'success');

  // Injetar os players de vídeo na página do webview
  await injectRtspPlayersIntoWebview(connectedStreams, channels);

  elements.rtspCredentialsModal.classList.add('hidden');
  previewInjected = true;
  updateStatus(`📹 ${connectedStreams.length} câmeras conectadas via RTSP`);
}

/**
 * Gera paths RTSP por canal baseado na marca
 */
function buildRtspChannelPaths(brand, channels, quality) {
  const b = (brand || '').toLowerCase();
  const paths = [];

  for (let ch = 1; ch <= channels; ch++) {
    if (b.includes('hikvision') || b.includes('hik')) {
      // Hikvision: /Streaming/Channels/X01 (main) ou X02 (sub)
      const stream = quality === 'main' ? '01' : '02';
      paths.push(`/Streaming/Channels/${ch}${stream}`);
    } else if (b.includes('tecvoz') || b.includes('dahua') || b.includes('intelbras')) {
      // Dahua/Tecvoz: /cam/realmonitor?channel=X&subtype=0 (main) ou subtype=1 (sub)
      const subtype = quality === 'main' ? '0' : '1';
      paths.push(`/cam/realmonitor?channel=${ch}&subtype=${subtype}`);
    } else {
      // Genérico Hikvision style
      const stream = quality === 'main' ? '01' : '02';
      paths.push(`/Streaming/Channels/${ch}${stream}`);
    }
  }
  return paths;
}

/**
 * Injeta players HLS/MJPEG dentro do webview na página de preview
 */
async function injectRtspPlayersIntoWebview(streams, totalChannels) {
  // Gera o JavaScript a injetar no webview
  const streamsJson = JSON.stringify(streams);

  const script = `
  (function() {
    var streams = ${streamsJson};
    var total = ${totalChannels};
    console.log('[IE Portable] Injetando ' + streams.length + ' streams no preview');

    // Calcular grid
    var cols = Math.ceil(Math.sqrt(total));
    var rows = Math.ceil(total / cols);

    // Procurar o container de vídeo do DVR
    var container = document.querySelector('#divPlugin')
      || document.querySelector('.plugin-container')
      || document.querySelector('.preview-container')
      || document.querySelector('.video-container')
      || document.querySelector('#plugin0')
      || document.querySelector('[class*="plugin"]')
      || document.querySelector('[class*="video"]')
      || document.querySelector('[class*="preview"]');

    if (!container) {
      // Criar overlay sobre a página inteira
      container = document.createElement('div');
      container.id = 'ieportable-rtsp-container';
      container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;background:#000;';
      document.body.appendChild(container);
    } else {
      // Limpar conteúdo anterior do container
      container.innerHTML = '';
      container.style.position = 'relative';
      container.style.overflow = 'hidden';
      container.style.background = '#000';
    }

    // Grid container
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat('+cols+',1fr);grid-template-rows:repeat('+rows+',1fr);width:100%;height:100%;gap:2px;background:#333;';
    container.appendChild(grid);

    for (var i = 0; i < total; i++) {
      var cell = document.createElement('div');
      cell.style.cssText = 'position:relative;background:#111;overflow:hidden;display:flex;align-items:center;justify-content:center;';

      var streamInfo = null;
      for (var s = 0; s < streams.length; s++) {
        if (streams[s].channel === (i + 1)) { streamInfo = streams[s]; break; }
      }

      if (streamInfo) {
        if (streamInfo.type === 'hls') {
          var video = document.createElement('video');
          video.autoplay = true;
          video.muted = true;
          video.playsInline = true;
          video.style.cssText = 'width:100%;height:100%;object-fit:contain;';
          video.src = streamInfo.hlsUrl;
          video.play().catch(function(){});
          cell.appendChild(video);
        } else if (streamInfo.type === 'mjpeg') {
          var img = document.createElement('img');
          img.style.cssText = 'width:100%;height:100%;object-fit:contain;';
          img.src = streamInfo.mjpegUrl;
          cell.appendChild(img);
        }
        // Channel label
        var label = document.createElement('div');
        label.style.cssText = 'position:absolute;top:4px;left:6px;color:#fff;font-size:12px;background:rgba(0,0,0,0.6);padding:2px 6px;border-radius:3px;pointer-events:none;';
        label.textContent = 'CH ' + streamInfo.channel;
        cell.appendChild(label);
      } else {
        // Canal sem stream
        var noSig = document.createElement('div');
        noSig.style.cssText = 'color:#666;font-size:14px;text-align:center;';
        noSig.innerHTML = '<div style="font-size:32px;margin-bottom:4px;">📷</div>CH ' + (i+1) + '<br><span style="font-size:11px;">Sem sinal</span>';
        cell.appendChild(noSig);
      }
      grid.appendChild(cell);
    }

    // Barra de controle no topo
    var bar = document.createElement('div');
    bar.style.cssText = 'position:absolute;top:0;left:0;right:0;height:32px;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:space-between;padding:0 12px;z-index:100;color:#fff;font-size:13px;';
    bar.innerHTML = '<span>📹 IE Portable - ' + streams.length + '/' + total + ' câmeras conectadas</span>'
      + '<button onclick="document.getElementById(\\'ieportable-rtsp-container\\')&&document.getElementById(\\'ieportable-rtsp-container\\').remove();this.parentElement.remove();" style="background:none;border:1px solid #666;color:#fff;padding:2px 10px;cursor:pointer;border-radius:3px;">✕ Fechar</button>';
    container.insertBefore(bar, container.firstChild);

    // Ajustar grid para não ficar sob a barra
    grid.style.marginTop = '32px';
    grid.style.height = 'calc(100% - 32px)';

    console.log('[IE Portable] RTSP preview injetado com sucesso!');
  })();
  `;

  try {
    await elements.webview.executeJavaScript(script);
    console.log('[Renderer] RTSP players injetados no webview');
  } catch(e) {
    console.error('[Renderer] Erro ao injetar RTSP players:', e);
  }
}

/**
 * Fallback: injeta snapshots ISAPI/MJPEG direto (sem ffmpeg)
 */
async function injectSnapshotPreview(host, rtspPort, user, pass, channels) {
  const auth = btoa(user + ':' + pass);
  // Tentar extrair a porta HTTP da URL atual
  let httpPort = '80';
  try {
    const urlObj = new URL(currentUrl);
    httpPort = urlObj.port || '80';
  } catch(e) {}

  const streamsJson = JSON.stringify({ host, httpPort, auth, user, pass, channels });

  const script = `
  (function() {
    var cfg = ${streamsJson};
    console.log('[IE Portable] Injetando snapshot preview para ' + cfg.channels + ' canais');

    var cols = Math.ceil(Math.sqrt(cfg.channels));
    var rows = Math.ceil(cfg.channels / cols);

    var container = document.querySelector('#divPlugin')
      || document.querySelector('.plugin-container')
      || document.querySelector('.preview-container')
      || document.querySelector('[class*="plugin"]')
      || document.querySelector('[class*="video"]');

    if (!container) {
      container = document.createElement('div');
      container.id = 'ieportable-rtsp-container';
      container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;background:#000;';
      document.body.appendChild(container);
    } else {
      container.innerHTML = '';
      container.style.position = 'relative';
      container.style.background = '#000';
    }

    var bar = document.createElement('div');
    bar.style.cssText = 'height:32px;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:space-between;padding:0 12px;color:#fff;font-size:13px;';
    bar.innerHTML = '<span>📷 IE Portable - Snapshot Mode (' + cfg.channels + ' canais)</span>'
      + '<button onclick="document.getElementById(\\'ieportable-rtsp-container\\')&&document.getElementById(\\'ieportable-rtsp-container\\').remove();this.parentElement.parentElement.innerHTML=\\'\\';" style="background:none;border:1px solid #666;color:#fff;padding:2px 10px;cursor:pointer;border-radius:3px;">✕ Fechar</button>';
    container.appendChild(bar);

    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat('+cols+',1fr);grid-template-rows:repeat('+rows+',1fr);width:100%;height:calc(100% - 32px);gap:2px;background:#333;';
    container.appendChild(grid);

    for (var i = 1; i <= cfg.channels; i++) {
      var cell = document.createElement('div');
      cell.style.cssText = 'position:relative;background:#111;overflow:hidden;display:flex;align-items:center;justify-content:center;';

      // Hikvision ISAPI snapshot URL
      var snapUrl = 'http://' + cfg.user + ':' + cfg.pass + '@' + cfg.host + ':' + cfg.httpPort + '/ISAPI/Streaming/channels/' + i + '01/picture?t=' + Date.now();
      var img = document.createElement('img');
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;';
      img.dataset.channel = i;
      img.dataset.baseUrl = 'http://' + cfg.user + ':' + cfg.pass + '@' + cfg.host + ':' + cfg.httpPort + '/ISAPI/Streaming/channels/' + i + '01/picture';
      img.src = snapUrl;
      img.onerror = function() {
        this.style.display = 'none';
        this.parentElement.innerHTML += '<div style="color:#666;font-size:13px;text-align:center;"><div style="font-size:24px;">⚠️</div>Sem sinal</div>';
      };
      cell.appendChild(img);

      var label = document.createElement('div');
      label.style.cssText = 'position:absolute;top:4px;left:6px;color:#fff;font-size:12px;background:rgba(0,0,0,0.6);padding:2px 6px;border-radius:3px;pointer-events:none;';
      label.textContent = 'CH ' + i;
      cell.appendChild(label);

      grid.appendChild(cell);
    }

    // Auto-refresh snapshots every 2 seconds
    setInterval(function() {
      var imgs = grid.querySelectorAll('img[data-base-url]');
      for (var j = 0; j < imgs.length; j++) {
        imgs[j].src = imgs[j].dataset.baseUrl + '?t=' + Date.now();
      }
    }, 2000);

    console.log('[IE Portable] Snapshot preview injetado');
  })();
  `;

  try {
    await elements.webview.executeJavaScript(script);
    console.log('[Renderer] Snapshot preview injetado no webview');
  } catch(e) {
    console.error('[Renderer] Erro ao injetar snapshot preview:', e);
  }
}

/**
 * Para todos os streams RTSP ativos
 */
async function stopAllRtspStreams() {
  if (activeRtspStreams.length > 0) {
    try {
      await window.electronAPI.rtspStopAll();
    } catch(e) {}
    activeRtspStreams = [];
  }
}

// ============================================
// Iniciar
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Renderer] DOM carregado, iniciando...');
  try {
    await init();
    console.log('[Renderer] Inicialização concluída');
  } catch (error) {
    console.error('[Renderer] ERRO na inicialização:', error);
    document.body.innerHTML = '<div style="padding:20px;color:red;font-family:Arial;"><h2>Erro ao inicializar</h2><pre>' + error.stack + '</pre></div>';
  }
});
