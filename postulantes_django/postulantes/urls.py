from django.urls import path
from .views import PostulanteCreateView, VerificarExistenciaView, ServirPDFView, RecintoListView, FileUploadView, ConfiguracionSistemaView

urlpatterns = [
    path('', PostulanteCreateView.as_view(), name='registrar_postulante'),
    path('existe/', VerificarExistenciaView.as_view(), name='verificar_existencia'),
    path('pdf/<int:ci>/', ServirPDFView.as_view(), name='servir_pdf'),
    path('recintos/', RecintoListView.as_view(), name='listar_recintos'),
    path('upload/', FileUploadView.as_view(), name='subir_archivo'),
    path('status/', ConfiguracionSistemaView.as_view(), name='estado_sistema'),
]
