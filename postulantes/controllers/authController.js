const Usuario = require('../models/usuario');
const { generarToken } = require('../utils/jwt');

const authController = {
  login: async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Usuario y contraseña son requeridos' });
      }

      const usuario = await Usuario.verificarCredenciales(username, password);
      
      if (!usuario) {
        return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
      }

      const token = await Usuario.generarTokenAutenticacion(usuario);

      res.json({ 
        success: true,
        token,
        usuario: {
          id: usuario.id,
          username: usuario.username,
          email: usuario.email,
          rol: usuario.rol
        }
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ success: false, error: 'Error en el servidor' });
    }
  },

  registro: async (req, res) => {
    try {
      const { username, email, password } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ success: false, error: 'Todos los campos son requeridos' });
      }

      if (password.length < 8) {
        return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 8 caracteres' });
      }

      // Verificar si el usuario ya existe
      const usuarioExistente = await Usuario.buscarPorUsername(username) || await Usuario.buscarPorEmail(email);
      if (usuarioExistente) {
        return res.status(400).json({ success: false, error: 'El usuario o email ya está registrado' });
      }

      const nuevoUsuario = await Usuario.crear({ username, email, password });
      
      res.status(201).json({ 
        success: true,
        message: 'Usuario registrado exitosamente'
      });
    } catch (error) {
      console.error('Error en registro:', error);
      res.status(500).json({ success: false, error: 'Error en el servidor' });
    }
  },

  perfil: async (req, res) => {
    try {
      // El middleware de autenticación ya adjuntó el usuario a req.usuario
      res.json({ 
        success: true,
        usuario: req.usuario
      });
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      res.status(500).json({ success: false, error: 'Error en el servidor' });
    }
  }
};

module.exports = authController;