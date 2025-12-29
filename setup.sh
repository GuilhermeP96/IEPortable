#!/bin/bash

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        IE Portable - Verificador de Dependências           ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

ERRORS=0
WARNINGS=0

# ==========================================
# Detectar sistema operacional
# ==========================================
OS_TYPE=""
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS_TYPE="linux"
    if [ -f /etc/debian_version ]; then
        DISTRO="debian"
    elif [ -f /etc/redhat-release ]; then
        DISTRO="redhat"
    elif [ -f /etc/arch-release ]; then
        DISTRO="arch"
    else
        DISTRO="unknown"
    fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS_TYPE="macos"
else
    OS_TYPE="unknown"
fi

echo -e "${CYAN}Sistema detectado:${NC} $OS_TYPE ${DISTRO:+($DISTRO)}"
echo ""

# ==========================================
# Verificar Node.js
# ==========================================
echo -e "${CYAN}[1/6]${NC} Verificando Node.js..."

if ! command -v node &> /dev/null; then
    echo -e "      ${RED}✗ Node.js não encontrado!${NC}"
    
    if [[ "$OS_TYPE" == "linux" ]]; then
        echo -e "      ${YELLOW}→ Instale com:${NC}"
        case $DISTRO in
            debian)
                echo "        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
                echo "        sudo apt-get install -y nodejs"
                ;;
            redhat)
                echo "        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -"
                echo "        sudo yum install nodejs -y"
                ;;
            arch)
                echo "        sudo pacman -S nodejs npm"
                ;;
            *)
                echo "        https://nodejs.org/"
                ;;
        esac
    elif [[ "$OS_TYPE" == "macos" ]]; then
        echo -e "      ${YELLOW}→ Instale com: brew install node${NC}"
    else
        echo -e "      ${YELLOW}→ Baixe em: https://nodejs.org/${NC}"
    fi
    
    ((ERRORS++))
else
    NODE_VERSION=$(node -v)
    echo -e "      ${GREEN}✓ Node.js instalado: $NODE_VERSION${NC}"
    
    # Verificar versão mínima (v18)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | tr -d 'v')
    if [ "$NODE_MAJOR" -lt 18 ]; then
        echo -e "      ${YELLOW}⚠ Versão recomendada: v18 ou superior${NC}"
        ((WARNINGS++))
    fi
fi

# ==========================================
# Verificar npm
# ==========================================
echo ""
echo -e "${CYAN}[2/6]${NC} Verificando npm..."

if ! command -v npm &> /dev/null; then
    echo -e "      ${RED}✗ npm não encontrado!${NC}"
    echo -e "      ${YELLOW}→ Normalmente instalado junto com Node.js${NC}"
    ((ERRORS++))
else
    NPM_VERSION=$(npm -v)
    echo -e "      ${GREEN}✓ npm instalado: v$NPM_VERSION${NC}"
fi

# ==========================================
# Verificar Git (opcional)
# ==========================================
echo ""
echo -e "${CYAN}[3/6]${NC} Verificando Git (opcional)..."

if ! command -v git &> /dev/null; then
    echo -e "      ${YELLOW}⚠ Git não encontrado (opcional para desenvolvimento)${NC}"
    
    if [[ "$OS_TYPE" == "linux" ]]; then
        case $DISTRO in
            debian)
                echo -e "      ${YELLOW}→ Instale com: sudo apt install git${NC}"
                ;;
            redhat)
                echo -e "      ${YELLOW}→ Instale com: sudo yum install git${NC}"
                ;;
            arch)
                echo -e "      ${YELLOW}→ Instale com: sudo pacman -S git${NC}"
                ;;
        esac
    elif [[ "$OS_TYPE" == "macos" ]]; then
        echo -e "      ${YELLOW}→ Instale com: brew install git${NC}"
    fi
    
    ((WARNINGS++))
else
    GIT_VERSION=$(git --version | awk '{print $3}')
    echo -e "      ${GREEN}✓ Git instalado: v$GIT_VERSION${NC}"
fi

# ==========================================
# Verificar Wine (opcional - para plugins ActiveX no Linux)
# ==========================================
echo ""
echo -e "${CYAN}[4/6]${NC} Verificando Wine (opcional - plugins ActiveX)..."

if [[ "$OS_TYPE" == "linux" ]]; then
    if ! command -v wine &> /dev/null; then
        echo -e "      ${YELLOW}○ Wine não encontrado${NC}"
        echo -e "      ${YELLOW}  (Opcional: necessário apenas para plugins ActiveX)${NC}"
        
        case $DISTRO in
            debian)
                echo -e "      ${YELLOW}→ Instale com: sudo apt install wine${NC}"
                ;;
            redhat)
                echo -e "      ${YELLOW}→ Instale com: sudo yum install wine${NC}"
                ;;
            arch)
                echo -e "      ${YELLOW}→ Instale com: sudo pacman -S wine${NC}"
                ;;
        esac
    else
        WINE_VERSION=$(wine --version 2>/dev/null | head -1)
        echo -e "      ${GREEN}✓ Wine instalado: $WINE_VERSION${NC}"
    fi
else
    echo -e "      ${YELLOW}○ Wine não é necessário no $OS_TYPE${NC}"
fi

# ==========================================
# Verificar dependências do projeto
# ==========================================
echo ""
echo -e "${CYAN}[5/6]${NC} Verificando dependências do projeto..."

if [ ! -d "node_modules" ]; then
    echo -e "      ${YELLOW}⚠ Pasta node_modules não encontrada${NC}"
    
    if [ $ERRORS -eq 0 ]; then
        echo ""
        read -p "      Deseja instalar as dependências agora? [S/n]: " INSTALL_DEPS
        
        if [[ ! "$INSTALL_DEPS" =~ ^[Nn]$ ]]; then
            echo ""
            echo "      Instalando dependências..."
            npm install
            
            if [ $? -ne 0 ]; then
                echo -e "      ${RED}✗ Falha ao instalar dependências!${NC}"
                ((ERRORS++))
            else
                echo -e "      ${GREEN}✓ Dependências instaladas com sucesso!${NC}"
            fi
        else
            echo -e "      ${YELLOW}→ Execute 'npm install' manualmente depois${NC}"
            ((WARNINGS++))
        fi
    else
        echo -e "      ${RED}→ Corrija os erros acima primeiro${NC}"
    fi
else
    if [ -d "node_modules/electron" ]; then
        echo -e "      ${GREEN}✓ Dependências instaladas${NC}"
        
        # Verificar versão do Electron
        ELECTRON_VERSION=$(node -e "console.log(require('./node_modules/electron/package.json').version)" 2>/dev/null)
        if [ ! -z "$ELECTRON_VERSION" ]; then
            echo -e "      ${GREEN}✓ Electron: v$ELECTRON_VERSION${NC}"
        fi
    else
        echo -e "      ${YELLOW}⚠ Dependências incompletas${NC}"
        echo -e "      ${YELLOW}→ Execute 'npm install' para reinstalar${NC}"
        ((WARNINGS++))
    fi
fi

# ==========================================
# Verificar recursos opcionais
# ==========================================
echo ""
echo -e "${CYAN}[6/6]${NC} Verificando recursos opcionais..."

# Verificar VLC
if command -v vlc &> /dev/null; then
    VLC_VERSION=$(vlc --version 2>/dev/null | head -1 | awk '{print $3}')
    echo -e "      ${GREEN}✓ VLC encontrado: $VLC_VERSION (útil para streams RTSP)${NC}"
else
    echo -e "      ${YELLOW}○ VLC não encontrado (opcional para streams RTSP)${NC}"
    
    if [[ "$OS_TYPE" == "linux" ]]; then
        case $DISTRO in
            debian)
                echo -e "      ${YELLOW}→ Instale com: sudo apt install vlc${NC}"
                ;;
            arch)
                echo -e "      ${YELLOW}→ Instale com: sudo pacman -S vlc${NC}"
                ;;
        esac
    fi
fi

# Verificar ffmpeg (útil para conversão de streams)
if command -v ffmpeg &> /dev/null; then
    FFMPEG_VERSION=$(ffmpeg -version 2>/dev/null | head -1 | awk '{print $3}')
    echo -e "      ${GREEN}✓ FFmpeg encontrado: $FFMPEG_VERSION${NC}"
else
    echo -e "      ${YELLOW}○ FFmpeg não encontrado (opcional)${NC}"
fi

# ==========================================
# Resumo
# ==========================================
echo ""
echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo "                           RESUMO"
echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "  ${GREEN}✓ Tudo pronto! Ambiente configurado corretamente.${NC}"
        echo ""
        echo "  Para iniciar o IE Portable:"
        echo -e "    ${CYAN}npm start${NC}     ou     ${CYAN}./start.sh${NC}"
        echo ""
        echo "  Para criar um executável:"
        echo -e "    ${CYAN}npm run build:linux${NC}     ou     ${CYAN}./build.sh linux${NC}"
    else
        echo -e "  ${YELLOW}⚠ Ambiente funcional com $WARNINGS aviso(s).${NC}"
        echo ""
        echo "  Você pode iniciar o IE Portable, mas considere"
        echo "  resolver os avisos para melhor experiência."
    fi
else
    echo -e "  ${RED}✗ Encontrado(s) $ERRORS erro(s) crítico(s).${NC}"
    echo ""
    echo "  Por favor, resolva os problemas acima antes de continuar."
    echo ""
    echo "  Passo a passo:"
    echo "    1. Instale o Node.js v18+ (veja instruções acima)"
    echo "    2. Reinicie o terminal"
    echo "    3. Execute este script novamente"
fi

echo ""
echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo ""
