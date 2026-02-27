import os
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.utils import simpleSplit
from django.conf import settings
from datetime import datetime
import qrcode
import json
import base64

# ─── Paleta institucional ─────────────────────────────────────────────────────
COLOR_PRIMARY   = colors.HexColor("#474747")
COLOR_ACCENT    = colors.HexColor("#C8102E")
COLOR_GOLD      = colors.HexColor("#828282")
COLOR_LIGHT_BG  = colors.HexColor("#FCFCFC")    # color de fondo de las secciones
COLOR_CHECK_BG  = colors.HexColor("#F0FFF4")   # fondo checkboxes OK
COLOR_LABEL     = colors.HexColor("#2C3E50")   # Darker for better contrast
COLOR_VALUE     = colors.HexColor("#1A1A1A")
COLOR_WHITE     = colors.white
COLOR_BORDER    = colors.HexColor("#95A5A6")
COLOR_GREEN     = colors.HexColor("#1C1C1C")  # Darker green
COLOR_RED       = colors.HexColor("#B71C1C")  # Darker red

LOGO_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "static", "logoOEP.png"
)

SI  = "✔  SÍ"
NO  = "✘  NO"

def _bool(val):
    return SI if val else NO


# ─────────────────────────────────────────────────────────────────────────────
def generate_qr(data, ci):
    qr_data = {
        "ci":              data.get("cedulaIdentidad") or data.get("cedula_identidad"),
        "complemento":    data.get("complemento") or "",
        "nombres":        (f"{data.get('nombre')} "
                           f"{data.get('apellidoPaterno') or data.get('apellido_paterno') or ''} "
                           f"{data.get('apellidoMaterno') or data.get('apellido_materno') or ''}"),
        "fechaNacimiento": str(data.get("fechaNacimiento") or data.get("fecha_nacimiento")),
        "fechaPostulacion": datetime.now().isoformat(),
    }
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8, border=2,
    )
    # Convertir a JSON y luego a Base64
    json_data = json.dumps(qr_data)
    b64_data = base64.b64encode(json_data.encode('utf-8')).decode('utf-8')
    
    qr.add_data(b64_data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#003A70", back_color="white")
    qr_dir = os.path.join(settings.MEDIA_ROOT, "qr_temp")
    os.makedirs(qr_dir, exist_ok=True)
    qr_path = os.path.join(qr_dir, f"qr_{ci}.png")
    img.save(qr_path)
    return qr_path


# ─────────────────────────────────────────────────────────────────────────────
def generate_pdf(postulante):
    pdf_dir = os.path.join(settings.MEDIA_ROOT, "comprobantes")
    os.makedirs(pdf_dir, exist_ok=True)

    filename = f"comprobante_{postulante.cedula_identidad}.pdf"
    filepath  = os.path.join(pdf_dir, filename)

    c       = canvas.Canvas(filepath, pagesize=A4)
    width, height = A4
    margin  = 45
    now_str = datetime.now().strftime("%d/%m/%Y  %H:%M:%S")

    # ── Marca de agua de fondo (Patrón Repetitivo) ────────────────────────
    c.saveState()
    c.setFont("Helvetica", 6)
    c.setFillColor(colors.HexColor("#E5E8E8")) # Gris muy claro
    c.setFillAlpha(0.4)
    
    pattern_text = "SERVICIO DE REGISTRO CÍVICO LA PAZ      "
    text_w_pattern = c.stringWidth(pattern_text, "Helvetica", 6)
    
    # Cubrir toda la página con el patrón
    for i in range(-10, 30): # Filas
        for j in range(-5, 15): # Columnas
            c.saveState()
            c.translate(j * text_w_pattern, i * 35)
            c.rotate(35)
            c.drawString(0, 0, pattern_text)
            c.restoreState()
    c.restoreState()

    nombre_completo = (
        f"{postulante.nombre or ''} "
        f"{postulante.apellido_paterno or ''} "
        f"{postulante.apellido_materno or ''}"
    ).strip().upper()

    # ══════════════════════════════════════════════════════════════════════
    # 1. CABECERA INSTITUCIONAL
    # ══════════════════════════════════════════════════════════════════════
    header_top    = height - margin
    header_bottom = height - margin - 90
    header_h      = header_top - header_bottom

    c.setFillColor(COLOR_WHITE)
    c.setStrokeColor(COLOR_GOLD)
    c.setLineWidth(2.5)
    c.rect(margin, header_bottom, width - margin * 2, header_h, fill=1, stroke=0)
    c.line(margin, header_bottom, width - margin, header_bottom)

    logo_h, logo_w = 72, 72
    if os.path.exists(LOGO_PATH):
        c.drawImage(
            LOGO_PATH,
            margin + 4, header_bottom + (header_h - logo_h) / 2,
            width=logo_w, height=logo_h,
            preserveAspectRatio=True, mask="auto"
        )

    text_x = margin + logo_w + 12
    # QR en la cabecera (derecha)
    qr_size = 66
    qr_x    = width - margin - qr_size - 4
    qr_y    = header_bottom + (header_h - qr_size) / 2
    
    text_available_right = qr_x - 12
    text_w  = text_available_right - text_x
    mid_y   = header_bottom + header_h / 2

    # QR Drawing
    qr_path = generate_qr({
        "cedula_identidad": postulante.cedula_identidad,
        "complemento":      postulante.complemento,
        "nombre":           postulante.nombre,
        "apellido_paterno": postulante.apellido_paterno,
        "apellido_materno": postulante.apellido_materno,
        "fecha_nacimiento": postulante.fecha_nacimiento,
    }, postulante.cedula_identidad)
    c.setStrokeColor(COLOR_BORDER)
    c.setLineWidth(0.5)
    c.rect(qr_x - 2, qr_y - 2, qr_size + 4, qr_size + 4, fill=0, stroke=1)
    c.drawImage(qr_path, qr_x, qr_y, width=qr_size, height=qr_size)
    os.remove(qr_path)
    c.setFont("Helvetica", 5.5)
    c.setFillColor(COLOR_LABEL)
    c.drawCentredString(qr_x + qr_size / 2, qr_y - 8, "Verificación digital")

    c.setFillColor(COLOR_PRIMARY)
    c.setFont("Helvetica-Bold", 10.5)
    c.drawCentredString(text_x + text_w / 2, mid_y + 24,
                        "ÓRGANO ELECTORAL PLURINACIONAL")
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(text_x + text_w / 2, mid_y + 10,
                        "SERECI - SERVICIO DE REGISTRO CIVICO LA PAZ")
    c.setFillColor(COLOR_LABEL)
    c.setFont("Helvetica", 7.5)
    c.drawCentredString(text_x + text_w / 2, mid_y - 12,
                        f"Fecha de emisión: {now_str}")

    # ── Franja de título ─────────────────────────────────────────────────
    banner_h = 26
    banner_y = header_bottom - banner_h
    c.setFillColor(COLOR_PRIMARY)
    c.rect(margin, banner_y, width - margin * 2, banner_h, fill=1, stroke=0)
    c.setFillColor(COLOR_WHITE)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(width / 2, banner_y + 8,
                        "COMPROBANTE DE POSTULACIÓN — SIREPRE")
    c.setStrokeColor(COLOR_GOLD)
    c.setLineWidth(2)
    c.line(margin, banner_y, width - margin, banner_y)

    # ══════════════════════════════════════════════════════════════════════
    # 2. CONTENIDO PRINCIPAL - FLUJO DINÁMICO
    # ══════════════════════════════════════════════════════════════════════
    
    # Espacio para el pie de página (fijo)
    footer_base = margin + 60 
    firma_space_y = footer_base + 54 # Mantiene la declaración en su altura actual
    sep_y = firma_space_y + 45
    
    firma_line_y = footer_base + 15    # Subido 15 puntos respecto al anterior (-15 + 15)
    nombre_y = footer_base - 1      # Mantener altura actual
    firma_label_y = footer_base - 8 # Mantener altura actual
    
    # Límite superior del contenido (después del banner)
    current_y = banner_y - 12
    
    # Altura máxima disponible para contenido
    content_min_y = sep_y + 12 # Ajustado al nuevo sep_y
    
    line_h = 14
    label_w = 160
    col2_x = margin + label_w
    
    # Función para verificar si hay espacio suficiente
    def has_space(needed_height):
        return (current_y - needed_height) > content_min_y
    
    # Función para ajustar y dibujar sección con verificación de espacio
    def draw_section_with_check(title, draw_func, *args, **kwargs):
        nonlocal current_y
        estimated_height = kwargs.get('estimated_height', 60)
        
        if not has_space(estimated_height):
            # Si no hay espacio, crear nueva página
            c.showPage()
            # Reiniciar configuración para nueva página
            current_y = height - margin - 50
            
        # Dibujar la sección
        draw_func(*args, **kwargs)

    def draw_section_header(title):
        nonlocal current_y
        sec_x = margin
        total_w = width - margin * 2
        header_h_ = 22 # Reducido de 28
        
        # Verificar espacio
        if current_y - header_h_ - 5 < content_min_y:
            c.showPage()
            current_y = height - margin - 50
            
        c.setFillColor(COLOR_PRIMARY)
        c.rect(sec_x, current_y - header_h_, total_w, header_h_, fill=1, stroke=0)
        c.setFillColor(COLOR_GOLD)
        c.rect(sec_x, current_y - header_h_, 5, header_h_, fill=1, stroke=0)
        c.setFillColor(COLOR_WHITE)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(sec_x + 12, current_y - header_h_ + 6, title)
        current_y -= (header_h_ + 3)

    def draw_fields(fields, cols=2):
        nonlocal current_y
        total_w = width - margin * 2
        col_w = total_w / cols
        row_h_fields = 14  # Reducido de 16
        
        # Calcular espacio necesario
        needed_height = (len(fields) + 1) // cols * row_h_fields + 5
        
        # Verificar espacio
        if current_y - needed_height < content_min_y:
            c.showPage()
            current_y = height - margin - 50
            # Redibujar encabezado de sección si es necesario
            if hasattr(draw_fields, 'last_section'):
                draw_section_header(draw_fields.last_section)
        
        for i in range(0, len(fields), cols):
            row_y = current_y - row_h_fields
            
            # Fondo de fila
            bg = COLOR_LIGHT_BG if (i // cols) % 2 == 0 else COLOR_WHITE
            c.setFillColor(bg)
            c.setStrokeColor(COLOR_BORDER)
            c.setLineWidth(0.3)
            c.rect(margin, row_y, total_w, row_h_fields, fill=1, stroke=1)

            for col in range(cols):
                idx = i + col
                if idx >= len(fields): break
                
                label, value = fields[idx]
                cell_x = margin + col * col_w
                
                # Label
                c.setFont("Helvetica-Bold", 9)
                c.setFillColor(COLOR_LABEL)
                c.drawString(cell_x + 6, row_y + 5, f"{label}:")
                
                # Value
                label_width = c.stringWidth(f"{label}:", "Helvetica-Bold", 9)
                c.setFont("Helvetica", 9)
                c.setFillColor(COLOR_VALUE)
                val_str = str(value).strip() if value else "—"
                
                max_val_w = col_w - label_width - 16
                while c.stringWidth(val_str, "Helvetica", 9) > max_val_w and len(val_str) > 3:
                    val_str = val_str[:-4] + "..."
                c.drawString(cell_x + label_width + 12, row_y + 5, val_str)

            current_y = row_y

        current_y -= 4 # Reducido de 8

    def draw_bool_section(title, items):
        nonlocal current_y
        total_w = width - margin * 2
        hdr_h = 22
        row_h_bool = 16
        
        # Calcular espacio necesario
        rows = (len(items) + 1) // 2
        needed_height = hdr_h + rows * row_h_bool + 5
        
        # Verificar espacio
        if current_y - needed_height < content_min_y:
            c.showPage()
            current_y = height - margin - 50
        
        # Título de sección
        c.setFillColor(COLOR_PRIMARY)
        c.rect(margin, current_y - hdr_h, total_w, hdr_h, fill=1, stroke=0)
        c.setFillColor(COLOR_GOLD)
        c.rect(margin, current_y - hdr_h, 5, hdr_h, fill=1, stroke=0)
        c.setFillColor(COLOR_WHITE)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(margin + 12, current_y - hdr_h + 6, title)
        current_y -= hdr_h

        cols = 2
        col_w = total_w / cols
        
        for i, (label, val) in enumerate(items):
            if i % cols == 0:
                row_top = current_y - row_h_bool
                bg = COLOR_LIGHT_BG if (i // cols) % 2 == 0 else COLOR_WHITE
                c.setFillColor(bg)
                c.setStrokeColor(COLOR_BORDER)
                c.setLineWidth(0.3)
                c.rect(margin, row_top, total_w, row_h_bool, fill=1, stroke=1)

            col_idx = i % cols
            cell_x = margin + col_idx * col_w

            # Square with symbol
            sym_color = COLOR_GREEN if val else COLOR_RED
            c.setStrokeColor(sym_color)
            c.setLineWidth(1.2)
            c.rect(cell_x + 6, current_y - row_h_bool + 5, 9, 9, fill=0, stroke=1)
            
            c.setFont("Helvetica-Bold", 8)
            c.setFillColor(sym_color)
            if val:
                # Checkmark
                p = c.beginPath()
                p.moveTo(cell_x + 7, current_y - row_h_bool + 11)
                p.lineTo(cell_x + 11, current_y - row_h_bool + 7)
                p.lineTo(cell_x + 15, current_y - row_h_bool + 13)
                c.setLineWidth(1.5)
                c.drawPath(p, stroke=1, fill=0)
            else:
                # X
                c.setLineWidth(1.2)
                c.line(cell_x + 8, current_y - row_h_bool + 6, cell_x + 14, current_y - row_h_bool + 13)
                c.line(cell_x + 8, current_y - row_h_bool + 13, cell_x + 14, current_y - row_h_bool + 6)

            c.setFont("Helvetica", 8.5)
            c.setFillColor(COLOR_VALUE)
            c.drawString(cell_x + 22, current_y - row_h_bool + 4, label)

            if (i + 1) % cols == 0:
                current_y -= row_h_bool

        if len(items) % cols != 0:
            current_y -= row_h_bool

        current_y -= 4

    # ── SECCIONES DE DATOS ───────────────────────────────────────────────
    
    # I. INFORMACIÓN PERSONAL Y ACADÉMICA
    datos_personales = [
        ("Nombre(s)",            postulante.nombre),
        ("Apellido Paterno",     postulante.apellido_paterno or "—"),
        ("Apellido Materno",     postulante.apellido_materno or "—"),
        ("Fecha Nacimiento",     str(postulante.fecha_nacimiento)),
        ("CI",                   f"{postulante.cedula_identidad} {postulante.complemento or ''}".strip()),
        ("Expedición",           postulante.expedicion),
    ]
    draw_section_header("I. INFORMACIÓN PERSONAL Y ACADÉMICA")
    draw_fields(datos_personales, cols=2)

    # Instrucción Académica
    instruccion = [
        ("Instrucción", postulante.grado_instruccion or "—"),
        ("Carrera",      postulante.carrera or "—"),
    ]
    draw_fields(instruccion, cols=2)

    # II. DIRECCIÓN Y CONTACTO
    domicilio = [
        ("Ciudad / Loc.",  postulante.ciudad),
        ("Zona / Barrio",  postulante.zona),
        ("Calle / Av.",    postulante.calle_avenida or "—"),
        ("Nro.",           postulante.numero_domicilio or "—"),
    ]
    draw_section_header("II. DIRECCIÓN Y CONTACTO")
    draw_fields(domicilio, cols=2)

    # Contacto
    contacto = [
        ("Email",            postulante.email or "—"),
        ("Celular",          str(postulante.celular) if postulante.celular else "—"),
        ("Cel. Respaldo",    str(postulante.telefono) if postulante.telefono else "—"),
    ]
    draw_fields(contacto, cols=2)

    # III. DATOS DE LA POSTULACIÓN Y RECINTO
    postulacion = [
        ("Cargo",           postulante.cargo_postulacion),
        ("Experiencia",     "SI" if postulante.experiencia_general == "SI" else "NO"),
        ("Nro. Procesos",   postulante.experiencia_especifica or "0"),
        ("Exp. Rural",      postulante.experiencia_procesos_rural or "—"),
    ]
    draw_section_header("III. DATOS DE LA POSTULACIÓN Y RECINTO")
    draw_fields(postulacion, cols=2)

    # Recinto Electoral
    recinto_1 = postulante.recinto_primera_opcion
    if recinto_1:
        recinto_data = [
            ("Recinto",      recinto_1.nombre),
            ("Municipio",    recinto_1.municipio),
            ("Dirección",    getattr(recinto_1, 'direccion', '—')),
            ("Estado",       "PENDIENTE ASIGNACIÓN"),
        ]
    else:
        recinto_data = [
            ("Recinto",  "NO SELECCIONADO"),
        ]
    draw_fields(recinto_data, cols=2)

    # IV. REQUISITOS Y DOCUMENTOS
    docs = [
        ("CI",                "ADJUNTO" if postulante.archivo_ci else "NO ADJUNTO"),
        ("No Militancia",     "ADJUNTO" if postulante.archivo_no_militancia else "NO ADJUNTO"),
        ("Hoja de Vida",      "ADJUNTO" if postulante.archivo_hoja_de_vida else "NO ADJUNTO"),
        ("Certificado Exp.",  "ADJUNTO" if postulante.archivo_certificado_ofimatica else "NO ADJUNTO"),
    ]
    draw_section_header("IV. REQUISITOS Y DOCUMENTOS")
    draw_fields(docs, cols=2)

    # Requisitos declarados
    requisitos = [
        ("Es ciudadano/a boliviano/a",          postulante.es_boliviano),
        ("Registrado en el Padrón Electoral",   postulante.registrado_en_padron_electoral),
        ("Cédula de Identidad vigente",         postulante.ci_vigente),
        ("Disponibilidad a tiempo completo",    postulante.disponibilidad_tiempo_completo),
        ("Cuenta con línea Entel",              postulante.linea_entel),
        ("Sin militancia política",             postulante.ninguna_militancia_politica),
        ("Sin conflictos con la institución",   postulante.sin_conflictos_con_la_institucion),
        ("Sin sentencia ejecutoriada",          postulante.sin_sentencia_ejecutoriada),
        ("Cuenta con celular Android",          postulante.cuenta_con_celular_android),
        ("Cuenta con Powerbank",                postulante.cuenta_con_powerbank),
    ]
    draw_bool_section("REQUISITOS DECLARADOS", requisitos)

    # Observación (si existe y no es el mensaje automático de no acuerdo)
    auto_obs = "POSTULACION - NO ESTA DE ACUERDO CON DESIGNACION DE ACUERDO A REQUERIMIENTO"
    if postulante.observacion and postulante.observacion.strip().upper() != auto_obs:
        # Verificar espacio antes de agregar observación
        if current_y - 40 < content_min_y:
            c.showPage()
            current_y = height - margin - 50
        
        draw_section_header("⚠ OBSERVACIÓN")
        draw_fields([("Observación", postulante.observacion)], cols=1)

    # ══════════════════════════════════════════════════════════════════════
    # 3. PIE DE PÁGINA FIJO
    # ══════════════════════════════════════════════════════════════════════

    # Ajustar current_y para el pie de página
    current_y = sep_y

    # Franja de fondo
    footer_area_h = sep_y - footer_base + 6
    c.setFillColor(colors.HexColor("#F4F6FA"))
    c.rect(margin, footer_base, width - margin * 2, footer_area_h, fill=1, stroke=0)

    # Línea separadora doble
    c.setStrokeColor(COLOR_PRIMARY)
    c.setLineWidth(1.5)
    c.line(margin, sep_y, width - margin, sep_y)
    c.setStrokeColor(COLOR_GOLD)
    c.setLineWidth(0.8)
    c.line(margin, sep_y - 3, width - margin, sep_y - 3)

    # Etiqueta declaración
    c.setFont("Helvetica-Bold", 7.5)
    c.setFillColor(COLOR_PRIMARY)
    c.drawString(margin, sep_y - 14, "DECLARACIÓN.")

    # Texto declaración
    decl_text = (
        "Yo, el/la postulante, declaro que toda la información consignada "
        "en el presente formulario es veraz, completa y fidedigna. Acepto que cualquier dato "
        "falso, incompleto o alterado será motivo de inhabilitación automática e irrevocable "
        "de mi postulación. Asimismo, manifiesto mi conformidad con la asignación de "
        "recintos electorales de acuerdo a requerimiento del SERECI La Paz."
    )
    max_w = width - margin * 2 - 40
    decl_lines = simpleSplit(decl_text, "Helvetica-Oblique", 8, max_w)
    decl_line_h = 11
    
    decl_y = firma_space_y + (len(decl_lines) - 1) * decl_line_h
    c.setFont("Helvetica-Oblique", 8)
    c.setFillColor(COLOR_VALUE)
    for line in decl_lines:
        c.drawString(margin, decl_y, line)
        decl_y -= decl_line_h

    # Área de firma
    firma_cx = width / 2
    firma_half_w = 110
    
    c.setStrokeColor(COLOR_PRIMARY)
    c.setLineWidth(0.8)
    c.line(firma_cx - firma_half_w, firma_line_y,
           firma_cx + firma_half_w, firma_line_y)

    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(COLOR_VALUE)
    c.drawCentredString(firma_cx, nombre_y, nombre_completo)

    c.setFont("Helvetica", 7.5)
    c.setFillColor(COLOR_LABEL)
    c.drawCentredString(firma_cx, firma_label_y, "Firma del postulante")

    # ID de registro
    ts = int(datetime.now().timestamp() * 1000)
    c.setFont("Helvetica", 6.5)
    c.setFillColor(COLOR_LABEL)
    c.drawString(margin, footer_base - 30,
                 f"Nro. de registro: {postulante.cedula_identidad}-{ts}")
    c.drawRightString(width - margin, footer_base - 30,
                      "Documento generado electrónicamente")

    # ── Rótulo de observación diagonal AL FINAL ─────────────────────────
    if postulante.observacion and "NO ESTA DE ACUERDO CON DESIGNACION" in postulante.observacion.upper():
        c.saveState()
        c.setFont("Helvetica-Bold", 20)  # Reducido tamaño
        c.setFillColor(colors.Color(199/255, 0, 0, alpha=0.4))  # Rojo con transparencia
        
        c.translate(width / 2, height / 2)
        c.rotate(30)
        
        obs_text1 = "OBSERVADO: NO ESTA DE ACUERDO CON LA"
        obs_text2 = "ASIGNACION DE RECINTOS"
        
        c.drawCentredString(0, 30, obs_text1)
        c.drawCentredString(0, 0, obs_text2)
        c.restoreState()

    c.save()
    return filename