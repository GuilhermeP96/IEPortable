// ============================================
// ActiveX Polyfill - Emula ActiveX para páginas de DVR
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

  console.log('[IE Portable] ActiveX Polyfill carregado');

  // Storage para objetos ActiveX criados
  const activeXInstances = new Map();
  let instanceCounter = 0;

  // CLSIDs conhecidos de DVRs
  const KNOWN_CLSIDS = {
    // Qualvision / Tecvoz
    'E0DA039D-992F-4187-A105-C699A71F5F06': { 
      brand: 'Qualvision/Tecvoz',
      type: 'video-player'
    },
    // Hikvision
    '55F88890-DE29-4E36-B13B-E0774CAC9C5A': {
      brand: 'Hikvision',
      type: 'video-player'
    },
    // Dahua
    '4B3476C6-3A85-4F86-8418-D1130C952B05': {
      brand: 'Dahua',
      type: 'video-player'
    }
  };

  // Métodos comuns de players de DVR
  const DVR_PLAYER_METHODS = {
    // Métodos de conexão
    Login: function(ip, port, user, pass) {
      console.log('[ActiveX] Login chamado:', { ip, port, user });
      this._connectionInfo = { ip, port, user, pass };
      this._connected = true;
      return 1; // Sucesso
    },
    Logout: function() {
      console.log('[ActiveX] Logout chamado');
      this._connected = false;
      return 1;
    },
    Connect: function(ip, port, user, pass) {
      return this.Login(ip, port, user, pass);
    },
    Disconnect: function() {
      return this.Logout();
    },
    
    // Métodos de playback
    Play: function(channel) {
      console.log('[ActiveX] Play chamado, canal:', channel);
      this._playing = true;
      this._channel = channel || 0;
      // Notificar IE Portable para mostrar player alternativo
      window.postMessage({
        type: 'ACTIVEX_PLAY',
        clsid: this._clsid,
        channel: channel,
        connectionInfo: this._connectionInfo
      }, '*');
      return 1;
    },
    Stop: function() {
      console.log('[ActiveX] Stop chamado');
      this._playing = false;
      window.postMessage({
        type: 'ACTIVEX_STOP',
        clsid: this._clsid
      }, '*');
      return 1;
    },
    StartRealPlay: function(channel) {
      return this.Play(channel);
    },
    StopRealPlay: function() {
      return this.Stop();
    },
    
    // Métodos de propriedade
    SetChannelNum: function(num) {
      this._channelNum = num;
    },
    GetChannelNum: function() {
      return this._channelNum || 0;
    },
    SetVisible: function(visible) {
      this._visible = visible;
    },
    SetWndNum: function(num) {
      this._wndNum = num;
    },
    
    // PTZ
    PTZControl: function(cmd, param1, param2) {
      console.log('[ActiveX] PTZ:', cmd, param1, param2);
      return 1;
    },
    
    // Propriedades como métodos
    isConnected: function() {
      return this._connected || false;
    },
    isPlaying: function() {
      return this._playing || false;
    }
  };

  // Criar objeto fake ActiveX
  function createFakeActiveXObject(progId) {
    const instanceId = ++instanceCounter;
    
    // Extrair CLSID do progId se existir
    let clsid = null;
    const clsidMatch = progId.match(/{([A-F0-9-]+)}/i);
    if (clsidMatch) {
      clsid = clsidMatch[1].toUpperCase();
    }
    
    console.log('[ActiveX] Criando objeto:', progId, 'CLSID:', clsid);
    
    // Notificar IE Portable que um ActiveX foi criado
    window.postMessage({
      type: 'ACTIVEX_CREATED',
      progId: progId,
      clsid: clsid,
      instanceId: instanceId,
      timestamp: Date.now()
    }, '*');

    const obj = {
      _id: instanceId,
      _progId: progId,
      _clsid: clsid,
      _connected: false,
      _playing: false,
      _visible: true,
      _connectionInfo: null,
      
      // Adicionar todos os métodos DVR
      ...DVR_PLAYER_METHODS
    };

    // Adicionar propriedades como getters/setters
    Object.defineProperties(obj, {
      Connected: {
        get: function() { return this._connected; },
        set: function(v) { this._connected = v; }
      },
      Playing: {
        get: function() { return this._playing; },
        set: function(v) { this._playing = v; }
      },
      Visible: {
        get: function() { return this._visible; },
        set: function(v) { this._visible = v; }
      }
    });

    activeXInstances.set(instanceId, obj);
    return obj;
  }

  // Criar constructor ActiveXObject
  window.ActiveXObject = function(progId) {
    return createFakeActiveXObject(progId);
  };
  window.ActiveXObject.__polyfill = true;

  // Também emular window.ActiveXObject como função (algumas páginas usam assim)
  window.ActiveXObject.toString = function() {
    return 'function ActiveXObject() { [native code] }';
  };

  // Interceptar tags <object> com CLSIDs
  function interceptObjectTags() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element
            processElement(node);
            node.querySelectorAll && node.querySelectorAll('object, embed').forEach(processElement);
          }
        });
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    // Processar elementos existentes
    document.querySelectorAll('object, embed').forEach(processElement);
  }

  function processElement(element) {
    if (element.tagName !== 'OBJECT' && element.tagName !== 'EMBED') return;
    if (element.dataset.iePortableProcessed) return;
    
    element.dataset.iePortableProcessed = 'true';
    
    // Extrair CLSID
    let clsid = element.getAttribute('classid') || element.getAttribute('clsid') || '';
    const clsidMatch = clsid.match(/{?([A-F0-9-]+)}?/i);
    
    if (clsidMatch) {
      clsid = clsidMatch[1].toUpperCase();
      console.log('[ActiveX] Tag <object> detectada com CLSID:', clsid);
      
      // Notificar IE Portable
      window.postMessage({
        type: 'ACTIVEX_OBJECT_TAG',
        clsid: clsid,
        element: {
          id: element.id,
          name: element.name,
          width: element.width || element.style.width,
          height: element.height || element.style.height
        },
        timestamp: Date.now()
      }, '*');

      // Criar placeholder visual
      createPlaceholder(element, clsid);
    }
  }

  function createPlaceholder(element, clsid) {
    const info = KNOWN_CLSIDS[clsid] || { brand: 'Desconhecido', type: 'video-player' };
    
    // Criar div placeholder
    const placeholder = document.createElement('div');
    placeholder.className = 'ie-portable-activex-placeholder';
    placeholder.style.cssText = \`
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 2px solid #0f3460;
      border-radius: 8px;
      color: #e94560;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 200px;
      padding: 20px;
      text-align: center;
      font-family: Arial, sans-serif;
    \`;
    
    placeholder.innerHTML = \`
      <div style="font-size: 48px; margin-bottom: 10px;">📹</div>
      <div style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">Plugin ActiveX Detectado</div>
      <div style="font-size: 14px; color: #aaa; margin-bottom: 15px;">\${info.brand} (CLSID: \${clsid.substring(0, 8)}...)</div>
      <button onclick="window.postMessage({type: 'ACTIVEX_SHOW_PLAYER', clsid: '\${clsid}'}, '*')" 
        style="background: #e94560; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px;">
        🎬 Abrir Player Alternativo
      </button>
      <div style="font-size: 12px; color: #666; margin-top: 10px;">
        O IE Portable pode reproduzir este stream usando RTSP
      </div>
    \`;

    // Substituir o elemento original pelo placeholder
    if (element.parentNode) {
      // Manter dimensões originais se especificadas
      if (element.width) placeholder.style.width = element.width + 'px';
      if (element.height) placeholder.style.height = element.height + 'px';
      
      element.parentNode.insertBefore(placeholder, element);
      element.style.display = 'none';
    }
  }

  // Executar quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', interceptObjectTags);
  } else {
    interceptObjectTags();
  }

  // Marcar que o polyfill está ativo
  window.__iePortableActiveXPolyfill = true;
  
  console.log('[IE Portable] ActiveX Polyfill ativo - ActiveXObject disponível');
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
  // Listener para mensagens do polyfill via console
  webview.addEventListener('console-message', (e) => {
    if (e.message.startsWith('[ActiveX]')) {
      console.log('ActiveX Event:', e.message);
    }
  });

  // Listener para mensagens postMessage (via IPC se necessário)
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
