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
                almacen_id: '',
                chofer_id: '',
                volumen_solicitado: '',
                ubicacion_entrega: '',
                precio_unitario: '',
                notas: ''
            }
        };
    },
    mounted() {
        this.checkAuth();
    },
    methods: {
        async checkAuth() {
            const token = localStorage.getItem('token');
            const role = localStorage.getItem('role');

            if (!token) {
                window.location.href = 'login.html';
                return;
            }

            // Verificar que sea un cliente
            if (role !== 'cliente') {
                alert('Acceso denegado. Esta página es solo para clientes.');
                localStorage.removeItem('token');
                localStorage.removeItem('role');
                window.location.href = 'login.html';
                return;
            }

            try {
                const response = await fetch(`${API_URL}/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    this.userName = data.nombre || data.username;
                    this.userId = data.id;
                    this.loadData();
                } else {
                    throw new Error('Authentication failed');
                }
            } catch (error) {
                console.error('Error de autenticación:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('role');
                window.location.href = 'login.html';
            }
        },

        async loadData() {
            await Promise.all([
                this.loadProductos(),
                this.loadAlmacenes(),
                this.loadDeliveries(),
                this.loadOrders()
            ]);
        },

        async loadProductos() {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_URL}/productos`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    this.productos = await response.json();
                }
            } catch (error) {
                console.error('Error al cargar productos:', error);
            }
        },

        async loadAlmacenes() {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_URL}/almacenes`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    this.almacenes = await response.json();
                }
            } catch (error) {
                console.error('Error al cargar almacenes:', error);
            }
        },

        async loadDeliveries() {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_URL}/deliveries`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    this.deliveries = await response.json();
                }
            } catch (error) {
                console.error('Error al cargar choferes:', error);
            }
        },

        async loadOrders() {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_URL}/ordenes`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const allOrders = await response.json();
                    // Filtrar solo las órdenes del cliente actual
                    this.orders = allOrders.filter(order => order.cliente_id === this.userId);
                }
            } catch (error) {
                console.error('Error al cargar órdenes:', error);
            }
        },

        async createOrder() {
            try {
                const token = localStorage.getItem('token');
                
                const orderData = {
                    cliente_id: this.userId,
                    producto_id: this.newOrder.producto_id,
                    almacen_id: this.newOrder.almacen_id,
                    chofer_id: this.newOrder.chofer_id,
                    volumen_solicitado: this.newOrder.volumen_solicitado,
                    ubicacion_entrega: this.newOrder.ubicacion_entrega,
                    estado: 'pendiente'
                };

                // Agregar campos opcionales solo si tienen valor
                if (this.newOrder.precio_unitario) {
                    orderData.precio_unitario = this.newOrder.precio_unitario;
                    orderData.precio_total = this.newOrder.precio_unitario * this.newOrder.volumen_solicitado;
                }

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

                if (response.ok) {
                    alert('Orden creada exitosamente');
                    // Resetear formulario
                    this.newOrder = {
                        producto_id: '',
                        almacen_id: '',
                        chofer_id: '',
                        volumen_solicitado: '',
                        ubicacion_entrega: '',
                        precio_unitario: '',
                        notas: ''
                    };
                    // Recargar órdenes
                    await this.loadOrders();
                } else {
                    const error = await response.json();
                    alert('Error al crear orden: ' + (error.error || 'Error desconocido'));
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

        logout() {
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            window.location.href = 'login.html';
        }
    }
}).mount('#app');
