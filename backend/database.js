const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

function initDatabase() {
  // Tabla de vehículos
  db.run(`
    CREATE TABLE IF NOT EXISTS vehiculos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      placa TEXT UNIQUE NOT NULL,
      marca TEXT NOT NULL,
      modelo TEXT NOT NULL,
      año INTEGER,
      capacidad REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de usuarios (para login/register)
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nombre TEXT NOT NULL,
      cedula TEXT UNIQUE NOT NULL,
      telefono TEXT,
      direccion TEXT,
      role TEXT DEFAULT 'cliente',
      vehiculo_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating users table:', err.message);
    } else {
      console.log('Users table ready');
    }
  });

  // Tabla de clientes (gestión operativa)
  db.run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      direccion TEXT NOT NULL,
      cedula TEXT UNIQUE NOT NULL,
      telefono TEXT NOT NULL,
      email TEXT,
      condiciones_comerciales TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de productos
  db.run(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      tipo TEXT NOT NULL,
      precio REAL NOT NULL,
      unidad TEXT NOT NULL,
      descripcion TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de almacenes
  db.run(`
    CREATE TABLE IF NOT EXISTS almacenes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      ubicacion TEXT NOT NULL,
      capacidad_total REAL NOT NULL,
      unidad_capacidad TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de inventario de almacenes (productos almacenados)
  db.run(`
    CREATE TABLE IF NOT EXISTS inventario_almacen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      almacen_id INTEGER NOT NULL,
      producto_id INTEGER NOT NULL,
      cantidad REAL NOT NULL,
      fecha_ingreso DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (almacen_id) REFERENCES almacenes(id) ON DELETE CASCADE,
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    )
  `);

  // Tabla de delivery/conductores
  db.run(`
    CREATE TABLE IF NOT EXISTS deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      cedula TEXT UNIQUE NOT NULL,
      telefono TEXT NOT NULL,
      licencia TEXT NOT NULL,
      vehiculo_placa TEXT NOT NULL,
      vehiculo_capacidad REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de órdenes de entrega
  db.run(`
    CREATE TABLE IF NOT EXISTS ordenes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      producto_id INTEGER NOT NULL,
      delivery_id INTEGER,
      almacen_id INTEGER NOT NULL,
      volumen_solicitado REAL NOT NULL,
      volumen_entregado REAL,
      fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_entrega DATETIME,
      ventana_entrega_inicio DATETIME,
      ventana_entrega_fin DATETIME,
      ubicacion_entrega TEXT NOT NULL,
      estado TEXT DEFAULT 'pendiente',
      precio_unitario REAL,
      total REAL,
      pagado INTEGER DEFAULT 0,
      payment_method TEXT,
      notas TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (producto_id) REFERENCES productos(id),
      FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
      FOREIGN KEY (almacen_id) REFERENCES almacenes(id)
    )
  `);

  // Tabla de eventos de viaje (tracking)
  db.run(`
    CREATE TABLE IF NOT EXISTS eventos_viaje (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orden_id INTEGER NOT NULL,
      tipo_evento TEXT NOT NULL,
      descripcion TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      latitud REAL,
      longitud REAL,
      FOREIGN KEY (orden_id) REFERENCES ordenes(id)
    )
  `);
}

module.exports = db;
