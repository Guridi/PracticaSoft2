const express = require('express');
const db = require('../database');
const { authenticateToken } = require('./auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

// GET - Obtener todos los deliveries
router.get('/', authenticateToken, (req, res) => {
  db.all('SELECT * FROM deliveries ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al obtener deliveries' });
    }
    res.json({ success: true, data: rows });
  });
});

// GET - Obtener un delivery por ID
router.get('/:id', authenticateToken, (req, res) => {
  db.get('SELECT * FROM deliveries WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al obtener delivery' });
    }
    if (!row) {
      return res.status(404).json({ success: false, message: 'Delivery no encontrado' });
    }
    res.json({ success: true, data: row });
  });
});

// POST - Crear un delivery
router.post('/', authenticateToken, authorize(['admin']), (req, res) => {
  const { nombre, cedula, telefono, licencia, vehiculo_placa, vehiculo_capacidad } = req.body;

  if (!nombre || !cedula || !telefono || !licencia || !vehiculo_placa || !vehiculo_capacidad) {
    return res.status(400).json({ 
      success: false, 
      message: 'Todos los campos son requeridos' 
    });
  }

  db.run(
    'INSERT INTO deliveries (nombre, cedula, telefono, licencia, vehiculo_placa, vehiculo_capacidad) VALUES (?, ?, ?, ?, ?, ?)',
    [nombre, cedula, telefono, licencia, vehiculo_placa, vehiculo_capacidad],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ success: false, message: 'La cédula ya está registrada' });
        }
        return res.status(500).json({ success: false, message: 'Error al crear delivery' });
      }
      res.status(201).json({
        success: true,
        message: 'Delivery creado exitosamente',
        data: { id: this.lastID, nombre, cedula, telefono, licencia, vehiculo_placa, vehiculo_capacidad }
      });
    }
  );
});

// PUT - Actualizar un delivery
router.put('/:id', authenticateToken, authorize(['admin']), (req, res) => {
  const { nombre, cedula, telefono, licencia, vehiculo_placa, vehiculo_capacidad } = req.body;

  db.run(
    'UPDATE deliveries SET nombre = ?, cedula = ?, telefono = ?, licencia = ?, vehiculo_placa = ?, vehiculo_capacidad = ? WHERE id = ?',
    [nombre, cedula, telefono, licencia, vehiculo_placa, vehiculo_capacidad, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error al actualizar delivery' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: 'Delivery no encontrado' });
      }
      res.json({ success: true, message: 'Delivery actualizado exitosamente' });
    }
  );
});

// DELETE - Eliminar un delivery
router.delete('/:id', authenticateToken, authorize(['admin']), (req, res) => {
  db.run('DELETE FROM deliveries WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al eliminar delivery' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'Delivery no encontrado' });
    }
    res.json({ success: true, message: 'Delivery eliminado exitosamente' });
  });
});

module.exports = router;
