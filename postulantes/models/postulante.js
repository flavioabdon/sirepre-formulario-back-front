const pool = require('../config/db');

const crearPostulante = async (data) => {
  // Primero verificamos si el postulante ya existe
  const yaExiste = await existePostulante(data.cedulaIdentidad, data.complemento || null);
  
  if (yaExiste) {
    throw new Error('Ya existe un postulante con esta cédula de identidad y complemento');
  }

  const query = `
    INSERT INTO postulantes (
      nombre,
      apellido_paterno,
      apellido_materno,
      fecha_nacimiento,
      cedula_identidad,
      complemento,
      expedicion,
      grado_instruccion,
      carrera,
      ciudad, 
      zona,
      calle_avenida,
      numero_domicilio,
      email,
      telefono,
      celular,
      experiencia_general,
      experiencia_especifica, 
      experiencia_procesos_rural,
      es_boliviano,
      registrado_en_padron_electoral,
      ci_vigente,
      disponibilidad_tiempo_completo,
      linea_entel, 
      ninguna_militancia_politica,
      sin_conflictos_con_la_institucion,
      cuenta_con_celular_android,
      cuenta_con_powerbank,
      archivo_ci, 
      archivo_no_militancia,
      archivo_hoja_de_vida,
      sin_sentencia_ejecutoriada,
      archivo_certificado_ofimatica,
      cargo_postulacion
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
      $31, $32, $33, $34
    )
    RETURNING id
  `;
  
  const values = [                  
    data.nombre, //1                               
    data.apellidoPaterno || null, //2               
    data.apellidoMaterno || null,    //3           
    data.fechaNacimiento,               ///4        
    data.cedulaIdentidad,                   //5    
    data.complemento || null,                  //6 
    data.expedicion,                            //7
    data.gradoInstruccion,                      //8
    data.carrera || 'NO APLICA',                //9
    data.ciudad,                                //10
    data.zona,                                  //11
    data.calleAvenida,                          //12
    data.numeroDomicilio,                       //13
    data.email,                                 //14
    data.telefono || null,                      //15
    data.celular,                                   //16                                    
    data.experienciaGeneral || null,     //17
    data.experienciaEspecifica || null,//18
    data.experienciaProcesosRural || null, //19       
    data.es_boliviano || false,                //20 
    data.registrado_en_padron_electoral || false, //21
    data.ci_vigente || false,                   //22
    data.disponibilidad_tiempo_completo || false,   //23   
    data.linea_entel || false,                //24
    data.ninguna_militancia_politica || false,   //25
    data.sin_conflictos_con_la_institucion || false,  //26
    data.cuenta_con_celular_android || false,  //27
    data.cuenta_con_powerbank || false,   //28
    data.archivos.ci,                        //29
    data.archivos.no_militancia,                //30
    data.archivos.hoja_vida,                    //31
    data.sin_sentencia_ejecutoriada || false,    //32
    data.archivos.certificado_ofimatica || null, //33
    data.cargoPostulacion,  
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error al crear postulante:', error);
    throw error;
  }
};

const existePostulante = async (cedula_identidad, complemento) => {
  const result = await pool.query(
    `SELECT 1 FROM postulantes 
     WHERE cedula_identidad = $1 AND (complemento = $2 OR complemento IS NULL)
     LIMIT 1`,
    [cedula_identidad, complemento]
  );
  return result.rowCount > 0;
};

module.exports = {
  crearPostulante,
  existePostulante
};