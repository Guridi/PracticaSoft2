const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

const router = express.Router();
const JWT_SECRET = 'tu_secreto_super_seguro_cambiar_en_produccion';

// Registro de usuario (público)
router.post('/register', async (req, res) => {
  try {
    const { email, password, nombre, cedula, telefono, direccion } = req.body;

    // Validaciones básicas
    if (!email || !password || !nombre || !cedula) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, contraseña, nombre y cédula son requeridos' 
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Formato de email inválido' 
      });
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'La contraseña debe tener al menos 6 caracteres' 
      });
    }

    // Verificar si es el primer usuario (será admin automáticamente)
    db.get('SELECT COUNT(*) as count FROM users', [], async (err, result) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error en el servidor' });
      }

      const isFirstUser = result.count === 0;
      const userRole = isFirstUser ? 'admin' : 'cliente';

      // Verificar si el usuario ya existe
      db.get('SELECT * FROM users WHERE email = ? OR cedula = ?', [email, cedula], async (err, existingUser) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Error en el servidor' });
        }

        if (existingUser) {
          return res.status(400).json({ 
            success: false, 
            message: 'El email o cédula ya está registrado' 
          });
        }

        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertar usuario en la base de datos
        db.run(
          'INSERT INTO users (email, password, nombre, cedula, telefono, direccion, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [email, hashedPassword, nombre, cedula, telefono || '', direccion || '', userRole],
          function(err) {
            if (err) {
              return res.status(500).json({ 
                success: false, 
                message: 'Error al crear usuario' 
              });
            }

            // Generar token JWT
            const token = jwt.sign(
              { id: this.lastID, email, nombre, role: userRole },
              JWT_SECRET,
              { expiresIn: '24h' }
            );

            res.status(201).json({
              success: true,
              message: 'Usuario registrado exitosamente',
              data: {
                token,
                user: {
                  id: this.lastID,
                  email,
                  nombre,
                  cedula,
                  telefono: telefono || '',
                  direccion: direccion || '',
                  role: userRole
                }
              }
            });
          }
        );
      });
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
});

// Login de usuario
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    // Validaciones básicas
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email y contraseña son requeridos' 
      });
    }

    // Buscar usuario en la base de datos
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error en el servidor' });
      }

      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Email o contraseña incorrectos' 
        });
      }

      // Verificar contraseña
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ 
          success: false, 
          message: 'Email o contraseña incorrectos' 
        });
      }

      // Generar token JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, nombre: user.nombre, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        message: 'Login exitoso',
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            nombre: user.nombre,
            cedula: user.cedula,
            telefono: user.telefono,
            direccion: user.direccion,
            role: user.role
          }
        }
      });
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
});

// Middleware para verificar token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token no proporcionado' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Ruta protegida de ejemplo (obtener perfil)
router.get('/profile', authenticateToken, (req, res) => {
  db.get('SELECT id, email, nombre, cedula, telefono, direccion, role FROM users WHERE id = ?', 
    [req.user.id], 
    (err, user) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error en el servidor' });
      }
      if (!user) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }
      res.json({ success: true, data: user });
    }
  );
});

module.exports = { router, authenticateToken };
