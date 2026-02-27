const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const postulanteRoutes = require('./routes/postulantes');
const path = require('path');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use('/api/postulantes', postulanteRoutes);
app.use(express.static('public'));
app.use('/comprobantes', express.static(path.join(__dirname, 'public/comprobantes')));
app.use('/qr_temp', express.static(path.join(__dirname, 'public/qr_temp')));

// Servir archivos estáticos JS/CSS
app.use(express.static(path.join(__dirname, 'public')));

app.get('/formulario', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'formulario.html'));
});

app.use('/admin', adminRoutes);

// Servir archivos Excel generados
app.use('/excel', express.static(path.join(__dirname, 'public/excel')));

app.use('/api/auth', authRoutes);

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});



//

// Configura tus rutas normales
app.use('/api/auth', authRoutes);
app.use('/api/postulantes', postulanteRoutes);
app.use('/admin', adminRoutes);

// Rutas específicas que no deben redirigir
//DESCOMENTAR PARA AÑADIR A LA LISTA DE RESTRGUIDOS
const excludedRoutes = [
  //'/postulantes',
  //'/postulante',
  //'/postulantes/excel',
  //'/estadisticas',
  //'/login',
  //'/registro',
  //'/perfil',
  '/formulario'  // Para evitar redirección infinita
];
//

app.get('*', (req, res, next) => {
  if (excludedRoutes.includes(req.path)) {
    return next(); // Pasar a la siguiente ruta
  }
  res.redirect('/formulario');
});


const PORT = process.env.PORT || 5055;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`);
});