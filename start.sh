#!/bin/bash

# Script para iniciar ambos servidores del Sistema de Gestión

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Iniciando Sistema de Gestión de Combustible...${NC}\n"

# Verificar que estamos en el directorio correcto
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Debes ejecutar este script desde el directorio PracticaSoft2"
    exit 1
fi

# Matar procesos previos en los puertos
echo "🔄 Limpiando puertos..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
sleep 1

# Iniciar backend en segundo plano
echo -e "${GREEN}✅ Iniciando Backend (puerto 3000)...${NC}"
cd backend
npm start > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Esperar a que el backend esté listo
sleep 3

# Iniciar frontend en segundo plano
echo -e "${GREEN}✅ Iniciando Frontend (puerto 8080)...${NC}"
cd frontend
python3 -m http.server 8080 > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

sleep 2

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ ¡Sistema iniciado exitosamente!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo "🌐 URLs disponibles:"
echo "   - Login:     http://localhost:8080/login.html"
echo "   - Register:  http://localhost:8080/register.html"
echo "   - Dashboard: http://localhost:8080/dashboard.html"
echo "   - API:       http://localhost:3000/api/health"
echo ""
echo "📝 Logs guardados en:"
echo "   - Backend:  backend.log"
echo "   - Frontend: frontend.log"
echo ""
echo "🔴 Para detener los servidores:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "   O ejecuta: ./stop.sh"
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"

# Guardar PIDs para el script de stop
echo "$BACKEND_PID" > .backend.pid
echo "$FRONTEND_PID" > .frontend.pid

# Mantener el script corriendo y mostrar logs
echo ""
echo "📊 Presiona Ctrl+C para detener ambos servidores"
echo ""

# Función para limpiar al salir
cleanup() {
    echo ""
    echo "🛑 Deteniendo servidores..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    rm -f .backend.pid .frontend.pid
    echo "✅ Servidores detenidos"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Esperar indefinidamente
wait
