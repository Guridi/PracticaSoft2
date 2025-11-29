const express = require('express');
const db = require('../database');
const { authenticateToken } = require('./auth');

const router = express.Router();

// GET - Obtener todos los clientes
router.get('/', authenticateToken, (req, res) => {
  db.all('SELECT * FROM clientes ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al obtener clientes' });
    }
    res.json({ success: true, data: rows });
  });
});

// GET - Obtener un cliente por ID
router.get('/:id', authenticateToken, (req, res) => {
  db.get('SELECT * FROM clientes WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al obtener cliente' });
    }
    if (!row) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }
    res.json({ success: true, data: row });
  });
});

// POST - Crear un cliente
router.post('/', authenticateToken, (req, res) => {
  const { nombre, direccion, cedula, telefono, email, condiciones_comerciales } = req.body;

  if (!nombre || !direccion || !cedula || !telefono) {
    return res.status(400).json({ 
      success: false, 
      message: 'Nombre, dirección, cédula y teléfono son requeridos' 
    });
  }

  db.run(
    'INSERT INTO clientes (nombre, direccion, cedula, telefono, email, condiciones_comerciales) VALUES (?, ?, ?, ?, ?, ?)',
    [nombre, direccion, cedula, telefono, email || '', condiciones_comerciales || ''],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ success: false, message: 'La cédula ya está registrada' });
        }
        return res.status(500).json({ success: false, message: 'Error al crear cliente' });
      }
      res.status(201).json({
        success: true,
        message: 'Cliente creado exitosamente',
        data: { id: this.lastID, nombre, direccion, cedula, telefono, email, condiciones_comerciales }
      });
    }
  );
});

// PUT - Actualizar un cliente
router.put('/:id', authenticateToken, (req, res) => {
  const { nombre, direccion, cedula, telefono, email, condiciones_comerciales } = req.body;

  db.run(
    'UPDATE clientes SET nombre = ?, direccion = ?, cedula = ?, telefono = ?, email = ?, condiciones_comerciales = ? WHERE id = ?',
    [nombre, direccion, cedula, telefono, email || '', condiciones_comerciales || '', req.params.id],
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

// DELETE - Eliminar un cliente
router.delete('/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM clientes WHERE id = ?', [req.params.id], function(err) {
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
