const pool = require('../config/db');
const excel = require('exceljs');
const fs = require('fs');
const path = require('path');

// Listar todos los postulantes
const listarPostulantes = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT id, nombre, apellido_paterno, apellido_materno, 
             cedula_identidad, complemento, expedicion,
             fecha_registro, cargo_postulacion
      FROM postulantes
    `;

    let countQuery = 'SELECT COUNT(*) FROM postulantes';
    const params = [];
    const countParams = [];

    if (search) {
      query += ` WHERE CONCAT(nombre, ' ', apellido_paterno, ' ', apellido_materno) ILIKE $1 
                OR cedula_identidad::TEXT LIKE $1`;
      countQuery += ` WHERE CONCAT(nombre, ' ', apellido_paterno, ' ', apellido_materno) ILIKE $1 
                     OR cedula_identidad::TEXT LIKE $1`;
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    query += ` ORDER BY fecha_registro DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const [postulantes, total] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    res.json({
      success: true,
      data: postulantes.rows,
      total: parseInt(total.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(total.rows[0].count / limit)
    });
  } catch (error) {
    console.error('Error al listar postulantes:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// Generar Excel con todos los postulantes
const generarExcel = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        id, nombre, apellido_paterno, apellido_materno,
        cedula_identidad, complemento, expedicion,
        TO_CHAR(fecha_nacimiento, 'DD/MM/YYYY') as fecha_nacimiento,
        grado_instruccion, carrera,
        ciudad, zona, calle_avenida, numero_domicilio,
        email, telefono, celular,
        cargo_postulacion,
        TO_CHAR(fecha_registro, 'DD/MM/YYYY HH24:MI:SS') as fecha_registro,
        es_boliviano, registrado_en_padron_electoral, ci_vigente,
        disponibilidad_tiempo_completo,
        ninguna_militancia_politica, sin_conflictos_con_la_institucion
      FROM postulantes
      ORDER BY fecha_registro DESC
    `);

    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Postulantes');

    // Columnas del Excel
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Nombre Completo', key: 'nombre_completo', width: 30 },
      { header: 'CI', key: 'ci', width: 15 },
      { header: 'Fecha Nacimiento', key: 'fecha_nacimiento', width: 15 },
      { header: 'Grado Instrucción', key: 'grado_instruccion', width: 20 },
      { header: 'Teléfono', key: 'celular', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Cargo Postulación', key: 'cargo_postulacion', width: 30 },
      { header: 'Fecha Registro', key: 'fecha_registro', width: 20 },
      { header: 'Cumple Requisitos', key: 'cumple_requisitos', width: 15 }
    ];

    // Agregar datos
    rows.forEach(postulante => {
      worksheet.addRow({
        ...postulante,
        nombre_completo: `${postulante.nombre} ${postulante.apellido_paterno} ${postulante.apellido_materno}`,
        ci: `${postulante.cedula_identidad} ${postulante.complemento} ${postulante.expedicion}`,
        cumple_requisitos: (
          postulante.es_boliviano &&
          postulante.registrado_en_padron_electoral &&
          postulante.ci_vigente &&
          postulante.disponibilidad_tiempo_completo &&
          postulante.linea_entel &&
          postulante.ninguna_militancia_politica &&
          postulante.sin_conflictos_con_la_institucion
        ) ? 'SI' : 'NO'
      });
    });

    // Estilo para la cabecera
    worksheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9D9D9' }
      };
    });

    // Crear archivo temporal
    const excelDir = path.join(__dirname, '../public/excel');
    if (!fs.existsSync(excelDir)) {
      fs.mkdirSync(excelDir, { recursive: true });
    }

    const filePath = path.join(excelDir, 'postulantes.xlsx');
    await workbook.xlsx.writeFile(filePath);

    // Enviar archivo
    res.download(filePath, 'postulantes.xlsx', (err) => {
      if (err) console.error('Error al descargar Excel:', err);
      // Eliminar archivo temporal después de enviar
      fs.unlinkSync(filePath);
    });

  } catch (error) {
    console.error('Error al generar Excel:', error);
    res.status(500).json({ success: false, error: 'Error al generar el archivo Excel' });
  }
};

// Obtener estadísticas de registros
const obtenerEstadisticas = async (req, res) => {
  try {
    // Registros por minuto (últimas 24 horas)
    const registrosPorMinuto = await pool.query(`
      SELECT 
        DATE_TRUNC('minute', fecha_registro) AS minuto,
        COUNT(*) AS cantidad
      FROM postulantes
      WHERE fecha_registro >= NOW() - INTERVAL '24 hours'
      GROUP BY minuto
      ORDER BY minuto ASC
    `);

    // Totales por tipo de postulación
    const totalesPorTipo = await pool.query(`
      SELECT 
        tipo_postulacion,
        COUNT(*) AS total
      FROM postulantes
      GROUP BY tipo_postulacion
    `);

    // Cumplimiento de requisitos
    const cumplimientoRequisitos = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE es_boliviano) AS es_boliviano,
        COUNT(*) FILTER (WHERE registrado_en_padron_electoral) AS registrado_padron,
        COUNT(*) FILTER (WHERE ci_vigente) AS ci_vigente,
        COUNT(*) FILTER (WHERE disponibilidad_tiempo_completo) AS disponibilidad,
        COUNT(*) FILTER (WHERE linea_entel) AS linea_entel,
        COUNT(*) FILTER (WHERE ninguna_militancia_politica) AS sin_militancia,
        COUNT(*) FILTER (WHERE sin_conflictos_con_la_institucion) AS sin_conflictos,
        COUNT(*) AS total
      FROM postulantes
    `);

    res.json({
      success: true,
      data: {
        registrosPorMinuto: registrosPorMinuto.rows,
        totalesPorTipo: totalesPorTipo.rows,
        cumplimientoRequisitos: cumplimientoRequisitos.rows[0]
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ success: false, error: 'Error al obtener estadísticas' });
  }
};

module.exports = {
  listarPostulantes,
  generarExcel,
  obtenerEstadisticas
};