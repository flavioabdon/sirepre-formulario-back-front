import os
import json
from datetime import datetime
from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status, views, generics, permissions
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Postulante, Recinto, UploadedFile, ConfiguracionSistema
from .serializers import PostulanteSerializer, RecintoSerializer, UploadedFileSerializer
from .utils import generate_pdf

class FileUploadView(views.APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"success": False, "message": "No se subió ningún archivo."}, status=400)
        
        uploaded_file = UploadedFile.objects.create(file=file_obj)
        return Response({
            "success": True,
            "id": uploaded_file.id,
            "url": uploaded_file.file.url,
            "name": uploaded_file.file.name
        }, status=201)

class RecintoListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    queryset = Recinto.objects.all()
    serializer_class = RecintoSerializer
    pagination_class = None # Return all recintos for the map

class PostulanteCreateView(views.APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        # Verificar si el sistema está activo
        config = ConfiguracionSistema.objects.first()
        if config and not config.sistema_activo:
            return Response({
                "success": False,
                "message": config.mensaje or "El sistema de postulación se ha cerrado."
            }, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        
        # Process requisitos if it comes as a JSON string (as in the Node.js version)
        requisitos_raw = data.get('requisitos')
        if requisitos_raw:
            try:
                if isinstance(requisitos_raw, str):
                    requisitos = json.loads(requisitos_raw)
                elif isinstance(requisitos_raw, list):
                    # Logic from Node.js: if it's an array, it might be keys or JSON strings
                    requisitos = {}
                    for item in requisitos_raw:
                        try:
                            parsed = json.loads(item)
                            requisitos.update(parsed)
                        except:
                            requisitos[item] = True
                else:
                    requisitos = requisitos_raw
                
                # Map booleans
                data['es_boliviano'] = bool(requisitos.get('esBoliviano', False))
                data['registrado_en_padron_electoral'] = bool(requisitos.get('registradoPadronElectoral', False))
                data['ci_vigente'] = bool(requisitos.get('ciVigente', False))
                data['disponibilidad_tiempo_completo'] = bool(requisitos.get('disponibilidadTiempoCompleto', False))
                data['linea_entel'] = bool(requisitos.get('lineaEntel', False))
                data['ninguna_militancia_politica'] = bool(requisitos.get('ningunaMilitanciaPolitica', False))
                data['sin_conflictos_con_la_institucion'] = bool(requisitos.get('sinConflictosInstitucion', False))
                data['sin_sentencia_ejecutoriada'] = bool(requisitos.get('sinSentenciaEjecutoriada', False))
                data['cuenta_con_celular_android'] = bool(requisitos.get('cuentaConCelularAndroid', False))
                data['cuenta_con_powerbank'] = bool(requisitos.get('cuentaConPowerbank', False))
            except Exception as e:
                print(f"Error processing requisitos: {e}")

        # Map file fields from Node.js names to Django model names
        file_mappings = {
            'archivo_ci': 'archivo_ci',
            'archivo_no_militancia': 'archivo_no_militancia',
            'archivo_curriculum': 'archivo_hoja_de_vida',
            'archivo_certificado_ofimatica': 'archivo_certificado_ofimatica'
        }

        # Let's fix the Hoja de Vida name
        if 'archivo_curriculum' in data:
            data['archivo_hoja_de_vida'] = data.pop('archivo_curriculum')
        
        file_fields = ['archivo_ci', 'archivo_no_militancia', 'archivo_hoja_de_vida', 'archivo_certificado_ofimatica']

        for field in file_fields:
            val = data.get(field)
            # If it's a list (QueryDict behavior), take the first element
            if isinstance(val, list):
                val = val[0] if val else None

            # If it's a numeric ID (as string or int), look up the UploadedFile
            if val and not hasattr(val, 'read'):  # Not a file object
                try:
                    file_id = int(str(val).strip())
                    uploaded = UploadedFile.objects.get(id=file_id)
                    data[field] = uploaded.file
                except (UploadedFile.DoesNotExist, ValueError, TypeError):
                    data[field] = None  # If the ID is invalid/missing, set to None
            elif field in request.FILES:
                data[field] = request.FILES[field]

        # Fix specific field names if necessary (e.g. CamelCase to snake_case)
        if 'cedulaIdentidad' in data:
            data['cedula_identidad'] = data['cedulaIdentidad']
        if 'fechaNacimiento' in data:
            data['fecha_nacimiento'] = data['fechaNacimiento']
        if 'apellidoPaterno' in data:
            data['apellido_paterno'] = data['apellidoPaterno']
        if 'apellidoMaterno' in data:
            data['apellido_materno'] = data['apellidoMaterno']
        if 'gradoInstruccion' in data:
            data['grado_instruccion'] = data['gradoInstruccion']
        if 'calleAvenida' in data:
            data['calle_avenida'] = data['calleAvenida']
        if 'numeroDomicilio' in data:
            data['numero_domicilio'] = data['numeroDomicilio']
        if 'experienciaGeneral' in data:
            data['experiencia_general'] = data['experienciaGeneral']
        if 'experienciaEspecifica' in data:
            data['experiencia_especifica'] = data['experienciaEspecifica']
        if 'experienciaProcesosRural' in data:
            data['experiencia_procesos_rural'] = data['experienciaProcesosRural']
        if 'cargoPostulacion' in data:
            data['cargo_postulacion'] = data['cargoPostulacion']
        if 'observacion' in data:
            data['observacion'] = data['observacion']

        # Check for existence
        ci = data.get('cedula_identidad')
        complemento = data.get('complemento')
        if Postulante.objects.filter(cedula_identidad=ci, complemento=complemento).exists():
            return Response({
                "success": False,
                "message": "Ya existe un postulante con esta cédula de identidad y complemento"
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = PostulanteSerializer(data=data)
        if serializer.is_valid():
            postulante = serializer.save()
            
            # Generate PDF
            try:
                pdf_filename = generate_pdf(postulante)
            except Exception as e:
                print(f"Error generating PDF: {e}")
                pdf_filename = None

            return Response({
                "success": True,
                "message": "Postulante registrado exitosamente",
                "id": postulante.id,
                "pdfUrl": f"/api/postulantes/pdf/{postulante.cedula_identidad}/",
                "pdfFilename": pdf_filename,
                "nombreCompleto": f"{postulante.nombre} {postulante.apellido_paterno or ''} {postulante.apellido_materno or ''}"
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            "success": False,
            "message": "Error al registrar postulante",
            "error": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

class VerificarExistenciaView(views.APIView):
    permission_classes = [permissions.AllowAny]
    def get(self, request):
        ci = request.query_params.get('cedula_identidad')
        complemento = request.query_params.get('complemento')

        if not ci:
            return Response({"success": False, "error": "Faltan campos requeridos."}, status=status.HTTP_400_BAD_REQUEST)

        # Complemento can be null or empty string
        if not complemento or complemento == 'null':
            complemento = None

        exists = Postulante.objects.filter(cedula_identidad=ci, complemento=complemento).exists()
        
        if exists:
            return Response({"success": True, "existe": True, "mensaje": "El postulante ya está registrado."})
        else:
            return Response({"success": True, "existe": False, "mensaje": "El postulante no está registrado."})

class ServirPDFView(views.APIView):
    def get(self, request, ci):
        pdf_path = os.path.join(settings.MEDIA_ROOT, 'comprobantes', f'comprobante_{ci}.pdf')
        
        if not os.path.exists(pdf_path):
            raise Http404("PDF no encontrado")

        response = FileResponse(open(pdf_path, 'rb'), content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="comprobante_{ci}.pdf"'
        response['Cache-Control'] = 'public, max-age=3600'
        return response

class ConfiguracionSistemaView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        config = ConfiguracionSistema.objects.first()
        if not config:
            # Si no existe, crear una por defecto
            config = ConfiguracionSistema.objects.create(
                sistema_activo=True,
                mensaje="El sistema de postulación se ha cerrado."
            )
        
        return Response({
            "success": True,
            "sistema_activo": config.sistema_activo,
            "mensaje": config.mensaje
        })

def health_check(request):
    return HttpResponse(
        json.dumps({
            "success": True,
            "message": "Servidor de postulantes funcionando correctamente",
            "timestamp": datetime.now().isoformat()
        }),
        content_type="application/json",
        status=200
    )
