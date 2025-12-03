const { createApp } = Vue;

const API_URL = 'http://localhost:3000/api';

createApp({
    data() {
        return {
            userName: '',
            userId: null,
            productos: [],
            almacenes: [],
            deliveries: [],
            orders: [],
            newOrder: {
                producto_id: '',
                cantidad: '',
                ubicacion_entrega: '',
                notas: ''
            },
            showPaymentModal: false,
            paymentMethod: '',
            selectedProducto: null,
            calculatedSubtotal: 0,
            calculatedITBIS: 0,
            calculatedTotal: 0,
            volumenEnLitros: 0,
            // Constantes de conversión
            GALON_A_LITROS: 3.78541,
            BARRIL_A_LITROS: 159
        };
    },
    mounted() {
        // Verificar autenticación SOLO UNA VEZ
        this.initApp();
    },
    methods: {
        initApp() {
            const token = localStorage.getItem('authToken');
            const userStr = localStorage.getItem('user');

            // Si no hay token o usuario, redirigir al login
            if (!token || !userStr) {
                window.location.replace('login.html');
                return;
            }

            try {
                const user = JSON.parse(userStr);
                
                // Verificar que sea un cliente
                if (user.role !== 'cliente') {
                    alert('Acceso denegado. Esta página es solo para clientes.');
                    localStorage.clear();
                    window.location.replace('login.html');
                    return;
                }

                // Establecer datos del usuario
                this.userName = user.nombre;
                this.userId = user.id;
                
                // Cargar datos sin verificación adicional
                this.loadAllData();
            } catch (error) {
                console.error('Error:', error);
                localStorage.clear();
                window.location.replace('login.html');
            }
        },

        async loadAllData() {
            try {
                const token = localStorage.getItem('authToken');
                
                // Cargar todos los datos en paralelo sin verificar 401 individualmente
                const [productosRes, almacenesRes, deliveriesRes, ordenesRes] = await Promise.all([
                    fetch(`${API_URL}/productos`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${API_URL}/almacenes`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${API_URL}/deliveries`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${API_URL}/ordenes`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);

                // Procesar productos
                if (productosRes.ok) {
                    const result = await productosRes.json();
                    this.productos = result.success ? result.data : result;
                }

                // Procesar almacenes
                if (almacenesRes.ok) {
                    const result = await almacenesRes.json();
                    this.almacenes = result.success ? result.data : result;
                }

                // Procesar deliveries
                if (deliveriesRes.ok) {
                    const result = await deliveriesRes.json();
                    this.deliveries = result.success ? result.data : result;
                }

                // Procesar órdenes
                if (ordenesRes.ok) {
                    const result = await ordenesRes.json();
                    const allOrders = result.success ? result.data : result;
                    // Filtrar solo las órdenes del cliente actual
                    this.orders = allOrders.filter(order => order.user_id === this.userId);
                }
            } catch (error) {
                console.error('Error al cargar datos:', error);
            }
        },

        onProductoChange() {
            const producto = this.productos.find(p => p.id == this.newOrder.producto_id);
            this.selectedProducto = producto;
            if (this.newOrder.cantidad) {
                this.calculateTotal();
            }
        },

        convertirALitros(cantidad, unidad) {
            switch(unidad) {
                case 'Litro':
                    return cantidad;
                case 'Galón':
                    return cantidad * this.GALON_A_LITROS;
                case 'Barril':
                    return cantidad * this.BARRIL_A_LITROS;
                default:
                    return cantidad;
            }
        },

        calculateTotal() {
            if (!this.selectedProducto || !this.newOrder.cantidad) {
                return;
            }

            // Convertir cantidad a litros según la unidad del producto
            this.volumenEnLitros = this.convertirALitros(
                parseFloat(this.newOrder.cantidad),
                this.selectedProducto.unidad
            );

            // Calcular subtotal basado en la cantidad original y el precio
            this.calculatedSubtotal = parseFloat(this.newOrder.cantidad) * parseFloat(this.selectedProducto.precio);
            
            // Calcular ITBIS (18%)
            this.calculatedITBIS = this.calculatedSubtotal * 0.18;
            
            // Total
            this.calculatedTotal = this.calculatedSubtotal + this.calculatedITBIS;
        },

        createOrder() {
            // Validar campos
            if (!this.newOrder.producto_id || !this.newOrder.cantidad || !this.newOrder.ubicacion_entrega) {
                alert('Por favor complete todos los campos requeridos');
                return;
            }

            // Obtener producto seleccionado
            this.selectedProducto = this.productos.find(p => p.id == this.newOrder.producto_id);
            
            if (!this.selectedProducto) {
                alert('Producto no encontrado');
                return;
            }

            // Calcular totales
            this.calculateTotal();

            // Mostrar modal de pago
            this.showPaymentModal = true;
        },

        closePaymentModal() {
            this.showPaymentModal = false;
            this.paymentMethod = '';
        },

        async confirmPayment() {
            if (!this.paymentMethod) {
                alert('Por favor seleccione un método de pago');
                return;
            }

            try {
                const token = localStorage.getItem('authToken');
                
                const orderData = {
                    user_id: this.userId,
                    producto_id: this.newOrder.producto_id,
                    volumen_solicitado: this.volumenEnLitros,
                    ubicacion_entrega: this.newOrder.ubicacion_entrega,
                    estado: 'pendiente',
                    precio_unitario: this.selectedProducto.precio,
                    payment_method: this.paymentMethod
                };

                if (this.newOrder.notas) {
                    orderData.notas = this.newOrder.notas;
                }

                const response = await fetch(`${API_URL}/ordenes`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(orderData)
                });

                const result = await response.json();

                if (result.success) {
                    alert('Orden creada exitosamente');
                    this.closePaymentModal();
                    
                    // Resetear formulario
                    this.newOrder = {
                        producto_id: '',
                        cantidad: '',
                        ubicacion_entrega: '',
                        notas: ''
                    };
                    this.selectedProducto = null;
                    
                    // Recargar órdenes
                    const ordenesRes = await fetch(`${API_URL}/ordenes`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (ordenesRes.ok) {
                        const result = await ordenesRes.json();
                        const allOrders = result.success ? result.data : result;
                        this.orders = allOrders.filter(order => order.user_id === this.userId);
                    }
                } else {
                    alert('Error al crear orden: ' + (result.message || 'Error desconocido'));
                }
            } catch (error) {
                console.error('Error al crear orden:', error);
                alert('Error al crear orden');
            }
        },

        getProductoNombre(id) {
            const producto = this.productos.find(p => p.id === id);
            return producto ? producto.nombre : 'N/A';
        },

        getAlmacenNombre(id) {
            const almacen = this.almacenes.find(a => a.id === id);
            return almacen ? almacen.nombre : 'N/A';
        },

        getChoferNombre(id) {
            const chofer = this.deliveries.find(d => d.id === id);
            return chofer ? chofer.nombre : 'N/A';
        },

        formatDate(dateString) {
            if (!dateString) return '-';
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES');
        },

        async downloadFactura(ordenId) {
            try {
                const token = localStorage.getItem('authToken');
                
                const response = await fetch(`${API_URL}/reportes/factura/${ordenId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Error al descargar factura');
                }

                // Obtener el blob del PDF
                const blob = await response.blob();
                
                // Crear URL temporal para el blob
                const url = window.URL.createObjectURL(blob);
                
                // Crear elemento <a> temporal para descargar
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `factura_orden_${ordenId}.pdf`;
                
                // Agregar al DOM, hacer click y remover
                document.body.appendChild(a);
                a.click();
                
                // Limpiar
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                alert('✅ Factura descargada exitosamente');
            } catch (error) {
                console.error('Error descargando factura:', error);
                alert('❌ Error al descargar la factura');
            }
        },

        logout() {
            localStorage.clear();
            window.location.replace('login.html');
        }
    }
}).mount('#app');
