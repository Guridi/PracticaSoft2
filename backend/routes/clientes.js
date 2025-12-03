const express = require('express');
const db = require('../database');
const { authenticateToken } = require('./auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

// GET - Obtener todos los clientes (usuarios con role='cliente')
router.get('/', authenticateToken, (req, res) => {
  db.all('SELECT id, nombre, cedula, telefono, email, direccion, created_at FROM users WHERE role = "cliente" ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al obtener clientes' });
    }
    res.json({ success: true, data: rows });
  });
});

// GET - Obtener un cliente por ID
router.get('/:id', authenticateToken, (req, res) => {
  db.get('SELECT id, nombre, cedula, telefono, email, direccion, created_at FROM users WHERE id = ? AND role = "cliente"', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al obtener cliente' });
    }
    if (!row) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }
    res.json({ success: true, data: row });
  });
});

// POST - Crear un cliente (DESHABILITADO - usar registro de usuarios)
router.post('/', authenticateToken, authorize(['admin', 'empleado']), (req, res) => {
  return res.status(400).json({ 
    success: false, 
    message: 'Los clientes se crean mediante el registro de usuarios con rol "cliente"' 
  });
});

// PUT - Actualizar un cliente (en tabla users)
router.put('/:id', authenticateToken, authorize(['admin', 'empleado']), (req, res) => {
  const { nombre, direccion, cedula, telefono, email } = req.body;

  db.run(
    'UPDATE users SET nombre = ?, direccion = ?, cedula = ?, telefono = ?, email = ? WHERE id = ? AND role = "cliente"',
    [nombre, direccion, cedula, telefono, email || '', req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error al actualizar cliente' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
      }
      res.json({ success: true, message: 'Cliente actualizado exitosamente' });
    }
  );
});

// DELETE - Eliminar un cliente (de tabla users)
router.delete('/:id', authenticateToken, authorize(['admin']), (req, res) => {
  db.run('DELETE FROM users WHERE id = ? AND role = "cliente"', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al eliminar cliente' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }
    res.json({ success: true, message: 'Cliente eliminado exitosamente' });
  });
});

module.exports = router;
