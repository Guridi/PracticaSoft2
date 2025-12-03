const express = require('express');
const db = require('../database');
const { authenticateToken } = require('./auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

// GET - Obtener todos los deliveries (usuarios con role='transportista') con sus vehículos
router.get('/', authenticateToken, (req, res) => {
  db.all(`
    SELECT 
      u.id, u.nombre, u.cedula, u.telefono, u.email, u.direccion, u.created_at, u.vehiculo_id,
      v.placa, v.marca, v.modelo, v.año, v.capacidad
    FROM users u
    LEFT JOIN vehiculos v ON u.vehiculo_id = v.id
    WHERE u.role = "transportista" 
    ORDER BY u.created_at DESC
  `, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al obtener deliveries' });
    }
    res.json({ success: true, data: rows });
  });
});

// GET - Obtener un delivery por ID
router.get('/:id', authenticateToken, (req, res) => {
  db.get('SELECT id, nombre, cedula, telefono, email, direccion, created_at FROM users WHERE id = ? AND role = "transportista"', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al obtener delivery' });
    }
    if (!row) {
      return res.status(404).json({ success: false, message: 'Delivery no encontrado' });
    }
    res.json({ success: true, data: row });
  });
});

// POST - Crear un delivery (DESHABILITADO - usar registro de usuarios)
router.post('/', authenticateToken, authorize(['admin']), (req, res) => {
  return res.status(400).json({ 
    success: false, 
    message: 'Los choferes se crean mediante el registro de usuarios con rol "transportista"' 
  });
});

// PUT - Actualizar un delivery (en tabla users)
router.put('/:id', authenticateToken, authorize(['admin']), (req, res) => {
  const { nombre, cedula, telefono, email, direccion } = req.body;

  db.run(
    'UPDATE users SET nombre = ?, cedula = ?, telefono = ?, email = ?, direccion = ? WHERE id = ? AND role = "transportista"',
    [nombre, cedula, telefono, email || '', direccion || '', req.params.id],
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

// DELETE - Eliminar un delivery (de tabla users)
router.delete('/:id', authenticateToken, authorize(['admin']), (req, res) => {
  db.run('DELETE FROM users WHERE id = ? AND role = "transportista"', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al eliminar delivery' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'Delivery no encontrado' });
    }
    res.json({ success: true, message: 'Delivery eliminado exitosamente' });
  });
});

// POST - Asignar vehículo a chofer
router.post('/:id/asignar-vehiculo', authenticateToken, authorize(['admin', 'empleado']), (req, res) => {
  const { vehiculo_id } = req.body;
  
  // Permitir null para desasignar
  const vehiculoValue = vehiculo_id === null || vehiculo_id === '' ? null : vehiculo_id;
  
  db.run(
    'UPDATE users SET vehiculo_id = ? WHERE id = ? AND role = "transportista"',
    [vehiculoValue, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error al asignar vehículo' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: 'Chofer no encontrado' });
      }
      res.json({ success: true, message: 'Vehículo asignado exitosamente' });
    }
  );
});

module.exports = router;
