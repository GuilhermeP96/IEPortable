// ============================================
// ActiveX Emulator - Emula controles ActiveX de DVR
// ============================================

class ActiveXEmulator {
  constructor() {
    this.controls = new Map(); // id -> controle emulado
    this.videoPlayers = new Map(); // id -> elemento de vídeo
    
    // CLSIDs conhecidos e seus handlers
    this.knownCLSIDs = {
      // Ipega / Qualvision / Tecvoz (genérico)
      'B6D5419C-D381-4687-9CFC-A9E2CD7008F5': 'IpegaControl',
      
      // ==========================================
      // Hikvision - Todos os CLSIDs
      // ==========================================
      '6263DEED-F971-4C18-AB42-3ABCDE741A89': 'HikvisionControl',
      '08CF8D24-DA5E-4C0B-B2E3-E72B3C714BAC': 'HikvisionControl',
      'CCAB80D2-5DCF-44FB-9EAE-0F632B758498': 'HikvisionControl',
      '55F88890-DE29-4E36-B13B-E0774CAC9C5A': 'HikvisionControl',
      'A4452457-8E0E-4F87-829C-5DE9E0DD4D76': 'HikvisionControl',
      '150B57E6-D57E-45D3-A6E8-2A70F874B70C': 'HikvisionControl',
      'D8F7B6D8-3E5A-4B27-8C83-F91BAB946D2A': 'HikvisionControl',
      '5E0E2E49-1BAB-4C2A-B4CE-1B4E56AE7B3E': 'HikvisionControl',
      'E7EF736D-B4E6-4A5A-BA94-732D71107808': 'HikvisionControl',
      
      // ==========================================
      // Tecvoz - Todos os CLSIDs
      // ==========================================
      '3BFEDAE3-B170-4C2E-B6AA-E945E3260C70': 'TecvozControl',
      'E23B5E25-AA3A-4B2C-8B5A-1A38E93E2C60': 'TecvozControl',
      'C7B43A36-2B41-4B2F-9B10-68A2E3E53D18': 'TecvozControl',
      'A83053A4-6E5A-4F5E-8B3B-8B9F1C50DA32': 'TecvozControl',
      // Tecvoz/Qualvision genérico
      'E0DA039D-992F-4187-A105-C699A71F5F06': 'TecvozControl',
      
      // Dahua
      '4B3476C6-3A85-4C2C-BD55-BD8F1E028B00': 'DahuaControl',
      '39B06C8F-91A7-4CAC-8B94-C8B8F26B1A8C': 'DahuaControl',
      '4B3476C6-3A85-4F86-8418-D1130C952B05': 'DahuaControl',
      
      // Intelbras (OEM Dahua)
      '99EC681B-C798-4B2A-A57C-98D8E3E96FAA': 'DahuaControl',
    };
    
    // Configurações padrão
    this.defaultConfig = {
      rtspPort: 554,
      httpPort: 80,
      username: 'admin',
      password: 'admin'
    };
  }

  /**
   * Cria um controle emulado para um elemento <object>
   */
  createControl(element, clsid) {
    const controlType = this.knownCLSIDs[clsid] || 'GenericControl';
    const controlId = element.id || `activex_${Date.now()}`;
    
    console.log(`[ActiveX Emulator] Criando controle ${controlType} para CLSID ${clsid}`);
    
    let control;
    switch (controlType) {
      case 'IpegaControl':
        control = new IpegaActiveXControl(element, clsid, this);
        break;
      case 'HikvisionControl':
        control = new HikvisionActiveXControl(element, clsid, this);
        break;
      case 'TecvozControl':
        control = new TecvozActiveXControl(element, clsid, this);
        break;
      case 'DahuaControl':
        control = new DahuaActiveXControl(element, clsid, this);
        break;
      default:
        control = new GenericActiveXControl(element, clsid, this);
    }
    
    this.controls.set(controlId, control);
    return control;
  }

  /**
   * Obtém um controle existente
   */
  getControl(id) {
    return this.controls.get(id);
  }

  /**
   * Cria um player de vídeo substituto
   */
  createVideoPlayer(element, streamUrl) {
    const container = document.createElement('div');
    container.className = 'activex-video-container';
    container.style.cssText = `
      width: 100%;
      height: 100%;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    `;
    
    // Tentar diferentes métodos de reprodução
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.controls = true;
    video.style.cssText = 'width: 100%; height: 100%; object-fit: contain;';
    
    // Para RTSP, usar img com MJPEG como fallback
    const img = document.createElement('img');
    img.style.cssText = 'width: 100%; height: 100%; object-fit: contain; display: none;';
    
    // Mensagem de status
    const status = document.createElement('div');
    status.className = 'activex-video-status';
    status.style.cssText = `
      position: absolute;
      bottom: 10px;
      left: 10px;
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 12px;
    `;
    status.textContent = 'Conectando...';
    
    container.appendChild(video);
    container.appendChild(img);
    container.appendChild(status);
    
    // Substituir o elemento original
    element.style.display = 'none';
    element.parentNode.insertBefore(container, element.nextSibling);
    
    return { container, video, img, status };
  }
}

// ============================================
// Controle Base
// ============================================

class BaseActiveXControl {
  constructor(element, clsid, emulator) {
    this.element = element;
    this.clsid = clsid;
    this.emulator = emulator;
    this.host = null;
    this.port = 80;
    this.username = 'admin';
    this.password = 'admin';
    this.loggedIn = false;
    this.channels = [];
    this.currentChannel = 0;
    this.videoPlayer = null;
    
    // Estado
    this.readyState = 4;
    this.valid = 1;
    
    // Aplicar métodos ao elemento
    this.applyToElement();
  }

  applyToElement() {
    const self = this;
    const methods = [
      'Login', 'Logout', 'Init', 'Play', 'Stop', 'Pause', 'Resume',
      'StartRealPlay', 'StopRealPlay', 'SetChannel', 'GetChannel',
      'PTZControl', 'PTZControlEx', 'StartRecord', 'StopRecord',
      'Playback', 'DeviceConfig', 'GetConfig', 'SetConfig',
      'GetDeviceInfo', 'CapturePicture', 'SavePicture',
      'QueryRecordFile', 'QueryRecordFileEx', 'ConnectRealPlay',
      'DisconnectRealPlay', 'SetDisplayRegion', 'Refresh'
    ];
    
    methods.forEach(method => {
      if (typeof this[method] === 'function') {
        this.element[method] = this[method].bind(this);
      } else {
        this.element[method] = () => {
          console.log(`[ActiveX] ${method}() chamado (stub)`);
          return 1;
        };
      }
    });
    
    // Propriedades
    Object.defineProperty(this.element, 'readyState', {
      get: () => this.readyState,
      configurable: true
    });
    
    Object.defineProperty(this.element, 'valid', {
      get: () => this.valid,
      configurable: true
    });
    
    Object.defineProperty(this.element, 'object', {
      get: () => this.element,
      configurable: true
    });
  }

  // Métodos base - sobrescrever nas subclasses
  Login(host, port, username, password) {
    console.log(`[ActiveX] Login: ${host}:${port} user=${username}`);
    this.host = host;
    this.port = port || 80;
    this.username = username || 'admin';
    this.password = password || 'admin';
    this.loggedIn = true;
    return 1;
  }

  Logout() {
    console.log('[ActiveX] Logout');
    this.loggedIn = false;
    return 1;
  }

  Init() {
    console.log('[ActiveX] Init');
    return 1;
  }

  Play() {
    console.log('[ActiveX] Play');
    this.startVideoStream();
    return 1;
  }

  Stop() {
    console.log('[ActiveX] Stop');
    this.stopVideoStream();
    return 1;
  }

  StartRealPlay(channel) {
    console.log(`[ActiveX] StartRealPlay: channel=${channel}`);
    this.currentChannel = channel || 0;
    this.startVideoStream();
    return 1;
  }

  StopRealPlay() {
    console.log('[ActiveX] StopRealPlay');
    this.stopVideoStream();
    return 1;
  }

  SetChannel(channel) {
    console.log(`[ActiveX] SetChannel: ${channel}`);
    this.currentChannel = channel;
    return 1;
  }

  GetChannel() {
    return this.currentChannel;
  }

  // Métodos de vídeo
  startVideoStream() {
    if (!this.host) {
      console.warn('[ActiveX] Host não definido');
      return;
    }
    
    const streamUrls = this.getStreamUrls();
    console.log('[ActiveX] URLs de stream:', streamUrls);
    
    if (!this.videoPlayer) {
      this.videoPlayer = this.emulator.createVideoPlayer(this.element, streamUrls[0]);
    }
    
    this.tryStreamUrls(streamUrls);
  }

  stopVideoStream() {
    if (this.videoPlayer) {
      if (this.videoPlayer.video) {
        this.videoPlayer.video.pause();
        this.videoPlayer.video.src = '';
      }
      if (this.videoPlayer.img) {
        this.videoPlayer.img.src = '';
      }
    }
  }

  getStreamUrls() {
    // Sobrescrever nas subclasses
    return [
      `http://${this.host}/cgi-bin/snapshot.cgi`,
      `http://${this.host}/snap.jpg`,
      `http://${this.host}/image.jpg`
    ];
  }

  async tryStreamUrls(urls) {
    if (!this.videoPlayer) return;
    
    const { video, img, status } = this.videoPlayer;
    
    for (const url of urls) {
      status.textContent = `Tentando: ${url}`;
      console.log('[ActiveX] Tentando URL:', url);
      
      try {
        if (url.includes('rtsp://')) {
          // RTSP não funciona diretamente em browsers
          status.textContent = 'RTSP requer player externo';
          continue;
        }
        
        if (url.includes('.mjpg') || url.includes('mjpeg') || url.includes('video.cgi')) {
          // MJPEG stream
          img.style.display = 'block';
          video.style.display = 'none';
          img.src = url;
          
          // Verificar se carregou
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            setTimeout(reject, 5000);
          });
          
          status.textContent = 'Conectado (MJPEG)';
          return;
        }
        
        // Tentar como imagem estática (snapshot)
        const response = await fetch(url, {
          mode: 'no-cors',
          credentials: 'include'
        });
        
        if (response.ok || response.type === 'opaque') {
          img.style.display = 'block';
          video.style.display = 'none';
          img.src = url;
          
          // Auto-refresh para simular vídeo
          this.snapshotInterval = setInterval(() => {
            img.src = url + '?t=' + Date.now();
          }, 1000);
          
          status.textContent = 'Conectado (Snapshot)';
          return;
        }
      } catch (e) {
        console.log('[ActiveX] Falha em:', url, e.message);
      }
    }
    
    status.textContent = 'Não foi possível conectar. Clique para configurar.';
    status.style.cursor = 'pointer';
    status.onclick = () => {
      window.postMessage({ type: 'ACTIVEX_SHOW_PLAYER', clsid: this.clsid }, '*');
    };
  }
}

// ============================================
// Controle Ipega / Qualvision / Tecvoz
// ============================================

class IpegaActiveXControl extends BaseActiveXControl {
  constructor(element, clsid, emulator) {
    super(element, clsid, emulator);
    this.brand = 'Ipega';
  }

  getStreamUrls() {
    const ch = this.currentChannel || 1;
    const auth = this.username && this.password 
      ? `${this.username}:${this.password}@` 
      : '';
    
    return [
      // Snapshot URLs
      `http://${auth}${this.host}/cgi-bin/snapshot.cgi?channel=${ch}`,
      `http://${auth}${this.host}/snap.jpg?channel=${ch}`,
      `http://${auth}${this.host}/tmpfs/auto.jpg`,
      `http://${auth}${this.host}/image/jpeg.cgi`,
      
      // MJPEG URLs
      `http://${auth}${this.host}/cgi-bin/mjpeg.cgi?channel=${ch}`,
      `http://${auth}${this.host}/video.mjpg`,
      `http://${auth}${this.host}/mjpeg/1`,
      
      // RTSP (precisa de player externo)
      `rtsp://${auth}${this.host}:554/user=admin&password=&channel=${ch}&stream=0.sdp`,
      `rtsp://${auth}${this.host}:554/cam/realmonitor?channel=${ch}&subtype=0`,
    ];
  }

  // Métodos específicos Ipega
  Login(ip, port, user, pass) {
    super.Login(ip, port, user, pass);
    
    // Tentar autenticar via HTTP
    this.authenticate();
    return 1;
  }

  async authenticate() {
    try {
      // Tentar login via HTTP
      const loginUrls = [
        `http://${this.host}/cgi-bin/global.login?userName=${this.username}&password=${this.password}`,
        `http://${this.host}/RPC_Login/${this.username}/${this.password}`,
        `http://${this.host}/ISAPI/Security/sessionLogin`
      ];
      
      for (const url of loginUrls) {
        try {
          const response = await fetch(url, { 
            method: 'GET',
            mode: 'no-cors',
            credentials: 'include'
          });
          console.log('[Ipega] Login tentado:', url);
        } catch (e) {
          // Ignorar erros
        }
      }
    } catch (e) {
      console.warn('[Ipega] Erro na autenticação:', e);
    }
  }
}

// ============================================
// Controle Hikvision (WebComponents / VideoWebPlugin completo)
// ============================================

class HikvisionActiveXControl extends BaseActiveXControl {
  constructor(element, clsid, emulator) {
    super(element, clsid, emulator);
    this.brand = 'Hikvision';
    this.iDevicePort = 80;
    this.iRtspPort = 554;
    this.szDeviceIdentify = '';
    this.iWndNum = 1;
    this.iSelectedWnd = 0;
    this.bConnected = false;
    this.handles = new Map();
    this.handleCounter = 1000;
    this.applyHikvisionMethods();
  }

  /**
   * Aplica todos os métodos específicos da API Hikvision WebComponents
   * ao elemento DOM para que o JavaScript da página funcione
   */
  applyHikvisionMethods() {
    const self = this;
    const el = this.element;

    // ============================================
    // API JavaScript Hikvision WebComponents (JS_*)
    // ============================================

    // Login - retorna um handle (número longo)
    el.JS_Login = function(ip, port, user, pass) {
      console.log(`[Hikvision] JS_Login: ${ip}:${port} user=${user}`);
      self.host = ip;
      self.port = port || 80;
      self.iDevicePort = port || 80;
      self.username = user || 'admin';
      self.password = pass || 'admin';
      self.loggedIn = true;
      self.bConnected = true;
      const handle = ++self.handleCounter;
      self.handles.set(handle, { ip, port, user, pass });
      self.szDeviceIdentify = `${ip}_${port}`;
      return handle;
    };

    // Logout por handle
    el.JS_Logout = function(handle) {
      console.log(`[Hikvision] JS_Logout: handle=${handle}`);
      self.handles.delete(handle);
      if (self.handles.size === 0) {
        self.loggedIn = false;
        self.bConnected = false;
      }
      return true;
    };

    // Play - iniciar stream
    el.JS_Play = function(url, options, wndIndex, streamType, mode) {
      console.log(`[Hikvision] JS_Play: url=${url} wnd=${wndIndex} stream=${streamType}`);
      self.currentChannel = wndIndex || 0;
      self.startVideoStream();
      return true;
    };

    // Stop - parar stream
    el.JS_Stop = function(wndIndex) {
      console.log(`[Hikvision] JS_Stop: wnd=${wndIndex}`);
      self.stopVideoStream();
      return true;
    };

    // Definir número de janelas
    el.JS_SetWindowNum = function(num) {
      console.log(`[Hikvision] JS_SetWindowNum: ${num}`);
      self.iWndNum = num;
      return true;
    };

    // Selecionar janela ativa
    el.JS_SelectWnd = function(wnd) {
      console.log(`[Hikvision] JS_SelectWnd: ${wnd}`);
      self.iSelectedWnd = wnd;
      return true;
    };

    // Captura de imagem
    el.JS_Capture = function(channel) {
      console.log(`[Hikvision] JS_Capture: channel=${channel}`);
      return true;
    };

    // Audio talk
    el.JS_StartTalk = function(channel) {
      console.log(`[Hikvision] JS_StartTalk: channel=${channel}`);
      return true;
    };

    el.JS_StopTalk = function(channel) {
      console.log(`[Hikvision] JS_StopTalk: channel=${channel}`);
      return true;
    };

    // PTZ control
    el.JS_PTZControl = function(cmd, stop, speed) {
      console.log(`[Hikvision] JS_PTZControl: cmd=${cmd} stop=${stop} speed=${speed}`);
      return true;
    };

    // Resize/layout
    el.JS_Resize = function(w, h) {
      console.log(`[Hikvision] JS_Resize: ${w}x${h}`);
      return true;
    };

    // Presença digital
    el.JS_SetDigitalSign = function() { return true; };

    // Gravar
    el.JS_StartRecord = function(path) {
      console.log(`[Hikvision] JS_StartRecord: ${path}`);
      return true;
    };

    el.JS_StopRecord = function() {
      console.log(`[Hikvision] JS_StopRecord`);
      return true;
    };

    // Som e volume
    el.JS_OpenSound = function(wnd) { return true; };
    el.JS_CloseSound = function(wnd) { return true; };
    el.JS_SetVolume = function(vol) { return true; };
    el.JS_GetVolume = function() { return 50; };

    // Playback
    el.JS_StartPlayback = function(url, options, wnd) {
      console.log(`[Hikvision] JS_StartPlayback: ${url}`);
      return true;
    };

    el.JS_StopPlayback = function(wnd) { return true; };
    el.JS_PausePlayback = function(wnd) { return true; };
    el.JS_ResumePlayback = function(wnd) { return true; };
    el.JS_PlaybackSpeed = function(speed, wnd) { return true; };
    el.JS_PlaybackSeek = function(time, wnd) { return true; };

    // Consultas
    el.JS_QueryDeviceInfo = function() { return JSON.stringify({ success: true }); };
    el.JS_QueryAlarmInfo = function() { return JSON.stringify({ success: true }); };
    el.JS_GetDevicePort = function() { return self.iDevicePort; };
    el.JS_GetRtspPort = function() { return self.iRtspPort; };

    // Criptografia
    el.JS_SetSecretKey = function(key) { return true; };
    el.JS_GetEncryptStr = function(str) { return str; };

    // Inicialização
    el.JS_Init = function() {
      console.log('[Hikvision] JS_Init');
      return true;
    };

    el.JS_DeInit = function() {
      console.log('[Hikvision] JS_DeInit');
      return true;
    };

    // ============================================
    // API alternativa HWP_* (iVMS-4200 Web)
    // ============================================
    el.HWP_JS_Login = el.JS_Login;
    el.HWP_Play = el.JS_Play;
    el.HWP_Stop = el.JS_Stop;
    el.HWP_SetWindowNum = el.JS_SetWindowNum;
    el.HWP_SelectWnd = el.JS_SelectWnd;
    el.HWP_PTZControl = el.JS_PTZControl;
    el.HWP_Capture = el.JS_Capture;
    el.HWP_Logout = el.JS_Logout;

    // ============================================
    // API webVideoCtrl.js (Hikvision web control)
    // ============================================
    el.HWP_Init = el.JS_Init;
    el.HWP_DeInit = el.JS_DeInit;
    el.HWP_Resize = el.JS_Resize;
    el.HWP_StartTalk = el.JS_StartTalk;
    el.HWP_StopTalk = el.JS_StopTalk;
    el.HWP_StartRecord = el.JS_StartRecord;
    el.HWP_StopRecord = el.JS_StopRecord;
    el.HWP_OpenSound = el.JS_OpenSound;
    el.HWP_CloseSound = el.JS_CloseSound;
    
    // HWP_setPlayWndMode / HWP_ArrangeWindow (métodos de layout de janela)
    el.HWP_setPlayWndMode = function(mode) {
      console.log('[ActiveX-Emu] HWP_setPlayWndMode:', mode);
      return true;
    };
    el.HWP_SetPlayWndMode = el.HWP_setPlayWndMode;
    el.HWP_ArrangeWindow = function(mode) {
      console.log('[ActiveX-Emu] HWP_ArrangeWindow:', mode);
      return true;
    };

    // HWP_* config/state methods used by Hikvision web interface
    el.HWP_GetLocalConfig = function(key) {
      console.log('[ActiveX-Emu] HWP_GetLocalConfig:', key);
      var configs = {
        'PluginVersion': '3.0.6.1', 'EncryptMode': '0', 'PlaybackType': '0',
        'StreamType': '1', 'PackageType': '0', 'SearchType': '0',
        'TransmodeType': '0', 'ProtocolType': '1', 'NetworkTransmissionType': '0',
        'BufferSize': '0', 'IVSMode': '0'
      };
      return configs[key] || '';
    };
    el.HWP_SetLocalConfig = function(key, value) { return true; };
    el.HWP_GetStreamingCapability = function(handle) { return JSON.stringify({ StreamingChannel: [] }); };
    el.HWP_SetEncryptMode = function(mode) { return true; };
    el.HWP_GetEncryptMode = function() { return 0; };
    el.HWP_GetPluginVersion = function() { return '3.0.6.1'; };
    el.HWP_SetStreamType = function(wnd, type) { return true; };
    el.HWP_GetStreamType = function(wnd) { return 1; };
    el.HWP_SetPackageType = function(type) { return true; };
    el.HWP_GetPackageType = function() { return 0; };
    el.HWP_SetProtocolType = function(type) { return true; };
    el.HWP_GetProtocolType = function() { return 1; };
    el.HWP_SetNetworkTransmission = function(type) { return true; };
    el.HWP_GetNetworkTransmission = function() { return 0; };
    el.HWP_SetBufferSize = function(size) { return true; };
    el.HWP_GetBufferSize = function() { return 0; };
    el.HWP_SetIVSMode = function(mode) { return true; };
    el.HWP_GetIVSMode = function() { return 0; };
    el.HWP_SetSearchType = function(type) { return true; };
    el.HWP_GetSearchType = function() { return 0; };
    el.HWP_SetPlaybackType = function(type) { return true; };
    el.HWP_GetPlaybackType = function() { return 0; };
    el.HWP_SetTransmodeType = function(type) { return true; };
    el.HWP_GetTransmodeType = function() { return 0; };
    el.HWP_EnableEZoom = function(wnd) { return true; };
    el.HWP_DisableEZoom = function(wnd) { return true; };
    el.HWP_Enable3DZoom = function(wnd) { return true; };
    el.HWP_Disable3DZoom = function(wnd) { return true; };
    el.HWP_SetDeviceConfig = function(handle, url, body) { return JSON.stringify({ statusCode: 1 }); };
    el.HWP_GetDeviceConfig = function(handle, url) { return JSON.stringify({ statusCode: 1 }); };
    el.HWP_PutDeviceConfig = function(handle, url, body) { return JSON.stringify({ statusCode: 1 }); };
    el.HWP_PostDeviceConfig = function(handle, url, body) { return JSON.stringify({ statusCode: 1 }); };
    el.HWP_DeleteDeviceConfig = function(handle, url) { return JSON.stringify({ statusCode: 1 }); };
    el.HWP_DownloadDeviceConfig = function(handle, url) { return true; };
    el.HWP_ReversePlay = function(url, opt, wnd) { return true; };
    el.HWP_SlowPlay = function(wnd) { return true; };
    el.HWP_FastPlay = function(wnd) { return true; };
    el.HWP_FrameForward = function(wnd) { return true; };
    el.HWP_FrameRewind = function(wnd) { return true; };
    el.HWP_SetPlayBackSeek = function(time, wnd) { return true; };
    el.HWP_GetOSDTime = function(wnd) { return new Date().toISOString(); };
    el.HWP_GetAbsPlayPos = function(wnd) { return 0; };
    el.HWP_SetWaterMark = function(enable) { return true; };
    el.HWP_SetDigitalSign = function(enable) { return true; };
    el.HWP_SetConnectTimeOut = function(timeout) { return true; };
    el.HWP_GetLastError = function() { return 0; };
    el.HWP_FullScreen = function(full) { return true; };
    el.HWP_SetSecretKey = function(handle, key) { return true; };
    el.HWP_GetEncryptStr = function(str) { return str; };

    // Propriedades esperadas
    Object.defineProperty(el, 'bConnected', {
      get: () => self.bConnected,
      configurable: true
    });
    Object.defineProperty(el, 'iWndNum', {
      get: () => self.iWndNum,
      set: (v) => { self.iWndNum = v; },
      configurable: true
    });
  }

  getStreamUrls() {
    const ch = this.currentChannel || 1;
    const auth = this.username && this.password 
      ? `${this.username}:${this.password}@` 
      : '';
    
    return [
      // ISAPI Snapshot (mais compatível)
      `http://${auth}${this.host}/ISAPI/Streaming/channels/${ch}01/picture`,
      `http://${auth}${this.host}/Streaming/channels/${ch}01/picture`,
      
      // ISAPI httpPreview (MJPEG)
      `http://${auth}${this.host}/ISAPI/Streaming/channels/${ch}01/httpPreview`,
      `http://${auth}${this.host}/ISAPI/Streaming/channels/${ch}02/httpPreview`,
      
      // Snapshot legado
      `http://${auth}${this.host}/cgi-bin/snapshot.cgi`,
      `http://${auth}${this.host}/snap.jpg`,
      
      // ONVIF snapshot
      `http://${auth}${this.host}/onvif-http/snapshot?Profile_1`,
      
      // RTSP
      `rtsp://${auth}${this.host}:554/Streaming/Channels/${ch}01`,
      `rtsp://${auth}${this.host}:554/Streaming/Channels/${ch}02`,
      `rtsp://${auth}${this.host}:554/h264/ch${ch}/main/av_stream`,
      `rtsp://${auth}${this.host}:554/h264/ch${ch}/sub/av_stream`,
    ];
  }
}

// ============================================
// Controle Tecvoz (THK / TW / T1 Series)
// Baseado em Dahua/XiongMai com extensões próprias
// ============================================

class TecvozActiveXControl extends BaseActiveXControl {
  constructor(element, clsid, emulator) {
    super(element, clsid, emulator);
    this.brand = 'Tecvoz';
    this.iProtocolType = 0; // 0=TCP, 1=UDP
    this.iStreamType = 0;   // 0=main, 1=sub
    this.channelNum = 4;
    this.devPort = 37777;    // Porta de serviço Dahua/Tecvoz
    this.applyTecvozMethods();
  }

  /**
   * Aplica métodos específicos da API Tecvoz/Dahua-based WebPlugin
   */
  applyTecvozMethods() {
    const self = this;
    const el = this.element;

    // ============================================
    // Login com porta de serviço (37777 / 34567)
    // ============================================
    el.LoginDevice = function(ip, port, user, pass, paramStr) {
      console.log(`[Tecvoz] LoginDevice: ${ip}:${port} user=${user}`);
      self.host = ip;
      self.port = port || 80;
      self.devPort = port || 37777;
      self.username = user || 'admin';
      self.password = pass || 'admin';
      self.loggedIn = true;
      return 1;
    };

    el.LogoutDevice = function() {
      console.log('[Tecvoz] LogoutDevice');
      self.loggedIn = false;
      return 1;
    };

    // ============================================
    // Controle de vídeo - Estilo Dahua
    // ============================================
    el.StartRealPlay = function(channel, streamType, wndNo) {
      console.log(`[Tecvoz] StartRealPlay: ch=${channel} stream=${streamType} wnd=${wndNo}`);
      self.currentChannel = channel || 0;
      self.iStreamType = streamType || 0;
      self.startVideoStream();
      return 1;
    };

    el.StopRealPlay = function(wndNo) {
      console.log(`[Tecvoz] StopRealPlay: wnd=${wndNo}`);
      self.stopVideoStream();
      return 1;
    };

    el.StartRealPlayAll = function() {
      console.log('[Tecvoz] StartRealPlayAll');
      self.startVideoStream();
      return 1;
    };

    el.StopRealPlayAll = function() {
      console.log('[Tecvoz] StopRealPlayAll');
      self.stopVideoStream();
      return 1;
    };

    // ============================================
    // Configurações do dispositivo
    // ============================================
    el.SetProtocolType = function(type) {
      console.log(`[Tecvoz] SetProtocolType: ${type}`);
      self.iProtocolType = type;
      return 1;
    };

    el.SetStreamType = function(type) {
      console.log(`[Tecvoz] SetStreamType: ${type}`);
      self.iStreamType = type;
      return 1;
    };

    el.SetChannelNum = function(num) {
      console.log(`[Tecvoz] SetChannelNum: ${num}`);
      self.channelNum = num;
      return 1;
    };

    el.GetChannelNum = function() {
      return self.channelNum;
    };

    el.SetWndNum = function(num) {
      console.log(`[Tecvoz] SetWndNum: ${num}`);
      return 1;
    };

    el.SelectWnd = function(wnd) {
      console.log(`[Tecvoz] SelectWnd: ${wnd}`);
      return 1;
    };

    // ============================================
    // PTZ
    // ============================================
    el.PTZControl = function(cmd, param1, param2, param3) {
      console.log(`[Tecvoz] PTZControl: cmd=${cmd} p1=${param1} p2=${param2}`);
      return 1;
    };

    el.PTZGotoPreset = function(channel, preset) {
      console.log(`[Tecvoz] PTZGotoPreset: ch=${channel} preset=${preset}`);
      return 1;
    };

    // ============================================
    // Gravação e Playback
    // ============================================
    el.StartLocalRecord = function(channel, path) {
      console.log(`[Tecvoz] StartLocalRecord: ch=${channel}`);
      return 1;
    };

    el.StopLocalRecord = function(channel) {
      return 1;
    };

    el.StartPlayback = function(channel, startTime, endTime) {
      console.log(`[Tecvoz] StartPlayback: ch=${channel}`);
      return 1;
    };

    el.StopPlayback = function() {
      return 1;
    };

    // ============================================
    // Snapshot e Aúdio
    // ============================================
    el.CapturePicture = function(channel, path) {
      console.log(`[Tecvoz] CapturePicture: ch=${channel}`);
      return 1;
    };

    el.OpenSound = function(channel) { return 1; };
    el.CloseSound = function(channel) { return 1; };
    el.StartTalkback = function() { return 1; };
    el.StopTalkback = function() { return 1; };

    // ============================================
    // Status e consultas
    // ============================================
    el.IsConnected = function() { return self.loggedIn ? 1 : 0; };
    el.GetLastError = function() { return 0; };
    el.GetDeviceInfo = function() { return JSON.stringify({ channels: self.channelNum }); };
    el.GetChannelName = function(ch) { return `Canal ${ch + 1}`; };

    // ============================================
    // Inicialização
    // ============================================
    el.InitPlugin = function() {
      console.log('[Tecvoz] InitPlugin');
      return 1;
    };

    el.UninitPlugin = function() {
      console.log('[Tecvoz] UninitPlugin');
      return 1;
    };

    // Estilo XiongMai / XMEye (usado por alguns Tecvoz)
    el.LoginDev = el.LoginDevice;
    el.LogoutDev = el.LogoutDevice;
    el.RealPlay = el.StartRealPlay;
    el.StopReal = el.StopRealPlay;

    // Propriedades
    Object.defineProperty(el, 'ChannelNum', {
      get: () => self.channelNum,
      set: (v) => { self.channelNum = v; },
      configurable: true
    });
  }

  getStreamUrls() {
    const ch = this.currentChannel || 1;
    const auth = this.username && this.password 
      ? `${this.username}:${this.password}@` 
      : '';
    const streamSuffix = this.iStreamType === 1 ? '&subtype=1' : '&subtype=0';
    
    return [
      // Snapshot via CGI (Dahua-compatible)
      `http://${auth}${this.host}/cgi-bin/snapshot.cgi?channel=${ch}`,
      `http://${auth}${this.host}/cgi-bin/snapshot.cgi`,
      `http://${auth}${this.host}/snap.jpg`,
      `http://${auth}${this.host}/tmpfs/auto.jpg`,
      
      // MJPEG
      `http://${auth}${this.host}/cgi-bin/mjpg/video.cgi?channel=${ch}`,
      `http://${auth}${this.host}/cgi-bin/mjpg/video.cgi`,
      `http://${auth}${this.host}/video.mjpg`,
      
      // ONVIF snapshot
      `http://${auth}${this.host}/onvif-http/snapshot?Profile_1`,
      
      // RTSP Dahua-compatible
      `rtsp://${auth}${this.host}:554/cam/realmonitor?channel=${ch}${streamSuffix}`,
      `rtsp://${auth}${this.host}:554/live/ch${String(ch-1).padStart(2,'0')}_0`,
      `rtsp://${auth}${this.host}:554/live`,
      
      // RTSP XiongMai (alguns modelos Tecvoz)
      `rtsp://${auth}${this.host}:554/user=${this.username}&password=${this.password}&channel=${ch}&stream=0.sdp`,
    ];
  }

  Login(ip, port, user, pass) {
    super.Login(ip, port, user, pass);
    this.devPort = port || 37777;
    this.authenticate();
    return 1;
  }

  async authenticate() {
    try {
      const loginUrls = [
        `http://${this.host}/cgi-bin/global.login?userName=${this.username}&password=${this.password}`,
        `http://${this.host}/RPC_Login/${this.username}/${this.password}`,
        `http://${this.host}/RPC2_Login`,
        `http://${this.host}/cgi-bin/logsnapshot.cgi?channel=1`,
      ];
      
      for (const url of loginUrls) {
        try {
          await fetch(url, { mode: 'no-cors', credentials: 'include' });
          console.log('[Tecvoz] Login tentado:', url);
        } catch (e) { /* ignorar */ }
      }
    } catch (e) {
      console.warn('[Tecvoz] Erro na autenticação:', e);
    }
  }
}

// ============================================
// Controle Dahua
// ============================================

class DahuaActiveXControl extends BaseActiveXControl {
  constructor(element, clsid, emulator) {
    super(element, clsid, emulator);
    this.brand = 'Dahua';
  }

  getStreamUrls() {
    const ch = this.currentChannel || 1;
    const auth = this.username && this.password 
      ? `${this.username}:${this.password}@` 
      : '';
    
    return [
      // Snapshot
      `http://${auth}${this.host}/cgi-bin/snapshot.cgi?channel=${ch}`,
      `http://${auth}${this.host}/cgi-bin/snapshot.cgi`,
      
      // MJPEG
      `http://${auth}${this.host}/cgi-bin/mjpg/video.cgi?channel=${ch}`,
      `http://${auth}${this.host}/cgi-bin/mjpg/video.cgi`,
      
      // RTSP
      `rtsp://${auth}${this.host}:554/cam/realmonitor?channel=${ch}&subtype=0`,
      `rtsp://${auth}${this.host}:554/live`,
    ];
  }
}

// ============================================
// Controle Genérico
// ============================================

class GenericActiveXControl extends BaseActiveXControl {
  constructor(element, clsid, emulator) {
    super(element, clsid, emulator);
    this.brand = 'Generic';
  }

  getStreamUrls() {
    const ch = this.currentChannel || 1;
    const auth = this.username && this.password 
      ? `${this.username}:${this.password}@` 
      : '';
    
    return [
      // URLs comuns
      `http://${auth}${this.host}/cgi-bin/snapshot.cgi`,
      `http://${auth}${this.host}/snap.jpg`,
      `http://${auth}${this.host}/image.jpg`,
      `http://${auth}${this.host}/tmpfs/auto.jpg`,
      `http://${auth}${this.host}/cgi-bin/mjpg/video.cgi`,
      `http://${auth}${this.host}/video.mjpg`,
      `http://${auth}${this.host}/mjpeg/1`,
      
      // ONVIF comum
      `http://${auth}${this.host}/onvif-http/snapshot`,
      
      // RTSP genérico
      `rtsp://${auth}${this.host}:554/stream1`,
      `rtsp://${auth}${this.host}:554/ch0`,
      `rtsp://${auth}${this.host}:554/live`,
    ];
  }
}

// Exportar para uso global
window.ActiveXEmulator = ActiveXEmulator;
window.IpegaActiveXControl = IpegaActiveXControl;
window.HikvisionActiveXControl = HikvisionActiveXControl;
window.TecvozActiveXControl = TecvozActiveXControl;
window.DahuaActiveXControl = DahuaActiveXControl;
window.GenericActiveXControl = GenericActiveXControl;
