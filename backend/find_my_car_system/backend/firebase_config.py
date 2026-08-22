import os
import requests
import firebase_admin
from firebase_admin import credentials, firestore

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICE_ACCOUNT_PATH = os.path.join(BASE_DIR, "serviceAccountKey.json")

class MockDocument:
    def __init__(self, data):
        self._data = data
    def to_dict(self):
        return self._data

class MockQuery:
    def __init__(self, collection_name, filter_field=None, filter_val=None):
        self.collection_name = collection_name
        self.filter_field = filter_field
        self.filter_val = filter_val

    def where(self, field, op, val):
        return MockQuery(self.collection_name, field, val)

    def limit(self, num):
        return self

    def stream(self):
        mock_cars = [
            {
                "uid": "FMJkuneOckVmb4Irb6vsr961oBI3",
                "name": "Pavetran",
                "email": "tp067847@mail.apu.edu.my",
                "student_id": "TP067847",
                "car_model": "Toyota Vios",
                "car_colour": "Grey",
                "car_plate": "AKD 9878",
                "car_plate_search": "AKD9878",
                "is_oku": False,
                "parking_zone": "Zone B",
                "parking_row": "Row 12",
                "parking_slot": "B12-08",
                "image_url": "http://127.0.0.1:5002/static/car_images/AKD9878.jpg",
                "status": "parked",
                "entry_time": "2026-06-26T10:15:00",
                "exit_time": None
            },
            {
                "uid": "Ggo3vrNZdRRUCUHz3OG18VDrd001",
                "name": "Khaillash",
                "email": "tp070452@mail.apu.edu.my",
                "student_id": "TP070452",
                "car_model": "Perodua Bezza",
                "car_colour": "Red",
                "car_plate": "VCG 7127",
                "car_plate_search": "VCG7127",
                "is_oku": False,
                "parking_zone": "Zone A",
                "parking_row": "Row 4",
                "parking_slot": "A04-02",
                "image_url": "http://127.0.0.1:5002/static/car_images/VCG7127.jpg",
                "status": "parked",
                "entry_time": "2026-06-26T11:30:00",
                "exit_time": None
            },
            {
                "uid": "user_vdl2267",
                "name": "Pavetran",
                "email": "tp067847@mail.apu.edu.my",
                "student_id": "TP067847",
                "car_model": "Proton Saga",
                "car_colour": "Blue",
                "car_plate": "VDL 2267",
                "car_plate_search": "VDL2267",
                "is_oku": False,
                "parking_zone": "Zone B",
                "parking_row": "Row 8",
                "parking_slot": "B08-04",
                "image_url": "http://127.0.0.1:5002/static/car_images/VDL2267.jpg",
                "status": "parked",
                "entry_time": "2026-08-17T09:00:00",
                "exit_time": None
            },
            {
                "uid": "user_pfj3043",
                "name": "Kimberly Anne Raj",
                "email": "tp272727@mail.apu.edu.my",
                "student_id": "TP272727",
                "car_model": "Myvi GT",
                "car_colour": "White",
                "car_plate": "PFJ 3043",
                "car_plate_search": "PFJ3043",
                "is_oku": True,
                "parking_zone": "Zone A",
                "parking_row": "Row 1",
                "parking_slot": "A01-01",
                "image_url": "http://127.0.0.1:5002/static/car_images/PFJ3043.jpg",
                "status": "parked",
                "entry_time": "2026-08-17T08:30:00",
                "exit_time": None
            }
        ]

        try:
            url = f"https://firestore.googleapis.com/v1/projects/smartpark-ai-web/databases/(default)/documents/{self.collection_name}"
            res = requests.get(url, timeout=2)
            if res.status_code == 200:
                docs = res.json().get("documents", [])
                results = []
                for d in docs:
                    fields = d.get("fields", {})
                    parsed = {}
                    for k, v in fields.items():
                        parsed[k] = list(v.values())[0] if v else None
                    if self.filter_field and self.filter_val:
                        if parsed.get(self.filter_field) == self.filter_val:
                            results.append(MockDocument(parsed))
                    else:
                        results.append(MockDocument(parsed))
                if results:
                    return results
        except Exception:
            pass

        results = []
        for car in mock_cars:
            if self.filter_field and self.filter_val:
                if car.get(self.filter_field) == self.filter_val:
                    results.append(MockDocument(car))
            else:
                results.append(MockDocument(car))
        return results

class MockCollection:
    def __init__(self, collection_name):
        self.collection_name = collection_name
    def where(self, field, op, val):
        return MockQuery(self.collection_name, field, val)
    def stream(self):
        return MockQuery(self.collection_name).stream()

class MockFirestoreDB:
    def collection(self, collection_name):
        return MockCollection(collection_name)

db = None
if os.path.exists(SERVICE_ACCOUNT_PATH):
    try:
        cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        db = firestore.client()
    except Exception:
        db = MockFirestoreDB()
else:
    db = MockFirestoreDB()