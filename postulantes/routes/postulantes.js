const express = require('express');
const multer = require('multer');
const { 
  crearPostulante, 
  verificarExistenciaPostulante, 
  servirPDF 
} = require('../controllers/postulanteController');
const { 
  listarPostulantes, 
  generarExcel, 
  obtenerEstadisticas 
} = require('../controllers/adminController');
const { 
  verificarAutenticacion, 
  esAdministrador 
} = require('../middlewares/auth');

const router = express.Router();

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Límite de 10MB por archivo
  },
  fileFilter: (req, file, cb) => {
    // Permitir solo archivos PDF e imágenes
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'), false);
    }
  }
});

// Manejo de errores de multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'El archivo es demasiado grande. Máximo 10MB.'
      });
    }
  } else if (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  next();
};

// Rutas públicas
router.post('/', 
  upload.fields([
    { name: 'archivo_ci', maxCount: 1 },
    { name: 'archivo_no_militancia', maxCount: 1 },
    { name: 'archivo_curriculum', maxCount: 1 },
    { name: 'archivo_certificado_ofimatica', maxCount: 1 }
  ]),
  handleMulterError,
  crearPostulante
);

// ✅ Ruta corregida para servir PDF
router.get('/pdf/:id', servirPDF);

// Ruta para verificar existencia de postulante
router.get('/existe', verificarExistenciaPostulante);

// Rutas protegidas (requieren autenticación y ser admin)
router.get('/postulantes', 
  verificarAutenticacion, 
  esAdministrador, 
  listarPostulantes
);

router.get('/postulantes/excel', 
  verificarAutenticacion, 
  esAdministrador, 
  generarExcel
);

router.get('/estadisticas', 
  verificarAutenticacion, 
  esAdministrador, 
  obtenerEstadisticas
);

// Ruta de salud para verificar que el servidor funciona
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Servidor de postulantes funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
