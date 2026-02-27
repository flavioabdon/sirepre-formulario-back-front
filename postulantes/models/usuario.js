const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { generarToken } = require('../utils/jwt');

class Usuario {
  static async crear({ username, email, password, rol = 'user' }) {
    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO usuarios (username, email, password_hash, rol) VALUES ($1, $2, $3, $4) RETURNING *',
      [username, email, passwordHash, rol]
    );
    return rows[0];
  }

  static async buscarPorUsername(username) {
    const { rows } = await pool.query('SELECT * FROM usuarios WHERE username = $1', [username]);
    return rows[0];
  }

  static async buscarPorEmail(email) {
    const { rows } = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    return rows[0];
  }

  static async verificarCredenciales(username, password) {
    const usuario = await this.buscarPorUsername(username);
    if (!usuario) return null;
    
    const valido = await bcrypt.compare(password, usuario.password_hash);
    return valido ? usuario : null;
  }

  static async generarTokenAutenticacion(usuario) {
    return generarToken({
      id: usuario.id,
      username: usuario.username,
      rol: usuario.rol
    });
  }
}

module.exports = Usuario;