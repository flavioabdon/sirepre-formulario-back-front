import os
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.utils import simpleSplit
from django.conf import settings
from datetime import datetime
import qrcode

# ─── Paleta institucional ─────────────────────────────────────────────────────
COLOR_PRIMARY   = colors.HexColor("#003A70")
COLOR_ACCENT    = colors.HexColor("#C8102E")
COLOR_GOLD      = colors.HexColor("#F0A500")
COLOR_LIGHT_BG  = colors.HexColor("#EEF2F7")
COLOR_CHECK_BG  = colors.HexColor("#F0FFF4")   # fondo checkboxes OK
COLOR_LABEL     = colors.HexColor("#2C3E50")   # Darker for better contrast
COLOR_VALUE     = colors.HexColor("#1A1A1A")
COLOR_WHITE     = colors.white
COLOR_BORDER    = colors.HexColor("#95A5A6")
COLOR_GREEN     = colors.HexColor("#1B5E20")  # Darker green
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
    qr.add_data(str(qr_data))
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
    # Usamos un rango amplio para cubrir la inclinación
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
    # ALTURA DEL PIE DE PÁGINA (fijo) — definido primero para saber
    # cuánto espacio disponible tenemos en el contenido
    # ══════════════════════════════════════════════════════════════════════
    footer_base   = margin - 15
    id_y          = footer_base
    firma_label_y = id_y + 20
    nombre_y      = firma_label_y + 15
    firma_line_y  = nombre_y + 16
    firma_space_y = firma_line_y + 42

    decl_text = (
        "Yo, el/la postulante, declaro que toda la información consignada "
        "en el presente formulario es veraz, completa y fidedigna. Acepto que cualquier dato "
        "falso, incompleto o alterado será motivo de inhabilitación automática e irrevocable "
        "de mi postulación. Asimismo, manifiesto mi conformidad con la asignación de "
        "recintos electorales de acuerdo a requerimiento del SERECI La Paz."
    )
    max_w         = width - margin * 2
    decl_lines    = simpleSplit(decl_text, "Helvetica-Oblique", 8, max_w)
    decl_line_h   = 11
    decl_block_h  = len(decl_lines) * decl_line_h + 6
    sep_y         = firma_space_y + decl_block_h + 10
    footer_top    = sep_y + 6          # límite superior del pie de página

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
    # 3. HELPERS
    # ══════════════════════════════════════════════════════════════════════
    y_pos      = [banner_y - 25] # Espacio tras el banner
    line_h     = 15
    label_w    = 160
    col2_x     = margin + label_w

    def draw_section_header(title):
        sec_x       = margin
        total_w     = width - margin * 2
        header_h_   = 28 # Increased

        c.setFillColor(COLOR_PRIMARY)
        c.rect(sec_x, y_pos[0], total_w, header_h_, fill=1, stroke=0)
        c.setFillColor(COLOR_GOLD)
        c.rect(sec_x, y_pos[0], 6, header_h_, fill=1, stroke=0)
        c.setFillColor(COLOR_WHITE)
        c.setFont("Helvetica-Bold", 10.5)
        c.drawString(sec_x + 14, y_pos[0] + 9, title)
        y_pos[0] += header_h_

    def draw_fields(fields, cols=2):
        """
        fields: list of (label, value).
        """
        total_w = width - margin * 2
        col_w = total_w / cols
        row_h_fields = 18 # Increased from 18

        for i in range(0, len(fields), cols):
            row_y = y_pos[0] - row_h_fields
            # Background
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
                c.setFont("Helvetica-Bold", 9.5)
                c.setFillColor(COLOR_LABEL)
                c.drawString(cell_x + 8, row_y + 7, f"{label}:")
                
                # Value
                label_width = c.stringWidth(f"{label}:", "Helvetica-Bold", 9.5)
                c.setFont("Helvetica", 9.5)
                c.setFillColor(COLOR_VALUE)
                val_str = str(value).strip() if value else "—"
                
                max_val_w = col_w - label_width - 16
                while c.stringWidth(val_str, "Helvetica", 9.5) > max_val_w and len(val_str) > 3:
                    val_str = val_str[:-4] + "..."
                c.drawString(cell_x + label_width + 14, row_y + 7, val_str) # Aumentado el espacio tras los :

            y_pos[0] = row_y

        y_pos[0] -= 12

    def draw_bool_section(title, items):
        total_w = width - margin * 2
        hdr_h   = 28
        c.setFillColor(COLOR_PRIMARY)
        c.rect(margin, y_pos[0], total_w, hdr_h, fill=1, stroke=0)
        c.setFillColor(COLOR_GOLD)
        c.rect(margin, y_pos[0], 6, hdr_h, fill=1, stroke=0)
        c.setFillColor(COLOR_WHITE)
        c.setFont("Helvetica-Bold", 10.5)
        c.drawString(margin + 14, y_pos[0] + 9, title)
        y_pos[0] += hdr_h

        cols    = 2
        col_w   = total_w / cols
        row_h_bool = 20 # Increased from 20
        for i, (label, val) in enumerate(items):
            if i % cols == 0:
                row_top = y_pos[0] - row_h_bool
                c.setFillColor(COLOR_LIGHT_BG if (i // cols) % 2 == 0 else COLOR_WHITE)
                c.setStrokeColor(COLOR_BORDER)
                c.setLineWidth(0.3)
                c.rect(margin, row_top, total_w, row_h_bool, fill=1, stroke=1)

            col_idx = i % cols
            cell_x  = margin + col_idx * col_w

            # Square with symbol
            sym_color = COLOR_GREEN if val else COLOR_RED
            c.setStrokeColor(sym_color)
            c.setLineWidth(1.2)
            c.rect(cell_x + 8, y_pos[0] - row_h_bool + 7, 11, 11, fill=0, stroke=1)
            
            c.setFont("Helvetica-Bold", 9)
            c.setFillColor(sym_color)
            if val:
                # Draw a larger checkmark
                p = c.beginPath()
                p.moveTo(cell_x + 9, y_pos[0] - row_h_bool + 13)
                p.lineTo(cell_x + 13, y_pos[0] - row_h_bool + 8)
                p.lineTo(cell_x + 18, y_pos[0] - row_h_bool + 17)
                c.setLineWidth(1.5)
                c.drawPath(p, stroke=1, fill=0)
            else:
                # Draw a larger X
                c.setLineWidth(1.5)
                c.line(cell_x + 10, y_pos[0] - row_h_bool + 8, cell_x + 17, y_pos[0] - row_h_bool + 17)
                c.line(cell_x + 10, y_pos[0] - row_h_bool + 17, cell_x + 17, y_pos[0] - row_h_bool + 8)

            c.setFont("Helvetica", 10)
            c.setFillColor(COLOR_VALUE)
            c.drawString(cell_x + 28, y_pos[0] - row_h_bool + 8, label)

            if (i + 1) % cols == 0 or i == len(items) - 1:
                y_pos[0] -= row_h_bool

        y_pos[0] -= 12

    # ══════════════════════════════════════════════════════════════════════
    # 4. SECCIONES
    # ══════════════════════════════════════════════════════════════════════

    # ── § Datos Personales ────────────────────────────────────────────────
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

    # ── § Instrucción Académica ───────────────────────────────────────────
    instruccion = [
        ("Instrucción", postulante.grado_instruccion or "—"),
        ("Carrera",      postulante.carrera or "—"),
    ]
    draw_fields(instruccion, cols=2)

    # ── § Domicilio ────────────────────────────────────────────────────────
    domicilio = [
        ("Ciudad / Loc.",  postulante.ciudad),
        ("Zona / Barrio",  postulante.zona),
        ("Calle / Av.",    postulante.calle_avenida),
        ("Nro.",           postulante.numero_domicilio),
    ]
    draw_section_header("II. DIRECCIÓN Y CONTACTO")
    draw_fields(domicilio, cols=2)

    # ── § Contacto ────────────────────────────────────────────────────────
    contacto = [
        ("Email",            postulante.email),
        ("Celular",          str(postulante.celular) if postulante.celular else "—"),
        ("Cel. Respaldo",    str(postulante.telefono) if postulante.telefono else "—"),
    ]
    draw_fields(contacto, cols=2)

    # ── § Postulación ─────────────────────────────────────────────────────
    postulacion = [
        ("Cargo",           postulante.cargo_postulacion),
        ("Experiencia",     "SI" if postulante.experiencia_general == "SI" else "NO"),
        ("Nro. Procesos",   postulante.experiencia_especifica or "0"),
        ("Exp. Rural",      postulante.experiencia_procesos_rural or "—"),
    ]
    draw_section_header("III. DATOS DE LA POSTULACIÓN Y RECINTO")
    draw_fields(postulacion, cols=2)

    # ── § Recinto Electoral ───────────────────────────────────────────────
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

    # ── § Documentos Adjuntos ─────────────────────────────────────────────
    docs = [
        ("CI",                "ADJUNTO" if postulante.archivo_ci else "NO ADJUNTO"),
        ("No Militancia",     "ADJUNTO" if postulante.archivo_no_militancia else "NO ADJUNTO"),
        ("Hoja de Vida",      "ADJUNTO" if postulante.archivo_hoja_de_vida else "NO ADJUNTO"),
        ("Certificado Exp.",  "ADJUNTO" if postulante.archivo_certificado_ofimatica else "NO ADJUNTO (OPCIONAL)"),
    ]
    draw_section_header("IV. REQUISITOS Y DOCUMENTOS")
    draw_fields(docs, cols=2)

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

    # ── § Observación (si el postulante no acordó con designación) ────────
    if postulante.observacion:
        draw_section_header("⚠  OBSERVACIÓN")
        draw_fields([("Observación", postulante.observacion)], cols=1)

    # ══════════════════════════════════════════════════════════════════════
    # 5. PIE DE PÁGINA FIJO
    # ══════════════════════════════════════════════════════════════════════

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
    decl_y = firma_space_y + (len(decl_lines) - 1) * decl_line_h
    c.setFont("Helvetica-Oblique", 8)
    c.setFillColor(COLOR_VALUE)
    for line in decl_lines:
        c.drawString(margin, decl_y, line)
        decl_y -= decl_line_h

    # Área de firma
    firma_cx     = width / 2
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
    c.drawString(margin, id_y,
                 f"Nro. de registro: {postulante.cedula_identidad}-{ts}")
    c.drawRightString(width - margin, id_y,
                      "Documento generado electrónicamente")

    # ── Rótulo de observación diagonal AL FINAL (encima de todo) ─────────
    if postulante.observacion and "NO ESTA DE ACUERDO CON DESIGNACION" in postulante.observacion.upper():
        c.saveState()
        # Usamos una fuente grande y color rojo sólido
        c.setFont("Helvetica-Bold", 24)
        c.setFillColor(colors.red)
        # Posición central para rotar
        c.translate(width / 2, height / 2)
        c.rotate(30) # Ángulo diagonal
        
        obs_text1 = "OBSERVADO: NO ESTA DE ACUERDO CON LA"
        obs_text2 = "ASIGNACION DE RECINTOS DE TRANSMISION DE ACUERDO A REQUERIMIENTOS"
        
        # Dibujamos sin transparencia para que esté SOBRE el formulario
        c.drawCentredString(0, 30, obs_text1)
        c.drawCentredString(0, -10, obs_text2)
        c.restoreState()

    c.save()
    return filename
