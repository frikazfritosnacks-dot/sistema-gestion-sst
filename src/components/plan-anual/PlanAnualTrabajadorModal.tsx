import React, { useState, useEffect, useMemo } from 'react';
import { TrabajadorFichaSST, PruebaComplementariaTrabajador } from '../../types/planAnual';
import { RiesgoGTC45Item } from '../../types/gtc45RiskMatrix';
import { CargoSST } from '../../types/organigramaSst';
import {
  coincidenCargoYRiesgo,
  evaluarCompletitudTrabajador,
} from '../../services/planAnualSgsstService';
import {
  obtenerIdCargoOficial,
  obtenerNombreCargoOficial,
} from '../../data/cargosOficiales';
import {
  X,
  Save,
  User,
  HeartPulse,
  Activity,
  Stethoscope,
  ClipboardCheck,
  ShieldAlert,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface PlanAnualTrabajadorModalProps {
  isOpen: boolean;
  trabajador: TrabajadorFichaSST | null;
  cargos: CargoSST[];
  riesgos: RiesgoGTC45Item[];
  accesoMedicoAutorizado: boolean;
  onSolicitarDesbloqueoMedico: () => void;
  onClose: () => void;
  onSave: (trabajador: TrabajadorFichaSST) => void;
}

type SeccionModal = 'laboral' | 'habitos' | 'morbilidad' | 'examenes' | 'recomendaciones';

export const PlanAnualTrabajadorModal: React.FC<PlanAnualTrabajadorModalProps> = ({
  isOpen,
  trabajador,
  cargos,
  riesgos,
  accesoMedicoAutorizado,
  onSolicitarDesbloqueoMedico,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<TrabajadorFichaSST | null>(null);
  const [seccion, setSeccion] = useState<SeccionModal>('laboral');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && trabajador) {
      const oficialId = obtenerIdCargoOficial(trabajador.cargoId || trabajador.cargoNombre);
      const oficialNombre = obtenerNombreCargoOficial(oficialId);
      const cargoObj = cargos.find((c) => c.id === oficialId);
      setForm({
        ...trabajador,
        cargoId: oficialId,
        cargoNombre: cargoObj?.nombre || oficialNombre,
        areaProceso: cargoObj?.areaProceso || trabajador.areaProceso,
      });
      setSeccion('laboral');
      setErrorMsg(null);
    }
  }, [isOpen, trabajador, cargos]);

  const riesgosDelCargo = useMemo(() => {
    if (!form) return [];
    return riesgos.filter((r) => coincidenCargoYRiesgo(form.cargoNombre, r));
  }, [form, riesgos]);

  const completitud = useMemo(() => {
    if (!form) return { porcentaje: 0, pendientes: [] as string[], completa: false };
    return evaluarCompletitudTrabajador(form);
  }, [form]);

  if (!isOpen || !form) return null;

  const handleChangeCargo = (cargoId: string) => {
    const c = cargos.find((item) => item.id === cargoId);
    if (!c) return;
    setForm({
      ...form,
      cargoId: c.id,
      cargoNombre: c.nombre,
      areaProceso: c.areaProceso,
    });
  };

  const updatePrueba = (
    campo: 'audiometria' | 'visiometria' | 'optometria' | 'espirometria' | 'laboratorio',
    patch: Partial<PruebaComplementariaTrabajador>
  ) => {
    setForm({
      ...form,
      [campo]: { ...form[campo], ...patch },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombreCompleto.trim()) {
      setErrorMsg('Por favor escribe el nombre completo del trabajador.');
      setSeccion('laboral');
      return;
    }
    if (!form.numeroDocumento.trim()) {
      setErrorMsg('Por favor ingresa el número de documento de identidad.');
      setSeccion('laboral');
      return;
    }
    onSave({
      ...form,
      fechaActualizacion: new Date().toISOString().split('T')[0],
    });
    onClose();
  };

  const esSeccionMedica = seccion !== 'laboral';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-xs">
        {/* Cabecera */}
        <div className="bg-[#0f172a] text-white px-5 py-4 flex items-start justify-between gap-3 shrink-0">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#f97316] text-white font-black text-[10px] uppercase">
                Ficha Individual de Trabajador
              </span>
              <span
                className={`px-2 py-0.5 rounded font-bold text-[10px] inline-flex items-center gap-1 ${
                  completitud.completa
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                    : 'bg-amber-500/20 text-amber-200 border border-amber-400/40'
                }`}
              >
                {completitud.completa ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <AlertTriangle className="h-3 w-3" />
                )}
                {completitud.porcentaje}% Diligenciada
              </span>
              <span
                className={`px-2 py-0.5 rounded font-bold text-[10px] inline-flex items-center gap-1 ${
                  accesoMedicoAutorizado
                    ? 'bg-emerald-900/60 text-emerald-200'
                    : 'bg-rose-900/60 text-rose-200'
                }`}
              >
                {accesoMedicoAutorizado ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                {accesoMedicoAutorizado ? 'Salud Ocupacional Desbloqueada' : 'Datos Médicos Protegidos'}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black">
              {form.nombreCompleto || 'Nuevo Trabajador de Frikaz S.A.S.'}
            </h3>
            <p className="text-[11px] text-slate-300">
              {form.cargoNombre} · {form.areaProceso}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Pestañas internas */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex flex-wrap gap-1.5 shrink-0">
          {[
            { id: 'laboral', label: '1. Datos Personales, Laborales y Riesgos', icon: User, privada: false },
            { id: 'habitos', label: '2. Hábitos y Estilos de Vida', icon: Activity, privada: true },
            { id: 'morbilidad', label: '3. Molestias y Enfermedades', icon: HeartPulse, privada: true },
            { id: 'examenes', label: '4. Exámenes y Pruebas Médicas', icon: Stethoscope, privada: true },
            { id: 'recomendaciones', label: '5. Recomendaciones Médicas', icon: ClipboardCheck, privada: true },
          ].map((t) => {
            const Icon = t.icon;
            const active = seccion === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSeccion(t.id as SeccionModal)}
                className={`px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  active
                    ? 'bg-[#0f172a] text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-orange-50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
                {t.privada && <Lock className="h-2.5 w-2.5 opacity-70" />}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 font-bold">
              {errorMsg}
            </div>
          )}

          {!completitud.completa && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-[11px]">
              <strong>Información pendiente por completar:</strong>{' '}
              {completitud.pendientes.join(' · ')}.
            </div>
          )}

          {esSeccionMedica && !accesoMedicoAutorizado ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
                <Lock className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-black text-rose-950">
                Información Médica Individual Protegida por Ley
              </h4>
              <p className="text-xs text-rose-900 max-w-lg mx-auto leading-relaxed">
                Por seguridad y respeto a la privacidad de cada trabajador (Resolución 2346 de 2007), los datos de salud, exámenes y diagnósticos individuales solo pueden ser vistos o editados por personal autorizado de Salud Ocupacional o el Responsable SST.
              </p>
              <button
                type="button"
                onClick={onSolicitarDesbloqueoMedico}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0f172a] text-white font-bold hover:bg-slate-800 cursor-pointer"
              >
                <Unlock className="h-3.5 w-3.5" />
                <span>Activar Acceso Autorizado de Salud Ocupacional</span>
              </button>
            </div>
          ) : (
            <>
              {/* 1. DATOS DEMOGRÁFICOS, LABORALES Y RIESGOS */}
              {seccion === 'laboral' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="font-bold text-slate-700 block mb-1">
                        Nombre completo del trabajador *
                      </label>
                      <input
                        type="text"
                        value={form.nombreCompleto}
                        onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Estado en la empresa</label>
                      <select
                        value={form.estadoLaboral}
                        onChange={(e) =>
                          setForm({ ...form, estadoLaboral: e.target.value as 'ACTIVO' | 'INACTIVO' })
                        }
                        className="w-full rounded-lg border border-slate-300 p-2 bg-white font-bold"
                      >
                        <option value="ACTIVO">Activo trabajando</option>
                        <option value="INACTIVO">Retirado / Inactivo</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Tipo documento</label>
                      <select
                        value={form.tipoDocumento}
                        onChange={(e) => setForm({ ...form, tipoDocumento: e.target.value as any })}
                        className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                      >
                        <option value="CC">Cédula (CC)</option>
                        <option value="CE">Extranjería (CE)</option>
                        <option value="PPT">Permiso PPT</option>
                        <option value="TI">TI</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Número documento *</label>
                      <input
                        type="text"
                        value={form.numeroDocumento}
                        onChange={(e) => setForm({ ...form, numeroDocumento: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Fecha nacimiento</label>
                      <input
                        type="date"
                        value={form.fechaNacimiento}
                        onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Sexo</label>
                      <select
                        value={form.sexo}
                        onChange={(e) => setForm({ ...form, sexo: e.target.value as any })}
                        className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                      >
                        <option value="Femenino">Femenino</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Estado civil</label>
                      <select
                        value={form.estadoCivil}
                        onChange={(e) => setForm({ ...form, estadoCivil: e.target.value as any })}
                        className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                      >
                        <option value="Soltero(a)">Soltero(a)</option>
                        <option value="Casado(a)">Casado(a)</option>
                        <option value="Unión Libre">Unión Libre</option>
                        <option value="Separado(a)">Separado(a)</option>
                        <option value="Viudo(a)">Viudo(a)</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Estudios (escolaridad)</label>
                      <select
                        value={form.escolaridad}
                        onChange={(e) => setForm({ ...form, escolaridad: e.target.value as any })}
                        className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                      >
                        <option value="Primaria">Primaria</option>
                        <option value="Bachiller">Bachiller</option>
                        <option value="Técnico / Tecnólogo">Técnico / Tecnólogo</option>
                        <option value="Profesional">Profesional</option>
                        <option value="Posgrado">Posgrado</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Barrio / Localidad</label>
                      <input
                        type="text"
                        value={form.localidadResidencia}
                        onChange={(e) => setForm({ ...form, localidadResidencia: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Teléfono</label>
                      <input
                        type="text"
                        value={form.telefono}
                        onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                      />
                    </div>
                  </div>

                  {/* Información laboral y cargo */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <h4 className="font-black text-[#0f172a]">
                      Trabajo que realiza y afiliaciones (se conecta con la Matriz de Riesgos)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Cargo en Frikaz S.A.S.</label>
                        <select
                          value={form.cargoId}
                          onChange={(e) => handleChangeCargo(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 p-2 bg-white font-bold"
                        >
                          {cargos.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Tipo de contrato</label>
                        <select
                          value={form.tipoContrato}
                          onChange={(e) => setForm({ ...form, tipoContrato: e.target.value as any })}
                          className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                        >
                          <option value="Indefinido">Término Indefinido</option>
                          <option value="Fijo">Término Fijo</option>
                          <option value="Obra o Labor">Obra o Labor</option>
                          <option value="Aprendizaje">Aprendiz</option>
                          <option value="Prestación de Servicios">Prestación de Servicios</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Fecha de ingreso</label>
                        <input
                          type="date"
                          value={form.fechaIngreso}
                          onChange={(e) => setForm({ ...form, fechaIngreso: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">
                          Actividad principal diaria (qué hace en su puesto)
                        </label>
                        <input
                          type="text"
                          value={form.actividadPrincipal}
                          onChange={(e) => setForm({ ...form, actividadPrincipal: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Turno y horario</label>
                        <input
                          type="text"
                          value={form.turnoHorario}
                          onChange={(e) => setForm({ ...form, turnoHorario: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">EPS (Salud)</label>
                        <input
                          type="text"
                          value={form.eps}
                          onChange={(e) => setForm({ ...form, eps: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">ARL (Riesgos Laborales)</label>
                        <input
                          type="text"
                          value={form.arl}
                          onChange={(e) => setForm({ ...form, arl: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Fondo de Pensiones (AFP)</label>
                        <input
                          type="text"
                          value={form.afp}
                          onChange={(e) => setForm({ ...form, afp: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Riesgos conectados automáticamente desde la Matriz GTC 45 */}
                  <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 space-y-2">
                    <h4 className="font-black text-orange-950 flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4 text-[#f97316]" />
                      <span>
                        Peligros y riesgos de este cargo según la Matriz GTC 45 ({riesgosDelCargo.length})
                      </span>
                    </h4>
                    <p className="text-[11px] text-orange-900">
                      Esta información viene directamente de la Matriz de Peligros y Riesgos sin tener que copiarla dos veces.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {riesgosDelCargo.map((r) => (
                        <div
                          key={r.id}
                          className="p-2.5 rounded-lg bg-white border border-orange-200 flex items-start justify-between gap-2"
                        >
                          <div>
                            <span className="font-mono font-black text-[10px] text-slate-600">
                              {r.codigo || r.id} · {r.peligroClasificacion}
                            </span>
                            <p className="font-bold text-slate-900 text-[11px]">
                              {r.peligroDescripcion}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded font-black text-[10px] shrink-0 ${
                              r.interpretacionNR === 'I'
                                ? 'bg-rose-600 text-white'
                                : r.interpretacionNR === 'II'
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            Nivel {r.interpretacionNR}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. HÁBITOS Y ESTILOS DE VIDA */}
              {seccion === 'habitos' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Consumo de tabaco / cigarrillo</label>
                      <select
                        value={form.consumoTabaco}
                        onChange={(e) => setForm({ ...form, consumoTabaco: e.target.value as any })}
                        className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                      >
                        <option value="No fuma">No fuma</option>
                        <option value="Ocasional">Ocasional</option>
                        <option value="Frecuente">Frecuente</option>
                        <option value="Exfumador">Exfumador</option>
                        <option value="Pendiente">Pendiente de preguntar</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Consumo de alcohol</label>
                      <select
                        value={form.consumoAlcohol}
                        onChange={(e) => setForm({ ...form, consumoAlcohol: e.target.value as any })}
                        className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                      >
                        <option value="No consume">No consume</option>
                        <option value="Ocasional">Ocasional (fuera de turno)</option>
                        <option value="Frecuente">Frecuente</option>
                        <option value="Pendiente">Pendiente de preguntar</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Actividad física / ejercicio</label>
                      <select
                        value={form.actividadFisica}
                        onChange={(e) => setForm({ ...form, actividadFisica: e.target.value as any })}
                        className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                      >
                        <option value="Sí, regular (3+ días/sem)">Sí, regular (3+ días/semana)</option>
                        <option value="Moderada (1-2 días/sem)">Moderada (1-2 días/semana)</option>
                        <option value="Sedentario / No realiza">No realiza ejercicio</option>
                        <option value="Pendiente">Pendiente de preguntar</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Otras sustancias o medicamentos de uso diario
                    </label>
                    <input
                      type="text"
                      value={form.otrasSustancias}
                      onChange={(e) => setForm({ ...form, otrasSustancias: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Nutrición, alimentación e hidratación en el turno
                    </label>
                    <textarea
                      rows={3}
                      value={form.nutricionHabitos}
                      onChange={(e) => setForm({ ...form, nutricionHabitos: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* 3. MORBILIDAD SENTIDA Y DIAGNOSTICADA */}
              {seccion === 'morbilidad' && (
                <div className="space-y-4">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Molestias o síntomas que siente el trabajador (morbilidad sentida)
                    </label>
                    <textarea
                      rows={3}
                      value={form.morbilidadSentida}
                      onChange={(e) => setForm({ ...form, morbilidadSentida: e.target.value })}
                      placeholder="Ej. Dolor leve de espalda, cansancio en piernas o ninguna molestia."
                      className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Enfermedades diagnosticadas por médico (morbilidad diagnosticada)
                    </label>
                    <textarea
                      rows={3}
                      value={form.enfermedadesDiagnosticadas}
                      onChange={(e) =>
                        setForm({ ...form, enfermedadesDiagnosticadas: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.tieneEnfermedadLaboralCalificada}
                        onChange={(e) =>
                          setForm({ ...form, tieneEnfermedadLaboralCalificada: e.target.checked })
                        }
                      />
                      <span>¿Tiene enfermedad laboral calificada por EPS/ARL?</span>
                    </label>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Fecha última incapacidad (si aplica)
                      </label>
                      <input
                        type="date"
                        value={form.fechaUltimaIncapacidad || ''}
                        onChange={(e) =>
                          setForm({ ...form, fechaUltimaIncapacidad: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 4. EVALUACIONES Y PRUEBAS COMPLEMENTARIAS */}
              {seccion === 'examenes' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Último examen médico</label>
                      <select
                        value={form.tipoUltimoExamen}
                        onChange={(e) => setForm({ ...form, tipoUltimoExamen: e.target.value as any })}
                        className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                      >
                        <option value="Ingreso">Examen de Ingreso</option>
                        <option value="Periódico">Examen Periódico Anual</option>
                        <option value="Post-incapacidad">Post-incapacidad</option>
                        <option value="Egreso">Egreso</option>
                        <option value="Pendiente">Pendiente de realizar</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Fecha del examen</label>
                      <input
                        type="date"
                        value={form.fechaUltimoExamen}
                        onChange={(e) => setForm({ ...form, fechaUltimoExamen: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Resultado / Concepto médico</label>
                      <select
                        value={form.conceptoAptitud}
                        onChange={(e) => setForm({ ...form, conceptoAptitud: e.target.value as any })}
                        className="w-full rounded-lg border border-slate-300 p-2 bg-white font-bold"
                      >
                        <option value="Apto sin restricciones">Apto para el cargo</option>
                        <option value="Apto con recomendaciones">Apto con recomendaciones</option>
                        <option value="Aplazado">Aplazado</option>
                        <option value="Pendiente">Pendiente</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <h4 className="font-black text-[#0f172a]">
                      Pruebas médicas complementarias según su puesto
                    </h4>
                    {(
                      [
                        { key: 'audiometria', titulo: 'Audiometría (revisión del oído por ruido)' },
                        { key: 'visiometria', titulo: 'Visiometría (revisión básica de la vista)' },
                        { key: 'optometria', titulo: 'Optometría (fórmula de gafas si necesita)' },
                        { key: 'espirometria', titulo: 'Espirometría (revisión de pulmones y respiración)' },
                        { key: 'laboratorio', titulo: 'Exámenes de laboratorio y manipulador de alimentos (BPM)' },
                      ] as const
                    ).map((item) => {
                      const p = form[item.key];
                      return (
                        <div
                          key={item.key}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-3 rounded-xl border border-slate-200 bg-white"
                        >
                          <div className="sm:col-span-4 font-bold text-slate-900">{item.titulo}</div>
                          <div className="sm:col-span-3">
                            <select
                              value={p.estado}
                              onChange={(e) =>
                                updatePrueba(item.key, { estado: e.target.value as any })
                              }
                              className="w-full rounded-lg border border-slate-300 p-1.5 text-xs bg-white font-bold"
                            >
                              <option value="REALIZADA">Realizada / Al día</option>
                              <option value="PENDIENTE">Pendiente</option>
                              <option value="NO_APLICA">No aplica al cargo</option>
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <input
                              type="date"
                              value={p.fecha || ''}
                              onChange={(e) => updatePrueba(item.key, { fecha: e.target.value })}
                              className="w-full rounded-lg border border-slate-300 p-1.5 text-xs bg-white"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <input
                              type="text"
                              value={p.resultado || p.observaciones || ''}
                              onChange={(e) => updatePrueba(item.key, { resultado: e.target.value })}
                              placeholder="Resultado breve o nota"
                              className="w-full rounded-lg border border-slate-300 p-1.5 text-xs bg-white"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 5. RECOMENDACIONES Y PRIORIDADES DE INTERVENCIÓN */}
              {seccion === 'recomendaciones' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Nivel de prioridad de atención
                      </label>
                      <select
                        value={form.prioridadIntervencion}
                        onChange={(e) =>
                          setForm({ ...form, prioridadIntervencion: e.target.value as any })
                        }
                        className="w-full rounded-lg border border-slate-300 p-2 bg-white font-bold"
                      >
                        <option value="ALTA">Alta (atender pronto)</option>
                        <option value="MEDIA">Media (programar este trimestre)</option>
                        <option value="BAJA">Baja (seguimiento normal)</option>
                        <option value="NINGUNA">Sin prioridad especial</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Seguimiento acordado
                      </label>
                      <input
                        type="text"
                        value={form.seguimientoMedico}
                        onChange={(e) => setForm({ ...form, seguimientoMedico: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Recomendaciones de salud ocupacional (qué debe cuidarse en el puesto)
                    </label>
                    <textarea
                      rows={3}
                      value={form.recomendacionesSaludOcupacional}
                      onChange={(e) =>
                        setForm({ ...form, recomendacionesSaludOcupacional: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Necesidad de intervención concreta (EPP, ajuste de puesto, pausas o examen)
                    </label>
                    <textarea
                      rows={2}
                      value={form.necesidadIntervencion}
                      onChange={(e) =>
                        setForm({ ...form, necesidadIntervencion: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 p-2 bg-white"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Footer del Modal */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-black cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Guardar Ficha del Trabajador</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
