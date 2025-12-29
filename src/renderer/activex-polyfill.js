// ============================================
// ActiveX Polyfill - Emula ActiveX para páginas de DVR
// Versão robusta que não trava páginas
// ============================================

/**
 * Script a ser injetado no webview para emular ActiveX
 * Este código roda no contexto da página web
 */
const ACTIVEX_POLYFILL_SCRIPT = `
(function() {
  // Se já existe ActiveXObject real (IE), não fazer nada
  if (window.ActiveXObject && !window.ActiveXObject.__polyfill) {
    return;
  }
  if (window.__iePortableActiveXPolyfill) {
    return;
  }

  console.log('[IE Portable] ActiveX Polyfill Robusto carregado');

  // ===============================================
  // TRATAMENTO GLOBAL DE ERROS - Evita travamentos
  // ===============================================
  window.addEventListener('error', function(e) {
    if (e.message && (
      e.message.includes('ActiveX') ||
      e.message.includes('undefined') ||
      e.message.includes('null') ||
      e.message.includes('object') ||
      e.message.includes('plugin') ||
      e.message.includes('not a function')
    )) {
      console.warn('[IE Portable] Erro suprimido:', e.message);
      e.preventDefault();
      e.stopPropagation();
      return true;
    }
  }, true);

  window.addEventListener('unhandledrejection', function(e) {
    console.warn('[IE Portable] Promise rejection suprimida:', e.reason);
    e.preventDefault();
  });

  // Storage para objetos ActiveX criados
  const activeXInstances = new Map();
  let instanceCounter = 0;

  // CLSIDs conhecidos de DVRs
  const KNOWN_CLSIDS = {
    'E0DA039D-992F-4187-A105-C699A71F5F06': { brand: 'Qualvision/Tecvoz', type: 'video-player' },
    '55F88890-DE29-4E36-B13B-E0774CAC9C5A': { brand: 'Hikvision', type: 'video-player' },
    '4B3476C6-3A85-4F86-8418-D1130C952B05': { brand: 'Dahua', type: 'video-player' },
    'B6D5419C-4B84-4C47-ACF6-4E5E0C6C1B7D': { brand: 'Ipega', type: 'video-player' }
  };

  // Métodos extensivos de players de DVR - todos retornam sucesso
  const DVR_PLAYER_METHODS = {
    // Conexão
    Login: function(ip, port, user, pass) {
      console.log('[ActiveX] Login chamado:', { ip, port, user });
      this._connectionInfo = { ip, port, user, pass };
      this._connected = true;
      return 1;
    },
    Logout: function() { this._connected = false; return 1; },
    Connect: function(ip, port, user, pass) { return this.Login(ip, port, user, pass); },
    Disconnect: function() { return this.Logout(); },
    LoginEx: function() { return 1; },
    LogoutEx: function() { return 1; },
    
    // Playback
    Play: function(channel) {
      console.log('[ActiveX] Play canal:', channel);
      this._playing = true;
      this._channel = channel || 0;
      window.postMessage({ type: 'ACTIVEX_PLAY', clsid: this._clsid, channel: channel, connectionInfo: this._connectionInfo }, '*');
      return 1;
    },
    Stop: function() {
      this._playing = false;
      window.postMessage({ type: 'ACTIVEX_STOP', clsid: this._clsid }, '*');
      return 1;
    },
    Pause: function() { return 1; },
    Resume: function() { return 1; },
    StartRealPlay: function(ch) { return this.Play(ch); },
    StopRealPlay: function() { return this.Stop(); },
    StartPlay: function(ch) { return this.Play(ch); },
    StopPlay: function() { return this.Stop(); },
    PlayByTime: function() { return 1; },
    StopPlayBack: function() { return 1; },
    StartRecord: function() { return 1; },
    StopRecord: function() { return 1; },
    
    // Configurações
    SetChannelNum: function(num) { this._channelNum = num; return 1; },
    GetChannelNum: function() { return this._channelNum || 0; },
    SetVisible: function(v) { this._visible = v; return 1; },
    SetWndNum: function(n) { this._wndNum = n; return 1; },
    GetWndNum: function() { return this._wndNum || 1; },
    SetSplitNum: function(n) { this._splitNum = n; return 1; },
    GetSplitNum: function() { return this._splitNum || 1; },
    SetSelectWnd: function() { return 1; },
    GetSelectWnd: function() { return 0; },
    
    // PTZ
    PTZControl: function(cmd, p1, p2) { console.log('[ActiveX] PTZ:', cmd, p1, p2); return 1; },
    PTZControlEx: function() { return 1; },
    PTZPreset: function() { return 1; },
    
    // Snapshot/Áudio
    CapturePicture: function() { return 1; },
    SavePicture: function() { return 1; },
    OpenSound: function() { return 1; },
    CloseSound: function() { return 1; },
    SetVolume: function() { return 1; },
    GetVolume: function() { return 50; },
    
    // Inicialização
    Init: function() { return 1; },
    InitPlugin: function() { return 1; },
    UnInit: function() { return 1; },
    Initialize: function() { return 1; },
    Uninitialize: function() { return 1; },
    SetConfig: function() { return 1; },
    GetConfig: function() { return ''; },
    
    // Status
    isConnected: function() { return this._connected || false; },
    isPlaying: function() { return this._playing || false; },
    IsConnected: function() { return this._connected || false; },
    IsPlaying: function() { return this._playing || false; },
    GetState: function() { return this._connected ? 1 : 0; },
    GetStatus: function() { return this._connected ? 1 : 0; },
    GetLastError: function() { return 0; },
    
    // Callbacks
    RegisterCallback: function() { return 1; },
    SetCallback: function() { return 1; },
    attachEvent: function() { return true; },
    detachEvent: function() { return true; },
    
    // Device
    GetDeviceInfo: function() { return {}; },
    GetDeviceConfig: function() { return {}; },
    SetDeviceConfig: function() { return 1; },
    
    toString: function() { return '[object ActiveXObject]'; }
  };

  // Criar objeto fake ActiveX com Proxy
  function createFakeActiveXObject(progId) {
    const instanceId = ++instanceCounter;
    
    let clsid = null;
    const clsidMatch = progId.match(/{([A-F0-9-]+)}/i);
    if (clsidMatch) {
      clsid = clsidMatch[1].toUpperCase();
    }
    
    console.log('[ActiveX] Criando objeto:', progId, 'CLSID:', clsid);
    
    window.postMessage({
      type: 'ACTIVEX_CREATED',
      progId: progId,
      clsid: clsid,
      instanceId: instanceId
    }, '*');

    const baseObj = {
      _id: instanceId,
      _progId: progId,
      _clsid: clsid,
      _connected: false,
      _playing: false,
      _visible: true,
      _connectionInfo: null,
      ...DVR_PLAYER_METHODS
    };

    // Propriedades como getters/setters
    Object.defineProperties(baseObj, {
      Connected: { get: function() { return this._connected; }, set: function(v) { this._connected = v; } },
      Playing: { get: function() { return this._playing; }, set: function(v) { this._playing = v; } },
      Visible: { get: function() { return this._visible; }, set: function(v) { this._visible = v; } },
      readyState: { get: function() { return 4; } },
      valid: { get: function() { return 1; } }
    });

    // Usar Proxy para evitar erros em propriedades inexistentes
    const proxy = new Proxy(baseObj, {
      get: function(target, prop) {
        if (prop in target) return target[prop];
        if (typeof prop === 'string') {
          console.log('[ActiveX] Propriedade não mapeada:', prop);
          return function() { return 1; };
        }
        return undefined;
      },
      set: function(target, prop, value) { target[prop] = value; return true; },
      has: function() { return true; }
    });

    activeXInstances.set(instanceId, proxy);
    return proxy;
  }

  // Constructor ActiveXObject
  window.ActiveXObject = function(progId) {
    return createFakeActiveXObject(progId);
  };
  window.ActiveXObject.__polyfill = true;
  window.ActiveXObject.toString = function() { return 'function ActiveXObject() { [native code] }'; };

  // Processar tags <object> sem esconder - apenas adiciona fallback
  function processElement(element) {
    if (element.tagName !== 'OBJECT' && element.tagName !== 'EMBED') return;
    if (element.dataset.iePortableProcessed) return;
    
    element.dataset.iePortableProcessed = 'true';
    
    let clsid = element.getAttribute('classid') || element.getAttribute('clsid') || '';
    const clsidMatch = clsid.match(/{?([A-F0-9-]+)}?/i);
    
    if (clsidMatch) {
      clsid = clsidMatch[1].toUpperCase();
      console.log('[ActiveX] Tag <object> detectada com CLSID:', clsid);
      
      window.postMessage({
        type: 'ACTIVEX_OBJECT_TAG',
        clsid: clsid,
        element: { id: element.id, name: element.name }
      }, '*');

      // Adicionar botão de fallback discreto
      const info = KNOWN_CLSIDS[clsid] || { brand: 'Plugin' };
      const fallbackBtn = document.createElement('div');
      fallbackBtn.className = 'ie-portable-fallback';
      fallbackBtn.style.cssText = 'position:absolute;top:5px;right:5px;z-index:99999;background:rgba(233,69,96,0.9);color:white;padding:5px 10px;border-radius:4px;font-size:11px;cursor:pointer;font-family:Arial;box-shadow:0 2px 5px rgba(0,0,0,0.3);';
      fallbackBtn.innerHTML = '🎬 Player Alt.';
      fallbackBtn.title = 'Clique para abrir player alternativo (RTSP)';
      fallbackBtn.onclick = function(e) {
        e.stopPropagation();
        window.postMessage({type:'ACTIVEX_SHOW_PLAYER', clsid: clsid}, '*');
      };
      
      if (element.parentNode) {
        var wrapperStyle = window.getComputedStyle(element.parentNode);
        if (wrapperStyle.position === 'static') {
          element.parentNode.style.position = 'relative';
        }
        element.parentNode.appendChild(fallbackBtn);
      }

      // Preparar elemento com métodos stub
      try {
        var fakeObj = createFakeActiveXObject('CLSID:' + clsid);
        Object.keys(DVR_PLAYER_METHODS).forEach(function(key) {
          element[key] = DVR_PLAYER_METHODS[key].bind(fakeObj);
        });
        element.object = fakeObj;
        element.readyState = 4;
        element.valid = 1;
        element.Valid = 1;
      } catch(e) {
        console.warn('[ActiveX] Erro ao preparar elemento:', e);
      }
    }
  }

  // Observar DOM
  function interceptObjectTags() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            try {
              processElement(node);
              node.querySelectorAll && node.querySelectorAll('object, embed').forEach(processElement);
            } catch(e) {
              console.warn('[ActiveX] Erro ao processar:', e);
            }
          }
        });
      });
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    document.querySelectorAll('object, embed').forEach(processElement);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', interceptObjectTags);
  } else {
    interceptObjectTags();
  }

  window.__iePortableActiveXPolyfill = true;
  console.log('[IE Portable] ActiveX Polyfill Robusto ativo');
})();
`;

/**
 * Injeta o polyfill ActiveX no webview
 */
async function injectActiveXPolyfill(webview) {
  try {
    await webview.executeJavaScript(ACTIVEX_POLYFILL_SCRIPT);
    console.log('[ActiveX Polyfill] Injetado com sucesso');
    return true;
  } catch (error) {
    console.error('[ActiveX Polyfill] Erro ao injetar:', error);
    return false;
  }
}

/**
 * Configura listener para mensagens do polyfill
 */
function setupPolyfillMessageListener(webview, onActiveXEvent) {
  webview.addEventListener('console-message', (e) => {
    if (e.message.startsWith('[ActiveX]')) {
      console.log('ActiveX Event:', e.message);
    }
  });

  webview.addEventListener('ipc-message', (e) => {
    if (e.channel === 'activex-event' && onActiveXEvent) {
      onActiveXEvent(e.args[0]);
    }
  });
}

// Exportar para uso no renderer
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ACTIVEX_POLYFILL_SCRIPT,
    injectActiveXPolyfill,
    setupPolyfillMessageListener
  };
}
