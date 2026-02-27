from rest_framework import serializers
from .models import Postulante, Recinto, UploadedFile

class PostulanteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Postulante
        fields = '__all__'

class RecintoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recinto
        fields = '__all__'

class UploadedFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadedFile
        fields = '__all__'
