# Sistema de Gestión de Pedidos y Envíos de Combustible

Sistema web completo con autenticación de usuarios, backend Express + SQLite y frontend Vue.js 3.

## 📁 Estructura del Proyecto

```
PracticaSoft2/
├── backend/                 # Servidor Express + SQLite
│   ├── server.js           # Servidor principal
│   ├── database.js         # Configuración SQLite y schemas
│   ├── routes/
│   │   └── auth.js         # Endpoints de autenticación
│   ├── database.db         # Base de datos SQLite (se crea automáticamente)
│   └── package.json
│
└── frontend/               # Aplicación web Vue.js 3 (CDN)
    ├── login.html          # Pantalla de inicio de sesión
    ├── register.html       # Pantalla de registro
    ├── dashboard.html      # Dashboard principal con CRUD completo
    ├── app.js              # Lógica Vue.js de la aplicación
    ├── index.html          # Dashboard original (backup)
    ├── script.js           # Script original (backup)
    └── styles.css          # Estilos
```

## 🚀 Instalación y Ejecución

### 1. Backend (Servidor Express + SQLite)

```bash
# Navegar a la carpeta backend
cd backend

# Las dependencias ya están instaladas, pero si necesitas reinstalar:
npm install

# Iniciar el servidor
npm start
```

El servidor correrá en: **http://localhost:3000**

**Endpoints disponibles:**

**Autenticación:**
- `POST /api/auth/register` - Registro de usuarios
- `POST /api/auth/login` - Inicio de sesión
- `GET /api/auth/profile` - Obtener perfil (requiere token)

**CRUD (todos requieren autenticación):**
- `GET/POST /api/clientes` - Listar/Crear clientes
- `GET/PUT/DELETE /api/clientes/:id` - Obtener/Actualizar/Eliminar cliente
- `GET/POST /api/productos` - Listar/Crear productos
- `GET/PUT/DELETE /api/productos/:id` - Obtener/Actualizar/Eliminar producto
- `GET/POST /api/almacenes` - Listar/Crear almacenes
- `GET/PUT/DELETE /api/almacenes/:id` - Obtener/Actualizar/Eliminar almacén
- `GET/POST /api/deliveries` - Listar/Crear deliveries
- `GET/PUT/DELETE /api/deliveries/:id` - Obtener/Actualizar/Eliminar delivery
- `GET/POST /api/ordenes` - Listar/Crear órdenes
- `GET/PUT/DELETE /api/ordenes/:id` - Obtener/Actualizar/Eliminar orden

**Utilidad:**
- `GET /api/health` - Health check del servidor

### 2. Frontend (Vue.js 3)

```bash
# Navegar a la carpeta frontend
cd frontend

# Opción 1: Usar un servidor HTTP simple (recomendado)
# Si tienes Python 3 instalado:
python3 -m http.server 8080

# Si tienes Node.js con http-server:
npx http-server -p 8080

# Opción 2: Abrir directamente en el navegador
# Abre frontend/login.html en tu navegador
```

La aplicación estará disponible en: **http://localhost:8080**

## 🔐 Uso del Sistema

### Registro de Usuario

1. Abre **http://localhost:8080/register.html**
2. Completa el formulario con:
   - Nombre completo
   - Cédula (formato: 000-0000000-0)
   - Teléfono (formato: 000-000-0000)
   - Email
   - Dirección (opcional)
   - Contraseña (mínimo 6 caracteres)
   - Tipo de usuario (cliente, admin, empleado, transportista)
3. Haz clic en "Crear Cuenta"
4. Serás redirigido automáticamente al dashboard

### Inicio de Sesión

1. Abre **http://localhost:8080/login.html**
2. Ingresa tu email y contraseña
3. Haz clic en "Iniciar Sesión"
4. Serás redirigido al dashboard principal

## 🗄️ Base de Datos

El sistema utiliza **SQLite** con las siguientes tablas:

### `users` - Usuarios del sistema
- `id` (PK)
- `email` (UNIQUE)
- `password` (hasheado con bcrypt)
- `nombre`
- `cedula` (UNIQUE)
- `telefono`
- `direccion`
- `role` (cliente/admin/empleado/transportista)
- `created_at`

### `clientes` - Gestión de clientes
- Información de clientes para operaciones

### `productos` - Catálogo de combustibles
- Gasolina, diésel, etc.

### `almacenes` - Tanques y ubicaciones
- Control de inventario

### `deliveries` - Conductores/Transportistas
- Gestión de personal de entrega

### `ordenes` - Órdenes de entrega
- Tracking completo de pedidos

### `eventos_viaje` - Eventos de tracking
- GPS y telemetría de entregas

## 🔑 Autenticación

El sistema usa **JWT (JSON Web Tokens)** para autenticación:

1. Al hacer login/register, el servidor genera un token JWT
2. El token se guarda en `localStorage` del navegador
3. Cada petición a rutas protegidas debe incluir el header:
   ```
   Authorization: Bearer <token>
   ```

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js** v12.22.9
- **Express** 4.18.2 - Framework web
- **SQLite3** - Base de datos embebida
- **bcryptjs** - Hash de contraseñas
- **jsonwebtoken** - Autenticación JWT
- **cors** - Políticas CORS
- **body-parser** - Parseo de JSON

### Frontend
- **Vue.js 3** (CDN) - Framework reactivo
- **Vanilla CSS** - Estilos personalizados
- **Fetch API** - Llamadas HTTP

## 📝 Notas Importantes

1. **Servidor Backend**: Asegúrate de que el servidor Express esté corriendo en `http://localhost:3000` antes de usar el frontend.

2. **CORS**: El backend está configurado para aceptar peticiones desde cualquier origen en desarrollo. Para producción, configurar orígenes específicos.

3. **Seguridad**: 
   - Cambiar `JWT_SECRET` en `routes/auth.js` para producción
   - Las contraseñas se hashean con bcrypt (10 rounds)
   - Los tokens expiran en 24 horas

4. **Base de Datos**: 
   - `database.db` se crea automáticamente al iniciar el servidor
   - Los datos persisten entre reinicios del servidor

## 🐛 Troubleshooting

### Error: "Cannot connect to server"
- Verifica que el backend esté corriendo en puerto 3000
- Revisa la consola del navegador para ver el error específico

### Error: "Email o cédula ya registrado"
- El usuario ya existe en la base de datos
- Usa credenciales diferentes o inicia sesión

### Páginas no cargan estilos
- Asegúrate de estar usando un servidor HTTP (python/http-server)
- No abras los archivos HTML directamente con `file://`

## ✅ Funcionalidades Implementadas

- ✅ Sistema de autenticación completo (registro/login/logout)
- ✅ Navbar con información del usuario logueado
- ✅ Protección de rutas (requiere autenticación)
- ✅ CRUD completo para clientes
- ✅ CRUD completo para productos
- ✅ CRUD completo para almacenes
- ✅ CRUD completo para deliveries/conductores
- ✅ CRUD completo para órdenes de entrega
- ✅ Control de inventario automático (resta capacidad al crear orden)
- ✅ Validación de disponibilidad en almacenes
- ✅ Tablas dinámicas con datos en tiempo real
- ✅ Edición inline de registros
- ✅ Formateo automático de cédulas y teléfonos
- ✅ Sistema de alertas/notificaciones
- ✅ Interfaz responsive y moderna

## 🚧 Próximos Pasos

- [ ] Dashboard con estadísticas y gráficos
- [ ] Sistema de roles y permisos (admin, empleado, cliente)
- [ ] Tracking en tiempo real con WebSockets
- [ ] Reportes y facturación en PDF
- [ ] Integración con GPS/mapas para tracking de entregas
- [ ] Notificaciones push para eventos de órdenes
- [ ] Historial de cambios y auditoría
- [ ] Exportación de datos a Excel/CSV

## 👥 Autor

Desarrollado para el curso de Práctica de Ingeniería de Software 2

## 📄 Licencia

ISC
