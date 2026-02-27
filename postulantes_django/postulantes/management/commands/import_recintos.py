import csv
import os
from django.core.management.base import BaseCommand
from postulantes.models import Recinto

class Command(BaseCommand):
    help = 'Import recintos from CSV'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Path to the CSV file')

    def handle(self, *args, **options):
        csv_path = options['csv_file']
        if not os.path.exists(csv_path):
            self.stderr.write(self.style.ERROR(f'File "{csv_path}" does not exist'))
            return

        with open(csv_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            count = 0
            for row in reader:
                try:
                    # Parse float values, handling empty or malformed strings
                    try:
                        longitud = float(row['Longitud']) if row['Longitud'] else None
                    except ValueError:
                        longitud = None
                        
                    try:
                        latitud = float(row['Latitud']) if row['Latitud'] else None
                    except ValueError:
                        latitud = None

                    Recinto.objects.update_or_create(
                        codigo=row['Código'],
                        defaults={
                            'nombre': row['Nombre'],
                            'departamento': row['Departamento'],
                            'provincia': row['Provincia'],
                            'municipio': row['Municipio'],
                            'asiento': row['Asiento'],
                            'zona': row['Zona'],
                            'longitud': longitud,
                            'latitud': latitud,
                        }
                    )
                    count += 1
                except Exception as e:
                    self.stderr.write(self.style.ERROR(f'Error importing row {row.get("Código", "unknown")}: {e}'))

        self.stdout.write(self.style.SUCCESS(f'Successfully imported {count} recintos'))
