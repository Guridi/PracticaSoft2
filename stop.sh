#!/bin/bash

# Script para detener los servidores del Sistema de Gestión

echo "🛑 Deteniendo Sistema de Gestión de Combustible..."

# Leer PIDs guardados
if [ -f ".backend.pid" ] && [ -f ".frontend.pid" ]; then
    BACKEND_PID=$(cat .backend.pid)
    FRONTEND_PID=$(cat .frontend.pid)
    
    echo "   Deteniendo Backend (PID: $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null
    
    echo "   Deteniendo Frontend (PID: $FRONTEND_PID)..."
    kill $FRONTEND_PID 2>/dev/null
    
    rm -f .backend.pid .frontend.pid
else
    # Si no hay PIDs guardados, matar por puerto
    echo "   Matando procesos en puerto 3000..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    
    echo "   Matando procesos en puerto 8080..."
    lsof -ti:8080 | xargs kill -9 2>/dev/null || true
fi

sleep 1
echo "✅ Servidores detenidos exitosamente"
