// ============================================
// IE Portable - ActiveX Polyfill
// Injected into webview context via executeJavaScript
// This file is read as plain text - NO template literals
// ============================================
(function() {
  "use strict";
  if (window.__iePortableActiveXPolyfill) return;
  window.__iePortableActiveXPolyfill = true;

  // ==========================================
  // 1. Global error suppression
  // ==========================================
  window.addEventListener("error", function(e) {
    var m = e.message || "";
    if (m.indexOf("ActiveX") >= 0 || m.indexOf("plugin") >= 0 ||
        m.indexOf("oPlugin") >= 0 || m.indexOf("null") >= 0 ||
        m.indexOf("HWP_") >= 0 || m.indexOf("JS_") >= 0 ||
        m.indexOf("StopRealPlayAll") >= 0 || m.indexOf("singleSpa") >= 0 ||
        m.indexOf("not a function") >= 0 || m.indexOf("not defined") >= 0 ||
        m.indexOf("Cannot read") >= 0 || m.indexOf("Unexpected token") >= 0 ||
        m.indexOf("Object doesn't support") >= 0) {
      e.preventDefault();
      e.stopPropagation();
      return true;
    }
  }, true);

  window.addEventListener("unhandledrejection", function(e) {
    var m = String(e.reason && e.reason.message ? e.reason.message : e.reason || "");
    if (m.indexOf("null") >= 0 || m.indexOf("HWP_") >= 0 || m.indexOf("plugin") >= 0 ||
        m.indexOf("oPlugin") >= 0 || m.indexOf("singleSpa") >= 0 ||
        m.indexOf("Cannot read") >= 0 || m.indexOf("Object") >= 0) {
      e.preventDefault();
    }
  });

  // ==========================================
  // 2. Host resolution helpers
  // ==========================================
  var _cachedHost = "";
  var _cachedPort = "";

  function resolveHost() {
    if (_cachedHost) return _cachedHost;
    // Try page hostname
    var h = window.location.hostname;
    if (h && h !== "" && h !== "undefined" && h !== "null" && h !== "localhost") { _cachedHost = h; return h; }
    // Try parsing full URL
    try {
      var m = window.location.href.match(/https?:\/\/([^:\/]+)/);
      if (m && m[1] && m[1] !== "undefined") { _cachedHost = m[1]; return m[1]; }
    } catch(e) {}
    // Try referrer
    try {
      if (document.referrer) {
        var rm = document.referrer.match(/https?:\/\/([^:\/]+)/);
        if (rm && rm[1] && rm[1] !== "undefined") { _cachedHost = rm[1]; return rm[1]; }
      }
    } catch(e) {}
    // Try all frames
    try {
      if (window.top && window.top.location && window.top.location.hostname) {
        var th = window.top.location.hostname;
        if (th && th !== "undefined" && th !== "localhost") { _cachedHost = th; return th; }
      }
    } catch(e) {}
    // Try parent
    try {
      if (window.parent && window.parent.location && window.parent.location.hostname) {
        var ph = window.parent.location.hostname;
        if (ph && ph !== "undefined" && ph !== "localhost") { _cachedHost = ph; return ph; }
      }
    } catch(e) {}
    return "";
  }

  function resolvePort() {
    if (_cachedPort) return _cachedPort;
    var p = window.location.port;
    if (p && p !== "" && p !== "undefined" && p !== "0") { _cachedPort = p; return p; }
    try {
      var m = window.location.href.match(/https?:\/\/[^:\/]+:(\d+)/);
      if (m && m[1]) { _cachedPort = m[1]; return m[1]; }
    } catch(e) {}
    // Try top/parent
    try {
      if (window.top && window.top.location && window.top.location.port) {
        var tp = window.top.location.port;
        if (tp && tp !== "undefined" && tp !== "0") { _cachedPort = tp; return tp; }
      }
    } catch(e) {}
    return "80";
  }

  // ==========================================
  // 3. Known CLSIDs
  // ==========================================
  var KNOWN_CLSIDS = {
    "B6D5419C-D381-4687-9CFC-A9E2CD7008F5": "Ipega",
    "6263DEED-F971-4C18-AB42-3ABCDE741A89": "Hikvision",
    "08CF8D24-DA5E-4C0B-B2E3-E72B3C714BAC": "Hikvision",
    "CCAB80D2-5DCF-44FB-9EAE-0F632B758498": "Hikvision",
    "55F88890-DE29-4E36-B13B-E0774CAC9C5A": "Hikvision",
    "A4452457-8E0E-4F87-829C-5DE9E0DD4D76": "Hikvision",
    "150B57E6-D57E-45D3-A6E8-2A70F874B70C": "Hikvision",
    "D8F7B6D8-3E5A-4B27-8C83-F91BAB946D2A": "Hikvision",
    "5E0E2E49-1BAB-4C2A-B4CE-1B4E56AE7B3E": "Hikvision",
    "E7EF736D-B4E6-4A5A-BA94-732D71107808": "Hikvision",
    "3BFEDAE3-B170-4C2E-B6AA-E945E3260C70": "Tecvoz",
    "E23B5E25-AA3A-4B2C-8B5A-1A38E93E2C60": "Tecvoz",
    "C7B43A36-2B41-4B2F-9B10-68A2E3E53D18": "Tecvoz",
    "A83053A4-6E5A-4F5E-8B3B-8B9F1C50DA32": "Tecvoz",
    "E0DA039D-992F-4187-A105-C699A71F5F06": "Tecvoz",
    "4B3476C6-3A85-4C2C-BD55-BD8F1E028B00": "Dahua",
    "39B06C8F-91A7-4CAC-8B94-C8B8F26B1A8C": "Dahua",
    "4B3476C6-3A85-4F86-8418-D1130C952B05": "Dahua",
    "99EC681B-C798-4B2A-A57C-98D8E3E96FAA": "Intelbras"
  };

  // ==========================================
  // 4. Shared plugin state
  // ==========================================
  var _state = {
    host: resolveHost(),
    port: resolvePort(),
    user: "admin",
    pass: "admin",
    loggedIn: false,
    auth: ""
  };
  var _globalCtrl = null;
  var _registry = {};

  // ==========================================
  // 5. Build a DVR control object
  // ==========================================
  function buildControl(brand) {
    var ctrl = {
      // Internal
      _brand: brand || "Generic",
      _host: _state.host,
      _port: _state.port,
      _user: _state.user,
      _pass: _state.pass,
      _loggedIn: false,
      _channel: 1,
      _wndNum: 1,
      _selectedWnd: 0,
      _streamType: 0,
      _connected: false,

      // Standard properties
      readyState: 4,
      valid: 1,
      bIsLogin: false,

      // ===================== Generic methods =====================
      Login: function(ip, port, user, pass) {
        ctrl._host = ip || resolveHost(); ctrl._port = port || resolvePort();
        ctrl._user = user || "admin"; ctrl._pass = pass || "admin";
        ctrl._loggedIn = true; ctrl._connected = true;
        _state.host = ctrl._host; _state.port = ctrl._port;
        _state.user = ctrl._user; _state.pass = ctrl._pass;
        _state.loggedIn = true;
        _state.auth = "Basic " + btoa(ctrl._user + ":" + ctrl._pass);
        return 1;
      },
      Logout: function() { ctrl._loggedIn = false; ctrl._connected = false; return 1; },
      Init: function() { return 1; },
      Play: function() { return 1; },
      Stop: function() { return 1; },
      Pause: function() { return 1; },
      Resume: function() { return 1; },
      StartRealPlay: function(ch) { ctrl._channel = ch || 1; return 1; },
      StopRealPlay: function() { return 1; },
      PTZControl: function() { return 1; },
      PTZControlEx: function() { return 1; },
      DeviceConfig: function() { return 1; },
      GetConfig: function() { return "{}"; },
      SetConfig: function() { return 1; },
      GetDeviceInfo: function() { return "{}"; },
      CapturePicture: function() { return 1; },
      StartRecord: function() { return 1; },
      StopRecord: function() { return 1; },
      IsConnected: function() { return ctrl._connected ? 1 : 0; },
      GetLastError: function() { return 0; },

      // ===================== Hikvision JS_* API =====================
      JS_Login: function(ip, port, user, pass) {
        ctrl._host = ip || resolveHost(); ctrl._port = port || resolvePort();
        ctrl._user = user || "admin"; ctrl._pass = pass || "admin";
        ctrl._loggedIn = true; ctrl._connected = true; ctrl.bIsLogin = true;
        _state.host = ctrl._host; _state.port = ctrl._port;
        _state.user = ctrl._user; _state.pass = ctrl._pass;
        _state.loggedIn = true;
        _state.auth = "Basic " + btoa(ctrl._user + ":" + ctrl._pass);
        return 10001;
      },
      JS_Logout: function() { ctrl._loggedIn = false; ctrl.bIsLogin = false; return true; },
      JS_Play: function(url, opt, wnd) { return true; },
      JS_Stop: function(wnd) { return true; },
      JS_SetWindowNum: function(n) { ctrl._wndNum = n; return true; },
      JS_SelectWnd: function(w) { ctrl._selectedWnd = w; return true; },
      JS_Capture: function() { return true; },
      JS_StartTalk: function() { return true; },
      JS_StopTalk: function() { return true; },
      JS_PTZControl: function() { return true; },
      JS_Resize: function() { return true; },
      JS_SetDigitalSign: function() { return true; },
      JS_StartRecord: function() { return true; },
      JS_StopRecord: function() { return true; },
      JS_OpenSound: function() { return true; },
      JS_CloseSound: function() { return true; },
      JS_SetVolume: function() { return true; },
      JS_GetVolume: function() { return 50; },
      JS_StartPlayback: function() { return true; },
      JS_StopPlayback: function() { return true; },
      JS_PausePlayback: function() { return true; },
      JS_ResumePlayback: function() { return true; },
      JS_PlaybackSpeed: function() { return true; },
      JS_PlaybackSeek: function() { return true; },
      JS_QueryDeviceInfo: function() { return JSON.stringify({success:true}); },
      JS_GetDevicePort: function() { return ctrl._port; },
      JS_GetRtspPort: function() { return 554; },
      JS_SetSecretKey: function() { return true; },
      JS_GetEncryptStr: function(s) { return s; },
      JS_Init: function() { return true; },
      JS_DeInit: function() { return true; },

      // ===================== Hikvision HWP_* API =====================
      HWP_JS_Login: function(ip,port,u,p) { return ctrl.JS_Login(ip,port,u,p); },
      HWP_Play: function(url,opt,wnd,st,m) { return ctrl.JS_Play(url,opt,wnd); },
      HWP_Stop: function(w) { return ctrl.JS_Stop(w); },
      HWP_SetWindowNum: function(n) { return ctrl.JS_SetWindowNum(n); },
      HWP_SelectWnd: function(w) { return ctrl.JS_SelectWnd(w); },
      HWP_PTZControl: function() { return true; },
      HWP_Capture: function() { return true; },
      HWP_Logout: function() { return ctrl.JS_Logout(); },
      HWP_Init: function() { return true; },
      HWP_DeInit: function() { return true; },
      HWP_Resize: function() { return true; },
      HWP_StartTalk: function() { return true; },
      HWP_StopTalk: function() { return true; },
      HWP_StartRecord: function() { return true; },
      HWP_StopRecord: function() { return true; },
      HWP_OpenSound: function() { return true; },
      HWP_CloseSound: function() { return true; },

      // HWP config/state methods (Hikvision web interface)
      HWP_GetLocalConfig: function(key) {
        var cfg = {
          PluginVersion: "3.0.6.1", EncryptMode: "0", PlaybackType: "0",
          StreamType: "1", PackageType: "0", SearchType: "0",
          TransmodeType: "0", ProtocolType: "1", NetworkTransmissionType: "0",
          BufferSize: "0", IVSMode: "0"
        };
        return cfg[key] || "";
      },
      HWP_SetLocalConfig: function() { return true; },
      HWP_GetStreamingCapability: function() {
        return JSON.stringify({StreamingChannel:[
          {id:1,channelName:"Camera 01",videoCodecType:"H.264"},
          {id:2,channelName:"Camera 02",videoCodecType:"H.264"},
          {id:3,channelName:"Camera 03",videoCodecType:"H.264"},
          {id:4,channelName:"Camera 04",videoCodecType:"H.264"}
        ]});
      },
      HWP_SetEncryptMode: function() { return true; },
      HWP_GetEncryptMode: function() { return 0; },
      HWP_GetPluginVersion: function() { return "3.0.6.1"; },
      HWP_SetStreamType: function() { return true; },
      HWP_GetStreamType: function() { return 1; },
      HWP_SetPackageType: function() { return true; },
      HWP_GetPackageType: function() { return 0; },
      HWP_SetProtocolType: function() { return true; },
      HWP_GetProtocolType: function() { return 1; },
      HWP_SetNetworkTransmission: function() { return true; },
      HWP_GetNetworkTransmission: function() { return 0; },
      HWP_SetBufferSize: function() { return true; },
      HWP_GetBufferSize: function() { return 0; },
      HWP_SetIVSMode: function() { return true; },
      HWP_GetIVSMode: function() { return 0; },
      HWP_SetSearchType: function() { return true; },
      HWP_GetSearchType: function() { return 0; },
      HWP_SetPlaybackType: function() { return true; },
      HWP_GetPlaybackType: function() { return 0; },
      HWP_SetTransmodeType: function() { return true; },
      HWP_GetTransmodeType: function() { return 0; },
      HWP_EnableEZoom: function() { return true; },
      HWP_DisableEZoom: function() { return true; },
      HWP_Enable3DZoom: function() { return true; },
      HWP_Disable3DZoom: function() { return true; },
      HWP_ReversePlay: function() { return true; },
      HWP_SlowPlay: function() { return true; },
      HWP_FastPlay: function() { return true; },
      HWP_FrameForward: function() { return true; },
      HWP_FrameRewind: function() { return true; },
      HWP_SetPlayBackSeek: function() { return true; },
      HWP_GetOSDTime: function() { return new Date().toISOString(); },
      HWP_GetAbsPlayPos: function() { return 0; },
      HWP_SetWaterMark: function() { return true; },
      HWP_SetDigitalSign: function() { return true; },
      HWP_SetConnectTimeOut: function() { return true; },
      HWP_GetLastError: function() { return 0; },
      HWP_FullScreen: function() { return true; },
      HWP_SetSecretKey: function() { return true; },
      HWP_GetEncryptStr: function(s) { return s; },
      HWP_DownloadDeviceConfig: function() { return true; },
      HWP_DeleteDeviceConfig: function() { return JSON.stringify({statusCode:1,statusString:"OK"}); },

      // Window layout
      HWP_setPlayWndMode: function(mode) { ctrl._wndNum = mode || 1; return true; },
      HWP_SetPlayWndMode: function(mode) { ctrl._wndNum = mode || 1; return true; },
      HWP_ArrangeWindow: function(mode) { ctrl._wndNum = mode || 1; return true; },
      HWP_SwitchLayout: function() { return true; },
      HWP_GetLayoutInfo: function() { return JSON.stringify({layout:1}); },

      // Extra stubs
      HWP_StartDownload: function() { return true; },
      HWP_StopDownload: function() { return true; },
      HWP_SetPlayMode: function() { return true; },
      HWP_GetPlayMode: function() { return 0; },
      HWP_SetWndType: function() { return true; },
      HWP_GetWndType: function() { return 0; },
      HWP_SetLinkMode: function() { return true; },
      HWP_GetLinkMode: function() { return 0; },
      HWP_SetSnapShotConfig: function() { return true; },
      HWP_GetSnapShotConfig: function() { return ""; },
      HWP_SetRecordConfig: function() { return true; },
      HWP_GetRecordConfig: function() { return ""; },
      HWP_SetOSDText: function() { return true; },
      HWP_GetOSDText: function() { return ""; },
      HWP_SetImagingConfig: function() { return true; },
      HWP_GetImagingConfig: function() { return ""; },
      HWP_StartVoiceTalk: function() { return true; },
      HWP_StopVoiceTalk: function() { return true; },
      HWP_StartFishEye: function() { return true; },
      HWP_StopFishEye: function() { return true; },
      HWP_GetPlayInfo: function() { return JSON.stringify({status:0}); },
      HWP_GetWindowStatus: function() { return JSON.stringify({status:0}); },

      // HWP_*DeviceConfig - actual HTTP calls to DVR
      HWP_GetDeviceConfig: function(handle, url) {
        try {
          var h = resolveHost(); var p = resolvePort();
          var xhr = new XMLHttpRequest();
          xhr.open("GET", "http://" + h + ":" + p + url, false);
          xhr.setRequestHeader("Authorization", _state.auth || "Basic " + btoa(ctrl._user + ":" + ctrl._pass));
          xhr.send();
          return xhr.responseText || JSON.stringify({statusCode:1,statusString:"OK"});
        } catch(e) { return JSON.stringify({statusCode:1,statusString:"OK"}); }
      },
      HWP_SetDeviceConfig: function(handle, url, body) {
        try {
          var h = resolveHost(); var p = resolvePort();
          var xhr = new XMLHttpRequest();
          xhr.open("PUT", "http://" + h + ":" + p + url, false);
          xhr.setRequestHeader("Authorization", _state.auth || "Basic " + btoa(ctrl._user + ":" + ctrl._pass));
          xhr.send(body);
          return xhr.responseText || JSON.stringify({statusCode:1,statusString:"OK"});
        } catch(e) { return JSON.stringify({statusCode:1,statusString:"OK"}); }
      },
      HWP_PutDeviceConfig: function(handle, url, body) {
        try {
          var h = resolveHost(); var p = resolvePort();
          var xhr = new XMLHttpRequest();
          xhr.open("PUT", "http://" + h + ":" + p + url, false);
          xhr.setRequestHeader("Authorization", _state.auth || "Basic " + btoa(ctrl._user + ":" + ctrl._pass));
          xhr.send(body);
          return xhr.responseText || JSON.stringify({statusCode:1,statusString:"OK"});
        } catch(e) { return JSON.stringify({statusCode:1,statusString:"OK"}); }
      },
      HWP_PostDeviceConfig: function(handle, url, body) {
        try {
          var h = resolveHost(); var p = resolvePort();
          var xhr = new XMLHttpRequest();
          xhr.open("POST", "http://" + h + ":" + p + url, false);
          xhr.setRequestHeader("Authorization", _state.auth || "Basic " + btoa(ctrl._user + ":" + ctrl._pass));
          xhr.send(body);
          return xhr.responseText || JSON.stringify({statusCode:1,statusString:"OK"});
        } catch(e) { return JSON.stringify({statusCode:1,statusString:"OK"}); }
      },

      // ===================== Tecvoz / Dahua API =====================
      LoginDevice: function(ip,port,u,p) { return ctrl.Login(ip,port,u,p); },
      LogoutDevice: function() { return ctrl.Logout(); },
      StartRealPlayAll: function() { return 1; },
      StopRealPlayAll: function() { return 1; },
      SetProtocolType: function() { return 1; },
      SetStreamType: function(t) { ctrl._streamType = t; return 1; },
      SetChannelNum: function(n) { return 1; },
      GetChannelNum: function() { return 4; },
      SetWndNum: function(n) { ctrl._wndNum = n; return 1; },
      GetWndNum: function() { return ctrl._wndNum; },
      SelectWnd: function(w) { ctrl._selectedWnd = w; return 1; },
      PTZGotoPreset: function() { return 1; },
      StartLocalRecord: function() { return 1; },
      StopLocalRecord: function() { return 1; },
      StartPlayback: function() { return 1; },
      StopPlayback: function() { return 1; },
      OpenSound: function() { return 1; },
      CloseSound: function() { return 1; },
      StartTalkback: function() { return 1; },
      StopTalkback: function() { return 1; },
      GetChannelName: function(ch) { return "Canal " + (ch + 1); },
      InitPlugin: function() { return 1; },
      UninitPlugin: function() { return 1; },
      LoginDev: function(ip,port,u,p) { return ctrl.Login(ip,port,u,p); },
      LogoutDev: function() { return ctrl.Logout(); },
      RealPlay: function(ch) { return ctrl.StartRealPlay(ch); },
      StopReal: function() { return ctrl.StopRealPlay(); },
      ConnectRealPlay: function() { return 1; }
    };

    // Dynamic szIP/szHost/szPort getters
    Object.defineProperty(ctrl, "szIP", {
      get: function() { return resolveHost() || ctrl._host || ""; },
      set: function(v) { if (v && v !== "undefined") { ctrl._host = v; _state.host = v; } },
      configurable: true
    });
    Object.defineProperty(ctrl, "szHost", {
      get: function() { return resolveHost() || ctrl._host || ""; },
      set: function(v) { if (v && v !== "undefined") { ctrl._host = v; _state.host = v; } },
      configurable: true
    });
    Object.defineProperty(ctrl, "szPort", {
      get: function() { return resolvePort() || ctrl._port || "80"; },
      set: function(v) { if (v && v !== "undefined") { ctrl._port = v; _state.port = v; } },
      configurable: true
    });
    Object.defineProperty(ctrl, "szDeviceIdentify", {
      get: function() { return (resolveHost() || "") + "_" + (resolvePort() || "80"); },
      set: function() {},
      configurable: true
    });
    Object.defineProperty(ctrl, "szAuth", {
      get: function() { return _state.auth || ""; },
      set: function(v) { _state.auth = v; },
      configurable: true
    });
    Object.defineProperty(ctrl, "object", {
      get: function() { return ctrl; },
      configurable: true
    });

    if (!_globalCtrl) _globalCtrl = ctrl;
    return ctrl;
  }

  // ==========================================
  // 6. Enrich a DOM element with all control methods
  // ==========================================
  function enrichElement(el, ctrl) {
    if (el.__iePluginDone) return;
    el.__iePluginDone = true;

    var keys = Object.getOwnPropertyNames(ctrl);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k.charAt(0) === "_") continue;
      try {
        var desc = Object.getOwnPropertyDescriptor(ctrl, k);
        if (desc && (desc.get || desc.set)) {
          Object.defineProperty(el, k, desc);
        } else if (typeof ctrl[k] === "function") {
          el[k] = ctrl[k];
        } else {
          Object.defineProperty(el, k, {
            get: (function(key) { return function() { return ctrl[key]; }; })(k),
            set: (function(key) { return function(v) { ctrl[key] = v; }; })(k),
            configurable: true
          });
        }
      } catch(e) {
        el[k] = ctrl[k];
      }
    }

    // el.object already defined as getter via defineProperty above
    try { el.readyState = 4; } catch(e) {}
    try { el.valid = 1; } catch(e) {}
    if (el.id) _registry[el.id.toLowerCase()] = el;
  }

  // ==========================================
  // 7. Plugin ID detection
  // ==========================================
  var PLUGIN_KEYWORDS = [
    "plugin", "hwp", "webvideo", "activex", "ocx",
    "divplugin", "objplugin", "videoplayer", "webcomponent"
  ];

  function looksLikePluginId(id) {
    if (!id) return false;
    var lo = id.toLowerCase();
    for (var i = 0; i < PLUGIN_KEYWORDS.length; i++) {
      if (lo.indexOf(PLUGIN_KEYWORDS[i]) >= 0) return true;
    }
    return false;
  }

  // ==========================================
  // 8. Override getElementById — core mechanism
  // ==========================================
  var _origGetById = document.getElementById.bind(document);
  document.getElementById = function(id) {
    var el = _origGetById(id);

    // Already-enriched?
    if (el && el.__iePluginDone) return el;

    // <object classid> tag — process it
    if (el && el.tagName === "OBJECT") {
      var clsAttr = el.getAttribute("classid") || "";
      var cm = clsAttr.match(/\{?([A-F0-9-]{8,36})\}?/i);
      if (cm) {
        var clsid = cm[1].toUpperCase();
        var brand = KNOWN_CLSIDS[clsid] || "Generic";
        var ctrl = buildControl(brand);
        enrichElement(el, ctrl);
        window.postMessage({type:"ACTIVEX_OBJECT_TAG", clsid:clsid}, "*");
        return el;
      }
    }

    // Looks like a plugin container? Enrich it
    if (el && looksLikePluginId(id)) {
      var ctrl2 = _globalCtrl || buildControl("Hikvision");
      enrichElement(el, ctrl2);
      return el;
    }

    // Element not found but expected to be a plugin — create a virtual one
    if (!el && looksLikePluginId(id)) {
      if (_registry[id.toLowerCase()]) return _registry[id.toLowerCase()];
      el = document.createElement("div");
      el.id = id;
      el.style.cssText = "width:100%;height:100%;";
      var ctrl3 = _globalCtrl || buildControl("Hikvision");
      enrichElement(el, ctrl3);
      // Insert off-screen so it exists in DOM
      if (document.body) {
        el.style.position = "fixed";
        el.style.left = "-9999px";
        el.style.top = "-9999px";
        document.body.appendChild(el);
      }
      return el;
    }

    return el;
  };

  // ==========================================
  // 9. Override createElement for <object>
  // ==========================================
  var _origCreate = document.createElement.bind(document);
  document.createElement = function(tag) {
    var el = _origCreate(tag);
    if (tag.toLowerCase() === "object") {
      var ctrl = buildControl("Generic");
      enrichElement(el, ctrl);
    }
    return el;
  };

  // ==========================================
  // 10. ActiveXObject constructor
  // ==========================================
  if (!window.ActiveXObject || window.ActiveXObject.__polyfill) {
    window.ActiveXObject = function(progId) {
      var lo = (progId || "").toLowerCase();

      // XML documents
      if (lo.indexOf("domdocument") >= 0 || lo.indexOf("xmldom") >= 0 || lo === "microsoft.xmldom") {
        return _createXMLDoc();
      }
      // XMLHTTP
      if (lo.indexOf("xmlhttp") >= 0 || lo.indexOf("serverxmlhttp") >= 0) {
        return new XMLHttpRequest();
      }
      // FileSystemObject
      if (lo.indexOf("filesystemobject") >= 0 || lo.indexOf("scripting.") >= 0) {
        return {
          FileExists: function() { return false; }, FolderExists: function() { return false; },
          CreateFolder: function() { return true; }, DeleteFile: function() { return true; },
          OpenTextFile: function() { return {ReadAll:function(){return "";},Write:function(){},Close:function(){}}; }
        };
      }
      // Shell
      if (lo.indexOf("shell") >= 0 || lo.indexOf("wscript") >= 0) {
        return {
          Run: function() { return 0; }, Exec: function() { return {Status:0}; },
          ExpandEnvironmentStrings: function(s) { return s; },
          RegRead: function() { return ""; }, RegWrite: function() { return true; }
        };
      }
      // Hikvision
      if (lo.indexOf("webvideo") >= 0 || lo.indexOf("hikvision") >= 0 ||
          lo.indexOf("hwp") >= 0 || lo.indexOf("webplugin") >= 0) {
        return buildControl("Hikvision");
      }
      // Tecvoz / Dahua
      if (lo.indexOf("tecvoz") >= 0 || lo.indexOf("dahua") >= 0 || lo.indexOf("dhactivex") >= 0) {
        return buildControl("Tecvoz");
      }
      // Default
      return buildControl("Generic");
    };
    window.ActiveXObject.__polyfill = true;
  }

  // ==========================================
  // 11. XML Document helper
  // ==========================================
  function _createXMLDoc() {
    var doc = document.implementation.createDocument("", "", null);
    doc.loadXML = function(xmlStr) {
      try {
        var p = new DOMParser();
        var nd = p.parseFromString(xmlStr, "application/xml");
        while (doc.firstChild) doc.removeChild(doc.firstChild);
        for (var i = 0; i < nd.childNodes.length; i++) {
          doc.appendChild(doc.importNode(nd.childNodes[i], true));
        }
        doc.parseError = {errorCode:0};
        return true;
      } catch(e) { doc.parseError = {errorCode:1,reason:e.message}; return false; }
    };
    doc.load = function(url) {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, false); xhr.send();
        return doc.loadXML(xhr.responseText);
      } catch(e) { return false; }
    };
    doc.parseError = {errorCode:0, reason:""};
    doc.async = false;
    doc.selectNodes = function(xpath) {
      try {
        var r = doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        var a = []; for (var i = 0; i < r.snapshotLength; i++) a.push(r.snapshotItem(i));
        return a;
      } catch(e) { return []; }
    };
    doc.selectSingleNode = function(xpath) { var n = doc.selectNodes(xpath); return n.length ? n[0] : null; };
    Object.defineProperty(doc, "xml", { get: function() { return new XMLSerializer().serializeToString(doc); } });
    Object.defineProperty(doc, "text", { get: function() { return doc.textContent || ""; } });
    return doc;
  }

  // ==========================================
  // 12. Fake IE environment
  // ==========================================
  try {
    Object.defineProperty(navigator, "userAgent", {
      get: function() { return "Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko"; },
      configurable: true
    });
  } catch(e) {}

  try {
    Object.defineProperty(navigator, "plugins", {
      get: function() {
        return {
          length: 1, 0: {name:"ActiveX Plugin", filename:"activex.dll"},
          item: function(i) { return this[i]; }, namedItem: function() { return this[0]; },
          refresh: function() {}
        };
      },
      configurable: true
    });
  } catch(e) {}

  if (document.body) {
    document.body.createControlRange = function() { return {add:function(){},remove:function(){}}; };
  }
  window.execScript = function(code, lang) {
    if (lang && lang.toLowerCase() === "vbscript") return true;
    return eval(code);
  };

  // ==========================================
  // 13. Process <object classid> tags in page
  // ==========================================
  function processObjectTag(el) {
    if (!el || el.__iePluginDone) return;
    var tag = el.tagName;
    if (tag !== "OBJECT" && tag !== "EMBED") return;
    var clsAttr = el.getAttribute("classid") || "";
    var cm = clsAttr.match(/\{?([A-F0-9-]{8,36})\}?/i);
    if (!cm) return;
    var clsid = cm[1].toUpperCase();
    var brand = KNOWN_CLSIDS[clsid] || "Generic";
    var ctrl = buildControl(brand);
    enrichElement(el, ctrl);
    window.postMessage({type:"ACTIVEX_OBJECT_TAG", clsid:clsid}, "*");
  }

  function scanAll() {
    var objects = document.querySelectorAll("object[classid], embed[classid]");
    for (var i = 0; i < objects.length; i++) processObjectTag(objects[i]);
  }

  // ==========================================
  // 14. MutationObserver for dynamic elements
  // ==========================================
  var observer = new MutationObserver(function(muts) {
    for (var i = 0; i < muts.length; i++) {
      var added = muts[i].addedNodes;
      for (var j = 0; j < added.length; j++) {
        var node = added[j];
        if (node.nodeType !== 1) continue;
        processObjectTag(node);
        if (node.querySelectorAll) {
          var nested = node.querySelectorAll("object[classid], embed[classid]");
          for (var k = 0; k < nested.length; k++) processObjectTag(nested[k]);
        }
      }
    }
  });
  observer.observe(document.documentElement, {childList:true, subtree:true});

  // ==========================================
  // 15. XHR interceptor — fix undefined hosts
  // ==========================================
  var _origXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (typeof url === "string" && url.indexOf("://undefined") >= 0) {
      var h = resolveHost();
      if (h) {
        url = url.replace("://undefined", "://" + h);
        console.log("[IE Portable] Fixed undefined host in XHR:", url);
      }
    }
    return _origXHROpen.apply(this, arguments);
  };

  // Also intercept fetch
  var _origFetch = window.fetch;
  if (_origFetch) {
    window.fetch = function(input, init) {
      if (typeof input === "string" && input.indexOf("://undefined") >= 0) {
        var h = resolveHost();
        if (h) {
          input = input.replace("://undefined", "://" + h);
          console.log("[IE Portable] Fixed undefined host in fetch:", input);
        }
      }
      return _origFetch.call(this, input, init);
    };
  }

  // ==========================================
  // 16. Delayed host resolution retry
  // ==========================================
  // Some SPAs navigate AFTER polyfill loads; retry host resolution
  setTimeout(function() {
    var h = resolveHost();
    var p = resolvePort();
    if (h && h !== _state.host) {
      _state.host = h;
      if (_globalCtrl) { _globalCtrl._host = h; }
    }
    if (p && p !== _state.port) {
      _state.port = p;
      if (_globalCtrl) { _globalCtrl._port = p; }
    }
  }, 500);
  setTimeout(function() {
    var h = resolveHost();
    var p = resolvePort();
    if (h && h !== _state.host) {
      _state.host = h;
      if (_globalCtrl) { _globalCtrl._host = h; }
    }
    if (p && p !== _state.port) {
      _state.port = p;
      if (_globalCtrl) { _globalCtrl._port = p; }
    }
  }, 2000);

  // Initial scan
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scanAll);
  } else {
    setTimeout(scanAll, 10);
  }

  console.log("[IE Portable] ActiveX Polyfill loaded OK");
})();
