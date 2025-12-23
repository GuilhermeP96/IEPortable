# IE Portable

🌐 **English** | **[Português](README.md)**

[![GitHub](https://img.shields.io/github/license/GuilhermeP96/IEPortable)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-blue)]()

Cross-platform legacy Internet Explorer simulator for compatibility with DVRs, security cameras, and other systems that require IE.

## 🎯 Why use it?

Microsoft has permanently removed Internet Explorer from Windows 11, however many security devices (DVRs, IP cameras, SCADA systems) still rely exclusively on IE for their web interface. IE Portable emulates Internet Explorer behavior allowing access to these systems.

## ✨ Features

- **User-Agent Emulation**: Simulates IE 6, 7, 8, 9, 10, and 11
- **Self-signed certificate support**: Automatically accepts certificates from local devices
- **Compatibility mode**: X-UA-Compatible headers for legacy sites
- **Bookmarks**: Save your most accessed devices
- **Browsing history**: Track your visits
- **Familiar interface**: Classic Internet Explorer style
- **Cross-platform**: Works on Windows and Linux
- **🆕 Plugin Manager**: Sandbox for ActiveX plugins downloaded from cameras/DVRs
- **🆕 CLSID Detection**: Automatically identifies manufacturers by ActiveX code
- **🆕 Wine Integration**: Support for real ActiveX plugins on Linux via Wine

## 🚀 Installation

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm or yarn

### Development

```bash
# Clone the repository
git clone https://github.com/GuilhermeP96/IEPortable.git
cd IEPortable

# Install dependencies
npm install

# Run in development mode
npm start
```

### Build for distribution

```bash
# Build for Windows
npm run build:win

# Build for Linux
npm run build:linux

# Build for both
npm run build:all
```

Executables will be generated in the `dist/` folder.

## 🔧 Usage

### Accessing a DVR or Camera

1. Open IE Portable
2. Enter the device IP address in the address bar (e.g., `192.168.1.100`)
3. The application automatically adds `http://` if necessary
4. If prompted, accept the certificate (already done automatically)

### When the site asks to install an ActiveX Plugin

Many DVRs and cameras try to install ActiveX plugins (.exe, .cab, .ocx) that only work in native Windows IE. IE Portable automatically detects these attempts and offers alternatives:

1. **Try Direct Stream**: Automatically searches for known RTSP/MJPEG URLs
2. **View Possible URLs**: Lists stream URLs for different manufacturers (Hikvision, Dahua, Intelbras, etc.)
3. **Configure Manually**: Allows entering stream URL, username, and password
4. **Use VLC**: For RTSP streams, copy the URL and open in VLC Media Player

#### Supported Manufacturers

| Manufacturer | Protocol | Default Port |
|--------------|----------|--------------|
| Hikvision | RTSP | 554 |
| Dahua | RTSP | 554 |
| Intelbras | RTSP | 554 |
| Axis | MJPEG/RTSP | 80/554 |
| Foscam | MJPEG/RTSP | 88/554 |
| Generic | RTSP/MJPEG | 554/80 |

#### RTSP URL Format

```
# Hikvision
rtsp://admin:password@192.168.1.100:554/Streaming/Channels/101

# Dahua/Intelbras
rtsp://admin:password@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0

# Generic
rtsp://admin:password@192.168.1.100:554/stream1
```

### Changing IE version

Some devices check the browser version. To change:

1. Go to **Tools** > **IE Version**
2. Select the desired version (IE6 to IE11)
3. Reload the page

### 🧩 ActiveX Plugin Manager

IE Portable includes a sandbox system to manage ActiveX plugins downloaded from cameras and DVRs. Access via:

- **Menu**: Tools > Plugin Manager
- **Shortcut**: `Ctrl+Shift+P`
- **Button**: Plug icon on the toolbar

#### Manager Features:

| Feature | Description |
|---------|-------------|
| **Import** | Drag or select .exe, .ocx, .dll, .cab, .msi files |
| **Sandbox** | Plugins are isolated in a secure directory |
| **Register** | Attempts to register OCX/DLL in the system (Windows) or via Wine (Linux) |
| **Execute** | Starts .exe installers |
| **Metadata** | Extracts information such as version, company, MD5 hash |
| **Notes** | Add notes about each plugin |

#### Platform Support:

| Platform | Register OCX | Execute EXE | Method |
|----------|--------------|-------------|--------|
| Windows | ✅ | ✅ | Native (regsvr32) |
| Linux + Wine | ✅ | ✅ | Via Wine |
| Linux (no Wine) | ❌ | ❌ | Storage only |

#### 🍷 Automatic Wine Installation

IE Portable automatically detects if Wine is installed. If not, you'll see a banner with options:

1. **Install Automatically**: Click the button and enter your admin password
2. **View Manual Instructions**: Shows step-by-step commands to copy

Automatic installation supports:
- **Ubuntu/Debian/Mint**: via `apt`
- **Fedora/RHEL**: via `dnf`
- **Arch/Manjaro**: via `pacman`
- **openSUSE**: via `zypper`
- **macOS**: via Homebrew

#### Installing Wine Manually:

```bash
# Ubuntu/Debian
sudo apt install wine

# Fedora
sudo dnf install wine

# Arch Linux
sudo pacman -S wine
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+L` | Focus address bar |
| `Ctrl+D` | Add bookmark |
| `Ctrl+Shift+P` | Plugin Manager |
| `F5` | Reload page |
| `Ctrl+F5` | Reload ignoring cache |
| `Alt+←` | Back |
| `Alt+→` | Forward |
| `F11` | Full screen |
| `F12` | Developer tools |

## 🛡️ Security

⚠️ **Important warning**: This application disables several security protections to ensure compatibility with legacy devices:

- Accepts self-signed certificates
- Allows mixed content (HTTP on HTTPS)
- Ignores certificate errors

**Use only to access trusted devices on your local network.**

## 🏗️ Architecture

```
IEPortable/
├── src/
│   ├── main.js                # Electron main process
│   ├── preload.js             # Preload script (secure bridge)
│   ├── plugin-manager.js      # ActiveX plugin manager
│   ├── wine-manager.js        # Wine integration manager
│   ├── wine-activex-scanner.js # Wine plugin scanner
│   └── renderer/
│       ├── index.html         # Browser interface
│       ├── styles.css         # Styles
│       ├── renderer.js        # Interface logic
│       ├── activex-handler.js # ActiveX plugin detector
│       ├── activex-polyfill.js # ActiveXObject emulation
│       ├── stream-player.js   # RTSP/MJPEG stream player
│       └── plugin-manager.html # Plugin manager interface
├── assets/
│   └── icons/                 # Application icons
├── package.json
└── README.md
```

## 🤝 Contributing

Contributions are welcome! Please open an issue first to discuss what you would like to change.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [Electron](https://www.electronjs.org/) - Desktop application framework
- [electron-builder](https://www.electron.build/) - Packaging and distribution
- [electron-store](https://github.com/sindresorhus/electron-store) - Data persistence
- [Wine](https://www.winehq.org/) - Windows compatibility on Linux

---

**Note**: This project is not affiliated with Microsoft. Internet Explorer is a registered trademark of Microsoft Corporation.
