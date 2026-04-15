import datetime
import json
import os
import sqlite3
from functools import wraps

from flask import Flask, jsonify, redirect, request, send_from_directory, session

try:
    from flask_cors import CORS
    FLASK_CORS_AVAILABLE = True
except ImportError:
    FLASK_CORS_AVAILABLE = False

BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, 'data')
DIST_DIR = os.path.join(BASE_DIR, 'dist')
DATABASE_PATH = os.path.join(DATA_DIR, 'agendamentos_app.db')
PROFESSIONALS_PATH = os.path.join(DATA_DIR, 'professionals.json')
APPOINTMENTS_PATH = os.path.join(DATA_DIR, 'appointments.json')

app = Flask(__name__, static_folder=os.path.join(DIST_DIR, 'assets'))
if FLASK_CORS_AVAILABLE:
    CORS(app, supports_credentials=True)
app.secret_key = 'super_secret_vita_nova_key_123'

# Admin credentials
ADMIN_USERNAME = 'admin'
ADMIN_PASSWORD = 'admin'

def get_db_connection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute('PRAGMA foreign_keys = ON')
    connection.execute('PRAGMA journal_mode = MEMORY')
    connection.execute('PRAGMA synchronous = OFF')
    return connection


def load_json_data(file_path):
    if not os.path.exists(file_path):
        return []

    with open(file_path, 'r', encoding='utf-8') as file:
        return json.load(file)


def normalize_professional(row, availability):
    return {
        'id': row['id'],
        'name': row['name'],
        'specialty': row['specialty'],
        'description': row['description'],
        'image': row['image'],
        'availability': availability,
    }


def normalize_appointment(row):
    return {
        'id': row['id'],
        'professionalId': row['professional_id'],
        'doctor': row['doctor'],
        'specialty': row['specialty'],
        'date': row['appointment_date'],
        'time': row['appointment_time'],
        'patientName': row['patient_name'],
        'cpf': row['cpf'],
        'createdAt': row['created_at'],
    }


def init_db():
    os.makedirs(DATA_DIR, exist_ok=True)

    with get_db_connection() as connection:
        connection.execute(
            '''
            CREATE TABLE IF NOT EXISTS professionals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                specialty TEXT NOT NULL,
                description TEXT NOT NULL,
                image TEXT NOT NULL DEFAULT 'doctor.png'
            )
            '''
        )
        connection.execute(
            '''
            CREATE TABLE IF NOT EXISTS professional_availability (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                professional_id INTEGER NOT NULL,
                time TEXT NOT NULL,
                FOREIGN KEY (professional_id) REFERENCES professionals (id) ON DELETE CASCADE
            )
            '''
        )
        connection.execute(
            '''
            CREATE TABLE IF NOT EXISTS appointments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                professional_id INTEGER,
                doctor TEXT NOT NULL,
                specialty TEXT NOT NULL,
                appointment_date TEXT,
                appointment_time TEXT NOT NULL,
                patient_name TEXT NOT NULL,
                cpf TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (professional_id) REFERENCES professionals (id)
            )
            '''
        )

        professionals_count = connection.execute('SELECT COUNT(*) FROM professionals').fetchone()[0]
        if professionals_count == 0:
            professionals = load_json_data(PROFESSIONALS_PATH)
            for professional in professionals:
                cursor = connection.execute(
                    '''
                    INSERT INTO professionals (id, name, specialty, description, image)
                    VALUES (?, ?, ?, ?, ?)
                    ''',
                    (
                        professional.get('id'),
                        professional.get('name', ''),
                        professional.get('specialty', ''),
                        professional.get('description', ''),
                        professional.get('image', 'doctor.png'),
                    ),
                )
                professional_id = professional.get('id') or cursor.lastrowid
                availability_rows = [
                    (professional_id, time)
                    for time in professional.get('availability', [])
                    if time
                ]
                if availability_rows:
                    connection.executemany(
                        '''
                        INSERT INTO professional_availability (professional_id, time)
                        VALUES (?, ?)
                        ''',
                        availability_rows,
                    )

        appointments_count = connection.execute('SELECT COUNT(*) FROM appointments').fetchone()[0]
        if appointments_count == 0:
            appointments = load_json_data(APPOINTMENTS_PATH)
            for appointment in appointments:
                connection.execute(
                    '''
                    INSERT INTO appointments (
                        id,
                        professional_id,
                        doctor,
                        specialty,
                        appointment_date,
                        appointment_time,
                        patient_name,
                        cpf,
                        created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''',
                    (
                        appointment.get('id'),
                        appointment.get('professionalId'),
                        appointment.get('doctor', ''),
                        appointment.get('specialty', ''),
                        appointment.get('date'),
                        appointment.get('time', ''),
                        appointment.get('patientName', ''),
                        appointment.get('cpf', ''),
                        appointment.get('createdAt') or datetime.datetime.now().isoformat(),
                    ),
                )

        connection.commit()


def fetch_professionals():
    with get_db_connection() as connection:
        professional_rows = connection.execute(
            '''
            SELECT id, name, specialty, description, image
            FROM professionals
            ORDER BY name
            '''
        ).fetchall()

        availability_rows = connection.execute(
            '''
            SELECT professional_id, time
            FROM professional_availability
            ORDER BY time
            '''
        ).fetchall()

    availability_by_professional = {}
    for row in availability_rows:
        availability_by_professional.setdefault(row['professional_id'], []).append(row['time'])

    return [
        normalize_professional(row, availability_by_professional.get(row['id'], []))
        for row in professional_rows
    ]


def fetch_appointments(cpf=None):
    query = '''
        SELECT
            id,
            professional_id,
            doctor,
            specialty,
            appointment_date,
            appointment_time,
            patient_name,
            cpf,
            created_at
        FROM appointments
    '''
    params = []
    if cpf:
        query += ' WHERE cpf = ?'
        params.append(cpf)

    query += ' ORDER BY COALESCE(appointment_date, "9999-12-31"), appointment_time, id'

    with get_db_connection() as connection:
        rows = connection.execute(query, params).fetchall()

    return [normalize_appointment(row) for row in rows]


def find_professional_by_id(professional_id):
    with get_db_connection() as connection:
        row = connection.execute(
            '''
            SELECT id, name, specialty, description, image
            FROM professionals
            WHERE id = ?
            ''',
            (professional_id,),
        ).fetchone()

        if not row:
            return None

        availability_rows = connection.execute(
            '''
            SELECT time
            FROM professional_availability
            WHERE professional_id = ?
            ORDER BY time
            ''',
            (professional_id,),
        ).fetchall()

    availability = [item['time'] for item in availability_rows]
    return normalize_professional(row, availability)


def find_professional_by_identity(name, specialty):
    with get_db_connection() as connection:
        row = connection.execute(
            '''
            SELECT id
            FROM professionals
            WHERE name = ? AND specialty = ?
            ''',
            (name, specialty),
        ).fetchone()

    if not row:
        return None

    return find_professional_by_id(row['id'])


def prepare_appointment_payload(payload):
    normalized_payload = {
        key: value.strip() if isinstance(value, str) else value
        for key, value in dict(payload).items()
    }
    if not normalized_payload.get('date'):
        normalized_payload['date'] = datetime.date.today().isoformat()

    professional = None
    professional_id = normalized_payload.get('professionalId')
    if professional_id not in (None, ''):
        try:
            professional = find_professional_by_id(int(professional_id))
        except (TypeError, ValueError):
            professional = None

    if professional:
        normalized_payload['professionalId'] = professional['id']
        normalized_payload['doctor'] = professional['name']
        normalized_payload['specialty'] = professional['specialty']

    if not professional and not normalized_payload.get('professionalId') and normalized_payload.get('doctor') and normalized_payload.get('specialty'):
        professional = find_professional_by_identity(
            normalized_payload.get('doctor'),
            normalized_payload.get('specialty'),
        )
        if professional:
            normalized_payload['professionalId'] = professional['id']
            normalized_payload['doctor'] = professional['name']
            normalized_payload['specialty'] = professional['specialty']

    return normalized_payload


def validate_appointment_payload(payload):
    required_fields = ['professionalId', 'doctor', 'specialty', 'date', 'time', 'patientName', 'cpf']
    missing_fields = [field for field in required_fields if not payload.get(field)]
    if missing_fields:
        return f'Campos obrigatorios ausentes: {", ".join(missing_fields)}'

    try:
        datetime.date.fromisoformat(payload['date'])
    except ValueError:
        return 'Data do agendamento invalida.'

    try:
        datetime.datetime.strptime(payload['time'], '%H:%M')
    except ValueError:
        return 'Horario do agendamento invalido.'

    return None


def appointment_conflict_exists(professional_id, appointment_date, appointment_time):
    with get_db_connection() as connection:
        row = connection.execute(
            '''
            SELECT id
            FROM appointments
            WHERE professional_id = ?
              AND appointment_date = ?
              AND appointment_time = ?
            ''',
            (professional_id, appointment_date, appointment_time),
        ).fetchone()
    return row is not None


init_db()


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_logged_in' not in session:
            return redirect('/admin/login')
        return f(*args, **kwargs)

    return decorated_function


def admin_api_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_logged_in' not in session:
            return jsonify({'message': 'Nao autorizado'}), 401
        return f(*args, **kwargs)

    return decorated_function


@app.route('/api/professionals', methods=['GET'])
def get_professionals():
    return jsonify(fetch_professionals())


@app.route('/api/appointments', methods=['GET', 'POST'])
def handle_appointments():
    if request.method == 'POST':
        new_appointment = prepare_appointment_payload(request.get_json(silent=True) or {})
        validation_error = validate_appointment_payload(new_appointment)
        if validation_error:
            return jsonify({'message': validation_error}), 400

        try:
            professional_id = int(new_appointment.get('professionalId'))
        except (TypeError, ValueError):
            return jsonify({'message': 'Profissional invalido.'}), 400

        professional = find_professional_by_id(professional_id)
        if not professional:
            return jsonify({'message': 'Profissional nao encontrado.'}), 404

        if professional['name'] != new_appointment.get('doctor') or professional['specialty'] != new_appointment.get('specialty'):
            return jsonify({'message': 'Os dados do profissional nao conferem.'}), 400

        if new_appointment.get('time') not in professional['availability']:
            return jsonify({'message': 'Este horario nao esta disponivel para o profissional selecionado.'}), 400

        if appointment_conflict_exists(professional['id'], new_appointment['date'], new_appointment['time']):
            return jsonify({'message': 'Este horario ja foi reservado para a data escolhida.'}), 409

        created_at = datetime.datetime.now().isoformat()

        with get_db_connection() as connection:
            cursor = connection.execute(
                '''
                INSERT INTO appointments (
                    professional_id,
                    doctor,
                    specialty,
                    appointment_date,
                    appointment_time,
                    patient_name,
                    cpf,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    professional['id'],
                    new_appointment['doctor'],
                    new_appointment['specialty'],
                    new_appointment['date'],
                    new_appointment['time'],
                    new_appointment['patientName'],
                    new_appointment['cpf'],
                    created_at,
                ),
            )
            appointment_id = cursor.lastrowid
            connection.commit()

        saved_appointment = {
            'id': appointment_id,
            'professionalId': professional['id'],
            'doctor': new_appointment['doctor'],
            'specialty': new_appointment['specialty'],
            'date': new_appointment['date'],
            'time': new_appointment['time'],
            'patientName': new_appointment['patientName'],
            'cpf': new_appointment['cpf'],
            'createdAt': created_at,
        }

        return jsonify({'message': 'Agendamento realizado com sucesso!', 'appointment': saved_appointment}), 201

    cpf = request.args.get('cpf')
    return jsonify(fetch_appointments(cpf=cpf))


@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    payload = request.get_json(silent=True) or {}
    username = payload.get('username', '')
    password = payload.get('password', '')

    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        session['admin_logged_in'] = True
        return jsonify({'message': 'Login realizado com sucesso'})

    return jsonify({'message': 'Credenciais invalidas'}), 401


@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    session.pop('admin_logged_in', None)
    return jsonify({'message': 'Logout realizado com sucesso'})


@app.route('/api/admin/session', methods=['GET'])
def admin_session():
    return jsonify({'authenticated': 'admin_logged_in' in session})


@app.route('/api/admin/dashboard', methods=['GET'])
@admin_api_required
def admin_dashboard():
    return jsonify({
        'storage': 'local_sqlite',
        'cors_available': FLASK_CORS_AVAILABLE,
    })


@app.route('/api/admin/professionals', methods=['GET'])
@admin_api_required
def list_admin_professionals():
    return jsonify(fetch_professionals())


@app.route('/api/admin/professionals', methods=['POST'])
@admin_api_required
def add_professional():
    data = request.get_json(silent=True) or {}
    availability = [item for item in data.get('availability', []) if item]
    if not data.get('name') or not data.get('specialty') or not data.get('description') or not availability:
        return jsonify({'message': 'Preencha todos os campos obrigatorios do profissional.'}), 400

    with get_db_connection() as connection:
        cursor = connection.execute(
            '''
            INSERT INTO professionals (name, specialty, description, image)
            VALUES (?, ?, ?, ?)
            ''',
            (
                data.get('name'),
                data.get('specialty'),
                data.get('description'),
                data.get('image', 'doctor.png'),
            ),
        )
        professional_id = cursor.lastrowid
        connection.executemany(
            '''
            INSERT INTO professional_availability (professional_id, time)
            VALUES (?, ?)
            ''',
            [(professional_id, time) for time in availability],
        )
        connection.commit()

    new_professional = find_professional_by_id(professional_id)
    return jsonify({'message': 'Profissional adicionado com sucesso!', 'professional': new_professional}), 201


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react_app(path):
    if path.startswith('api/'):
        return jsonify({'message': 'Rota nao encontrada'}), 404

    if path.startswith('assets/'):
        assets_dir = os.path.join(DIST_DIR, 'assets')
        asset_path = path.replace('assets/', '', 1)
        return send_from_directory(assets_dir, asset_path)

    index_path = os.path.join(DIST_DIR, 'index.html')
    if os.path.exists(index_path):
        return send_from_directory(DIST_DIR, 'index.html')

    return 'Frontend Vite ainda nao foi gerado. Execute npm install e npm run build.', 503


if __name__ == '__main__':
    app.run(debug=True, port=5000)
