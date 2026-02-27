# SIREPRE Backend (Django)

Este es el backend reescrito en Django para el sistema de postulación SIREPRE.

## Requisitos

- Python 3.13+
- Django 6.0+
- Django REST Framework
- ReportLab (para generación de PDF)
- QRCode (para generación de códigos QR)

## Instalación

1. Crear un entorno virtual:
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```

2. Instalar dependencias:
   ```bash
   pip install django djangorestframework django-cors-headers reportlab qrcode pillow psycopg2-binary
   ```

3. Ejecutar migraciones:
   ```bash
   python manage.py migrate
   ```

4. Crear un superusuario (opcional, para el admin):
   ```bash
   python manage.py createsuperuser
   ```

5. Iniciar el servidor:
   ```bash
   python manage.py runserver
   ```

## Endpoints de API

- `POST /api/postulantes/`: Registrar un nuevo postulante.
- `GET /api/postulantes/existe`: Verificar si un postulante ya está registrado (parámetros: `cedula_identidad`, `complemento`).
- `GET /api/postulantes/pdf/<ci>`: Descargar el comprobante PDF.

## Configuración del Frontend

Asegúrese de que el frontend (React) apunte a `http://localhost:8000` o configure un proxy en Vite.
