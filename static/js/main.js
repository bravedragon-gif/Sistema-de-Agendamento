document.addEventListener('DOMContentLoaded', () => {
    let professionals = [];
    let selectedSpecialty = '';
    let selectedDoctor = null;
    let selectedTime = '';

    // Elements
    const bookingFlow = document.getElementById('booking-flow');
    const steps = document.querySelectorAll('.step');
    const stepViews = document.querySelectorAll('.step-view');
    
    // Grids
    const specialtiesList = document.getElementById('specialties-list');
    const professionalsList = document.getElementById('professionals-list');
    const slotsList = document.getElementById('slots-list');

    // Data Load
    async function init() {
        try {
            const resp = await fetch('/api/professionals');
            professionals = await resp.json();
            renderSpecialties();
        } catch (err) {
            console.error('Erro ao carregar profissionais:', err);
        }
    }

    // Step Navigation
    function goToStep(stepNumber) {
        steps.forEach(s => s.classList.remove('active'));
        stepViews.forEach(v => v.classList.remove('active'));

        document.querySelector(`.step[data-step="${stepNumber}"]`).classList.add('active');
        document.getElementById(`step-${stepNumber}`).classList.add('active');
        
        // Scroll to scheduling section if not in view
        if (stepNumber > 1) {
            document.getElementById('agendamento').scrollIntoView({ behavior: 'smooth' });
        }
    }

    // Render Step 1
    function renderSpecialties() {
        const specs = [...new Set(professionals.map(p => p.specialty))];
        specialtiesList.innerHTML = specs.map(spec => `
            <div class="specialty-item" onclick="selectSpecialty('${spec}')">
                <h3>${spec}</h3>
                <p>Ver profissionais</p>
            </div>
        `).join('');
    }

    window.selectSpecialty = (spec) => {
        selectedSpecialty = spec;
        renderProfessionals();
        goToStep(2);
    };

    // Render Step 2
    function renderProfessionals() {
        const filtered = professionals.filter(p => p.specialty === selectedSpecialty);
        professionalsList.innerHTML = filtered.map(pro => `
            <div class="pro-card" onclick="selectDoctor(${pro.id})">
                <img src="/static/assets/${pro.image}" alt="${pro.name}">
                <h4>${pro.name}</h4>
                <p>${pro.description}</p>
            </div>
        `).join('');
    }

    window.selectDoctor = (id) => {
        selectedDoctor = professionals.find(p => p.id === id);
        document.getElementById('selected-doctor-name').innerText = selectedDoctor.name;
        document.getElementById('selected-doctor-specialty').innerText = selectedDoctor.specialty;
        renderSlots();
        goToStep(3);
    };

    // Render Step 3
    function renderSlots() {
        slotsList.innerHTML = selectedDoctor.availability.map(time => `
            <div class="slot-item" onclick="selectTime('${time}')">
                <h3>${time}</h3>
            </div>
        `).join('');
    }

    window.selectTime = (time) => {
        selectedTime = time;
        prepareConfirmation();
        goToStep(4);
    };

    // Step 4: Finalize
    function prepareConfirmation() {
        document.getElementById('confirm-doctor').innerText = selectedDoctor.name;
        document.getElementById('confirm-specialty').innerText = selectedDoctor.specialty;
        document.getElementById('confirm-time').innerText = selectedTime;
    }

    // Back Buttons
    document.querySelectorAll('.btn-back').forEach(btn => {
        btn.addEventListener('click', () => {
            const currentStep = parseInt(document.querySelector('.step.active').dataset.step);
            goToStep(currentStep - 1);
        });
    });

    // Form Submission
    const bookingForm = document.getElementById('booking-form');
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const appointment = {
            doctor: selectedDoctor.name,
            specialty: selectedDoctor.specialty,
            time: selectedTime,
            patientName: document.getElementById('patient-name').value,
            cpf: document.getElementById('patient-cpf').value
        };

        try {
            const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(appointment)
            });

            if (response.ok) {
                alert('Sucesso! Seu agendamento foi realizado.');
                bookingForm.reset();
                goToStep(1);
                // Also trigger search for user to see it
                document.getElementById('search-cpf').value = appointment.cpf;
                searchAppointments(appointment.cpf);
            }
        } catch (err) {
            alert('Erro ao realizar agendamento. Tente novamente.');
        }
    });

    // Search Appointments
    const searchBtn = document.getElementById('btn-search');
    const resultsGrid = document.getElementById('appointments-results');

    async function searchAppointments(cpf) {
        if (!cpf) return;
        
        try {
            const resp = await fetch(`/api/appointments?cpf=${cpf}`);
            const data = await resp.json();
            
            if (data.length === 0) {
                resultsGrid.innerHTML = '<p>Nenhum agendamento encontrado para este CPF.</p>';
            } else {
                resultsGrid.innerHTML = data.map(app => `
                    <div class="appointment-card glass">
                        <h4>${app.doctor}</h4>
                        <p><strong>Especialidade:</strong> ${app.specialty}</p>
                        <p><strong>Horário:</strong> ${app.time}</p>
                        <p><strong>Paciente:</strong> ${app.patientName}</p>
                    </div>
                `).join('');
            }
        } catch (err) {
            console.error('Erro na busca:', err);
        }
    }

    searchBtn.addEventListener('click', () => {
        const cpf = document.getElementById('search-cpf').value;
        searchAppointments(cpf);
    });

    // Header scroll effect
    window.addEventListener('scroll', () => {
        const header = document.querySelector('header');
        if (window.scrollY > 50) {
            header.style.padding = '0.7rem 0';
            header.style.background = 'rgba(15, 23, 42, 0.95)';
        } else {
            header.style.padding = '1rem 0';
            header.style.background = 'rgba(15, 23, 42, 0.8)';
        }
    });

    init();
});
