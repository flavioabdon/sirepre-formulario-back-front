import React, { useState, useEffect, useRef } from 'react';
import RecintoSelector from './RecintoSelector';
import AsyncFileUpload from './AsyncFileUpload';
import {
  User, Search, Home, Phone, Smartphone, Building, FileText,
  Briefcase, CheckCircle, AlertCircle, Loader2, Download, PlusCircle,
  TentTree, Computer, NotebookPen, FolderDot, UserCheck, Warehouse,
  ShieldCheck, Move3D, NotebookTabs, FileDown, CheckSquare,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

interface VerificationData {
  cedula_identidad: string;
  complemento: string;
  expedicion: string;
}

interface ApplicantData {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string;
  gradoInstruccion: string;
  carrera: string;
  ciudad: string;
  zona: string;
  calleAvenida: string;
  numeroDomicilio: string;
  email: string;
  celular: string;
  telefono: string;
  experienciaGeneral: string;
  experienciaEspecifica: string;
  experienciaProcesosRural: string;
  cargoPostulacion: string;
  recinto_primera_opcion: number | null;
  archivo_ci: File | number | null;
  archivo_no_militancia: File | number | null;
  archivo_curriculum: File | number | null;
  archivo_certificado_ofimatica: File | number | null;
  observacion: string;
  requisitos: {
    esBoliviano: boolean;
    registradoPadronElectoral: boolean;
    ciVigente: boolean;
    disponibilidadTiempoCompleto: boolean;
    lineaEntel: boolean;
    ningunaMilitanciaPolitica: boolean;
    sinConflictosInstitucion: boolean;
    sinSentenciaEjecutoriada: boolean;
    cuentaConCelularAndroid: boolean;
    cuentaConPowerbank: boolean;
  };
}

type Step = 'start' | 'personal' | 'additional' | 'confirmation' | 'review' | 'success' | 'already_registered';

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

const serializeFile = (file: File | number | null): any => {
  if (typeof file === 'number') return file;
  if (!file) return null;
  return JSON.stringify({ name: file.name, size: file.size, type: file.type, lastModified: file.lastModified });
};

const deserializeFile = (serialized: any): File | number | null => {
  if (!serialized) return null;
  if (typeof serialized === 'number') return serialized;
  if (!isNaN(Number(serialized)) && typeof serialized === 'string' && serialized.length < 10) return Number(serialized);
  try {
    const parsed = JSON.parse(serialized);
    if (typeof parsed === 'number') return parsed;
    return new File([], parsed.name, { type: parsed.type, lastModified: parsed.lastModified });
  } catch { return null; }
};

const descargarPDF = async (pdfUrl: string, filename: string): Promise<boolean> => {
  try {
    const fullUrl = pdfUrl.startsWith('http') ? pdfUrl : `${window.location.origin}${pdfUrl}`;
    const response = await fetch(fullUrl);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const blob = await response.blob();
    if (blob.size < 1000) throw new Error('Archivo PDF inválido');
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
    return true;
  } catch (error) { console.error('Error descargando PDF:', error); throw error; }
};

const checkConnectivity = async (): Promise<boolean> => {
  try {
    const r = await fetch('/api/health/', { method: 'HEAD', cache: 'no-cache' });
    return r.ok;
  } catch { return false; }
};

const EMPTY_FORM: ApplicantData = {
  nombre: '', apellidoPaterno: '', apellidoMaterno: '', fechaNacimiento: '',
  gradoInstruccion: '', carrera: '', ciudad: '', zona: '', calleAvenida: '',
  numeroDomicilio: '', email: '', celular: '', telefono: '',
  experienciaGeneral: '', experienciaEspecifica: '', experienciaProcesosRural: '',
  cargoPostulacion: '', recinto_primera_opcion: null,
  archivo_ci: null, archivo_no_militancia: null, archivo_curriculum: null,
  archivo_certificado_ofimatica: null,
  observacion: '',
  requisitos: {
    esBoliviano: false, registradoPadronElectoral: false, ciVigente: false,
    disponibilidadTiempoCompleto: false, lineaEntel: false,
    ningunaMilitanciaPolitica: false, sinConflictosInstitucion: false,
    sinSentenciaEjecutoriada: false, cuentaConCelularAndroid: false,
    cuentaConPowerbank: false,
  },
};

const EMPTY_VERIFICATION: VerificationData = { cedula_identidad: '', complemento: '', expedicion: '' };

// ─────────────────────────────────────────────────────────
// Static data
// ─────────────────────────────────────────────────────────

const requisitosCargo: Record<string, string[]> = {
  "OPERADOR TRANSMISION RURAL": [
    "Experiencia comprobada en procesos de Electorales (Deseable).",
    "Bachiller en Humanidades o superior.",
    "Capacidad en resolución de conflictos.",
    "Facilidad en Atención al público.",
    "Manejo de equipos de computación y Ofimática.",
    "Disponibilidad para viaje al área rural.",
  ],
  "OPERADOR TRANSMISION URBANO": [
    "Experiencia comprobada en procesos Electorales (Deseable).",
    "Bachiller en Humanidades o superior.",
    "Capacidad en resolución de conflictos.",
    "Facilidad en Atención al público.",
    "Manejo de equipos de computación y Ofimática.",
  ],
};

const iconosCargo: Record<string, React.ElementType> = {
  "OPERADOR TRANSMISION RURAL": Warehouse,
  "OPERADOR TRANSMISION URBANO": NotebookTabs,
};

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────

const ApplicantRegistration: React.FC = () => {

  // ── Load from localStorage ────────────────────────────
  const loadSaved = () => {
    const raw = localStorage.getItem('sirepre_reg');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.formData) {
        parsed.formData.archivo_ci = deserializeFile(parsed.formData.archivo_ci);
        parsed.formData.archivo_no_militancia = deserializeFile(parsed.formData.archivo_no_militancia);
        parsed.formData.archivo_curriculum = deserializeFile(parsed.formData.archivo_curriculum);
        parsed.formData.archivo_certificado_ofimatica = deserializeFile(parsed.formData.archivo_certificado_ofimatica);
      }
      return parsed;
    } catch { return null; }
  };

  const saved = loadSaved();

  const [currentStep, setCurrentStep] = useState<Step>(saved?.currentStep || 'start');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const [registeredPdfUrl, setRegisteredPdfUrl] = useState<string | null>(saved?.registeredPdfUrl || null);
  const [verificationData, setVerificationData] = useState<VerificationData>(saved?.verificationData || EMPTY_VERIFICATION);
  const [formData, setFormData] = useState<ApplicantData>(saved?.formData || EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showNoAgreementModal, setShowNoAgreementModal] = useState(false);
  const [systemConfig, setSystemConfig] = useState<{ sistema_activo: boolean; mensaje: string } | null>(null);
  const [isCheckingConfig, setIsCheckingConfig] = useState(true);

  // ── Fetch System Config ──────────────────────────────
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/postulantes/status/');
        const data = await res.json();
        if (data.success) {
          setSystemConfig({ sistema_activo: data.sistema_activo, mensaje: data.mensaje });
        } else {
          setSystemConfig({ sistema_activo: true, mensaje: '' });
        }
      } catch (err) {
        console.error('Error fetching system config:', err);
        setSystemConfig({ sistema_activo: true, mensaje: '' });
      } finally {
        setIsCheckingConfig(false);
      }
    };
    fetchConfig();
  }, []);

  // ── Persist to localStorage ────────────────────────────
  useEffect(() => {
    const toSave = {
      currentStep,
      verificationData,
      registeredPdfUrl,
      formData: {
        ...formData,
        archivo_ci: serializeFile(formData.archivo_ci),
        archivo_no_militancia: serializeFile(formData.archivo_no_militancia),
        archivo_curriculum: serializeFile(formData.archivo_curriculum),
        archivo_certificado_ofimatica: serializeFile(formData.archivo_certificado_ofimatica),
      }
    };
    localStorage.setItem('sirepre_reg', JSON.stringify(toSave));
  }, [currentStep, verificationData, formData, registeredPdfUrl]);

  // ── Clear side-effects ─────────────────────────────────
  useEffect(() => { if (formData.experienciaGeneral === 'NO') setFormData(p => ({ ...p, experienciaEspecifica: '' })); }, [formData.experienciaGeneral]);
  useEffect(() => { if (!formData.gradoInstruccion || formData.gradoInstruccion === 'BACHILLER') setFormData(p => ({ ...p, carrera: '' })); }, [formData.gradoInstruccion]);

  // ── Helpers ────────────────────────────────────────────
  const showMsg = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 6000);
  };

  // Scroll to message when error occurs
  useEffect(() => {
    if (message?.type === 'error' && messageRef.current) {
      setTimeout(() => {
        messageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [message]);

  const handleReset = () => {
    localStorage.removeItem('sirepre_reg');
    setCurrentStep('start');
    setRegisteredPdfUrl(null);
    setVerificationData(EMPTY_VERIFICATION);
    setFormData(EMPTY_FORM);
    setErrors({});
    setMessage(null);
  };

  const handleInputChange = (name: string, value: string | boolean | File | number | null) => {
    if (name.startsWith('requisitos.')) {
      const key = name.split('.')[1];
      setFormData(p => ({ ...p, requisitos: { ...p.requisitos, [key]: value as boolean } }));
    } else {
      setFormData(p => ({ ...p, [name]: value }));
    }
    // Clear error on change
    setErrors(p => ({ ...p, [name]: '' }));
  };

  // ── Step 1: Personal + Verification ───────────────────
  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate CI
    const ci = verificationData.cedula_identidad;
    if (!ci || !/^\d{4,9}$/.test(ci)) {
      showMsg('error', 'La Cédula de Identidad debe tener entre 4 y 9 dígitos.');
      return;
    }
    if (!verificationData.expedicion) {
      showMsg('error', 'Seleccione el departamento de expedición.');
      return;
    }
    if (!formData.nombre.trim()) {
      showMsg('error', 'El nombre es requerido.');
      return;
    }
    if (!formData.fechaNacimiento) {
      showMsg('error', 'La fecha de nacimiento es requerida.');
      return;
    }
    if (!formData.gradoInstruccion) {
      showMsg('error', 'Seleccione el grado de instrucción.');
      return;
    }

    setIsLoading(true);
    try {
      const isConnected = await checkConnectivity();
      if (!isConnected) { showMsg('error', 'Sin conexión al servidor.'); return; }

      const params = new URLSearchParams({
        cedula_identidad: ci,
        complemento: verificationData.complemento,
        expedicion: verificationData.expedicion,
      });
      const res = await fetch(`/api/postulantes/existe/?${params}`);
      if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);
      const result = await res.json();

      if (result.success) {
        if (result.existe) {
          setRegisteredPdfUrl(`/api/postulantes/pdf/${ci}/`);
          setCurrentStep('already_registered');
        } else {
          setCurrentStep('additional');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        showMsg('error', result.error || 'Error al verificar.');
      }
    } catch (err) {
      showMsg('error', 'Error de conexión con el servidor.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Validate and go to confirmation ───────────
  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    const fieldErrors: Record<string, string> = {};
    if (!formData.ciudad) fieldErrors.ciudad = 'Requerido';
    if (!formData.zona) fieldErrors.zona = 'Requerido';
    if (!formData.calleAvenida) fieldErrors.calleAvenida = 'Requerido';
    if (!formData.celular || !/^[6-7]\d{7}$/.test(formData.celular)) fieldErrors.celular = 'Formato inválido (8 dígitos, empieza con 6 o 7)';
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) fieldErrors.email = 'Email inválido';
    if (!formData.cargoPostulacion) fieldErrors.cargoPostulacion = 'Seleccione un cargo';
    if (!formData.experienciaGeneral) fieldErrors.experienciaGeneral = 'Requerido';
    if (!formData.archivo_ci) fieldErrors.archivo_ci = 'Requerido';
    if (!formData.archivo_no_militancia) fieldErrors.archivo_no_militancia = 'Requerido';
    if (!formData.archivo_curriculum) fieldErrors.archivo_curriculum = 'Requerido';

    // Validate all requisitos are checked
    const req = formData.requisitos;
    const unchecked = [
      !req.esBoliviano && 'Es ciudadano/a boliviano/a',
      !req.registradoPadronElectoral && 'Registrado/a en el Padrón Electoral',
      !req.ciVigente && 'Cédula de Identidad vigente',
      !req.disponibilidadTiempoCompleto && 'Disponibilidad a tiempo completo',
      !req.lineaEntel && 'Cuenta con línea Entel',
      !req.ningunaMilitanciaPolitica && 'Sin militancia política',
      !req.sinConflictosInstitucion && 'Sin conflictos con la institución',
      !req.sinSentenciaEjecutoriada && 'Sin sentencia ejecutoriada',
      !req.cuentaConCelularAndroid && 'Cuenta con celular Android',
      !req.cuentaConPowerbank && 'Cuenta con Powerbank',
    ].filter(Boolean) as string[];

    if (unchecked.length > 0) {
      fieldErrors.requisitos = `Debe confirmar todos los requisitos. Pendientes: ${unchecked.join(', ')}.`;
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      showMsg('error', 'Por favor complete todos los campos requeridos.');
      return;
    }

    // Si pasa validacion → ir al paso de confirmación SERECI
    setCurrentStep('confirmation');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Envío real al backend (con observacion opcional) ───
  const submitRegistration = async (observacion = '') => {
    setIsLoading(true);
    try {
      const isConnected = await checkConnectivity();
      if (!isConnected) { showMsg('error', 'Sin conexión al servidor.'); setIsLoading(false); return; }

      const fd = new FormData();
      fd.append('cedulaIdentidad', verificationData.cedula_identidad);
      fd.append('complemento', verificationData.complemento);
      fd.append('expedicion', verificationData.expedicion);
      if (observacion) fd.append('observacion', observacion);

      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'requisitos') {
          fd.append('requisitos', JSON.stringify(value));
        } else if (key === 'observacion') {
          // ya añadido arriba si aplica
        } else if (value instanceof File) {
          fd.append(key, value);
        } else if (typeof value === 'number') {
          fd.append(key, String(value));
        } else if (value !== null && value !== undefined && value !== '') {
          fd.append(key, String(value));
        }
      });

      const res = await fetch('/api/postulantes/', { method: 'POST', body: fd });
      const ct = res.headers.get('content-type') || '';

      if (!res.ok) {
        if (ct.includes('application/json')) {
          const errJson = await res.json();
          const msg: string = errJson.message || errJson.error || '';
          const isDuplicate = !errJson.success && (
            msg.toLowerCase().includes('ya existe') ||
            msg.toLowerCase().includes('cedula') ||
            msg.toLowerCase().includes('cédula')
          );
          if (isDuplicate) {
            setRegisteredPdfUrl(`/api/postulantes/pdf/${verificationData.cedula_identidad}/`);
            setCurrentStep('already_registered');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
          }
          throw new Error(errJson.message || errJson.error || `Error ${res.status}`);
        }
        const errText = await res.text();
        throw new Error(`Error ${res.status}: ${errText}`);
      }

      if (ct.includes('application/json')) {
        const result = await res.json();
        if (result.success) {
          setRegisteredPdfUrl(result.pdfUrl);
          setCurrentStep('success');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          showMsg('error', result.message || 'Error al registrar.');
        }
      } else {
        const blob = await res.blob();
        if (blob.type === 'application/pdf') {
          setRegisteredPdfUrl(window.URL.createObjectURL(blob));
          setCurrentStep('success');
        } else {
          throw new Error('Respuesta inesperada del servidor');
        }
      }
    } catch (err) {
      console.error(err);
      showMsg('error', err instanceof Error ? err.message : 'Error al registrar.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── UI ─────────────────────────────────────────────────
  const inputCls = (err?: string) =>
    `w-full px-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none transition-all font-medium text-gray-800 ${err ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-blue-500 focus:bg-white'}`;

  const labelCls = 'block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5';

  // ─────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────
  if (isCheckingConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Verificando estado del sistema...</p>
        </div>
      </div>
    );
  }

  if (systemConfig && !systemConfig.sistema_activo) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl p-10 text-center space-y-8 border-t-8 border-red-600">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-12 h-12 text-red-600" />
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Postulaciones Cerradas</h1>
            <p className="text-gray-600 text-lg font-medium leading-relaxed">
              {systemConfig.mensaje || "El sistema de postulación se ha cerrado."}
            </p>
          </div>
          <div className="pt-4">
            <img src="logoOEP.png" className="h-16 mx-auto object-contain opacity-50 grayscale" alt="OEP Logo" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-4">

        {/* ── HEADER ── */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-2xl shadow-2xl text-white p-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
              <User className="w-6 h-6" /> SIREPRE — RECLUTAMIENTO
            </h1>
            <p className="text-blue-200 text-sm mt-1 font-medium">Sistema de Resultados Preliminares</p>
          </div>
          {currentStep !== 'start' && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              <PlusCircle className="w-4 h-4" /> Ir al Inicio
            </button>
          )}
        </div>

        {/* ── GLOBAL MESSAGE ── */}
        {message && (
          <div
            ref={messageRef}
            className={`p-4 rounded-xl border flex items-center gap-3 font-medium shadow-sm transition-all animate-in fade-in slide-in-from-top-4 ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : message.type === 'error' ? 'bg-red-50 border-red-300 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}
          >
            {message.type === 'success' && <CheckCircle className="w-5 h-5 shrink-0" />}
            {message.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="flex-1">{message.text}</span>
            <button onClick={() => setMessage(null)} className="opacity-50 hover:opacity-100 transition-opacity">
              <PlusCircle className="w-4 h-4 rotate-45" />
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* STEP: START                                    */}
        {/* ══════════════════════════════════════════════ */}
        {currentStep === 'start' && (
          <div className="space-y-6">

            {/* Hero */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
              <div className="grid grid-cols-3 pt-10 pb-2">
                <div />
                <div className="flex justify-center">
                  <img src="logoOEP.png" className="h-24 object-contain" alt="OEP Logo" />
                </div>
                <div />
              </div>
              <div className="p-10 text-center space-y-6">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase">
                  Proceso de Reclutamiento y Selección
                </h2>
                <p className="text-blue-600 text-xl font-extrabold uppercase tracking-widest">
                  CONVOCATORIA OPERADORES DE TRANSMISION SIREPRE
                </p>
                <button
                  onClick={() => setCurrentStep('personal')}
                  className="inline-flex items-center gap-3 px-12 py-5 bg-blue-600 text-white rounded-2xl text-xl font-black shadow-2xl hover:bg-blue-700 hover:scale-105 active:scale-100 transition-all"
                >
                  <UserCheck className="w-7 h-7" />
                  POSTULAR AHORA
                </button>
              </div>
            </div>

            {/* Formularios */}
            <div className="bg-white rounded-3xl shadow-lg p-10 space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 rounded-2xl mb-2">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Formularios de Declaración Jurada para descargar</h3>
                <p className="text-gray-500 font-medium">Descargue, complete y firme estos formularios. Deberá adjuntarlos en su postulación.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { href: '/formularios/FORMULARIO-DE-DECLARACION-JURADA-POSTULACION-SUBNACIONALES.pdf', label: 'Declaración Jurada de Postulación' },
                  { href: '/formularios/FORMULARIO-DE-DECLARACION-JURADA-DE-INCONPATIBILIDAD-SUBNACIONALES.pdf', label: 'Declaración Jurada de Incompatibilidad' },
                ].map(f => (
                  <a key={f.label} href={f.href} download
                    className="flex flex-col items-center gap-4 p-8 bg-green-50 border-2 border-green-100 rounded-3xl hover:shadow-xl hover:border-green-300 transition-all group">
                    <div className="p-4 bg-green-600 text-white rounded-2xl shadow-md group-hover:rotate-6 transition-transform">
                      <FileDown className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                      <p className="font-black text-green-900">{f.label}</p>
                      <p className="text-xs text-green-600 font-bold uppercase tracking-widest mt-1">Click para descargar PDF</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Cargos */}
            <div className="bg-white rounded-3xl shadow-lg p-10">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b">
                <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Cargos Disponibles y Requisitos</h3>
                  <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Información para el postulante</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(requisitosCargo).map(([cargo, reqs]) => {
                  const Icon = iconosCargo[cargo] || Briefcase;
                  return (
                    <div key={cargo} className="bg-gray-50 rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:border-blue-200 hover:bg-white transition-all group">
                      <div className="w-12 h-12 bg-white shadow rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors">
                        <Icon className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                      </div>
                      <h4 className="font-black text-gray-900 uppercase tracking-tight mb-3">{cargo}</h4>
                      <ul className="space-y-2">
                        {reqs.map((r, i) => (
                          <li key={i} className="flex gap-2 text-sm text-gray-600">
                            <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* STEP: PERSONAL (Paso 1)                        */}
        {/* ══════════════════════════════════════════════ */}
        {currentStep === 'personal' && (
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="bg-blue-600 p-6 px-10 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-white/20 rounded-xl"><UserCheck className="w-6 h-6" /></div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">Paso 1 — Datos Personales</h2>
                  <p className="text-blue-100 text-xs font-bold">Identificación y datos biográficos</p>
                </div>
              </div>
              <span className="text-5xl font-black text-white/10">01</span>
            </div>

            <div className="p-8 md:p-10">
              {/* Warning */}
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 mb-8 flex gap-4 items-start">
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900 font-bold leading-relaxed">
                  IMPORTANTE: La postulación solo se puede realizar <span className="underline decoration-2">UNA SOLA VEZ</span>.
                  <br /> Si se identifica mas de un registro, sera causal de  <span className="text-red-700">inhabilitación automática.</span>
                  <br />  Verifique que sus datos coincidan con su documento de identidad.
                </p>
              </div>

              <form onSubmit={handlePersonalSubmit} className="space-y-8">

                {/* Cédula */}
                <div>
                  <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <span className="w-6 h-px bg-blue-300" /> Documento de Identidad
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelCls}>Cédula de Identidad *</label>
                      <input
                        type="text" required
                        value={verificationData.cedula_identidad}
                        onChange={e => setVerificationData(p => ({ ...p, cedula_identidad: e.target.value.replace(/\D/g, '').slice(0, 9) }))}
                        className={`${inputCls()} text-2xl font-black`}
                        placeholder="1234567"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Complemento</label>
                      <input
                        type="text"
                        value={verificationData.complemento}
                        onChange={e => setVerificationData(p => ({ ...p, complemento: e.target.value.toUpperCase() }))}
                        className={inputCls()}
                        placeholder="EJ: 1A"
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Expedición *</label>
                      <select
                        required
                        value={verificationData.expedicion}
                        onChange={e => setVerificationData(p => ({ ...p, expedicion: e.target.value }))}
                        className={inputCls()}
                      >
                        <option value="">Seleccione...</option>
                        {['LP', 'CB', 'SC', 'OR', 'PT', 'TJ', 'CH', 'BN', 'PD'].map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Datos biográficos */}
                <div>
                  <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <span className="w-6 h-px bg-blue-300" /> Datos Biográficos
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelCls}>Nombre(s) *</label>
                      <input
                        type="text" required
                        value={formData.nombre}
                        onChange={e => handleInputChange('nombre', e.target.value.toUpperCase())}
                        className={`${inputCls(errors.nombre)} uppercase`}
                      />
                      {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
                    </div>
                    <div>
                      <label className={labelCls}>Apellido Paterno</label>
                      <input
                        type="text"
                        value={formData.apellidoPaterno}
                        onChange={e => handleInputChange('apellidoPaterno', e.target.value.toUpperCase())}
                        className={`${inputCls()} uppercase`}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Apellido Materno</label>
                      <input
                        type="text"
                        value={formData.apellidoMaterno}
                        onChange={e => handleInputChange('apellidoMaterno', e.target.value.toUpperCase())}
                        className={`${inputCls()} uppercase`}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Fecha de Nacimiento *</label>
                      <input
                        type="date" required
                        value={formData.fechaNacimiento}
                        onChange={e => handleInputChange('fechaNacimiento', e.target.value)}
                        min="1940-01-01" max="2007-11-25"
                        className={inputCls(errors.fechaNacimiento)}
                      />
                      {errors.fechaNacimiento && <p className="text-red-500 text-xs mt-1">{errors.fechaNacimiento}</p>}
                    </div>
                    <div>
                      <label className={labelCls}>Grado de Instrucción *</label>
                      <select
                        required
                        value={formData.gradoInstruccion}
                        onChange={e => handleInputChange('gradoInstruccion', e.target.value)}
                        className={inputCls(errors.gradoInstruccion)}
                      >
                        <option value="">Seleccione...</option>
                        {['BACHILLER', 'TECNICO MEDIO', 'TECNICO SUPERIOR', 'UNIVERSITARIO', 'LICENCIATURA'].map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                      {errors.gradoInstruccion && <p className="text-red-500 text-xs mt-1">{errors.gradoInstruccion}</p>}
                    </div>
                    <div>
                      <label className={labelCls}>Carrera</label>
                      <input
                        type="text"
                        value={formData.carrera}
                        onChange={e => handleInputChange('carrera', e.target.value.toUpperCase())}
                        disabled={!formData.gradoInstruccion || formData.gradoInstruccion === 'BACHILLER'}
                        className={`${inputCls()} uppercase disabled:opacity-30`}
                        placeholder="Ej: SISTEMAS"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep('start')}
                    className="px-8 py-4 bg-gray-100 text-gray-500 rounded-xl font-black hover:bg-gray-200 transition-all uppercase tracking-wider text-sm"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center justify-center gap-3 px-10 py-4 bg-blue-600 text-white rounded-xl font-black shadow-xl hover:bg-blue-700 disabled:opacity-50 transition-all text-lg"
                  >
                    {isLoading ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> VERIFICANDO...</>
                    ) : (
                      <><ShieldCheck className="w-5 h-5" /> CONTINUAR AL PASO 2</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* STEP: ADDITIONAL (Paso 2)                      */}
        {/* ══════════════════════════════════════════════ */}
        {currentStep === 'additional' && (
          <form onSubmit={handleRegistration} className="space-y-6">

            {/* Header */}
            <div className="bg-blue-600 rounded-2xl shadow-lg text-white p-6 px-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-white/20 rounded-xl"><ShieldCheck className="w-6 h-6" /></div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">Paso 2 — Información Complementaria</h2>
                  <p className="text-blue-100 text-xs font-bold">Domicilio · Contacto · Cargo · Archivos · Recinto</p>
                </div>
              </div>
              <span className="text-5xl font-black text-white/10">02</span>
            </div>

            {/* Resumen Paso 1 */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex flex-wrap gap-6 text-sm">
              <div><span className="text-xs font-black text-blue-500 uppercase tracking-wider block">CI</span><span className="font-black text-gray-900">{verificationData.cedula_identidad}{verificationData.complemento && `-${verificationData.complemento}`} {verificationData.expedicion}</span></div>
              <div><span className="text-xs font-black text-blue-500 uppercase tracking-wider block">Nombre</span><span className="font-black text-gray-900">{formData.nombre} {formData.apellidoPaterno} {formData.apellidoMaterno}</span></div>
              <div><span className="text-xs font-black text-blue-500 uppercase tracking-wider block">Fecha Nac.</span><span className="font-black text-gray-900">{formData.fechaNacimiento}</span></div>
              <div><span className="text-xs font-black text-blue-500 uppercase tracking-wider block">Instrucción</span><span className="font-black text-gray-900">{formData.gradoInstruccion}{formData.carrera && ` — ${formData.carrera}`}</span></div>
            </div>

            {/* Domicilio y Contacto */}
            <div className="bg-white rounded-2xl shadow-md p-8 space-y-4">
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
                <Home className="w-4 h-4" /> Domicilio y Contacto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Ciudad / Localidad *</label>
                  <input type="text" value={formData.ciudad}
                    onChange={e => handleInputChange('ciudad', e.target.value.toUpperCase())}
                    className={`${inputCls(errors.ciudad)} uppercase`} required />
                  {errors.ciudad && <p className="text-red-500 text-xs mt-1">{errors.ciudad}</p>}
                </div>
                <div>
                  <label className={labelCls}>Barrio / Zona *</label>
                  <input type="text" value={formData.zona}
                    onChange={e => handleInputChange('zona', e.target.value.toUpperCase())}
                    className={`${inputCls(errors.zona)} uppercase`} required />
                  {errors.zona && <p className="text-red-500 text-xs mt-1">{errors.zona}</p>}
                </div>
                <div>
                  <label className={labelCls}>Avenida / Calle *</label>
                  <input type="text" value={formData.calleAvenida}
                    onChange={e => handleInputChange('calleAvenida', e.target.value.toUpperCase())}
                    className={`${inputCls(errors.calleAvenida)} uppercase`} required />
                  {errors.calleAvenida && <p className="text-red-500 text-xs mt-1">{errors.calleAvenida}</p>}
                </div>
                <div>
                  <label className={labelCls}>Nro. Domicilio</label>
                  <input type="text" value={formData.numeroDomicilio}
                    onChange={e => handleInputChange('numeroDomicilio', e.target.value.toUpperCase())}
                    className={`${inputCls()} uppercase`} />
                </div>
                <div>
                  <label className={labelCls}>Celular *</label>
                  <input type="tel" value={formData.celular}
                    onChange={e => handleInputChange('celular', e.target.value.replace(/\D/g, '').slice(0, 8))}
                    className={inputCls(errors.celular)} placeholder="70000000" required />
                  {errors.celular && <p className="text-red-500 text-xs mt-1">{errors.celular}</p>}
                </div>
                <div>
                  <label className={labelCls}>Correo Electrónico *</label>
                  <input type="email" value={formData.email}
                    onChange={e => handleInputChange('email', e.target.value)}
                    className={inputCls(errors.email)} placeholder="usuario@ejemplo.com" required />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
              </div>
            </div>

            {/* Cargo */}
            <div className="bg-white rounded-2xl shadow-md p-8">
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                <Briefcase className="w-4 h-4" /> Cargo de Postulación
              </h3>
              <div className="max-w-md">
                <label className={labelCls}>Seleccione el Cargo *</label>
                <select
                  value={formData.cargoPostulacion}
                  onChange={e => handleInputChange('cargoPostulacion', e.target.value)}
                  className={inputCls(errors.cargoPostulacion)} required
                >
                  <option value="">Seleccione un cargo...</option>
                  {Object.keys(requisitosCargo).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.cargoPostulacion && <p className="text-red-500 text-xs mt-1">{errors.cargoPostulacion}</p>}
              </div>
            </div>

            {/* Experiencia */}
            <div className="bg-white rounded-2xl shadow-md p-8">
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                <CheckSquare className="w-4 h-4" /> Experiencia en Procesos Electorales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
                <div>
                  <label className={labelCls}>¿Tiene experiencia? *</label>
                  <select value={formData.experienciaGeneral}
                    onChange={e => handleInputChange('experienciaGeneral', e.target.value)}
                    className={inputCls(errors.experienciaGeneral)} required>
                    <option value="">Seleccione...</option>
                    <option value="SI">SÍ, TENGO EXPERIENCIA</option>
                    <option value="NO">NO TENGO EXPERIENCIA</option>
                  </select>
                  {errors.experienciaGeneral && <p className="text-red-500 text-xs mt-1">{errors.experienciaGeneral}</p>}
                </div>
                <div>
                  <label className={labelCls}>Nro. de Procesos</label>
                  <select value={formData.experienciaEspecifica}
                    onChange={e => handleInputChange('experienciaEspecifica', e.target.value)}
                    disabled={formData.experienciaGeneral !== 'SI'}
                    className={`${inputCls()} disabled:opacity-30`}>
                    <option value="">Seleccione...</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <option key={n} value={n.toString()}>{n}</option>)}
                    <option value="10">10 o más</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── Requisitos Declarados ──────────────────────── */}
            <div className="bg-white rounded-2xl shadow-md p-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-600 rounded-xl">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em]">Requisitos Declarados</h3>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">Marque todos los requisitos que cumple. Todos son obligatorios.</p>
                </div>
              </div>

              {errors.requisitos && (
                <div className="mt-3 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                  {errors.requisitos}
                </div>
              )}

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  { key: 'esBoliviano', label: 'Es ciudadano/a boliviano/a', desc: 'Posee la nacionalidad boliviana' },
                  { key: 'registradoPadronElectoral', label: 'Registrado/a en el Padrón Electoral', desc: 'Habilitado para votar en Bolivia' },
                  { key: 'ciVigente', label: 'Cédula de Identidad vigente', desc: 'CI no vencida ni cancelada' },
                  { key: 'disponibilidadTiempoCompleto', label: 'Disponibilidad a tiempo completo', desc: 'Durante el tiempo que dure las activadedes del SIREPRE.' },
                  { key: 'lineaEntel', label: 'Cuenta con línea Entel', desc: 'Línea activa de la operadora Entel' },
                  { key: 'ningunaMilitanciaPolitica', label: 'Sin militancia política', desc: 'No pertenece a ningún partido político' },
                  { key: 'sinConflictosInstitucion', label: 'Sin conflictos con la institución', desc: 'Sin procesos administrativos pendientes con el OEP/TSE' },
                  { key: 'sinSentenciaEjecutoriada', label: 'Sin sentencia ejecutoriada', desc: 'Sin condena en firme por delitos dolosos' },
                  { key: 'cuentaConCelularAndroid', label: 'Cuenta con celular Android 8.1 o superior', desc: 'Smartphone Android en buen estado para la función' },
                  { key: 'cuentaConPowerbank', label: 'Cuenta con Powerbank', desc: 'Batería portátil para uso en campo' },
                ] as { key: keyof typeof formData.requisitos; label: string; desc: string }[]).map(({ key, label, desc }) => {
                  const checked = formData.requisitos[key];
                  return (
                    <label
                      key={key}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer select-none transition-all ${checked
                        ? 'bg-green-50 border-green-400 shadow-sm'
                        : 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                    >
                      {/* Custom checkbox */}
                      <div
                        className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all ${checked
                          ? 'bg-green-500 border-green-500'
                          : 'bg-white border-gray-300'
                          }`}
                      >
                        {checked && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-black leading-tight ${checked ? 'text-green-800' : 'text-gray-700'}`}>
                          {label}
                        </p>
                        <p className="text-xs text-gray-400 font-medium mt-0.5 leading-tight">{desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={e => handleInputChange(`requisitos.${key}`, e.target.checked)}
                      />
                    </label>
                  );
                })}
              </div>

              {/* Progreso de requisitos */}
              {(() => {
                const total = 10;
                const done = Object.values(formData.requisitos).filter(Boolean).length;
                const pct = (done / total) * 100;
                return (
                  <div className="mt-5">
                    <div className="flex justify-between text-xs font-black text-gray-400 mb-1.5">
                      <span>Requisitos confirmados: {done} / {total}</span>
                      <span className={done === total ? 'text-green-600' : 'text-amber-500'}>
                        {done === total ? '✓ COMPLETO' : 'PENDIENTES'}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${done === total ? 'bg-green-500' : done >= 5 ? 'bg-amber-400' : 'bg-red-400'
                          }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Archivos */}
            <div className="bg-white rounded-2xl shadow-md p-8">
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
                <FileText className="w-4 h-4" /> Documentos Adjuntos
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <AsyncFileUpload
                  label="Cédula de Identidad *"
                  description="Anverso y Reverso en un solo PDF (Max 3MB)"
                  accept={{ 'application/pdf': ['.pdf'] }}
                  imageRef="ci.jpg"
                  initialValue={typeof formData.archivo_ci === 'number' ? formData.archivo_ci : null}
                  onUploadSuccess={id => handleInputChange('archivo_ci', id)}
                  onClear={() => handleInputChange('archivo_ci', null)}
                  error={errors.archivo_ci}
                />
                <AsyncFileUpload
                  label="Captura de pantalla Yo Participo *"
                  description="Subir archivo en formato imagen (JPG, JPEG, PNG Max.3MB)"
                  accept={{ 'image/jpeg': ['.jpeg', '.jpg'], 'image/png': ['.png'] }}
                  imageRef="/yoparticipo.png"
                  initialValue={typeof formData.archivo_no_militancia === 'number' ? formData.archivo_no_militancia : null}
                  onUploadSuccess={id => handleInputChange('archivo_no_militancia', id)}
                  onClear={() => handleInputChange('archivo_no_militancia', null)}
                  error={errors.archivo_no_militancia}
                />
                <AsyncFileUpload
                  label="Hoja de Vida *"
                  description="Hoja de Vida No Documentada (PDF Max 3MB)"
                  accept={{ 'application/pdf': ['.pdf'] }}
                  imageRef="/cv.jpg"
                  initialValue={typeof formData.archivo_curriculum === 'number' ? formData.archivo_curriculum : null}
                  onUploadSuccess={id => handleInputChange('archivo_curriculum', id)}
                  onClear={() => handleInputChange('archivo_curriculum', null)}
                  error={errors.archivo_curriculum}
                />
                <AsyncFileUpload
                  label="Certificado de Experiencia"
                  description="En procesos Electorales — Opcional (PDF Max 3MB)"
                  accept={{ 'application/pdf': ['.pdf'] }}
                  imageRef="/certificado.png"
                  initialValue={typeof formData.archivo_certificado_ofimatica === 'number' ? formData.archivo_certificado_ofimatica : null}
                  onUploadSuccess={id => handleInputChange('archivo_certificado_ofimatica', id)}
                  onClear={() => handleInputChange('archivo_certificado_ofimatica', null)}
                  error={errors.archivo_certificado_ofimatica}
                />
              </div>
            </div>

            {/* Recinto */}
            <div className="bg-white rounded-2xl shadow-md p-8">
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                <Warehouse className="w-4 h-4" /> Recinto Electoral de Votación
              </h3>
              <p className="text-sm text-gray-500 font-medium mb-4">Seleccione en el mapa el recinto donde usted vota.</p>
              <div className="rounded-2xl overflow-hidden border-2 border-gray-100">
                <RecintoSelector
                  onSelect={(name, value) => handleInputChange(name, value)}
                  selected1={formData.recinto_primera_opcion}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 pb-10">
              <button
                type="button"
                onClick={() => setCurrentStep('personal')}
                className="px-8 py-4 bg-white border-2 border-gray-200 text-gray-500 rounded-xl font-black hover:bg-gray-50 transition-all uppercase tracking-wider text-sm"
              >
                Volver al Paso 1
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center justify-center gap-3 px-12 py-5 bg-green-600 text-white rounded-2xl font-black shadow-2xl hover:bg-green-700 disabled:opacity-50 transition-all text-xl"
              >
                {isLoading ? (
                  <><Loader2 className="w-6 h-6 animate-spin" /> PROCESANDO REGISTRO...</>
                ) : (
                  <><CheckCircle className="w-6 h-6" /> FINALIZAR POSTULACIÓN</>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* STEP: CONFIRMATION (SERECI designation)        */}
        {/* ══════════════════════════════════════════════ */}
        {currentStep === 'confirmation' && (
          <div className="max-w-2xl mx-auto py-6">
            <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">

              {/* Header */}
              <div className="bg-gradient-to-br from-blue-700 to-blue-900 p-10 text-white text-center">

              </div>

              <div className="p-10 space-y-8">
                {/* Mensaje institucional */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-7 text-center space-y-3">
                  <p className="text-blue-900 font-black text-lg leading-relaxed">
                    El SERECI La Paz realizará la designación de recintos de transmisión de acuerdo a requerimiento.
                  </p>
                  <p className="text-blue-700 font-bold text-base">
                    ¿Está de acuerdo con esta modalidad de designación?
                  </p>
                </div>

                {/* Botones Sí / No */}
                <div className="grid grid-cols-2 gap-5">
                  {/* NO → registrar con observación y volver al inicio */}
                  <button
                    disabled={isLoading}
                    onClick={() => setShowNoAgreementModal(true)}
                    className="flex flex-col items-center gap-3 p-6 bg-red-50 border-2 border-red-200 rounded-2xl hover:bg-red-100 hover:border-red-400 transition-all group disabled:opacity-50"
                  >
                    <div className="w-14 h-14 bg-red-100 group-hover:bg-red-200 rounded-2xl flex items-center justify-center transition-colors">
                      <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <div className="text-center">
                      <p className="font-black text-red-700 text-lg">NO</p>
                      <p className="text-xs text-red-500 font-bold mt-1 uppercase tracking-wider">No estoy de acuerdo</p>
                    </div>
                    {isLoading && <Loader2 className="w-5 h-5 animate-spin text-red-500" />}
                  </button>

                  {/* SÍ → ir a revisión de datos */}
                  <button
                    onClick={() => {
                      setCurrentStep('review');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex flex-col items-center gap-3 p-6 bg-green-50 border-2 border-green-200 rounded-2xl hover:bg-green-100 hover:border-green-400 transition-all group"
                  >
                    <div className="w-14 h-14 bg-green-100 group-hover:bg-green-200 rounded-2xl flex items-center justify-center transition-colors">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="text-center">
                      <p className="font-black text-green-700 text-lg">SÍ</p>
                      <p className="text-xs text-green-600 font-bold mt-1 uppercase tracking-wider">Estoy de acuerdo</p>
                    </div>
                  </button>
                </div>

                {/* Advertencia NO */}
                <p className="text-center text-xs text-gray-400 font-medium">
                  Si selecciona <span className="font-black text-red-500">NO</span>, su postulación quedará registrada pero no será considerada.
                </p>

                <button
                  onClick={() => setCurrentStep('additional')}
                  className="px-8 py-4 bg-white border-2 border-gray-200 text-gray-500 rounded-xl font-black hover:bg-gray-50 transition-all uppercase tracking-wider text-sm mt-4"
                >
                  Volver a editar datos
                </button>
              </div>
            </div>

            {/* Custom Modal for "No Agreement" */}
            {showNoAgreementModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="bg-red-600 p-8 text-white text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">Confirmación</h3>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-6 text-red-900 font-bold text-center leading-relaxed">
                      "Sr. Postulante, si selecciona que NO está de acuerdo, su postulación se registrará pero <span className="text-red-700 font-black">NO será considerada</span> para el proceso de selección."
                    </div>

                    <div className="flex flex-col gap-3">
                      <button
                        onClick={async () => {
                          setShowNoAgreementModal(false);
                          await submitRegistration(
                            'POSTULACION - NO ESTA DE ACUERDO CON DESIGNACION DE ACUERDO A REQUERIMIENTO'
                          );
                        }}
                        disabled={isLoading}
                        className="w-full py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2 text-sm uppercase px-4 text-center"
                      >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "No estoy de acuerdo con la designación de requerimientos."}
                      </button>

                      <button
                        onClick={() => setShowNoAgreementModal(false)}
                        className="w-full py-4 bg-green-600 text-white rounded-2xl font-black shadow-lg hover:bg-green-700 transition-all text-sm uppercase"
                      >
                        Volver atrás
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* STEP: REVIEW (verificación de datos)           */}
        {/* ══════════════════════════════════════════════ */}
        {currentStep === 'review' && (() => {
          const r = formData.requisitos;
          const reqLabels: [keyof typeof r, string][] = [
            ['esBoliviano', 'Es ciudadano/a boliviano/a'],
            ['registradoPadronElectoral', 'Registrado/a en el Padrón Electoral'],
            ['ciVigente', 'Cédula de Identidad vigente'],
            ['disponibilidadTiempoCompleto', 'Disponibilidad a tiempo completo'],
            ['lineaEntel', 'Cuenta con línea Entel'],
            ['ningunaMilitanciaPolitica', 'Sin militancia política'],
            ['sinConflictosInstitucion', 'Sin conflictos con la institución'],
            ['sinSentenciaEjecutoriada', 'Sin sentencia ejecutoriada'],
            ['cuentaConCelularAndroid', 'Cuenta con celular Android'],
            ['cuentaConPowerbank', 'Cuenta con Powerbank'],
          ];
          const Row = ({ label, value }: { label: string; value: string }) => (
            <div className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
              <span className="text-xs font-black text-gray-400 uppercase w-44 shrink-0">{label}</span>
              <span className="text-sm font-bold text-gray-800 break-all">{value || '—'}</span>
            </div>
          );
          return (
            <div className="max-w-3xl mx-auto py-6 space-y-5">

              {/* Header */}
              <div className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-2xl shadow-xl text-white p-7 text-center">
                <NotebookPen className="w-8 h-8 mx-auto mb-3 opacity-80" />
                <h2 className="text-2xl font-black uppercase tracking-tight">Verificación de Datos</h2>
                <p className="text-blue-200 font-bold text-sm mt-1">Revise que toda su información sea correcta antes de confirmar</p>
              </div>

              {/* § Identificación */}
              <div className="bg-white rounded-2xl shadow-md p-6">
                <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" /> Identificación
                </h3>
                <Row label="CI" value={`${verificationData.cedula_identidad}${verificationData.complemento ? `-${verificationData.complemento}` : ''} ${verificationData.expedicion}`} />
                <Row label="Nombre(s)" value={formData.nombre} />
                <Row label="Ap. Paterno" value={formData.apellidoPaterno} />
                <Row label="Ap. Materno" value={formData.apellidoMaterno} />
                <Row label="F. Nacimiento" value={formData.fechaNacimiento} />
                <Row label="Instrucción" value={`${formData.gradoInstruccion}${formData.carrera ? ` — ${formData.carrera}` : ''}`} />
              </div>

              {/* § Contacto y Domicilio */}
              <div className="bg-white rounded-2xl shadow-md p-6">
                <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Home className="w-4 h-4" /> Domicilio y Contacto
                </h3>
                <Row label="Ciudad" value={formData.ciudad} />
                <Row label="Zona/Barrio" value={formData.zona} />
                <Row label="Calle/Av." value={`${formData.calleAvenida} ${formData.numeroDomicilio}`} />
                <Row label="Celular" value={formData.celular} />
                <Row label="Cel. Respaldo" value={formData.telefono} />
                <Row label="Email" value={formData.email} />
              </div>

              {/* § Postulación */}
              <div className="bg-white rounded-2xl shadow-md p-6">
                <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" /> Postulación
                </h3>
                <Row label="Cargo" value={formData.cargoPostulacion} />
                <Row label="Experiencia" value={formData.experienciaGeneral === 'SI' ? 'SÍ, TIENE EXPERIENCIA' : 'NO TIENE EXPERIENCIA'} />
                <Row label="Nro. Procesos" value={formData.experienciaEspecifica} />
              </div>

              {/* § Requisitos */}
              <div className="bg-white rounded-2xl shadow-md p-6">
                <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Requisitos Declarados
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {reqLabels.map(([key, label]) => (
                    <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold ${r[key] ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
                      {r[key]
                        ? <CheckCircle className="w-4 h-4 shrink-0 text-green-500" />
                        : <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />}
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex flex-col sm:flex-row gap-4 pb-10">
                <button
                  onClick={() => setCurrentStep('additional')}
                  className="flex-1 px-8 py-4 bg-white border-2 border-gray-200 text-gray-600 rounded-xl font-black hover:bg-gray-50 transition-all uppercase tracking-wider text-sm flex items-center justify-center gap-2"
                >
                  <AlertCircle className="w-5 h-5" /> Editar datos
                </button>
                <button
                  onClick={() => submitRegistration()}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-3 px-10 py-4 bg-green-600 text-white rounded-xl font-black shadow-xl hover:bg-green-700 disabled:opacity-50 transition-all text-lg"
                >
                  {isLoading
                    ? <><Loader2 className="w-6 h-6 animate-spin" /> ENVIANDO...</>
                    : <><CheckCircle className="w-6 h-6" /> CONFIRMAR Y ENVIAR</>}
                </button>
              </div>
            </div>
          );
        })()}

        {/* ══════════════════════════════════════════════ */}
        {/* STEP: ALREADY_REGISTERED                       */}
        {/* ══════════════════════════════════════════════ */}
        {currentStep === 'already_registered' && (
          <div className="max-w-2xl mx-auto py-6">
            <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-red-50">
              <div className="bg-gradient-to-br from-red-600 to-red-700 p-12 text-white text-center">
                <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-12 h-12" />
                </div>
                <h2 className="text-4xl font-black uppercase tracking-tight">Ya se Encuentra Registrado</h2>
                <p className="text-red-100 font-bold mt-2 tracking-widest text-sm uppercase">Detección de Registro Existente</p>
              </div>
              <div className="p-12 text-center space-y-8">
                <div className="bg-red-50 border-2 border-red-100 rounded-3xl p-8 text-red-900 font-bold text-lg leading-relaxed italic">
                  "Sr. Postulante, nuestro sistema indica que usted ya cuenta con un registro activo. Los dobles registros <span className="text-red-700 not-italic font-black">inhabilitarán automáticamente</span> su postulación."
                </div>
                <div className="space-y-4">
                  <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Acciones Disponibles</p>
                  {registeredPdfUrl && (
                    <button
                      onClick={() => descargarPDF(registeredPdfUrl, `formulario_${verificationData.cedula_identidad}.pdf`)}
                      className="w-full max-w-sm py-5 bg-blue-600 text-white rounded-3xl font-black shadow-xl hover:bg-blue-700 hover:scale-105 active:scale-100 transition-all flex items-center justify-center gap-4 mx-auto"
                    >
                      <FileDown className="w-7 h-7" />
                      DESCARGAR FORMULARIO EXISTENTE
                    </button>
                  )}
                  <button onClick={handleReset}
                    className="block mx-auto text-gray-400 font-black hover:text-gray-600 transition-colors uppercase tracking-widest text-xs mt-4">
                    Volver al Inicio
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* STEP: SUCCESS                                  */}
        {/* ══════════════════════════════════════════════ */}
        {currentStep === 'success' && (
          <div className="max-w-2xl mx-auto py-6">
            <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-green-50">
              <div className="bg-gradient-to-br from-green-600 to-green-700 p-12 text-white text-center">
                <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-12 h-12" />
                </div>
                <h2 className="text-4xl font-black uppercase tracking-tight">¡Registro Exitoso!</h2>
                <p className="text-green-100 font-bold mt-2 tracking-widest text-sm uppercase">Postulación completada</p>
              </div>
              <div className="p-12 space-y-8">
                {/* Notice */}
                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 text-amber-900 font-bold leading-relaxed text-center">
                  <p className="text-lg"><span className="underline decoration-2"></span>SOLO  los postulantes seleccionados deberán presentar su formulario de registro <span className="underline decoration-2">debidamente firmado</span>, adjuntando su hoja de vida y los respaldos correspondientes.</p>
                </div>

                {/* Info del postulante */}
                <div className="bg-gray-50 rounded-2xl p-6 text-center">
                  <p className="text-xs text-gray-400 font-black uppercase tracking-[0.3em] mb-2">Postulante</p>
                  <p className="text-xl font-black text-gray-900 uppercase">{formData.nombre} {formData.apellidoPaterno} {formData.apellidoMaterno}</p>
                  <p className="text-sm text-gray-500 font-medium mt-1">CI: {verificationData.cedula_identidad}{verificationData.complemento && `-${verificationData.complemento}`} {verificationData.expedicion}</p>
                  {formData.cargoPostulacion && (
                    <p className="text-sm font-black text-blue-600 mt-2">Cargo: {formData.cargoPostulacion}</p>
                  )}
                </div>

                {/* Descargar PDF */}
                <div className="flex flex-col items-center gap-4">
                  {registeredPdfUrl && (
                    <button
                      onClick={() => descargarPDF(registeredPdfUrl, `comprobante_${verificationData.cedula_identidad}.pdf`)}
                      className="w-full max-w-sm py-5 bg-blue-600 text-white rounded-3xl font-black shadow-xl hover:bg-blue-700 hover:scale-105 active:scale-100 transition-all flex items-center justify-center gap-4"
                    >
                      <Download className="w-7 h-7" />
                      DESCARGAR FORMULARIO PDF
                    </button>
                  )}
                  <button onClick={handleReset}
                    className="text-gray-400 font-black hover:text-gray-600 transition-colors uppercase tracking-widest text-xs">
                    Finalizar y salir
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ApplicantRegistration;
