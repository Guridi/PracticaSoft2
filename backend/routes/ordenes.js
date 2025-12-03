const express = require('express');
const db = require('../database');
const { authenticateToken } = require('./auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

// GET - Obtener todas las órdenes
router.get('/', authenticateToken, (req, res) => {
  const query = `
    SELECT o.*, 
           u.nombre as cliente_nombre,
           p.nombre as producto_nombre,
           d.nombre as delivery_nombre,
           a.nombre as almacen_nombre
    FROM ordenes o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN productos p ON o.producto_id = p.id
    LEFT JOIN deliveries d ON o.delivery_id = d.id
    LEFT JOIN almacenes a ON o.almacen_id = a.id
    ORDER BY o.fecha_solicitud DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al obtener órdenes' });
    }
    res.json({ success: true, data: rows });
  });
});

// GET - Obtener una orden por ID
router.get('/:id', authenticateToken, (req, res) => {
  const query = `
    SELECT o.*, 
           u.nombre as cliente_nombre,
           p.nombre as producto_nombre,
           d.nombre as delivery_nombre,
           a.nombre as almacen_nombre
    FROM ordenes o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN productos p ON o.producto_id = p.id
    LEFT JOIN deliveries d ON o.delivery_id = d.id
    LEFT JOIN almacenes a ON o.almacen_id = a.id
    WHERE o.id = ?
  `;
  
  db.get(query, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al obtener orden' });
    }
    if (!row) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }
    res.json({ success: true, data: row });
  });
});

// POST - Crear una orden
router.post('/', authenticateToken, authorize(['admin', 'empleado', 'cliente']), (req, res) => {
  const { 
    user_id, producto_id, delivery_id, almacen_id, 
    volumen_solicitado, ubicacion_entrega, ventana_entrega_inicio, 
    ventana_entrega_fin, precio_unitario, notas, payment_method
  } = req.body;

  if (!user_id || !producto_id || !volumen_solicitado || !ubicacion_entrega) {
    return res.status(400).json({ 
      success: false, 
      message: 'Usuario, producto, volumen y ubicación son requeridos' 
    });
  }

  // Si no se proporciona almacén, buscar automáticamente el que tenga más disponibilidad
  const findAlmacen = almacen_id ? 
    Promise.resolve(almacen_id) : 
    new Promise((resolve, reject) => {
      db.get(
        `SELECT 
          ia.almacen_id, 
          ia.cantidad,
          COALESCE(SUM(CASE WHEN o.estado IN ('pendiente', 'en_proceso') THEN o.volumen_solicitado ELSE 0 END), 0) as usado,
          (ia.cantidad - COALESCE(SUM(CASE WHEN o.estado IN ('pendiente', 'en_proceso') THEN o.volumen_solicitado ELSE 0 END), 0)) as disponible
         FROM inventario_almacen ia
         LEFT JOIN ordenes o ON o.almacen_id = ia.almacen_id AND o.producto_id = ia.producto_id
         WHERE ia.producto_id = ?
         GROUP BY ia.almacen_id, ia.cantidad
         HAVING disponible >= ?
         ORDER BY disponible DESC 
         LIMIT 1`,
        [producto_id, volumen_solicitado],
        (err, row) => {
          if (err) reject(err);
          else if (!row) reject(new Error('No hay almacén con suficiente inventario'));
          else resolve(row.almacen_id);
        }
      );
    });

  // Si no se proporciona precio_unitario, obtenerlo del producto
  const findPrecio = precio_unitario ?
    Promise.resolve(precio_unitario) :
    new Promise((resolve, reject) => {
      db.get(
        'SELECT precio FROM productos WHERE id = ?',
        [producto_id],
        (err, row) => {
          if (err) reject(err);
          else if (!row) reject(new Error('Producto no encontrado'));
          else resolve(row.precio);
        }
      );
    });

  Promise.all([findAlmacen, findPrecio])
    .then(([selectedAlmacenId, selectedPrecio]) => {
      // Verificar disponibilidad del producto en el almacén seleccionado
      db.get(
        `SELECT 
          ia.cantidad,
          COALESCE(SUM(CASE WHEN o.estado IN ('pendiente', 'en_proceso') THEN o.volumen_solicitado ELSE 0 END), 0) as usado,
          (ia.cantidad - COALESCE(SUM(CASE WHEN o.estado IN ('pendiente', 'en_proceso') THEN o.volumen_solicitado ELSE 0 END), 0)) as disponible
         FROM inventario_almacen ia
         LEFT JOIN ordenes o ON o.almacen_id = ia.almacen_id AND o.producto_id = ia.producto_id
         WHERE ia.almacen_id = ? AND ia.producto_id = ?
         GROUP BY ia.cantidad`,
        [selectedAlmacenId, producto_id],
        (err, inventario) => {
          if (err) {
            return res.status(500).json({ success: false, message: 'Error al verificar inventario' });
          }

          if (!inventario || inventario.disponible < volumen_solicitado) {
            return res.status(400).json({ 
              success: false, 
              message: `Producto insuficiente en almacén. Disponible: ${inventario ? inventario.disponible : 0}` 
            });
          }

          // Calcular total incluyendo ITBIS (18%)
          const subtotal = selectedPrecio * volumen_solicitado;
          const itbis = subtotal * 0.18;
          const total = subtotal + itbis;

          // Reducir cantidad del inventario
          db.run(
            'UPDATE inventario_almacen SET cantidad = cantidad - ? WHERE almacen_id = ? AND producto_id = ?',
            [volumen_solicitado, selectedAlmacenId, producto_id],
            function(err) {
              if (err) {
                return res.status(500).json({ success: false, message: 'Error al actualizar inventario' });
              }

              // Crear la orden
              db.run(
                `INSERT INTO ordenes (
                  user_id, producto_id, delivery_id, almacen_id, 
                  volumen_solicitado, ubicacion_entrega, ventana_entrega_inicio,
                  ventana_entrega_fin, precio_unitario, total, pagado, payment_method, notas
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  user_id, producto_id, delivery_id || null, selectedAlmacenId,
                  volumen_solicitado, ubicacion_entrega, ventana_entrega_inicio || null,
                  ventana_entrega_fin || null, selectedPrecio, total, 0, payment_method || null, notas || ''
                ],
                function(err) {
                  if (err) {
                    console.error('Error creating order:', err);
                    return res.status(500).json({ success: false, message: 'Error al crear orden' });
                  }

                  res.status(201).json({
                    success: true,
                    message: 'Orden creada exitosamente',
                    data: { id: this.lastID, almacen_id: selectedAlmacenId, total }
                  });
                }
              );
            }
          );
        }
      );
    })
    .catch(error => {
      console.error('Error in order creation:', error);
      res.status(400).json({ 
        success: false, 
        message: error.message || 'Error al procesar la orden' 
      });
    });
});

// PUT - Actualizar una orden
router.put('/:id', authenticateToken, authorize(['admin', 'empleado', 'transportista']), (req, res) => {
  const { 
    user_id, producto_id, delivery_id, almacen_id,
    volumen_solicitado, volumen_entregado, estado,
    ubicacion_entrega, fecha_entrega, precio_unitario, notas
  } = req.body;

  const total = precio_unitario && volumen_solicitado ? precio_unitario * volumen_solicitado : null;

  db.run(
    `UPDATE ordenes SET 
      user_id = ?, producto_id = ?, delivery_id = ?, almacen_id = ?,
      volumen_solicitado = ?, volumen_entregado = ?, estado = ?,
      ubicacion_entrega = ?, fecha_entrega = ?, precio_unitario = ?,
      total = ?, notas = ?
    WHERE id = ?`,
    [
      user_id, producto_id, delivery_id, almacen_id,
      volumen_solicitado, volumen_entregado || null, estado || 'pendiente',
      ubicacion_entrega, fecha_entrega || null, precio_unitario || null,
      total, notas || '', req.params.id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error al actualizar orden' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: 'Orden no encontrada' });
      }
      res.json({ success: true, message: 'Orden actualizada exitosamente' });
    }
  );
});

// DELETE - Eliminar una orden
router.delete('/:id', authenticateToken, authorize(['admin']), (req, res) => {
  // Primero obtener la orden para devolver el producto al inventario
  db.get(
    'SELECT almacen_id, producto_id, volumen_solicitado, estado FROM ordenes WHERE id = ?', 
    [req.params.id], 
    (err, orden) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error al obtener orden' });
      }
      if (!orden) {
        return res.status(404).json({ success: false, message: 'Orden no encontrada' });
      }

      db.run('DELETE FROM ordenes WHERE id = ?', [req.params.id], function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: 'Error al eliminar orden' });
        }

        // Si la orden no fue entregada, devolver el producto al inventario
        if (orden.estado !== 'entregado') {
          db.run(
            `UPDATE inventario_almacen 
             SET cantidad = cantidad + ? 
             WHERE almacen_id = ? AND producto_id = ?`,
            [orden.volumen_solicitado, orden.almacen_id, orden.producto_id],
            (err) => {
              if (err) {
                console.error('Error al devolver producto al inventario:', err);
              }
            }
          );
        }

        res.json({ success: true, message: 'Orden eliminada exitosamente' });
      });
    }
  );
});

// PUT - Asignar chofer a una orden
router.put('/:id/asignar-chofer', authenticateToken, authorize(['admin', 'empleado']), (req, res) => {
  const { delivery_id } = req.body;
  const ordenId = req.params.id;

  if (!delivery_id) {
    return res.status(400).json({ success: false, message: 'delivery_id es requerido' });
  }

  // Obtener información de la orden
  db.get(
    'SELECT volumen_solicitado FROM ordenes WHERE id = ?',
    [ordenId],
    (err, orden) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error al obtener orden' });
      }
      if (!orden) {
        return res.status(404).json({ success: false, message: 'Orden no encontrada' });
      }

      // Obtener información del chofer y su vehículo
      db.get(
        `SELECT u.id, u.nombre, v.capacidad 
         FROM users u
         LEFT JOIN vehiculos v ON u.vehiculo_id = v.id
         WHERE u.id = ? AND u.role = 'transportista'`,
        [delivery_id],
        (err, chofer) => {
          if (err) {
            return res.status(500).json({ success: false, message: 'Error al verificar chofer' });
          }
          if (!chofer) {
            return res.status(404).json({ success: false, message: 'Chofer no encontrado' });
          }
          if (!chofer.capacidad) {
            return res.status(400).json({ 
              success: false, 
              message: 'El chofer no tiene vehículo asignado' 
            });
          }

          // Validar capacidad
          if (chofer.capacidad < orden.volumen_solicitado) {
            return res.status(400).json({
              success: false,
              message: `Capacidad insuficiente. Vehículo: ${chofer.capacidad}L, Orden: ${orden.volumen_solicitado}L`
            });
          }

          // Asignar chofer a la orden
          db.run(
            'UPDATE ordenes SET delivery_id = ? WHERE id = ?',
            [delivery_id, ordenId],
            function(err) {
              if (err) {
                return res.status(500).json({ success: false, message: 'Error al asignar chofer' });
              }
              res.json({ 
                success: true, 
                message: 'Chofer asignado exitosamente',
                data: { chofer_nombre: chofer.nombre, capacidad: chofer.capacidad }
              });
            }
          );
        }
      );
    }
  );
});

// PATCH - Marcar orden como pagada o no pagada
router.patch('/:id/pago', authenticateToken, authorize(['admin', 'empleado']), (req, res) => {
  const { pagado } = req.body;
  const ordenId = req.params.id;

  if (pagado === undefined || pagado === null) {
    return res.status(400).json({ success: false, message: 'El campo pagado es requerido' });
  }

  db.run(
    'UPDATE ordenes SET pagado = ? WHERE id = ?',
    [pagado ? 1 : 0, ordenId],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error al actualizar estado de pago' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: 'Orden no encontrada' });
      }
      res.json({ 
        success: true, 
        message: pagado ? 'Orden marcada como pagada' : 'Orden marcada como no pagada'
      });
    }
  );
});

module.exports = router;
