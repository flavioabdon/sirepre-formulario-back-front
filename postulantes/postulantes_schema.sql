CREATE TABLE IF NOT EXISTS postulantes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(250),
  apellido_paterno VARCHAR(250),
  apellido_materno VARCHAR(250),
  fecha_nacimiento DATE CHECK (fecha_nacimiento <= CURRENT_DATE - INTERVAL '18 years'),
  cedula_identidad INTEGER,
  complemento VARCHAR(2),
  expedicion VARCHAR(2) CHECK (expedicion IN ('LP', 'SC', 'CB', 'OR', 'CH', 'BN', 'PT', 'TJ', 'PN')),
  grado_instruccion VARCHAR(50),
  carrera VARCHAR(255),
  ciudad VARCHAR(100),
  zona VARCHAR(100),
  calle_avenida VARCHAR(100),
  numero_domicilio varchar(5),
  email VARCHAR(255),
  telefono INTEGER,
  celular INTEGER,
  cargo_postulacion VARCHAR(100),
  experiencia_especifica VARCHAR(24),
  experiencia_general VARCHAR(24),
  experiencia_procesos_rural VARCHAR(512),
  -- campos booleanos requisitos
  es_boliviano BOOLEAN,
  registrado_en_padron_electoral BOOLEAN,
  ci_vigente BOOLEAN,
  disponibilidad_tiempo_completo BOOLEAN,
  linea_entel BOOLEAN,
  ninguna_militancia_politica BOOLEAN,
  sin_conflictos_con_la_institucion BOOLEAN,
  sin_sentencia_ejecutoriada BOOLEAN,
  cuenta_con_celular_android BOOLEAN,
  cuenta_con_powerbank BOOLEAN,
  --rutas a los archivos
  archivo_ci VARCHAR(255),
  archivo_no_militancia VARCHAR(255),
  archivo_hoja_de_vida VARCHAR(255),
  archivo_certificado_ofimatica VARCHAR(255),
  -- Campo de registro automático
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (rol IN ('admin', 'user')),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar usuario admin inicial (password: Admin1234)
INSERT INTO usuarios (username, email, password_hash, rol) 
VALUES ('admin', 'admin@example.com', '$2b$10$5v5ZIVUQw.d2ZrFpD5JQ3Oo7M7jYvJz8Xo6bN3tL9QwW1kK5X5z6O', 'admin')
ON CONFLICT (username) DO NOTHING;


-- actualizacion de la tabla postulantes para el padron biometrico
--*
-- ALTER TABLE postulantes
--   DROP COLUMN IF EXISTS requisitos,
--   DROP COLUMN IF EXISTS latitud,
--   DROP COLUMN IF EXISTS longitud,
--   DROP COLUMN IF EXISTS marca_celular,
--   DROP COLUMN IF EXISTS modelo_celular,
--   DROP COLUMN IF EXISTS tipo_postulacion,
--   DROP COLUMN IF EXISTS id_recinto,
--   DROP COLUMN IF EXISTS nombre_recinto,
--   DROP COLUMN IF EXISTS Municipio_recinto,
--   DROP COLUMN IF EXISTS vive_cerca_recinto,
--   DROP COLUMN IF EXISTS celular_con_camara,
--   DROP COLUMN IF EXISTS android_8_2_o_superior,
--   DROP COLUMN IF EXISTS archivo_screenshot_celular,
--   DROP COLUMN IF EXISTS experiencia_especifica,
--   DROP COLUMN IF EXISTS experiencia_general;
  
  

--   SELECT * FROM postulantes;

-- ALTER TABLE postulantes
--   ADD COLUMN IF NOT EXISTS sin_sentencia_ejecutoriada BOOLEAN,
--   ADD COLUMN IF NOT EXISTS archivo_certificado_ofimatica VARCHAR(255),
--   ADD COLUMN IF NOT EXISTS cargo_postulacion VARCHAR(100),
--   ADD COLUMN IF NOT EXISTS experiencia_especifica VARCHAR(24),
--   ADD COLUMN IF NOT EXISTS experiencia_general VARCHAR(24);

-- ALTER TABLE postulantes
--    ADD COLUMN IF NOT EXISTS cuenta_con_celular_android BOOLEAN,
--    ADD COLUMN IF NOT EXISTS cuenta_con_powerbank BOOLEAN,
--    ADD COLUMN IF NOT EXISTS experiencia_procesos_rural VARCHAR(512);