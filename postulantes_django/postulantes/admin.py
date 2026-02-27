from django.http import HttpResponse
from openpyxl import Workbook
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.contrib import admin
from .models import Postulante, Recinto, RevisionPostulante, ConfiguracionSistema

class RevisionPostulanteInline(admin.TabularInline):
    model = RevisionPostulante
    extra = 1
    fields = (
        'revisado_por', 
        'cumple_experiencia_especifica', 
        'cumple_no_militancia', 
        'cumple_bachiller_o_superior', 
        'fecha_revision'
    )
    readonly_fields = ('fecha_revision',)

@admin.register(Postulante)
class PostulanteAdmin(admin.ModelAdmin):
    list_display = (
        'nombre_completo', 
        'cedula_identidad', 
        'total_revisiones',
        'estado_revision',
        'fecha_registro'
    )
    search_fields = ('nombre', 'apellido_paterno', 'apellido_materno', 'cedula_identidad')
    list_filter = (
        'fecha_registro', 
        'expedicion'
    )
    readonly_fields = ('fecha_registro', 'ver_archivo_ci', 'ver_archivo_no_militancia', 'ver_archivo_hoja_de_vida', 'ver_archivo_certificado_ofimatica')
    inlines = [RevisionPostulanteInline]
    actions = ['exportar_a_excel']

    def exportar_a_excel(self, request, queryset):
        wb = Workbook()
        ws = wb.active
        ws.title = "Postulantes y Revisiones"

        # Encabezados
        headers = [
            'ID', 'Nombre', 'Apellido Paterno', 'Apellido Materno', 'CI', 'Exp',
            'Celular', 'Email', 'Cargo Postulación', 'Fecha Registro',
            'Recinto 1ra Opción', 'Recinto 2da Opción',
            'Revisiones Totales', 'Último Estado',
            'Cumple Exp. Específica', 'Cumple No Militancia', 'Cumple Bachiller',
            'Revisado Por', 'Fecha Última Revisión'
        ]
        ws.append(headers)

        for obj in queryset:
            last_rev = obj.revisiones.first()
            
            # Determinar estado
            estado = "Sin revisión"
            cumple_exp = "-"
            cumple_mil = "-"
            cumple_bac = "-"
            revisado_por = "-"
            fecha_rev = "-"

            if last_rev:
                cumple_all = (
                    last_rev.cumple_experiencia_especifica == 'CUMPLE' and 
                    last_rev.cumple_no_militancia == 'CUMPLE' and 
                    last_rev.cumple_bachiller_o_superior == 'CUMPLE'
                )
                estado = "CUMPLE TODO" if cumple_all else "CON OBSERVACIONES"
                cumple_exp = last_rev.get_cumple_experiencia_especifica_display()
                cumple_mil = last_rev.get_cumple_no_militancia_display()
                cumple_bac = last_rev.get_cumple_bachiller_o_superior_display()
                revisado_por = last_rev.revisado_por.get_full_name() or last_rev.revisado_por.username if last_rev.revisado_por else "Sistema"
                fecha_rev = last_rev.fecha_revision.strftime('%d/%m/%Y %H:%M')

            row = [
                obj.id, obj.nombre, obj.apellido_paterno, obj.apellido_materno, obj.cedula_identidad, obj.expedicion,
                obj.celular, obj.email, obj.cargo_postulacion, obj.fecha_registro.strftime('%d/%m/%Y %H:%M'),
                str(obj.recinto_primera_opcion) if obj.recinto_primera_opcion else "N/A",
                str(obj.recinto_segunda_opcion) if obj.recinto_segunda_opcion else "N/A",
                obj.revisiones.count(),
                estado,
                cumple_exp, cumple_mil, cumple_bac,
                revisado_por, fecha_rev
            ]
            ws.append(row)


        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename=postulantes_revisiones.xlsx'
        wb.save(response)
        return response

    exportar_a_excel.short_description = "Exportar seleccionados a Excel"


    fieldsets = (
        ('Información Personal', {
            'fields': (
                ('nombre', 'apellido_paterno', 'apellido_materno'),
                ('cedula_identidad', 'complemento', 'expedicion'),
                'fecha_nacimiento',
                'grado_instruccion',
                'carrera',
            )
        }),
        ('Dirección y Contacto', {
            'fields': (
                ('ciudad', 'zona'),
                ('calle_avenida', 'numero_domicilio'),
                ('email', 'telefono', 'celular'),
            )
        }),
        ('Postulación y Experiencia', {
            'fields': (
                'cargo_postulacion',
                'experiencia_general',
                'experiencia_especifica',
                'experiencia_procesos_rural',
                ('recinto_primera_opcion', 'recinto_segunda_opcion'),
            )
        }),
        ('Documentación (Archivos)', {
            'fields': (
                ('archivo_ci', 'ver_archivo_ci'),
                ('archivo_no_militancia', 'ver_archivo_no_militancia'),
                ('archivo_hoja_de_vida', 'ver_archivo_hoja_de_vida'),
                ('archivo_certificado_ofimatica', 'ver_archivo_certificado_ofimatica'),
            )
        }),
        ('Metadatos', {
            'fields': ('fecha_registro',),
            'classes': ('collapse',),
        }),
    )

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)
        for instance in instances:
            if isinstance(instance, RevisionPostulante) and not instance.revisado_por:
                instance.revisado_por = request.user
            instance.save()
        formset.save_m2m()

    def nombre_completo(self, obj):
        return f"{obj.nombre} {obj.apellido_paterno or ''} {obj.apellido_materno or ''}"
    nombre_completo.short_description = 'Nombre Completo'

    def total_revisiones(self, obj):
        return obj.revisiones.count()
    total_revisiones.short_description = 'Revisiones'

    def estado_revision(self, obj):
        last = obj.revisiones.first()
        if not last:
            return mark_safe('<span style="color: grey;">⚪ Sin revisión</span>')

        
        cumple_all = (
            last.cumple_experiencia_especifica == 'CUMPLE' and 
            last.cumple_no_militancia == 'CUMPLE' and 
            last.cumple_bachiller_o_superior == 'CUMPLE'
        )
        
        if cumple_all:
            return mark_safe('<span style="color: green;">✅ CUMPLE TODO</span>')

        
        return mark_safe('<span style="color: orange;">⚠️ CON OBSERVACIONES</span>')

    estado_revision.short_description = 'Estado Actual'

    def ver_archivo_ci(self, obj):
        if obj.archivo_ci:
            return format_html('<a href="{}" target="_blank">📄 Ver CI</a>', obj.archivo_ci.url)
        return "No cargado"
    ver_archivo_ci.short_description = 'Enlace CI'

    def ver_archivo_no_militancia(self, obj):
        if obj.archivo_no_militancia:
            return format_html('<a href="{}" target="_blank">📄 Ver No Militancia</a>', obj.archivo_no_militancia.url)
        return "No cargado"
    ver_archivo_no_militancia.short_description = 'Enlace No Militancia'

    def ver_archivo_hoja_de_vida(self, obj):
        if obj.archivo_hoja_de_vida:
            return format_html('<a href="{}" target="_blank">📄 Ver CV</a>', obj.archivo_hoja_de_vida.url)
        return "No cargado"
    ver_archivo_hoja_de_vida.short_description = 'Enlace CV'

    def ver_archivo_certificado_ofimatica(self, obj):
        if obj.archivo_certificado_ofimatica:
            return format_html('<a href="{}" target="_blank">📄 Ver Certificado</a>', obj.archivo_certificado_ofimatica.url)
        return "No cargado"
    ver_archivo_certificado_ofimatica.short_description = 'Enlace Certificado'

@admin.register(RevisionPostulante)
class RevisionPostulanteAdmin(admin.ModelAdmin):
    list_display = ('postulante', 'revisado_por', 'fecha_revision', 'cumple_experiencia_especifica', 'cumple_no_militancia', 'cumple_bachiller_o_superior')
    list_filter = ('fecha_revision', 'revisado_por')

@admin.register(Recinto)
class RecintoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'codigo', 'departamento', 'provincia', 'municipio', 'zona')
    search_fields = ('nombre', 'codigo', 'municipio', 'zona')
    list_filter = ('departamento',)

@admin.register(ConfiguracionSistema)
class ConfiguracionSistemaAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'sistema_activo', 'mensaje')
    
    def has_add_permission(self, request):
        # Limitar a una sola instancia
        if self.model.objects.exists():
            return False
        return True
