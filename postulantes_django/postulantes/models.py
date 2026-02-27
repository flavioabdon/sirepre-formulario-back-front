from django.db import models

class Postulante(models.Model):
    EXPEDICION_CHOICES = [
        ('LP', 'La Paz'),
        ('SC', 'Santa Cruz'),
        ('CB', 'Cochabamba'),
        ('OR', 'Oruro'),
        ('CH', 'Chuquisaca'),
        ('BN', 'Beni'),
        ('PT', 'Potosí'),
        ('TJ', 'Tarija'),
        ('PN', 'Pando'),
    ]

    nombre = models.CharField(max_length=250)
    apellido_paterno = models.CharField(max_length=250, blank=True, null=True)
    apellido_materno = models.CharField(max_length=250, blank=True, null=True)
    fecha_nacimiento = models.DateField()
    cedula_identidad = models.IntegerField()
    complemento = models.CharField(max_length=2, blank=True, null=True)
    expedicion = models.CharField(max_length=2, choices=EXPEDICION_CHOICES)
    grado_instruccion = models.CharField(max_length=50, blank=True, null=True)
    carrera = models.CharField(max_length=255, blank=True, null=True, default='NO APLICA')
    
    # Dirección
    ciudad = models.CharField(max_length=100)
    zona = models.CharField(max_length=100)
    calle_avenida = models.CharField(max_length=100)
    numero_domicilio = models.CharField(max_length=10, blank=True, null=True)
    
    # Contacto
    email = models.EmailField(max_length=255)
    telefono = models.IntegerField(blank=True, null=True)
    celular = models.IntegerField()
    
    # Postulación
    cargo_postulacion = models.CharField(max_length=100)
    experiencia_especifica = models.CharField(max_length=24, blank=True, null=True)
    experiencia_general = models.CharField(max_length=24, blank=True, null=True)
    experiencia_procesos_rural = models.CharField(max_length=512, blank=True, null=True)
    observacion = models.TextField(blank=True, null=True, verbose_name="Observación")
    
    # Requisitos (Booleanos)
    es_boliviano = models.BooleanField(default=False)
    registrado_en_padron_electoral = models.BooleanField(default=False)
    ci_vigente = models.BooleanField(default=False)
    disponibilidad_tiempo_completo = models.BooleanField(default=False)
    linea_entel = models.BooleanField(default=False)
    ninguna_militancia_politica = models.BooleanField(default=False)
    sin_conflictos_con_la_institucion = models.BooleanField(default=False)
    sin_sentencia_ejecutoriada = models.BooleanField(default=False)
    cuenta_con_celular_android = models.BooleanField(default=False)
    cuenta_con_powerbank = models.BooleanField(default=False)
    
    # Archivos
    archivo_ci = models.FileField(upload_to='postulantes/ci/', blank=True, null=True)
    archivo_no_militancia = models.FileField(upload_to='postulantes/no_militancia/', blank=True, null=True)
    archivo_hoja_de_vida = models.FileField(upload_to='postulantes/cv/', blank=True, null=True)
    archivo_certificado_ofimatica = models.FileField(upload_to='postulantes/ofimatica/', blank=True, null=True)
    
    # Registro de recintos (Opciones)
    recinto_primera_opcion = models.ForeignKey(
        'Recinto', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='postulantes_primera_opcion',
        verbose_name="Recinto - Primera Opción"
    )
    recinto_segunda_opcion = models.ForeignKey(
        'Recinto', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='postulantes_segunda_opcion',
        verbose_name="Recinto - Segunda Opción"
    )
    
    # Registro automático
    fecha_registro = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nombre} {self.apellido_paterno or ''} {self.apellido_materno or ''} - {self.cedula_identidad}"

    class Meta:
        verbose_name = "Postulante"
        verbose_name_plural = "Postulantes"
        db_table = "postulantes"

class RevisionPostulante(models.Model):
    REVISION_CHOICES = [
        ('NO_REVISADO', 'NO REVISADO'),
        ('CUMPLE', 'CUMPLE'),
        ('NO_CUMPLE', 'NO CUMPLE'),
    ]

    postulante = models.ForeignKey(Postulante, on_delete=models.CASCADE, related_name='revisiones')
    revisado_por = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, verbose_name="Revisado por")
    fecha_revision = models.DateTimeField(auto_now_add=True)

    cumple_experiencia_especifica = models.CharField(
        max_length=20, choices=REVISION_CHOICES, default='NO_REVISADO',
        verbose_name="Cumple Experiencia especifica"
    )
    observaciones_experiencia_especifica = models.TextField(blank=True, null=True, verbose_name="Observaciones Experiencia especifica")

    cumple_no_militancia = models.CharField(
        max_length=20, choices=REVISION_CHOICES, default='NO_REVISADO',
        verbose_name="Cumple No militancia"
    )
    observaciones_no_militancia = models.TextField(blank=True, null=True, verbose_name="Observaciones No militancia")

    cumple_bachiller_o_superior = models.CharField(
        max_length=20, choices=REVISION_CHOICES, default='NO_REVISADO',
        verbose_name="Cumple Bachiller Humanidades o Superior"
    )
    observaciones_bachiller_o_superior = models.TextField(blank=True, null=True, verbose_name="Observaciones Bachiller o Superior")

    def __str__(self):
        return f"Revisión {self.id} - {self.postulante.nombre} ({self.fecha_revision.strftime('%d/%m/%Y %H:%M')})"

    class Meta:
        verbose_name = "Revisión de Postulante"
        verbose_name_plural = "Revisiones de Postulantes"
        ordering = ['-fecha_revision']

class Recinto(models.Model):
    nombre = models.CharField(max_length=500)
    codigo = models.CharField(max_length=100, unique=True)
    departamento = models.CharField(max_length=100)
    provincia = models.CharField(max_length=200)
    municipio = models.CharField(max_length=200)
    asiento = models.CharField(max_length=200)
    zona = models.CharField(max_length=200)
    longitud = models.FloatField(null=True, blank=True)
    latitud = models.FloatField(null=True, blank=True)

    def __str__(self):
        return f"{self.nombre} ({self.codigo})"

    class Meta:
        verbose_name = "Recinto"
        verbose_name_plural = "Recintos"
        db_table = "recintos"
class UploadedFile(models.Model):
    file = models.FileField(upload_to='temp_uploads/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"File {self.id} - {self.file.name}"

class ConfiguracionSistema(models.Model):
    sistema_activo = models.BooleanField(default=True, verbose_name="Sistema Activo")
    mensaje = models.TextField(default="El sistema de postulación se ha cerrado.", verbose_name="Mensaje de Cierre")

    class Meta:
        verbose_name = "Configuración de Sistema"
        verbose_name_plural = "Configuraciones de Sistema"

    def __str__(self):
        return f"Configuración: {'Activo' if self.sistema_activo else 'Inactivo'}"
