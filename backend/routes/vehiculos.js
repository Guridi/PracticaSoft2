const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('./auth');
const { authorize } = require('../middleware/authorize');

// GET - Obtener todos los vehículos
router.get('/', authenticateToken, authorize(['admin', 'empleado']), (req, res) => {
  db.all('SELECT * FROM vehiculos ORDER BY placa', [], (err, rows) => {
    if (err) {
      console.error('Error fetching vehiculos:', err);
      return res.status(500).json({ error: 'Error al obtener vehículos' });
    }
    res.json(rows);
  });
});

// GET - Obtener un vehículo por ID
router.get('/:id', authenticateToken, authorize(['admin', 'empleado']), (req, res) => {
  db.get('SELECT * FROM vehiculos WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      console.error('Error fetching vehiculo:', err);
      return res.status(500).json({ error: 'Error al obtener vehículo' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }
    res.json(row);
  });
});

// POST - Crear nuevo vehículo
router.post('/', authenticateToken, authorize(['admin', 'empleado']), (req, res) => {
  const { placa, marca, modelo, año, capacidad } = req.body;
  
  if (!placa || !marca || !modelo || !capacidad) {
    return res.status(400).json({ error: 'Todos los campos requeridos deben estar presentes' });
  }
  
  db.run(
    'INSERT INTO vehiculos (placa, marca, modelo, año, capacidad) VALUES (?, ?, ?, ?, ?)',
    [placa, marca, modelo, año || null, capacidad],
    function(err) {
      if (err) {
        console.error('Error creating vehiculo:', err);
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Ya existe un vehículo con esa placa' });
        }
        return res.status(500).json({ error: 'Error al crear vehículo' });
      }
      
      db.get('SELECT * FROM vehiculos WHERE id = ?', [this.lastID], (err, row) => {
        if (err) {
          return res.status(500).json({ error: 'Error al obtener vehículo creado' });
        }
        res.status(201).json(row);
      });
    }
  );
});

// PUT - Actualizar vehículo
router.put('/:id', authenticateToken, authorize(['admin', 'empleado']), (req, res) => {
  const { placa, marca, modelo, año, capacidad } = req.body;
  
  if (!placa || !marca || !modelo || !capacidad) {
    return res.status(400).json({ error: 'Todos los campos requeridos deben estar presentes' });
  }
  
  db.run(
    'UPDATE vehiculos SET placa = ?, marca = ?, modelo = ?, año = ?, capacidad = ? WHERE id = ?',
    [placa, marca, modelo, año || null, capacidad, req.params.id],
    function(err) {
      if (err) {
        console.error('Error updating vehiculo:', err);
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Ya existe un vehículo con esa placa' });
        }
        return res.status(500).json({ error: 'Error al actualizar vehículo' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Vehículo no encontrado' });
      }
      
      db.get('SELECT * FROM vehiculos WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
          return res.status(500).json({ error: 'Error al obtener vehículo actualizado' });
        }
        res.json(row);
      });
    }
  );
});

// DELETE - Eliminar vehículo
router.delete('/:id', authenticateToken, authorize(['admin']), (req, res) => {
  // Verificar si el vehículo está asignado a algún chofer
  db.get('SELECT id FROM users WHERE vehiculo_id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Error al verificar asignaciones' });
    }
    
    if (row) {
      return res.status(400).json({ error: 'No se puede eliminar un vehículo asignado a un chofer' });
    }
    
    db.run('DELETE FROM vehiculos WHERE id = ?', [req.params.id], function(err) {
      if (err) {
        console.error('Error deleting vehiculo:', err);
        return res.status(500).json({ error: 'Error al eliminar vehículo' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Vehículo no encontrado' });
      }
      
      res.json({ message: 'Vehículo eliminado exitosamente' });
    });
  });
});

module.exports = router;
