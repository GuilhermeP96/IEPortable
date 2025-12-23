const { app, BrowserWindow, Menu, ipcMain, session, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');
const PluginManager = require('./plugin-manager');
const WineManager = require('./wine-manager');

// Configurações persistentes
const store = new Store({
  defaults: {
    ieVersion: 'ie11',
    homepage: 'about:blank',
    favorites: [],
    history: [],
    lastVisited: [],
    windowBounds: { width: 1200, height: 800 }
  }
});

// Gerenciador de plugins
let pluginManager = null;
let pluginManagerWindow = null;

// Gerenciador de Wine
let wineManager = null;

// User-Agents do Internet Explorer
const USER_AGENTS = {
  ie6: 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1)',
  ie7: 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)',
  ie8: 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0)',
  ie9: 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)',
  ie10: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)',
  ie11: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko'
};

let mainWindow = null;
let currentIEVersion = store.get('ieVersion');

function createWindow() {
  const bounds = store.get('windowBounds');
  
  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../assets/icons/ie.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      plugins: true,
      // Permitir conteúdo inseguro (necessário para alguns DVRs)
      webSecurity: false,
      allowRunningInsecureContent: true
    }
  });

  // Configurar User-Agent globalmente
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = USER_AGENTS[currentIEVersion];
    // Headers adicionais para simular IE
    details.requestHeaders['X-UA-Compatible'] = 'IE=edge';
    callback({ requestHeaders: details.requestHeaders });
  });

  // Carregar interface do navegador
  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  // Salvar tamanho da janela ao fechar
  mainWindow.on('close', () => {
    store.set('windowBounds', mainWindow.getBounds());
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Menu da aplicação
  const menuTemplate = createMenu();
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
}

function createMenu() {
  return [
    {
      label: 'Arquivo',
      submenu: [
        {
          label: 'Nova Janela',
          accelerator: 'CmdOrCtrl+N',
          click: () => createWindow()
        },
        { type: 'separator' },
        {
          label: 'Abrir URL...',
          accelerator: 'CmdOrCtrl+L',
          click: () => mainWindow.webContents.send('focus-url-bar')
        },
        { type: 'separator' },
        {
          label: 'Imprimir',
          accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow.webContents.send('print-page')
        },
        { type: 'separator' },
        {
          label: 'Sair',
          accelerator: 'Alt+F4',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Editar',
      submenu: [
        { label: 'Desfazer', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Refazer', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
        { type: 'separator' },
        { label: 'Cortar', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copiar', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Colar', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { type: 'separator' },
        { label: 'Selecionar Tudo', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: 'Exibir',
      submenu: [
        {
          label: 'Recarregar',
          accelerator: 'F5',
          click: () => mainWindow.webContents.send('reload-page')
        },
        {
          label: 'Recarregar (Forçar)',
          accelerator: 'CmdOrCtrl+F5',
          click: () => mainWindow.webContents.send('force-reload-page')
        },
        { type: 'separator' },
        {
          label: 'Zoom +',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => mainWindow.webContents.send('zoom-in')
        },
        {
          label: 'Zoom -',
          accelerator: 'CmdOrCtrl+-',
          click: () => mainWindow.webContents.send('zoom-out')
        },
        {
          label: 'Zoom Normal',
          accelerator: 'CmdOrCtrl+0',
          click: () => mainWindow.webContents.send('zoom-reset')
        },
        { type: 'separator' },
        {
          label: 'Tela Cheia',
          accelerator: 'F11',
          click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen())
        },
        { type: 'separator' },
        {
          label: 'Ferramentas do Desenvolvedor',
          accelerator: 'F12',
          click: () => mainWindow.webContents.toggleDevTools()
        }
      ]
    },
    {
      label: 'Ferramentas',
      submenu: [
        {
          label: 'Versão do IE',
          submenu: [
            {
              label: 'Internet Explorer 11',
              type: 'radio',
              checked: currentIEVersion === 'ie11',
              click: () => setIEVersion('ie11')
            },
            {
              label: 'Internet Explorer 10',
              type: 'radio',
              checked: currentIEVersion === 'ie10',
              click: () => setIEVersion('ie10')
            },
            {
              label: 'Internet Explorer 9',
              type: 'radio',
              checked: currentIEVersion === 'ie9',
              click: () => setIEVersion('ie9')
            },
            {
              label: 'Internet Explorer 8',
              type: 'radio',
              checked: currentIEVersion === 'ie8',
              click: () => setIEVersion('ie8')
            },
            {
              label: 'Internet Explorer 7',
              type: 'radio',
              checked: currentIEVersion === 'ie7',
              click: () => setIEVersion('ie7')
            },
            {
              label: 'Internet Explorer 6',
              type: 'radio',
              checked: currentIEVersion === 'ie6',
              click: () => setIEVersion('ie6')
            }
          ]
        },
        { type: 'separator' },
        {
          label: '🧩 Gerenciador de Plugins',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => openPluginManager()
        },
        { type: 'separator' },
        {
          label: 'Limpar Dados de Navegação...',
          click: () => clearBrowsingData()
        },
        {
          label: 'Opções da Internet...',
          click: () => mainWindow.webContents.send('show-settings')
        }
      ]
    },
    {
      label: 'Favoritos',
      submenu: [
        {
          label: 'Adicionar aos Favoritos',
          accelerator: 'CmdOrCtrl+D',
          click: () => mainWindow.webContents.send('add-favorite')
        },
        {
          label: 'Organizar Favoritos...',
          click: () => mainWindow.webContents.send('manage-favorites')
        },
        { type: 'separator' },
        ...getFavoritesMenuItems()
      ]
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Sobre o IE Portable',
          click: () => showAboutDialog()
        }
      ]
    }
  ];
}

function setIEVersion(version) {
  currentIEVersion = version;
  store.set('ieVersion', version);
  mainWindow.webContents.send('ie-version-changed', version);
  
  // Recarregar menu para atualizar radio buttons
  Menu.setApplicationMenu(Menu.buildFromTemplate(createMenu()));
  
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Versão do IE',
    message: `Modo de compatibilidade alterado para ${version.toUpperCase()}`,
    detail: 'Recarregue a página para aplicar as alterações.',
    buttons: ['OK']
  });
}

function getFavoritesMenuItems() {
  const favorites = store.get('favorites') || [];
  if (favorites.length === 0) {
    return [{ label: '(Nenhum favorito)', enabled: false }];
  }
  return favorites.map(fav => ({
    label: fav.title || fav.url,
    click: () => mainWindow.webContents.send('navigate-to', fav.url)
  }));
}

async function clearBrowsingData() {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    title: 'Limpar Dados de Navegação',
    message: 'Deseja limpar todos os dados de navegação?',
    detail: 'Isso incluirá cache, cookies, histórico e dados de sessão.',
    buttons: ['Cancelar', 'Limpar Tudo'],
    defaultId: 0,
    cancelId: 0
  });

  if (result.response === 1) {
    await session.defaultSession.clearStorageData();
    await session.defaultSession.clearCache();
    store.set('history', []);
    store.set('lastVisited', []);
    
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Dados Limpos',
      message: 'Os dados de navegação foram limpos com sucesso.',
      buttons: ['OK']
    });
  }
}

function showAboutDialog() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Sobre o IE Portable',
    message: 'IE Portable v1.0.0',
    detail: 'Simulador do Internet Explorer legado para compatibilidade com DVRs, câmeras de segurança e outros dispositivos.\n\nEste aplicativo emula o User-Agent e comportamentos do Internet Explorer para permitir acesso a sistemas legados.\n\n© 2024 IEPortable Team',
    buttons: ['OK']
  });
}

// ============================================
// Gerenciador de Plugins
// ============================================

function openPluginManager() {
  // Se já existe uma janela, focar nela
  if (pluginManagerWindow && !pluginManagerWindow.isDestroyed()) {
    pluginManagerWindow.focus();
    return;
  }

  pluginManagerWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 700,
    minHeight: 500,
    parent: mainWindow,
    modal: false,
    icon: path.join(__dirname, '../assets/icons/ie.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  pluginManagerWindow.loadFile(path.join(__dirname, 'renderer/plugin-manager.html'));
  
  // Remover menu da janela de plugins
  pluginManagerWindow.setMenu(null);

  pluginManagerWindow.on('closed', () => {
    pluginManagerWindow = null;
  });
}

// IPC Handlers para Plugin Manager
ipcMain.handle('plugin-list', async () => {
  return pluginManager.listPlugins();
});

ipcMain.handle('plugin-stats', async () => {
  return pluginManager.getStats();
});

ipcMain.handle('plugin-import', async () => {
  return pluginManager.importPluginDialog(pluginManagerWindow || mainWindow);
});

ipcMain.handle('plugin-import-path', async (event, filePath) => {
  return pluginManager.importPlugin(filePath);
});

ipcMain.handle('plugin-register', async (event, pluginId) => {
  return pluginManager.registerPlugin(pluginId);
});

ipcMain.handle('plugin-unregister', async (event, pluginId) => {
  return pluginManager.unregisterPlugin(pluginId);
});

ipcMain.handle('plugin-run', async (event, pluginId) => {
  return pluginManager.runPlugin(pluginId);
});

ipcMain.handle('plugin-remove', async (event, pluginId) => {
  return pluginManager.removePlugin(pluginId);
});

ipcMain.handle('plugin-update-notes', async (event, pluginId, notes) => {
  return pluginManager.updatePluginNotes(pluginId, notes);
});

ipcMain.handle('plugin-open-sandbox', async () => {
  pluginManager.openSandboxFolder();
});

ipcMain.handle('plugin-open-folder', async (event, pluginId) => {
  pluginManager.openPluginFolder(pluginId);
});

ipcMain.handle('open-plugin-manager', () => {
  openPluginManager();
});

// IPC Handlers para Wine Manager
ipcMain.handle('wine-status', async () => {
  return wineManager.getStatus();
});

ipcMain.handle('wine-check', async () => {
  return wineManager.checkWineInstalled();
});

ipcMain.handle('wine-install-instructions', () => {
  return wineManager.getInstallInstructions();
});

ipcMain.handle('wine-generate-script', () => {
  return wineManager.generateInstallScript();
});

ipcMain.handle('wine-install', async (event) => {
  return new Promise((resolve, reject) => {
    wineManager.installWine(
      (progress) => {
        // Enviar progresso para a janela
        if (pluginManagerWindow && !pluginManagerWindow.isDestroyed()) {
          pluginManagerWindow.webContents.send('wine-install-progress', progress);
        }
      },
      (result) => {
        resolve(result);
      },
      (error) => {
        reject(error);
      }
    );
  });
});

// IPC Handlers para ActiveX Scanner
ipcMain.handle('scan-wine-plugins', async () => {
  return pluginManager.scanWineInstalledPlugins();
});

ipcMain.handle('check-clsid-available', async (event, clsid) => {
  return pluginManager.checkClsidAvailable(clsid);
});

ipcMain.handle('get-system-installed-plugins', () => {
  return pluginManager.getSystemInstalledPlugins();
});

ipcMain.handle('get-wine-program-files', () => {
  return pluginManager.getWineProgramFilesPaths();
});

ipcMain.handle('open-wine-program-files', () => {
  pluginManager.openWineProgramFiles();
});

ipcMain.handle('run-installer-monitored', async (event, pluginId) => {
  return pluginManager.runInstallerAndMonitor(pluginId);
});

ipcMain.handle('find-plugins-by-vendor', async (event, vendor) => {
  return pluginManager.findPluginsByVendor(vendor);
});

ipcMain.handle('clear-plugin-scan-cache', () => {
  pluginManager.clearScanCache();
  return { success: true };
});

ipcMain.handle('auto-register-wine-plugins', async (event) => {
  return pluginManager.autoRegisterWinePlugins((progress) => {
    // Enviar progresso para a janela
    if (pluginManagerWindow && !pluginManagerWindow.isDestroyed()) {
      pluginManagerWindow.webContents.send('wine-register-progress', progress);
    }
  });
});

ipcMain.handle('register-wine-file', async (event, filePath) => {
  return pluginManager.registerWineFile(filePath);
});

// IPC Handlers
ipcMain.handle('get-settings', () => {
  return {
    ieVersion: store.get('ieVersion'),
    homepage: store.get('homepage'),
    favorites: store.get('favorites'),
    history: store.get('history')
  };
});

ipcMain.handle('save-settings', (event, settings) => {
  if (settings.homepage) store.set('homepage', settings.homepage);
  if (settings.ieVersion) {
    currentIEVersion = settings.ieVersion;
    store.set('ieVersion', settings.ieVersion);
  }
  return true;
});

ipcMain.handle('add-favorite', (event, favorite) => {
  const favorites = store.get('favorites') || [];
  favorites.push(favorite);
  store.set('favorites', favorites);
  Menu.setApplicationMenu(Menu.buildFromTemplate(createMenu()));
  return true;
});

ipcMain.handle('remove-favorite', (event, url) => {
  const favorites = store.get('favorites') || [];
  const filtered = favorites.filter(f => f.url !== url);
  store.set('favorites', filtered);
  Menu.setApplicationMenu(Menu.buildFromTemplate(createMenu()));
  return true;
});

ipcMain.handle('get-favorites', () => {
  return store.get('favorites') || [];
});

ipcMain.handle('add-to-history', (event, entry) => {
  const history = store.get('history') || [];
  history.unshift({ ...entry, timestamp: Date.now() });
  // Manter apenas os últimos 1000 itens
  if (history.length > 1000) history.pop();
  store.set('history', history);
  return true;
});

ipcMain.handle('get-history', () => {
  return store.get('history') || [];
});

ipcMain.handle('clear-history', () => {
  store.set('history', []);
  return true;
});

ipcMain.handle('get-user-agent', () => {
  return USER_AGENTS[currentIEVersion];
});

ipcMain.handle('get-ie-version', () => {
  return currentIEVersion;
});

// Inicialização da aplicação
app.whenReady().then(() => {
  // Permitir certificados auto-assinados (comum em DVRs)
  app.commandLine.appendSwitch('ignore-certificate-errors');
  app.commandLine.appendSwitch('allow-insecure-localhost');
  
  // Inicializar gerenciador de plugins
  pluginManager = new PluginManager();
  
  // Inicializar gerenciador de Wine
  wineManager = new WineManager();
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Permitir navegação para URLs inseguras
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  event.preventDefault();
  callback(true);
});
