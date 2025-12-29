# IE Portable

🌐 **[English](README.en.md)** | **Português**

[![GitHub](https://img.shields.io/github/license/GuilhermeP96/IEPortable)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-blue)]()

Simulador do Internet Explorer legado multiplataforma para compatibilidade com DVRs, câmeras de segurança e outros sistemas que requerem o IE.

## 🎯 Por que usar?

A Microsoft removeu permanentemente o Internet Explorer do Windows 11, porém muitos dispositivos de segurança (DVRs, câmeras IP, sistemas SCADA) ainda dependem exclusivamente do IE para sua interface web. O IE Portable emula o comportamento do Internet Explorer permitindo acesso a esses sistemas.

## ✨ Funcionalidades

- **Emulação de User-Agent**: Simula IE 6, 7, 8, 9, 10 e 11
- **Suporte a certificados auto-assinados**: Aceita automaticamente certificados de dispositivos locais
- **Modo de compatibilidade**: Headers X-UA-Compatible para sites legados
- **Favoritos**: Salve seus dispositivos mais acessados
- **Histórico de navegação**: Acompanhe suas visitas
- **Interface familiar**: Estilo clássico do Internet Explorer
- **Multiplataforma**: Funciona em Windows e Linux
- **🆕 Gerenciador de Plugins**: Sandbox para plugins ActiveX baixados de câmeras/DVRs
- **🆕 Detecção de CLSID**: Identifica automaticamente fabricantes pelo código ActiveX
- **🆕 Integração Wine**: Suporte a plugins ActiveX reais no Linux via Wine
- **🆕 Emulação ActiveX**: Emula objetos ActiveX para interfaces de DVRs (MSXML2, XMLHTTP, etc.)
- **🆕 Escanear Pasta de Plugins**: Importa plugins de pastas (ex: Program Files)
- **🆕 Registro Automático**: Registra OCX/DLL automaticamente via regsvr32

## 🚀 Instalação

### Pré-requisitos

- [Node.js](https://nodejs.org/) v18 ou superior
- npm ou yarn

### Desenvolvimento

```bash
# Clone o repositório
git clone https://github.com/GuilhermeP96/IEPortable.git
cd IEPortable

# Instale as dependências
npm install

# Execute em modo de desenvolvimento
npm start
```

### Build para distribuição

```bash
# Build para Windows
npm run build:win

# Build para Linux
npm run build:linux

# Build para ambos
npm run build:all
```

Os executáveis serão gerados na pasta `dist/`.

## 🔧 Uso

### Acessando um DVR ou Câmera

1. Abra o IE Portable
2. Digite o endereço IP do dispositivo na barra de endereço (ex: `192.168.1.100`)
3. O aplicativo automaticamente adiciona `http://` se necessário
4. Se solicitado, aceite o certificado (já é feito automaticamente)

### Quando o site pede para instalar um Plugin ActiveX

Muitos DVRs e câmeras tentam instalar plugins ActiveX (.exe, .cab, .ocx) que só funcionam no IE nativo do Windows. O IE Portable detecta automaticamente essas tentativas e oferece alternativas:

1. **Tentar Stream Direto**: Busca automaticamente URLs RTSP/MJPEG conhecidas
2. **Ver URLs Possíveis**: Lista URLs de stream para diferentes fabricantes (Hikvision, Dahua, Intelbras, etc.)
3. **Configurar Manualmente**: Permite inserir URL de stream, usuário e senha
4. **Usar VLC**: Para streams RTSP, copie a URL e abra no VLC Media Player

#### Fabricantes Suportados

| Fabricante | Protocolo | Porta Padrão |
|------------|-----------|--------------|
| Hikvision | RTSP | 554 |
| Dahua | RTSP | 554 |
| Intelbras | RTSP | 554 |
| Ipega | RTSP | 554 |
| Axis | MJPEG/RTSP | 80/554 |
| Foscam | MJPEG/RTSP | 88/554 |
| Genéricos | RTSP/MJPEG | 554/80 |

#### Formato das URLs RTSP

```
# Hikvision
rtsp://admin:senha@192.168.1.100:554/Streaming/Channels/101

# Dahua/Intelbras
rtsp://admin:senha@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0

# Ipega (KP-CA Series)
rtsp://admin:senha@192.168.1.100:554/profile0
rtsp://admin:senha@192.168.1.100:554/11

# Genérico
rtsp://admin:senha@192.168.1.100:554/stream1
```

### Alterando a versão do IE

Alguns dispositivos verificam a versão do navegador. Para alterar:

1. Vá em **Ferramentas** > **Versão do IE**
2. Selecione a versão desejada (IE6 a IE11)
3. Recarregue a página

### 🧩 Gerenciador de Plugins ActiveX

O IE Portable inclui um sistema de sandbox para gerenciar plugins ActiveX baixados de câmeras e DVRs. Acesse via:

- **Menu**: Ferramentas > Gerenciador de Plugins
- **Atalho**: `Ctrl+Shift+P`
- **Botão**: Ícone de plug na barra de ferramentas

#### Funcionalidades do Gerenciador:

| Recurso | Descrição |
|---------|-----------|
| **Importar** | Arraste ou selecione arquivos .exe, .ocx, .dll, .cab, .msi |
| **Sandbox** | Plugins ficam isolados em diretório seguro |
| **Registrar** | Tenta registrar OCX/DLL no sistema (Windows) ou via Wine (Linux) |
| **Executar** | Inicia instaladores .exe |
| **Metadados** | Extrai informações como versão, empresa, hash MD5 |
| **Escanear Pasta** | Importa plugins de diretórios externos (ex: Program Files) |
| **Notas** | Adicione observações sobre cada plugin |

#### Suporte por Plataforma:

| Plataforma | Registrar OCX | Executar EXE | Método |
|------------|---------------|--------------|--------|
| Windows | ✅ | ✅ | Nativo (regsvr32) |
| Linux + Wine | ✅ | ✅ | Via Wine |
| Linux (sem Wine) | ❌ | ❌ | Apenas armazenamento |

#### 🍷 Instalação Automática do Wine

O IE Portable detecta automaticamente se o Wine está instalado. Se não estiver, você verá um banner com opções:

1. **Instalar Automaticamente**: Clique no botão e digite sua senha de administrador
2. **Ver Instruções Manuais**: Mostra os comandos passo a passo para copiar

A instalação automática suporta:
- **Ubuntu/Debian/Mint**: via `apt`
- **Fedora/RHEL**: via `dnf`
- **Arch/Manjaro**: via `pacman`
- **openSUSE**: via `zypper`
- **macOS**: via Homebrew

#### Instalando Wine Manualmente:

```bash
# Ubuntu/Debian
sudo apt install wine

# Fedora
sudo dnf install wine

# Arch Linux
sudo pacman -S wine
```

### Atalhos de teclado

| Atalho | Ação |
|--------|------|
| `Ctrl+L` | Focar barra de endereço |
| `Ctrl+D` | Adicionar favorito |
| `Ctrl+Shift+P` | Gerenciador de Plugins |
| `F5` | Recarregar página |
| `Ctrl+F5` | Recarregar ignorando cache |
| `Alt+←` | Voltar |
| `Alt+→` | Avançar |
| `F11` | Tela cheia |
| `F12` | Ferramentas do desenvolvedor |

## 🛡️ Segurança

⚠️ **Aviso importante**: Este aplicativo desabilita várias proteções de segurança para garantir compatibilidade com dispositivos legados:

- Aceita certificados auto-assinados
- Permite conteúdo misto (HTTP em HTTPS)
- Ignora erros de certificado

**Use apenas para acessar dispositivos confiáveis em sua rede local.**

## 🏗️ Arquitetura

```
IEPortable/
├── src/
│   ├── main.js                # Processo principal do Electron
│   ├── preload.js             # Script de preload (bridge segura)
│   ├── plugin-manager.js      # Gerenciador de plugins ActiveX
│   ├── wine-manager.js        # Gerenciador de integração Wine
│   ├── wine-activex-scanner.js # Scanner de plugins Wine
│   └── renderer/
│       ├── index.html         # Interface do navegador
│       ├── styles.css         # Estilos
│       ├── renderer.js        # Lógica da interface
│       ├── activex-handler.js # Detector de plugins ActiveX
│       ├── activex-polyfill.js # Emulação de ActiveXObject
│       ├── stream-player.js   # Player de streams RTSP/MJPEG
│       └── plugin-manager.html # Interface do gerenciador
├── assets/
│   └── icons/                 # Ícones do aplicativo
├── package.json
└── README.md
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor, abra uma issue primeiro para discutir o que você gostaria de mudar.

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 🙏 Agradecimentos

- [Electron](https://www.electronjs.org/) - Framework para aplicações desktop
- [electron-builder](https://www.electron.build/) - Empacotamento e distribuição
- [electron-store](https://github.com/sindresorhus/electron-store) - Persistência de dados
- [Wine](https://www.winehq.org/) - Compatibilidade Windows no Linux

---

**Nota**: Este projeto não é afiliado à Microsoft. Internet Explorer é uma marca registrada da Microsoft Corporation.

## ⚠️ Limitações Conhecidas

Consulte o arquivo [ISSUES.md](ISSUES.md) para a lista completa de problemas conhecidos e limitações.

### Principais Limitações:

1. **Emulação ActiveX Incompleta**: Não é possível emular completamente objetos ActiveX binários em JavaScript. A emulação funciona para algumas interfaces (ex: Tecvoz) mas não para todas.

2. **Plugins de Program Files**: Plugins instalados por .EXE que colocam DLLs em `C:\Program Files` podem não funcionar mesmo após importação, pois dependem de registro COM do Windows.

3. **Visualização de Câmeras**: A visualização de vídeo ao vivo pode não funcionar para alguns fabricantes. Use o VLC com URLs RTSP como alternativa.
