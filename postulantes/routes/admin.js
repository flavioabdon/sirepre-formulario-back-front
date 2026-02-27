// routes/admin.js
const express = require('express');
const router = express.Router();
const { listarPostulantes, generarExcel, obtenerEstadisticas } = require('../controllers/adminController');
const { verificarAutenticacion, esAdministrador } = require('../middlewares/auth');

//router.get('/postulantes', listarPostulantes)
router.get('/postulantes', verificarAutenticacion, esAdministrador, listarPostulantes);
router.get('/postulantes/excel', verificarAutenticacion, esAdministrador, generarExcel);
router.get('/estadisticas', verificarAutenticacion, esAdministrador, obtenerEstadisticas);

module.exports = router;