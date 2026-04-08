import json
import os
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Paths
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
PROFESSIONALS_PATH = os.path.join(DATA_DIR, 'professionals.json')
APPOINTMENTS_PATH = os.path.join(DATA_DIR, 'appointments.json')

def load_data(file_path):
    if not os.path.exists(file_path):
        return []
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_data(file_path, data):
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/professionals', methods=['GET'])
def get_professionals():
    data = load_data(PROFESSIONALS_PATH)
    return jsonify(data)

@app.route('/api/appointments', methods=['GET', 'POST'])
def handle_appointments():
    if request.method == 'POST':
        new_appointment = request.json
        appointments = load_data(APPOINTMENTS_PATH)
        
        # Simple ID generation
        new_appointment['id'] = len(appointments) + 1
        appointments.append(new_appointment)
        
        save_data(APPOINTMENTS_PATH, appointments)
        return jsonify({"message": "Agendamento realizado com sucesso!", "appointment": new_appointment}), 201
    
    # GET method
    cpf = request.args.get('cpf')
    appointments = load_data(APPOINTMENTS_PATH)
    
    if cpf:
        filtered = [a for a in appointments if a.get('cpf') == cpf]
        return jsonify(filtered)
    
    return jsonify(appointments)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
