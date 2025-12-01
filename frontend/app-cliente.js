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

        async createOrder() {
            try {
                const token = localStorage.getItem('authToken');
                
                const orderData = {
                    user_id: this.userId,
                    producto_id: this.newOrder.producto_id,
                    almacen_id: this.newOrder.almacen_id,
                    delivery_id: this.newOrder.chofer_id,
                    volumen_solicitado: this.newOrder.volumen_solicitado,
                    ubicacion_entrega: this.newOrder.ubicacion_entrega,
                    estado: 'pendiente'
                };

                if (this.newOrder.precio_unitario) {
                    orderData.precio_unitario = this.newOrder.precio_unitario;
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

                const result = await response.json();

                if (result.success) {
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
                    // Recargar solo órdenes
                    const token = localStorage.getItem('authToken');
                    const response = await fetch(`${API_URL}/ordenes`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.ok) {
                        const result = await response.json();
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

        logout() {
            localStorage.clear();
            window.location.replace('login.html');
        }
    }
}).mount('#app');
