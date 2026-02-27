const { verificarToken } = require('../utils/jwt');

const authMiddleware = {
  verificarAutenticacion: (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'No autorizado - Token no proporcionado' });
    }

    const usuarioDecodificado = verificarToken(token);
    
    if (!usuarioDecodificado) {
      return res.status(401).json({ success: false, error: 'No autorizado - Token inválido' });
    }

    req.usuario = usuarioDecodificado;
    next();
  },

  esAdministrador: (req, res, next) => {
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ success: false, error: 'Acceso prohibido - Se requiere rol de administrador' });
    }
    next();
  }
};

module.exports = authMiddleware;