const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.post('/registro', authController.registro);
router.get('/perfil', authController.perfil);

module.exports = router;