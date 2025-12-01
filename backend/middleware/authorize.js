// Middleware de autorización por roles
function authorize(allowedRoles) {
  return (req, res, next) => {
    // Verificar que el usuario esté autenticado
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'No autenticado' 
      });
    }

    // Verificar que el rol del usuario esté en los roles permitidos
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permisos para realizar esta acción' 
      });
    }

    next();
  };
}

module.exports = { authorize };
