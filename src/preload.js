const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

// Ler o polyfill ActiveX de arquivo no startup (evita template literal escaping)
let _polyfillScript = '';
try {
  const polyfillPath = path.join(__dirname, 'renderer', 'activex-polyfill-inject.js');
  _polyfillScript = fs.readFileSync(polyfillPath, 'utf8');
  console.log('[Preload] ActiveX polyfill carregado:', _polyfillScript.length, 'bytes');
} catch(e) {
  console.error('[Preload] Erro ao carregar polyfill:', e.message);
}

// Expor APIs seguras para o renderer
contextBridge.exposeInMainWorld('iePortable', {
  // Polyfill ActiveX (conteúdo do arquivo JS para injeção no webview)
  getActiveXPolyfill: () => _polyfillScript,
  
  // Configurações
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // Favoritos
  addFavorite: (favorite) => ipcRenderer.invoke('add-favorite', favorite),
  removeFavorite: (url) => ipcRenderer.invoke('remove-favorite', url),
  getFavorites: () => ipcRenderer.invoke('get-favorites'),
  
  // Histórico
  addToHistory: (entry) => ipcRenderer.invoke('add-to-history', entry),
  getHistory: () => ipcRenderer.invoke('get-history'),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  
  // Informações do IE
  getUserAgent: () => ipcRenderer.invoke('get-user-agent'),
  getIEVersion: () => ipcRenderer.invoke('get-ie-version'),
  
  // Gerenciador de Plugins
  openPluginManager: () => ipcRenderer.invoke('open-plugin-manager'),
  
  // Event listeners do main process
  onFocusUrlBar: (callback) => ipcRenderer.on('focus-url-bar', callback),
  onReloadPage: (callback) => ipcRenderer.on('reload-page', callback),
  onForceReloadPage: (callback) => ipcRenderer.on('force-reload-page', callback),
  onZoomIn: (callback) => ipcRenderer.on('zoom-in', callback),
  onZoomOut: (callback) => ipcRenderer.on('zoom-out', callback),
  onZoomReset: (callback) => ipcRenderer.on('zoom-reset', callback),
  onNavigateTo: (callback) => ipcRenderer.on('navigate-to', callback),
  onPrintPage: (callback) => ipcRenderer.on('print-page', callback),
  onShowSettings: (callback) => ipcRenderer.on('show-settings', callback),
  onAddFavorite: (callback) => ipcRenderer.on('add-favorite', callback),
  onManageFavorites: (callback) => ipcRenderer.on('manage-favorites', callback),
  onIEVersionChanged: (callback) => ipcRenderer.on('ie-version-changed', callback),
  
  // Remover listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// API para o scanner de ActiveX (disponível também como electronAPI)
contextBridge.exposeInMainWorld('electronAPI', {
  // Wine ActiveX Scanner
  scanWinePlugins: () => ipcRenderer.invoke('scan-wine-plugins'),
  checkClsidAvailable: (clsid) => ipcRenderer.invoke('check-clsid-available', clsid),
  getSystemInstalledPlugins: () => ipcRenderer.invoke('get-system-installed-plugins'),
  getWineProgramFiles: () => ipcRenderer.invoke('get-wine-program-files'),
  openWineProgramFiles: () => ipcRenderer.invoke('open-wine-program-files'),
  runInstallerMonitored: (pluginId) => ipcRenderer.invoke('run-installer-monitored', pluginId),
  findPluginsByVendor: (vendor) => ipcRenderer.invoke('find-plugins-by-vendor', vendor),
  clearPluginScanCache: () => ipcRenderer.invoke('clear-plugin-scan-cache'),
  
  // Notificação de ActiveX detectado (enviar para main process)
  notifyActiveX: (event, data) => ipcRenderer.send('activex-notification', { event, data }),
  
  // Receber notificações do main process
  onActiveXDetected: (callback) => ipcRenderer.on('activex-detected', (_, data) => callback(data)),
  onPluginAvailable: (callback) => ipcRenderer.on('plugin-available', (_, data) => callback(data)),

  // RTSP Proxy (conversão RTSP -> HLS/MJPEG para câmeras)
  rtspProxyStatus: () => ipcRenderer.invoke('rtsp-proxy-status'),
  rtspStartHls: (rtspUrl, username, password) => ipcRenderer.invoke('rtsp-start-hls', rtspUrl, username, password),
  rtspStartMjpeg: (rtspUrl, username, password) => ipcRenderer.invoke('rtsp-start-mjpeg', rtspUrl, username, password),
  rtspStopStream: (streamId) => ipcRenderer.invoke('rtsp-stop-stream', streamId),
  rtspStopAll: () => ipcRenderer.invoke('rtsp-stop-all'),
  rtspTestUrl: (rtspUrl, username, password) => ipcRenderer.invoke('rtsp-test-url', rtspUrl, username, password),
  rtspFindWorkingUrl: (host, username, password, brand) => ipcRenderer.invoke('rtsp-find-working-url', host, username, password, brand),
});
