import { useEffect, useMemo, useState } from 'react';

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Servicos', href: '#servicos' },
  { label: 'Agendamento', href: '#agendamento' },
  { label: 'Equipe', href: '#equipe' },
  { label: 'Minhas Consultas', href: '#minhas-consultas' }
];

const serviceItems = [
  {
    icon: '⚡',
    title: 'Agilidade Real',
    description: 'Agende em segundos com um fluxo guiado, intuitivo e responsivo.'
  },
  {
    icon: '🔐',
    title: 'Dados Protegidos',
    description: 'A API continua centralizando os dados e a autenticacao administrativa.'
  },
  {
    icon: '🧠',
    title: 'Experiencia Inteligente',
    description: 'A nova interface React organiza o atendimento em etapas claras e sem atrito.'
  }
];

const teamMembers = [
  { name: 'Dr. Gabriel Almeida', role: 'Cardiologista Chefe', image: '/assets/doctor.png' },
  { name: 'Dra. Marina Souza', role: 'Nutricionista Clinica', image: '/assets/nutritionist.png' },
  { name: 'Dr. Rafael Costa', role: 'Radiologista', image: '/assets/radiologist.png' }
];

const initialProfessionalForm = {
  name: '',
  specialty: '',
  description: '',
  image: 'doctor.png',
  availability: ''
};

const DEFAULT_BACKEND_ORIGIN = 'http://127.0.0.1:5000';

function getBackendCandidates() {
  if (typeof window === 'undefined') {
    return [DEFAULT_BACKEND_ORIGIN];
  }

  const currentOrigin = window.location.origin;
  if (!currentOrigin || !currentOrigin.startsWith('http')) {
    return [DEFAULT_BACKEND_ORIGIN];
  }

  return currentOrigin === DEFAULT_BACKEND_ORIGIN
    ? [currentOrigin]
    : [currentOrigin, DEFAULT_BACKEND_ORIGIN];
}

async function requestJson(path, options = {}) {
  const candidates = getBackendCandidates();
  let lastResult = null;

  for (const origin of candidates) {
    try {
      const response = await fetch(`${origin}${path}`, {
        ...options,
        credentials: 'include'
      });

      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const data = isJson ? await response.json().catch(() => null) : null;
      const shouldRetry = (response.status === 404 || !isJson) && origin !== candidates[candidates.length - 1];

      lastResult = {
        ok: response.ok,
        status: response.status,
        data,
        origin
      };

      if (shouldRetry) {
        continue;
      }

      return lastResult;
    } catch (error) {
      if (origin === candidates[candidates.length - 1]) {
        throw error;
      }
    }
  }

  return lastResult;
}

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatAppointmentDate(value) {
  if (!value) {
    return 'Nao informada';
  }

  const [year, month, day] = value.split('-');
  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function normalizeAvailability(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatCpf(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function ProfessionalImage({ image, alt, className }) {
  const [src, setSrc] = useState(`/assets/${image || 'doctor.png'}`);

  useEffect(() => {
    setSrc(`/assets/${image || 'doctor.png'}`);
  }, [image]);

  return <img className={className} src={src} alt={alt} onError={() => setSrc('/assets/doctor.png')} />;
}

function PublicLayout({
  professionals,
  bookingStep,
  selectedSpecialty,
  selectedDoctor,
  selectedTime,
  bookingForm,
  appointments,
  searchCpf,
  headerCompact,
  bookingMessage,
  appointmentsMessage,
  confirmedAppointments,
  onSelectSpecialty,
  onSelectDoctor,
  onSelectTime,
  onBackStep,
  onBookingFormChange,
  onSubmitBooking,
  onConfirmAppointment,
  onRescheduleAppointment,
  onSearchCpfChange,
  onSearchAppointments
}) {
  const specialties = useMemo(() => [...new Set(professionals.map((item) => item.specialty))], [professionals]);
  const filteredProfessionals = useMemo(
    () => professionals.filter((item) => item.specialty === selectedSpecialty),
    [professionals, selectedSpecialty]
  );

  return (
    <>
      <header className={headerCompact ? 'compact' : ''}>
        <nav className="container nav-shell">
          <div className="logo">Vita<span>Nova</span></div>
          <div className="nav-group">
            <ul className="nav-links">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </header>

      <main>
        <section id="home" className="hero section-pad">
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <div className="container hero-content">
            <div className="hero-text reveal">
              <span className="eyebrow">Frontend reconstruido com Vite + React</span>
              <h1>
                Sua saude em um <span>novo patamar digital</span>
              </h1>
              <p>
                O VitaNova agora roda com uma SPA moderna, fluida e pronta para crescer sem abandonar a API Flask que ja organiza profissionais e agendamentos.
              </p>
              <div className="hero-btns">
                <a href="#agendamento" className="btn btn-primary">
                  Iniciar agendamento
                </a>
                <a href="#minhas-consultas" className="btn btn-secondary">
                  Ver meus horarios
                </a>
              </div>
            </div>
            <div className="hero-panel glass reveal delay-1">
              <ProfessionalImage image="hero.png" alt="VitaNova Digital" className="hero-image" />
            </div>
          </div>
        </section>

        <section id="servicos" className="section-pad">
          <div className="container">
            <div className="section-title">
              <span className="eyebrow">Diferenciais</span>
              <h2>Um fluxo mais rapido, limpo e confiavel</h2>
              <p>A mesma operacao agora vive em uma interface pronta para evolucao front-end.</p>
            </div>
            <div className="services-grid">
              {serviceItems.map((item) => (
                <article key={item.title} className="glass service-card reveal">
                  <div className="card-icon">{item.icon}</div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="agendamento" className="section-pad scheduling">
          <div className="container">
            <div className="section-title">
              <span className="eyebrow">Portal</span>
              <h2>Agende em quatro passos</h2>
              <p>Especialidade, profissional, horario e confirmacao em uma experiencia unica.</p>
            </div>

            <div className="glass scheduling-container">
              <div className="step-indicator">
                {['Especialidade', 'Profissional', 'Horario', 'Confirmacao'].map((label, index) => {
                  const step = index + 1;
                  return (
                    <div key={label} className={`step ${bookingStep === step ? 'active' : ''}`}>
                      {step}. {label}
                    </div>
                  );
                })}
              </div>

              {bookingMessage ? <div className="banner success">{bookingMessage}</div> : null}

              {bookingStep === 1 ? (
                <div className="step-view active">
                  <h3>Em que podemos ajudar hoje?</h3>
                  <div className="specialty-grid">
                    {specialties.map((specialty) => (
                      <button key={specialty} className="specialty-item" type="button" onClick={() => onSelectSpecialty(specialty)}>
                        <h4>{specialty}</h4>
                        <p>Ver profissionais</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {bookingStep === 2 ? (
                <div className="step-view active">
                  <button className="btn-back" type="button" onClick={onBackStep}>
                    ← Voltar
                  </button>
                  <h3>Escolha seu especialista</h3>
                  <div className="professionals-grid">
                    {filteredProfessionals.map((professional) => (
                      <button key={professional.id} className="pro-card" type="button" onClick={() => onSelectDoctor(professional)}>
                        <ProfessionalImage image={professional.image} alt={professional.name} className="card-photo" />
                        <h4>{professional.name}</h4>
                        <p>{professional.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {bookingStep === 3 && selectedDoctor ? (
                <div className="step-view active">
                  <button className="btn-back" type="button" onClick={onBackStep}>
                    ← Voltar
                  </button>
                  <div className="slot-header">
                    <h3>{selectedDoctor.name}</h3>
                    <p>{selectedDoctor.specialty}</p>
                  </div>
                  <div className="slots-grid">
                    {selectedDoctor.availability.map((time) => (
                      <button key={time} className="slot-item" type="button" onClick={() => onSelectTime(time)}>
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {bookingStep === 4 && selectedDoctor ? (
                <div className="step-view active">
                  <button className="btn-back" type="button" onClick={onBackStep}>
                    ← Voltar
                  </button>
                  <h3>Finalizar agendamento</h3>
                  <div className="summary-card glass">
                    <p><strong>Profissional:</strong> {selectedDoctor.name}</p>
                    <p><strong>Especialidade:</strong> {selectedDoctor.specialty}</p>
                    <p><strong>Data:</strong> {formatAppointmentDate(bookingForm.date)}</p>
                    <p><strong>Horario:</strong> {selectedTime}</p>
                  </div>
                  <form className="portal-form" onSubmit={onSubmitBooking}>
                    <div className="form-group">
                      <label htmlFor="date">Data da consulta</label>
                      <input
                        id="date"
                        name="date"
                        type="date"
                        value={bookingForm.date}
                        onChange={onBookingFormChange}
                        min={getTodayDate()}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="patientName">Nome completo</label>
                      <input
                        id="patientName"
                        name="patientName"
                        type="text"
                        value={bookingForm.patientName}
                        onChange={onBookingFormChange}
                        placeholder="Seu nome completo"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="cpf">CPF</label>
                      <input
                        id="cpf"
                        name="cpf"
                        type="text"
                        value={bookingForm.cpf}
                        onChange={onBookingFormChange}
                        placeholder="000.000.000-00"
                        required
                      />
                    </div>
                    <button className="btn btn-primary btn-block" type="submit">
                      Confirmar agendamento
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section id="equipe" className="section-pad">
          <div className="container">
            <div className="section-title">
              <span className="eyebrow">Equipe</span>
              <h2>Profissionais em destaque</h2>
              <p>Os cards abaixo seguem o visual da nova interface e continuam alinhados aos dados da operacao.</p>
            </div>
            <div className="team-grid">
              {teamMembers.map((member) => (
                <article key={member.name} className="glass team-member reveal">
                  <ProfessionalImage image={member.image.replace('/assets/', '')} alt={member.name} className="member-photo" />
                  <h3>{member.name}</h3>
                  <span>{member.role}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="minhas-consultas" className="section-pad">
          <div className="container">
            <div className="glass search-wrapper">
              <div className="section-title left">
                <span className="eyebrow">Acompanhamento</span>
                <h2>Meus agendamentos</h2>
                <p>Pesquise por CPF para listar seus horarios marcados.</p>
              </div>
              <div className="search-box">
                <input type="text" value={searchCpf} onChange={onSearchCpfChange} placeholder="Digite seu CPF" />
                <button className="btn btn-primary" type="button" onClick={onSearchAppointments}>
                  Buscar
                </button>
              </div>
              {appointmentsMessage ? <div className="banner info">{appointmentsMessage}</div> : null}
              <div className="results-grid">
                {appointments.map((appointment) => (
                  <article key={appointment.id} className="glass appointment-card">
                    <h4>{appointment.doctor}</h4>
                    <p><strong>Especialidade:</strong> {appointment.specialty}</p>
                    <p><strong>Data:</strong> {formatAppointmentDate(appointment.date)}</p>
                    <p><strong>Horario:</strong> {appointment.time}</p>
                    <p><strong>Paciente:</strong> {appointment.patientName}</p>
                    <p><strong>CPF:</strong> {appointment.cpf}</p>
                    <div className="appointment-actions">
                      <button
                        className={`btn ${confirmedAppointments[appointment.id] ? 'btn-secondary' : 'btn-primary'}`}
                        type="button"
                        onClick={() => onConfirmAppointment(appointment.id)}
                      >
                        {confirmedAppointments[appointment.id] ? 'Confirmado' : 'Confirmar'}
                      </button>
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => onRescheduleAppointment(appointment)}
                      >
                        Reagendar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="container footer-shell">
          <div>
            <div className="logo">Vita<span>Nova</span></div>
            <p>Excelencia e tecnologia em saude, agora com frontend moderno em React.</p>
          </div>
        </div>
      </footer>
    </>
  );
}

function AdminLogin({ loginForm, loginError, loginLoading, onLoginChange, onLoginSubmit, onNavigateHome }) {
  return (
    <main className="admin-page admin-login-page">
      <section className="section-pad admin-login-shell">
        <div className="container admin-login-wrapper">
          <div className="glass admin-login-card">
            <span className="eyebrow">Area administrativa</span>
            <h1>Entrar no painel VitaNova</h1>
            <p>Use suas credenciais para gerenciar equipe e integracoes.</p>
            {loginError ? <div className="banner error">{loginError}</div> : null}
            <form className="portal-form compact-form" onSubmit={onLoginSubmit}>
              <div className="form-group">
                <label htmlFor="username">Usuario</label>
                <input id="username" name="username" value={loginForm.username} onChange={onLoginChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="password">Senha</label>
                <input id="password" name="password" type="password" value={loginForm.password} onChange={onLoginChange} required />
              </div>
              <button className="btn btn-primary btn-block" type="submit" disabled={loginLoading}>
                {loginLoading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
            <button className="text-link" type="button" onClick={onNavigateHome}>
              Voltar para o site
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function AdminDashboard({
  dashboard,
  professionals,
  professionalForm,
  adminMessage,
  onProfessionalChange,
  onProfessionalSubmit,
  onLogout,
  onNavigateHome
}) {
  return (
    <main className="admin-page">
      <section className="section-pad admin-shell">
        <div className="container">
          <div className="admin-topbar">
            <div>
              <span className="eyebrow">Painel administrativo</span>
              <h1>Gestao do VitaNova</h1>
              <p>Cadastre profissionais e mantenha o catalogo atualizado com armazenamento local.</p>
            </div>
            <div className="admin-actions">
              <button className="btn btn-secondary" type="button" onClick={onNavigateHome}>
                Ver site
              </button>
              <button className="btn btn-ghost" type="button" onClick={onLogout}>
                Sair
              </button>
            </div>
          </div>

          {adminMessage ? <div className="banner success">{adminMessage}</div> : null}

          <div className="admin-grid">
            <article className="glass admin-card status-card">
              <h2>Status do sistema</h2>
              <div className="status-list">
                <div>
                  <span>Armazenamento</span>
                  <strong>{dashboard?.storage === 'local_sqlite' ? 'SQLite local' : 'Indisponivel'}</strong>
                </div>
                <div>
                  <span>CORS</span>
                  <strong>{dashboard?.cors_available ? 'Disponivel' : 'Indisponivel'}</strong>
                </div>
              </div>
            </article>

            <article className="glass admin-card form-card">
              <h2>Novo profissional</h2>
              <form className="portal-form compact-form" onSubmit={onProfessionalSubmit}>
                <div className="form-group">
                  <label htmlFor="name">Nome</label>
                  <input id="name" name="name" value={professionalForm.name} onChange={onProfessionalChange} required />
                </div>
                <div className="form-group">
                  <label htmlFor="specialty">Especialidade</label>
                  <input id="specialty" name="specialty" value={professionalForm.specialty} onChange={onProfessionalChange} required />
                </div>
                <div className="form-group">
                  <label htmlFor="description">Descricao</label>
                  <input id="description" name="description" value={professionalForm.description} onChange={onProfessionalChange} required />
                </div>
                <div className="form-group">
                  <label htmlFor="image">Imagem</label>
                  <input id="image" name="image" value={professionalForm.image} onChange={onProfessionalChange} placeholder="doctor.png" />
                </div>
                <div className="form-group">
                  <label htmlFor="availability">Horarios</label>
                  <input
                    id="availability"
                    name="availability"
                    value={professionalForm.availability}
                    onChange={onProfessionalChange}
                    placeholder="09:00, 10:00, 14:00"
                    required
                  />
                </div>
                <button className="btn btn-primary btn-block" type="submit">
                  Adicionar profissional
                </button>
              </form>
            </article>
          </div>

          <section className="team-grid admin-team-grid">
            {professionals.map((professional) => (
              <article key={professional.id} className="glass team-member admin-member-card">
                <ProfessionalImage image={professional.image} alt={professional.name} className="member-photo" />
                <h3>{professional.name}</h3>
                <span>{professional.specialty}</span>
                <p>{professional.description}</p>
                <small>{professional.availability.join(' | ')}</small>
              </article>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const [professionals, setProfessionals] = useState([]);
  const [bookingStep, setBookingStep] = useState(1);
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [bookingForm, setBookingForm] = useState({ date: '', patientName: '', cpf: '' });
  const [bookingMessage, setBookingMessage] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [appointmentsMessage, setAppointmentsMessage] = useState('');
  const [searchCpf, setSearchCpf] = useState('');
  const [confirmedAppointments, setConfirmedAppointments] = useState({});
  const [headerCompact, setHeaderCompact] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [professionalForm, setProfessionalForm] = useState(initialProfessionalForm);

  const isAdminRoute = pathname.startsWith('/admin');

  const navigate = (nextPath) => {
    window.history.pushState({}, '', nextPath);
    setPathname(nextPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadProfessionals = async (admin = false) => {
    const endpoint = admin ? '/api/admin/professionals' : '/api/professionals';
    const result = await requestJson(endpoint);
    if (!result?.ok) {
      throw new Error('Falha ao carregar profissionais');
    }
    setProfessionals(result.data || []);
    return result.data || [];
  };

  const loadDashboard = async () => {
    const result = await requestJson('/api/admin/dashboard');
    if (result?.status === 401) {
      setIsAuthenticated(false);
      navigate('/admin/login');
      return;
    }
    setDashboard(result?.data || null);
  };

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    const onScroll = () => setHeaderCompact(window.scrollY > 40);

    window.addEventListener('popstate', onPopState);
    window.addEventListener('scroll', onScroll);

    loadProfessionals().catch(() => {
      setAppointmentsMessage('Nao foi possivel carregar os profissionais no momento.');
    });

    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    requestJson('/api/admin/session')
      .then((result) => {
        setIsAuthenticated(Boolean(result?.data?.authenticated));
      })
      .catch(() => {
        setIsAuthenticated(false);
      });
  }, []);

  useEffect(() => {
    if (!isAdminRoute) {
      return;
    }

    if (!isAuthenticated && pathname !== '/admin/login') {
      navigate('/admin/login');
      return;
    }

    if (isAuthenticated) {
      Promise.all([loadDashboard(), loadProfessionals(true)]).catch(() => {
        setAdminMessage('Nao foi possivel carregar os dados administrativos.');
      });
    }
  }, [isAdminRoute, isAuthenticated, pathname]);

  const handleSelectSpecialty = (specialty) => {
    setSelectedSpecialty(specialty);
    setSelectedDoctor(null);
    setSelectedTime('');
    setBookingMessage('');
    setBookingStep(2);
  };

  const handleSelectDoctor = (doctor) => {
    setSelectedDoctor(doctor);
    setSelectedTime('');
    setBookingMessage('');
    setBookingStep(3);
  };

  const handleSelectTime = (time) => {
    setSelectedTime(time);
    setBookingMessage('');
    setBookingStep(4);
  };

  const handleBackStep = () => {
    setBookingStep((current) => Math.max(1, current - 1));
  };

  const handleBookingFormChange = (event) => {
    const { name, value } = event.target;
    setBookingForm((current) => ({
      ...current,
      [name]: name === 'cpf' ? formatCpf(value) : value
    }));
  };

  const handleSubmitBooking = async (event) => {
    event.preventDefault();
    if (!selectedDoctor || !selectedTime || !bookingForm.date) {
      setBookingMessage('Selecione uma data valida para concluir o agendamento.');
      return;
    }

    const payload = {
      professionalId: selectedDoctor.id,
      doctor: selectedDoctor.name,
      specialty: selectedDoctor.specialty,
      date: bookingForm.date,
      time: selectedTime,
      patientName: bookingForm.patientName,
      cpf: bookingForm.cpf
    };

    try {
      const result = await requestJson('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!result?.ok) {
        setBookingMessage(result?.data?.message || 'Nao foi possivel concluir o agendamento.');
        return;
      }

      setBookingForm({ date: '', patientName: '', cpf: '' });
      setBookingStep(1);
      setSelectedSpecialty('');
      setSelectedDoctor(null);
      setSelectedTime('');
      setBookingMessage('Agendamento realizado com sucesso. Confira seus horarios abaixo.');
      setSearchCpf(payload.cpf);
      await handleSearchAppointments(payload.cpf);
      window.location.hash = 'minhas-consultas';
    } catch (error) {
      setBookingMessage('A API de agendamento nao respondeu. Verifique se o backend Flask esta em execucao.');
    }
  };

  const handleSearchAppointments = async (overrideCpf) => {
    const cpf = overrideCpf ?? searchCpf;
    if (!cpf) {
      setAppointments([]);
      setAppointmentsMessage('Informe um CPF para consultar.');
      return;
    }

    try {
      const result = await requestJson(`/api/appointments?cpf=${encodeURIComponent(cpf)}`);
      const data = result?.data || [];
      setAppointments(data);
      setAppointmentsMessage(data.length ? '' : 'Nenhum agendamento encontrado para este CPF.');
    } catch (error) {
      setAppointments([]);
      setAppointmentsMessage('Nao foi possivel consultar os agendamentos agora.');
    }
  };

  const handleConfirmAppointment = (appointmentId) => {
    setConfirmedAppointments((current) => ({
      ...current,
      [appointmentId]: true
    }));
  };

  const handleRescheduleAppointment = (appointment) => {
    setBookingStep(1);
    setSelectedSpecialty('');
    setSelectedDoctor(null);
    setSelectedTime('');
    setBookingMessage('');
    setBookingForm({
      date: appointment?.date || '',
      patientName: appointment?.patientName || '',
      cpf: appointment?.cpf || ''
    });
    window.location.hash = 'agendamento';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginChange = (event) => {
    const { name, value } = event.target;
    setLoginForm((current) => ({ ...current, [name]: value }));
    setLoginError('');
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    const result = await requestJson('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm)
    });

    setLoginLoading(false);

    if (!result?.ok) {
      setLoginError(result?.data?.message || 'Falha no login.');
      return;
    }

    setIsAuthenticated(true);
    setLoginForm({ username: '', password: '' });
    navigate('/admin');
  };

  const handleProfessionalChange = (event) => {
    const { name, value } = event.target;
    setProfessionalForm((current) => ({ ...current, [name]: value }));
  };

  const handleProfessionalSubmit = async (event) => {
    event.preventDefault();

    const result = await requestJson('/api/admin/professionals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...professionalForm,
        availability: normalizeAvailability(professionalForm.availability)
      })
    });

    if (!result?.ok) {
      setAdminMessage(result?.data?.message || 'Nao foi possivel adicionar o profissional.');
      return;
    }

    setProfessionalForm(initialProfessionalForm);
    setAdminMessage('Profissional adicionado com sucesso.');
    await loadProfessionals(true);
  };

  const handleLogout = async () => {
    await requestJson('/api/admin/logout', { method: 'POST' });
    setIsAuthenticated(false);
    setDashboard(null);
    setAdminMessage('');
    navigate('/admin/login');
  };

  if (isAdminRoute) {
    if (!isAuthenticated || pathname === '/admin/login') {
      return (
        <AdminLogin
          loginForm={loginForm}
          loginError={loginError}
          loginLoading={loginLoading}
          onLoginChange={handleLoginChange}
          onLoginSubmit={handleLoginSubmit}
          onNavigateHome={() => navigate('/')}
        />
      );
    }

    return (
      <AdminDashboard
        dashboard={dashboard}
        professionals={professionals}
        professionalForm={professionalForm}
        adminMessage={adminMessage}
        onProfessionalChange={handleProfessionalChange}
        onProfessionalSubmit={handleProfessionalSubmit}
        onLogout={handleLogout}
        onNavigateHome={() => navigate('/')}
      />
    );
  }

  return (
    <PublicLayout
      professionals={professionals}
      bookingStep={bookingStep}
      selectedSpecialty={selectedSpecialty}
      selectedDoctor={selectedDoctor}
      selectedTime={selectedTime}
      bookingForm={bookingForm}
      appointments={appointments}
      searchCpf={searchCpf}
      headerCompact={headerCompact}
      bookingMessage={bookingMessage}
      appointmentsMessage={appointmentsMessage}
      confirmedAppointments={confirmedAppointments}
      onSelectSpecialty={handleSelectSpecialty}
      onSelectDoctor={handleSelectDoctor}
      onSelectTime={handleSelectTime}
      onBackStep={handleBackStep}
      onBookingFormChange={handleBookingFormChange}
      onSubmitBooking={handleSubmitBooking}
      onConfirmAppointment={handleConfirmAppointment}
      onRescheduleAppointment={handleRescheduleAppointment}
      onSearchCpfChange={(event) => setSearchCpf(formatCpf(event.target.value))}
      onSearchAppointments={() => handleSearchAppointments()}
    />
  );
}

