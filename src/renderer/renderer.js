// ============================================
// IE Portable - Renderer Process
// ============================================

// Script do polyfill ActiveX - emulação completa para DVRs
const ACTIVEX_POLYFILL_SCRIPT = `
(function() {
  if (window.__iePortableActiveXPolyfill) return;
  window.__iePortableActiveXPolyfill = true;
  
  console.log('[ActiveX-Emu] Iniciando emulador completo...');
  
  // CLSIDs conhecidos
  var KNOWN_CLSIDS = {
    'B6D5419C-D381-4687-9CFC-A9E2CD7008F5': { brand: 'Ipega', type: 'dvr' },
    '6263DEED-F971-4C18-AB42-3ABCDE741A89': { brand: 'Hikvision', type: 'dvr' },
    '08CF8D24-DA5E-4C0B-B2E3-E72B3C714BAC': { brand: 'Hikvision', type: 'dvr' },
    'CCAB80D2-5DCF-44FB-9EAE-0F632B758498': { brand: 'Hikvision', type: 'dvr' },
    '4B3476C6-3A85-4C2C-BD55-BD8F1E028B00': { brand: 'Dahua', type: 'dvr' },
    '39B06C8F-91A7-4CAC-8B94-C8B8F26B1A8C': { brand: 'Dahua', type: 'dvr' }
  };
  
  // Estado global
  var activeXState = {
    host: window.location.hostname,
    port: window.location.port || 80,
    username: 'admin',
    password: 'admin',
    loggedIn: false,
    channels: [],
    pluginInstalled: true // Fingir que está instalado
  };
  
  // ========================================
  // Interceptar verificações de plugin
  // ========================================
  
  // Fingir que o navegador é IE
  Object.defineProperty(navigator, 'userAgent', {
    get: function() {
      return 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko';
    },
    configurable: true
  });
  
  // Fingir que plugins ActiveX estão instalados
  Object.defineProperty(navigator, 'plugins', {
    get: function() {
      var plugins = {
        length: 1,
        0: { name: 'ActiveX Plugin', filename: 'activex.dll' },
        'ActiveX Plugin': { name: 'ActiveX Plugin', filename: 'activex.dll' },
        item: function(i) { return this[i]; },
        namedItem: function(n) { return this[n]; },
        refresh: function() {}
      };
      return plugins;
    },
    configurable: true
  });
  
  // Interceptar document.body.createControlRange (usado para verificar IE)
  if (document.body) {
    document.body.createControlRange = function() {
      return { add: function() {}, remove: function() {} };
    };
  }
  
  // Fingir suporte a VBScript
  window.execScript = function(code, lang) {
    console.log('[ActiveX-Emu] execScript chamado:', lang);
    if (lang && lang.toLowerCase() === 'vbscript') {
      return true;
    }
    return eval(code);
  };
  
  // ========================================
  // Criar controle DVR completo
  // ========================================
  
  function createDVRControl(element) {
    var ctrl = {
      readyState: 4,
      valid: 1,
      object: null,
      _host: activeXState.host,
      _port: activeXState.port,
      _username: 'admin',
      _password: 'admin',
      _loggedIn: false,
      _channel: 1,
      _element: element,
      _videoContainer: null,
      
      // Login real
      Login: function(ip, port, user, pass) {
        console.log('[ActiveX-Emu] Login:', ip, port, user);
        this._host = ip || activeXState.host;
        this._port = port || 80;
        this._username = user || 'admin';
        this._password = pass || 'admin';
        this._loggedIn = true;
        activeXState.host = this._host;
        activeXState.username = this._username;
        activeXState.password = this._password;
        activeXState.loggedIn = true;
        return 1;
      },
      
      Logout: function() {
        this._loggedIn = false;
        activeXState.loggedIn = false;
        return 1;
      },
      
      Init: function() { 
        console.log('[ActiveX-Emu] Init');
        return 1; 
      },
      
      // Play - tenta mostrar stream
      Play: function() {
        console.log('[ActiveX-Emu] Play');
        this._startStream();
        return 1;
      },
      
      Stop: function() {
        console.log('[ActiveX-Emu] Stop');
        this._stopStream();
        return 1;
      },
      
      Pause: function() { return 1; },
      Resume: function() { return 1; },
      
      StartRealPlay: function(channel) {
        console.log('[ActiveX-Emu] StartRealPlay:', channel);
        this._channel = channel || 1;
        this._startStream();
        return 1;
      },
      
      StopRealPlay: function() {
        this._stopStream();
        return 1;
      },
      
      ConnectRealPlay: function() {
        this._startStream();
        return 1;
      },
      
      SetChannel: function(ch) { 
        this._channel = ch;
        return 1; 
      },
      GetChannel: function() { return this._channel; },
      
      // PTZ
      PTZControl: function(cmd, speed) {
        console.log('[ActiveX-Emu] PTZ:', cmd, speed);
        return 1;
      },
      PTZControlEx: function() { return 1; },
      
      // Gravação
      StartRecord: function() { return 1; },
      StopRecord: function() { return 1; },
      Playback: function() { return 1; },
      
      // Configuração
      DeviceConfig: function() { return 1; },
      GetConfig: function() { return '{}'; },
      SetConfig: function() { return 1; },
      GetDeviceInfo: function() { return '{}'; },
      
      // Snapshot
      CapturePicture: function() { return 1; },
      SavePicture: function() { return 1; },
      
      // Query
      QueryRecordFile: function() { return 1; },
      QueryRecordFileEx: function() { return 1; },
      
      // Iniciar stream de vídeo
      _startStream: function() {
        var self = this;
        if (!this._element) return;
        
        // Criar container se não existir
        if (!this._videoContainer) {
          this._videoContainer = document.createElement('div');
          this._videoContainer.className = 'activex-emu-video';
          this._videoContainer.style.cssText = 'width:100%;height:100%;background:#000;display:flex;align-items:center;justify-content:center;position:absolute;top:0;left:0;';
          
          var img = document.createElement('img');
          img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;';
          img.alt = 'Stream';
          this._videoContainer._img = img;
          
          var status = document.createElement('div');
          status.style.cssText = 'position:absolute;bottom:5px;left:5px;background:rgba(0,0,0,0.7);color:#fff;padding:3px 8px;font-size:11px;border-radius:3px;';
          status.textContent = 'Conectando...';
          this._videoContainer._status = status;
          
          this._videoContainer.appendChild(img);
          this._videoContainer.appendChild(status);
          
          // Inserir após o elemento
          var parent = this._element.parentNode;
          if (parent) {
            parent.style.position = 'relative';
            parent.appendChild(this._videoContainer);
          }
        }
        
        // Tentar carregar imagem
        var urls = this._getSnapshotUrls();
        this._tryUrls(urls, 0);
      },
      
      _stopStream: function() {
        if (this._videoContainer && this._videoContainer._img) {
          this._videoContainer._img.src = '';
        }
        if (this._refreshInterval) {
          clearInterval(this._refreshInterval);
        }
      },
      
      _getSnapshotUrls: function() {
        var host = this._host || activeXState.host || window.location.hostname;
        var ch = this._channel || 1;
        var auth = (this._username && this._password) ? (this._username + ':' + this._password + '@') : '';
        
        return [
          'http://' + host + '/cgi-bin/snapshot.cgi?channel=' + ch,
          'http://' + host + '/snap.jpg',
          'http://' + host + '/tmpfs/auto.jpg',
          'http://' + host + '/image/jpeg.cgi',
          'http://' + host + '/ISAPI/Streaming/channels/' + ch + '01/picture',
          'http://' + host + '/cgi-bin/images_snapshot.cgi'
        ];
      },
      
      _tryUrls: function(urls, index) {
        var self = this;
        if (index >= urls.length) {
          if (this._videoContainer && this._videoContainer._status) {
            this._videoContainer._status.textContent = 'Não foi possível conectar';
            this._videoContainer._status.onclick = function() {
              window.postMessage({ type: 'ACTIVEX_SHOW_PLAYER', clsid: 'B6D5419C-D381-4687-9CFC-A9E2CD7008F5' }, '*');
            };
            this._videoContainer._status.style.cursor = 'pointer';
          }
          return;
        }
        
        var url = urls[index];
        var img = this._videoContainer._img;
        var status = this._videoContainer._status;
        
        status.textContent = 'Tentando: ' + url.split('/').pop();
        
        var testImg = new Image();
        testImg.onload = function() {
          console.log('[ActiveX-Emu] URL funciona:', url);
          img.src = url;
          status.textContent = 'Conectado';
          
          // Auto-refresh
          self._refreshInterval = setInterval(function() {
            img.src = url + '?t=' + Date.now();
          }, 2000);
        };
        testImg.onerror = function() {
          self._tryUrls(urls, index + 1);
        };
        testImg.src = url + '?t=' + Date.now();
      }
    };
    
    // Definir propriedade object
    try {
      Object.defineProperty(ctrl, 'object', {
        get: function() { return ctrl; },
        configurable: true
      });
    } catch(e) {}
    
    return ctrl;
  }
  
  // Criar emulador de MSXML2.DOMDocument
  function createXMLDocument() {
    var doc = document.implementation.createDocument('', '', null);
    
    // Adicionar métodos que o IE espera
    doc.loadXML = function(xmlString) {
      try {
        var parser = new DOMParser();
        var newDoc = parser.parseFromString(xmlString, 'application/xml');
        // Copiar nodes
        while (doc.firstChild) doc.removeChild(doc.firstChild);
        for (var i = 0; i < newDoc.childNodes.length; i++) {
          doc.appendChild(doc.importNode(newDoc.childNodes[i], true));
        }
        doc.parseError = { errorCode: 0 };
        return true;
      } catch(e) {
        doc.parseError = { errorCode: 1, reason: e.message };
        return false;
      }
    };
    
    doc.load = function(url) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      try {
        xhr.send();
        return doc.loadXML(xhr.responseText);
      } catch(e) {
        return false;
      }
    };
    
    // Propriedades IE
    doc.parseError = { errorCode: 0, reason: '' };
    doc.async = false;
    doc.preserveWhiteSpace = true;
    doc.resolveExternals = false;
    
    // selectNodes e selectSingleNode (XPath)
    doc.selectNodes = function(xpath) {
      try {
        var result = doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        var nodes = [];
        for (var i = 0; i < result.snapshotLength; i++) {
          nodes.push(result.snapshotItem(i));
        }
        return nodes;
      } catch(e) {
        return [];
      }
    };
    
    doc.selectSingleNode = function(xpath) {
      var nodes = doc.selectNodes(xpath);
      return nodes.length > 0 ? nodes[0] : null;
    };
    
    // transformNode para XSLT
    doc.transformNode = function(xsl) {
      try {
        var processor = new XSLTProcessor();
        processor.importStylesheet(xsl);
        var result = processor.transformToDocument(doc);
        return new XMLSerializer().serializeToString(result);
      } catch(e) {
        return '';
      }
    };
    
    // xml property
    Object.defineProperty(doc, 'xml', {
      get: function() {
        return new XMLSerializer().serializeToString(doc);
      }
    });
    
    // text property
    Object.defineProperty(doc, 'text', {
      get: function() {
        return doc.textContent || '';
      }
    });
    
    return doc;
  }
  
  // Criar emulador de MSXML2.XMLHTTP
  function createXMLHTTP() {
    var xhr = new XMLHttpRequest();
    
    // Adicionar propriedades IE
    Object.defineProperty(xhr, 'responseBody', {
      get: function() { return xhr.response; }
    });
    
    return xhr;
  }
  
  // Stub para new ActiveXObject()
  if (!window.ActiveXObject) {
    window.ActiveXObject = function(progId) {
      console.log('[ActiveX-Emu] new ActiveXObject:', progId);
      
      var progIdLower = progId.toLowerCase();
      
      // MSXML2.DOMDocument - Manipulação XML
      if (progIdLower.includes('domdocument') || progIdLower.includes('xmldom') || 
          progIdLower === 'msxml2.domdocument' || progIdLower === 'msxml.domdocument' ||
          progIdLower === 'microsoft.xmldom') {
        console.log('[ActiveX-Emu] Criando XMLDocument');
        return createXMLDocument();
      }
      
      // MSXML2.XMLHTTP - Requisições HTTP
      if (progIdLower.includes('xmlhttp') || progIdLower.includes('serverxmlhttp') ||
          progIdLower === 'msxml2.xmlhttp' || progIdLower === 'microsoft.xmlhttp') {
        console.log('[ActiveX-Emu] Criando XMLHTTP');
        return createXMLHTTP();
      }
      
      // Scripting.FileSystemObject - Sistema de arquivos (stub)
      if (progIdLower.includes('filesystemobject') || progIdLower.includes('scripting.')) {
        console.log('[ActiveX-Emu] FileSystemObject (stub)');
        return {
          FileExists: function() { return false; },
          FolderExists: function() { return false; },
          CreateFolder: function() { return true; },
          DeleteFile: function() { return true; },
          OpenTextFile: function() { 
            return { 
              ReadAll: function() { return ''; },
              Write: function() {},
              Close: function() {}
            }; 
          }
        };
      }
      
      // Shell.Application - Stub
      if (progIdLower.includes('shell.application') || progIdLower.includes('wscript.shell')) {
        console.log('[ActiveX-Emu] Shell (stub)');
        return {
          Run: function() { return 0; },
          Exec: function() { return { Status: 0 }; },
          ExpandEnvironmentStrings: function(s) { return s; },
          RegRead: function() { return ''; },
          RegWrite: function() { return true; }
        };
      }
      
      // Default - DVR Control
      return createDVRControl(null);
    };
    window.ActiveXObject.__polyfill = true;
  }
  
  // Interceptar createElement para elementos object
  var originalCreateElement = document.createElement.bind(document);
  document.createElement = function(tagName) {
    var el = originalCreateElement(tagName);
    
    if (tagName.toLowerCase() === 'object') {
      console.log('[ActiveX-Emu] createElement object interceptado');
      
      // Adicionar métodos do controle DVR
      var ctrl = createDVRControl(el);
      var keys = Object.keys(ctrl);
      keys.forEach(function(key) {
        if (key.startsWith('_')) return;
        if (typeof ctrl[key] === 'function') {
          el[key] = ctrl[key].bind(ctrl);
        }
      });
      
      // Simular readyState
      el.readyState = 4;
      el.object = el;
      
      // Disparar ready após inserção no DOM
      var originalAppendChild = Element.prototype.appendChild;
      var checkInsertion = function() {
        if (el.parentNode) {
          setTimeout(function() {
            if (typeof el.onreadystatechange === 'function') {
              try { el.onreadystatechange(); } catch(e) {}
            }
          }, 50);
        }
      };
      
      // Observer para detectar inserção
      setTimeout(checkInsertion, 100);
    }
    
    return el;
  };
  
  // Interceptar getElementById para retornar objetos ActiveX emulados
  var originalGetById = document.getElementById.bind(document);
  document.getElementById = function(id) {
    var el = originalGetById(id);
    
    if (el && el.tagName === 'OBJECT' && !el.dataset.ieProcessed) {
      processActiveXElement(el);
    }
    
    return el;
  };
  
  // Interceptar try-catch global para suprimir erros de ActiveX
  window.onerror = function(msg, url, line, col, error) {
    if (msg && (msg.includes('ActiveX') || msg.includes('automation') || 
        msg.includes('Object doesn\\'t support') || msg.includes('not defined'))) {
      console.log('[ActiveX-Emu] Erro suprimido:', msg);
      return true; // Suprimir erro
    }
    return false;
  };
  
  // Processar elementos <object> com CLSID
  function processActiveXElement(el) {
    if (el.dataset.ieProcessed) return;
    el.dataset.ieProcessed = 'true';
    
    var classid = el.getAttribute('classid') || '';
    var match = classid.match(/{?([A-F0-9-]{8,36})}?/i);
    if (!match) return;
    
    var clsid = match[1].toUpperCase();
    var info = KNOWN_CLSIDS[clsid] || { brand: 'Unknown', type: 'unknown' };
    
    console.log('[ActiveX-Emu] Processando:', clsid, info.brand);
    
    // Notificar o renderer
    window.postMessage({ type: 'ACTIVEX_OBJECT_TAG', clsid: clsid }, '*');
    
    // Criar controle e aplicar ao elemento
    var ctrl = createDVRControl(el);
    
    // Copiar métodos e propriedades
    var keys = Object.keys(ctrl);
    keys.forEach(function(key) {
      if (key.startsWith('_')) return; // Pular privados
      if (typeof ctrl[key] === 'function') {
        el[key] = ctrl[key].bind(ctrl);
      } else {
        try {
          Object.defineProperty(el, key, {
            get: function() { return ctrl[key]; },
            set: function(v) { ctrl[key] = v; },
            configurable: true
          });
        } catch(e) {
          el[key] = ctrl[key];
        }
      }
    });
    
    // Garantir que object retorna o próprio elemento
    el.object = el;
    
    // Disparar evento ready
    setTimeout(function() {
      el.readyState = 4;
      if (typeof el.onreadystatechange === 'function') {
        try { el.onreadystatechange(); } catch(e) {}
      }
      var evt = document.createEvent('Event');
      evt.initEvent('readystatechange', true, true);
      el.dispatchEvent(evt);
    }, 100);
  }
  
  function scanForActiveX() {
    var objects = document.querySelectorAll('object[classid], embed[classid]');
    objects.forEach(processActiveXElement);
    
    // Também processar botões e links que podem chamar métodos ActiveX
    interceptLoginButtons();
  }
  
  // Interceptar botões de login e outros que chamam ActiveX
  function interceptLoginButtons() {
    // Encontrar botões de login
    var buttons = document.querySelectorAll('input[type="button"], input[type="submit"], button, a[href*="javascript"]');
    
    buttons.forEach(function(btn) {
      if (btn.dataset.ieIntercepted) return;
      btn.dataset.ieIntercepted = 'true';
      
      var onclick = btn.getAttribute('onclick') || '';
      var href = btn.getAttribute('href') || '';
      var value = (btn.value || btn.textContent || '').toLowerCase();
      
      // Detectar se é botão de login
      var isLoginButton = value.includes('login') || value.includes('entrar') || 
                          value.includes('acessar') || value.includes('conectar') ||
                          onclick.includes('Login') || onclick.includes('login');
      
      if (isLoginButton || onclick.includes('Login') || href.includes('Login')) {
        console.log('[ActiveX-Emu] Interceptando botão de login:', btn);
        
        // Adicionar nosso handler
        btn.addEventListener('click', function(e) {
          console.log('[ActiveX-Emu] Clique no botão de login detectado');
          
          // Tentar encontrar campos de usuário e senha
          var userField = document.querySelector('input[name*="user"], input[name*="User"], input[id*="user"], input[id*="User"], input[name*="name"], input[name*="login"]');
          var passField = document.querySelector('input[type="password"], input[name*="pass"], input[name*="Pass"], input[id*="pass"]');
          
          if (userField && passField) {
            var username = userField.value || 'admin';
            var password = passField.value || 'admin';
            var host = window.location.hostname;
            
            console.log('[ActiveX-Emu] Credenciais:', username, '****', 'Host:', host);
            
            // Atualizar estado global
            activeXState.username = username;
            activeXState.password = password;
            activeXState.loggedIn = true;
            
            // Tentar chamar Login em todos os objetos ActiveX
            var objects = document.querySelectorAll('object[classid]');
            objects.forEach(function(obj) {
              if (typeof obj.Login === 'function') {
                try {
                  console.log('[ActiveX-Emu] Chamando Login no objeto');
                  obj.Login(host, 80, username, password);
                } catch(e) {
                  console.log('[ActiveX-Emu] Erro ao chamar Login:', e);
                }
              }
            });
          }
          
          // Permitir que o evento continue (não bloquear)
        }, true);
      }
    });
    
    // Interceptar formulários
    var forms = document.querySelectorAll('form');
    forms.forEach(function(form) {
      if (form.dataset.ieIntercepted) return;
      form.dataset.ieIntercepted = 'true';
      
      form.addEventListener('submit', function(e) {
        console.log('[ActiveX-Emu] Formulário submetido');
        
        var userField = form.querySelector('input[name*="user"], input[name*="User"], input[id*="user"], input[name*="name"]');
        var passField = form.querySelector('input[type="password"]');
        
        if (userField && passField) {
          activeXState.username = userField.value || 'admin';
          activeXState.password = passField.value || 'admin';
          activeXState.loggedIn = true;
          console.log('[ActiveX-Emu] Credenciais capturadas do form');
        }
      }, true);
    });
  }
  
  // Executar após DOM carregado
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanForActiveX);
  } else {
    setTimeout(scanForActiveX, 50);
  }
  
  // Observer para elementos adicionados dinamicamente
  var observer = new MutationObserver(function(mutations) {
    var shouldRescan = false;
    mutations.forEach(function(m) {
      m.addedNodes.forEach(function(node) {
        if (node.nodeType !== 1) return;
        shouldRescan = true;
        if (node.matches && node.matches('object[classid], embed[classid]')) {
          processActiveXElement(node);
        }
        var nested = node.querySelectorAll ? node.querySelectorAll('object[classid], embed[classid]') : [];
        nested.forEach(processActiveXElement);
      });
    });
    // Re-escanear botões quando houver mudanças
    if (shouldRescan) {
      setTimeout(interceptLoginButtons, 100);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  
  // Interceptar cliques globalmente para capturar cliques em elementos criados via JS
  document.addEventListener('click', function(e) {
    var target = e.target;
    var onclick = target.getAttribute && target.getAttribute('onclick');
    
    if (onclick && (onclick.includes('Login') || onclick.includes('login') || onclick.includes('Check'))) {
      console.log('[ActiveX-Emu] Clique detectado em elemento com onclick:', onclick);
      
      // Capturar credenciais
      var userField = document.querySelector('input[name*="user" i], input[id*="user" i], input[name*="name" i]');
      var passField = document.querySelector('input[type="password"]');
      
      if (userField && passField) {
        activeXState.username = userField.value || 'admin';
        activeXState.password = passField.value || 'admin';
        activeXState.loggedIn = true;
        console.log('[ActiveX-Emu] Credenciais:', activeXState.username);
      }
    }
  }, true);
  
  console.log('[IE Portable] ActiveX Emulator carregado');
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
    streamPlayerContainer: document.getElementById('stream-player-container')
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
      webConfigUrls.unshift('/doc/page/config.asp', '/doc/page/preview.asp');
    } else if (brand.includes('dahua')) {
      webConfigUrls.unshift('/cgi-bin/configManager.cgi?action=getConfig&name=General');
    } else if (brand.includes('ipega') || brand.includes('qualvision') || brand.includes('tecvoz')) {
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
