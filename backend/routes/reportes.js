const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const db = require('../database');
const { authenticateToken } = require('./auth');
const { authorize } = require('../middleware/authorize');

// Función helper para formatear fecha
function formatDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} - ${hours}:${minutes}`;
}

// Reporte de Clientes
router.get('/clientes', authenticateToken, authorize(['admin', 'empleado']), async (req, res) => {
  try {
    const clientes = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM users WHERE role = "cliente"', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_clientes.pdf');
    doc.pipe(res);

    // Header con logo e info del usuario
    doc.rect(50, 50, 180, 60).fill('#6B9BD1');
    doc.fontSize(16).fillColor('#FFFFFF').text('Logo', 110, 73);
    
    doc.rect(370, 50, 192, 60).fill('#6B9BD1');
    doc.fontSize(9).fillColor('#FFFFFF')
       .text(`${req.user.nombre}`, 380, 58, { width: 172 })
       .text(req.user.direccion || 'Sin dirección', 380, 74, { width: 172 })
       .text(req.user.telefono ? `Tel: ${req.user.telefono}` : 'Sin teléfono', 380, 90, { width: 172 });

    // Título
    doc.fillColor('#000000').fontSize(18).text('Reporte de Clientes', 50, 130, { align: 'center' });
    doc.moveDown(2);

    // Detalles
    doc.fontSize(10);
    const detallesY = 180;
    doc.rect(50, detallesY, 200, 120).fill('#6B9BD1');
    doc.fillColor('#FFFFFF')
       .text('Detalles del reporte', 100, detallesY + 10)
       .text(`Generado: ${formatDate(new Date())}`, 70, detallesY + 30)
       .text(`Total de registros: ${clientes.length}`, 70, detallesY + 50)
       .text('Tipo: Clientes', 70, detallesY + 70);

    // Tabla
    const tableTop = 330;
    const itemHeight = 25;
    
    doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');
    doc.text('ID', 50, tableTop);
    doc.text('Nombre', 100, tableTop);
    doc.text('Cédula', 250, tableTop);
    doc.text('Teléfono', 350, tableTop);
    doc.text('Email', 450, tableTop);
    
    doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke();

    doc.font('Helvetica').fontSize(9);
    clientes.forEach((cliente, i) => {
      const y = tableTop + 20 + (i * itemHeight);
      if (y > 750) return; // Evitar desbordamiento de página
      doc.text(cliente.id, 50, y);
      doc.text(cliente.nombre || '-', 100, y, { width: 140 });
      doc.text(cliente.cedula || '-', 250, y);
      doc.text(cliente.telefono || '-', 350, y);
      doc.text(cliente.email || '-', 450, y, { width: 100 });
    });

    doc.end();
  } catch (error) {
    console.error('Error generando reporte:', error);
    res.status(500).json({ success: false, message: 'Error generando reporte' });
  }
});

// Reporte de Empleados
router.get('/empleados', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const empleados = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM users WHERE role = "empleado"', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_empleados.pdf');
    doc.pipe(res);

    doc.rect(50, 50, 180, 60).fill('#6B9BD1');
    doc.fontSize(16).fillColor('#FFFFFF').text('Logo', 110, 73);
    
    doc.rect(370, 50, 192, 60).fill('#6B9BD1');
    doc.fontSize(9).fillColor('#FFFFFF')
       .text(`${req.user.nombre}`, 380, 58, { width: 172 })
       .text(req.user.direccion || 'Sin dirección', 380, 74, { width: 172 })
       .text(req.user.telefono ? `Tel: ${req.user.telefono}` : 'Sin teléfono', 380, 90, { width: 172 });

    doc.fillColor('#000000').fontSize(18).text('Reporte de Empleados', 50, 130, { align: 'center' });
    doc.moveDown(2);

    const detallesY = 180;
    doc.rect(50, detallesY, 200, 120).fill('#6B9BD1');
    doc.fillColor('#FFFFFF')
       .text('Detalles del reporte', 100, detallesY + 10)
       .text(`Generado: ${formatDate(new Date())}`, 70, detallesY + 30)
       .text(`Total de registros: ${empleados.length}`, 70, detallesY + 50)
       .text('Tipo: Empleados', 70, detallesY + 70);

    const tableTop = 330;
    const itemHeight = 25;
    
    doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');
    doc.text('ID', 50, tableTop);
    doc.text('Nombre', 100, tableTop);
    doc.text('Cédula', 250, tableTop);
    doc.text('Teléfono', 350, tableTop);
    doc.text('Email', 450, tableTop);
    
    doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke();

    doc.font('Helvetica').fontSize(9);
    empleados.forEach((empleado, i) => {
      const y = tableTop + 20 + (i * itemHeight);
      if (y > 750) return;
      doc.text(empleado.id, 50, y);
      doc.text(empleado.nombre || '-', 100, y, { width: 140 });
      doc.text(empleado.cedula || '-', 250, y);
      doc.text(empleado.telefono || '-', 350, y);
      doc.text(empleado.email || '-', 450, y, { width: 100 });
    });

    doc.end();
  } catch (error) {
    console.error('Error generando reporte:', error);
    res.status(500).json({ success: false, message: 'Error generando reporte' });
  }
});

// Reporte de Productos
router.get('/productos', authenticateToken, authorize(['admin', 'empleado']), async (req, res) => {
  try {
    const productos = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM productos', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_productos.pdf');
    doc.pipe(res);

    doc.rect(50, 50, 180, 60).fill('#6B9BD1');
    doc.fontSize(16).fillColor('#FFFFFF').text('Logo', 110, 73);
    
    doc.rect(370, 50, 192, 60).fill('#6B9BD1');
    doc.fontSize(9).fillColor('#FFFFFF')
       .text(`${req.user.nombre}`, 380, 58, { width: 172 })
       .text(req.user.direccion || 'Sin dirección', 380, 74, { width: 172 })
       .text(req.user.telefono ? `Tel: ${req.user.telefono}` : 'Sin teléfono', 380, 90, { width: 172 });

    doc.fillColor('#000000').fontSize(18).text('Reporte de Productos', 50, 130, { align: 'center' });

    const detallesY = 180;
    doc.rect(50, detallesY, 200, 120).fill('#6B9BD1');
    doc.fillColor('#FFFFFF')
       .text('Detalles del reporte', 100, detallesY + 10)
       .text(`Generado: ${formatDate(new Date())}`, 70, detallesY + 30)
       .text(`Total de registros: ${productos.length}`, 70, detallesY + 50)
       .text('Tipo: Productos', 70, detallesY + 70);

    const tableTop = 330;
    const itemHeight = 25;
    
    doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');
    doc.text('ID', 50, tableTop);
    doc.text('Nombre', 100, tableTop);
    doc.text('Tipo', 250, tableTop);
    doc.text('Precio', 350, tableTop);
    doc.text('Unidad', 430, tableTop);
    
    doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke();

    doc.font('Helvetica').fontSize(9);
    productos.forEach((producto, i) => {
      const y = tableTop + 20 + (i * itemHeight);
      if (y > 750) return;
      doc.text(producto.id, 50, y);
      doc.text(producto.nombre || '-', 100, y, { width: 140 });
      doc.text(producto.tipo || '-', 250, y);
      doc.text(`$${producto.precio || 0}`, 350, y);
      doc.text(producto.unidad || '-', 430, y);
    });

    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error generando reporte' });
  }
});

// Reporte de Almacenes
router.get('/almacenes', authenticateToken, authorize(['admin', 'empleado']), async (req, res) => {
  try {
    const almacenes = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM almacenes', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_almacenes.pdf');
    doc.pipe(res);

    doc.rect(50, 50, 180, 60).fill('#6B9BD1');
    doc.fontSize(16).fillColor('#FFFFFF').text('Logo', 110, 73);
    
    doc.rect(370, 50, 192, 60).fill('#6B9BD1');
    doc.fontSize(9).fillColor('#FFFFFF')
       .text(`${req.user.nombre}`, 380, 58, { width: 172 })
       .text(req.user.direccion || 'Sin dirección', 380, 74, { width: 172 })
       .text(req.user.telefono ? `Tel: ${req.user.telefono}` : 'Sin teléfono', 380, 90, { width: 172 });

    doc.fillColor('#000000').fontSize(18).text('Reporte de Almacenes', 50, 130, { align: 'center' });

    const detallesY = 180;
    doc.rect(50, detallesY, 200, 120).fill('#6B9BD1');
    doc.fillColor('#FFFFFF')
       .text('Detalles del reporte', 100, detallesY + 10)
       .text(`Generado: ${formatDate(new Date())}`, 70, detallesY + 30)
       .text(`Total de registros: ${almacenes.length}`, 70, detallesY + 50)
       .text('Tipo: Almacenes', 70, detallesY + 70);

    const tableTop = 330;
    const itemHeight = 25;
    
    doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');
    doc.text('ID', 50, tableTop);
    doc.text('Nombre', 100, tableTop);
    doc.text('Ubicación', 250, tableTop);
    doc.text('Capacidad Total', 380, tableTop);
    
    doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke();

    doc.font('Helvetica').fontSize(9);
    almacenes.forEach((almacen, i) => {
      const y = tableTop + 20 + (i * itemHeight);
      if (y > 750) return;
      doc.text(almacen.id, 50, y);
      doc.text(almacen.nombre || '-', 100, y, { width: 140 });
      doc.text(almacen.ubicacion || '-', 250, y, { width: 120 });
      doc.text(almacen.capacidad_total || '0', 380, y);
    });

    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error generando reporte' });
  }
});

// Reporte de Choferes
router.get('/choferes', authenticateToken, authorize(['admin', 'empleado', 'transportista']), async (req, res) => {
  try {
    const choferes = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM deliveries', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_choferes.pdf');
    doc.pipe(res);

    doc.rect(50, 50, 180, 60).fill('#6B9BD1');
    doc.fontSize(16).fillColor('#FFFFFF').text('Logo', 110, 73);
    
    doc.rect(370, 50, 192, 60).fill('#6B9BD1');
    doc.fontSize(9).fillColor('#FFFFFF')
       .text(`${req.user.nombre}`, 380, 58, { width: 172 })
       .text(req.user.direccion || 'Sin dirección', 380, 74, { width: 172 })
       .text(req.user.telefono ? `Tel: ${req.user.telefono}` : 'Sin teléfono', 380, 90, { width: 172 });

    doc.fillColor('#000000').fontSize(18).text('Reporte de Choferes', 50, 130, { align: 'center' });

    const detallesY = 180;
    doc.rect(50, detallesY, 200, 120).fill('#6B9BD1');
    doc.fillColor('#FFFFFF')
       .text('Detalles del reporte', 100, detallesY + 10)
       .text(`Generado: ${formatDate(new Date())}`, 70, detallesY + 30)
       .text(`Total de registros: ${choferes.length}`, 70, detallesY + 50)
       .text('Tipo: Choferes', 70, detallesY + 70);

    const tableTop = 330;
    const itemHeight = 25;
    
    doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');
    doc.text('ID', 50, tableTop);
    doc.text('Nombre', 100, tableTop);
    doc.text('Cédula', 230, tableTop);
    doc.text('Licencia', 330, tableTop);
    doc.text('Placa', 430, tableTop);
    
    doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke();

    doc.font('Helvetica').fontSize(9);
    choferes.forEach((chofer, i) => {
      const y = tableTop + 20 + (i * itemHeight);
      if (y > 750) return;
      doc.text(chofer.id, 50, y);
      doc.text(chofer.nombre || '-', 100, y, { width: 120 });
      doc.text(chofer.cedula || '-', 230, y);
      doc.text(chofer.licencia || '-', 330, y);
      doc.text(chofer.vehiculo_placa || '-', 430, y);
    });

    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error generando reporte' });
  }
});

// Reporte de Órdenes
router.get('/ordenes', authenticateToken, authorize(['admin', 'empleado', 'cliente']), async (req, res) => {
  try {
    const ordenes = await new Promise((resolve, reject) => {
      db.all(`
        SELECT o.*, u.nombre as cliente_nombre, p.nombre as producto_nombre
        FROM ordenes o
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN productos p ON o.producto_id = p.id
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_ordenes.pdf');
    doc.pipe(res);

    doc.rect(50, 50, 180, 60).fill('#6B9BD1');
    doc.fontSize(16).fillColor('#FFFFFF').text('Logo', 110, 73);
    
    doc.rect(370, 50, 192, 60).fill('#6B9BD1');
    doc.fontSize(9).fillColor('#FFFFFF')
       .text(`${req.user.nombre}`, 380, 58, { width: 172 })
       .text(req.user.direccion || 'Sin dirección', 380, 74, { width: 172 })
       .text(req.user.telefono ? `Tel: ${req.user.telefono}` : 'Sin teléfono', 380, 90, { width: 172 });

    doc.fillColor('#000000').fontSize(18).text('Reporte de Órdenes', 50, 130, { align: 'center' });

    const detallesY = 180;
    doc.rect(50, detallesY, 200, 120).fill('#6B9BD1');
    doc.fillColor('#FFFFFF')
       .text('Detalles del reporte', 100, detallesY + 10)
       .text(`Generado: ${formatDate(new Date())}`, 70, detallesY + 30)
       .text(`Total de registros: ${ordenes.length}`, 70, detallesY + 50)
       .text('Tipo: Órdenes', 70, detallesY + 70);

    const tableTop = 330;
    const itemHeight = 30;
    
    doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
    doc.text('ID', 50, tableTop);
    doc.text('Producto', 90, tableTop);
    doc.text('Volumen', 200, tableTop);
    doc.text('Dirección', 270, tableTop);
    
    doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke();

    doc.font('Helvetica').fontSize(8);
    ordenes.forEach((orden, i) => {
      const y = tableTop + 20 + (i * itemHeight);
      if (y > 750) return;
      doc.text(orden.id, 50, y);
      doc.text(orden.producto_nombre || '-', 90, y, { width: 100 });
      doc.text(orden.volumen_solicitado || '0', 200, y);
      doc.text(orden.ubicacion_entrega || '-', 270, y, { width: 280 });
    });

    doc.end();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Error generando reporte' });
  }
});

module.exports = router;
