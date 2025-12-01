const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { authenticateToken } = require('./auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

// GET - Obtener todos los usuarios (solo admin)
router.get('/', authenticateToken, authorize(['admin']), (req, res) => {
  db.all('SELECT id, email, nombre, cedula, telefono, direccion, role, created_at FROM users ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al obtener usuarios' });
    }
    res.json({ success: true, data: rows });
  });
});

// GET - Obtener un usuario por ID (solo admin)
router.get('/:id', authenticateToken, authorize(['admin']), (req, res) => {
  db.get('SELECT id, email, nombre, cedula, telefono, direccion, role, created_at FROM users WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al obtener usuario' });
    }
    if (!row) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    res.json({ success: true, data: row });
  });
});

// POST - Crear un usuario (solo admin)
router.post('/', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const { email, password, nombre, cedula, telefono, direccion, role } = req.body;

    // Validaciones básicas
    if (!email || !password || !nombre || !cedula || !role) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, contraseña, nombre, cédula y rol son requeridos' 
      });
    }

    // Validar rol
    const validRoles = ['admin', 'empleado', 'transportista', 'cliente'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Rol inválido' 
      });
    }

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

      // Insertar usuario
      db.run(
        'INSERT INTO users (email, password, nombre, cedula, telefono, direccion, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [email, hashedPassword, nombre, cedula, telefono || '', direccion || '', role],
        function(err) {
          if (err) {
            return res.status(500).json({ 
              success: false, 
              message: 'Error al crear usuario' 
            });
          }

          res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            data: {
              id: this.lastID,
              email,
              nombre,
              cedula,
              telefono: telefono || '',
              direccion: direccion || '',
              role
            }
          });
        }
      );
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
});

// PUT - Actualizar un usuario (solo admin)
router.put('/:id', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const { email, password, nombre, cedula, telefono, direccion, role } = req.body;

    // Validar rol si se proporciona
    if (role) {
      const validRoles = ['admin', 'empleado', 'transportista', 'cliente'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Rol inválido' 
        });
      }
    }

    // Verificar si el email o cédula ya existen en otro usuario
    db.get(
      'SELECT * FROM users WHERE (email = ? OR cedula = ?) AND id != ?', 
      [email, cedula, req.params.id], 
      async (err, existingUser) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Error en el servidor' });
        }

        if (existingUser) {
          return res.status(400).json({ 
            success: false, 
            message: 'El email o cédula ya está registrado en otro usuario' 
          });
        }

        // Si se proporciona nueva contraseña, hashearla
        let updateQuery;
        let updateParams;

        if (password) {
          const hashedPassword = await bcrypt.hash(password, 10);
          updateQuery = 'UPDATE users SET email = ?, password = ?, nombre = ?, cedula = ?, telefono = ?, direccion = ?, role = ? WHERE id = ?';
          updateParams = [email, hashedPassword, nombre, cedula, telefono || '', direccion || '', role, req.params.id];
        } else {
          updateQuery = 'UPDATE users SET email = ?, nombre = ?, cedula = ?, telefono = ?, direccion = ?, role = ? WHERE id = ?';
          updateParams = [email, nombre, cedula, telefono || '', direccion || '', role, req.params.id];
        }

        db.run(updateQuery, updateParams, function(err) {
          if (err) {
            return res.status(500).json({ success: false, message: 'Error al actualizar usuario' });
          }
          if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
          }
          res.json({ success: true, message: 'Usuario actualizado exitosamente' });
        });
      }
    );
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
});

// DELETE - Eliminar un usuario (solo admin)
router.delete('/:id', authenticateToken, authorize(['admin']), (req, res) => {
  // No permitir que el admin se elimine a sí mismo
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ success: false, message: 'No puedes eliminar tu propia cuenta' });
  }

  db.run('DELETE FROM users WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al eliminar usuario' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    res.json({ success: true, message: 'Usuario eliminado exitosamente' });
  });
});

module.exports = router;
