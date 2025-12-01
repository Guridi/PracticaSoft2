const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { router: authRouter } = require('./routes/auth');
const clientesRouter = require('./routes/clientes');
const productosRouter = require('./routes/productos');
const almacenesRouter = require('./routes/almacenes');
const deliveriesRouter = require('./routes/deliveries');
const ordenesRouter = require('./routes/ordenes');
const inventarioRouter = require('./routes/inventario');
const usersRouter = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/clientes', clientesRouter);
app.use('/api/productos', productosRouter);
app.use('/api/almacenes', almacenesRouter);
app.use('/api/deliveries', deliveriesRouter);
app.use('/api/ordenes', ordenesRouter);
app.use('/api/inventario', inventarioRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, message: 'Error interno del servidor' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor backend corriendo en http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth endpoints:`);
  console.log(`   - POST http://localhost:${PORT}/api/auth/register`);
  console.log(`   - POST http://localhost:${PORT}/api/auth/login`);
  console.log(`   - GET  http://localhost:${PORT}/api/auth/profile (protegido)\n`);
});
