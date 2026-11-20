// ============================================================================
// MODAL DE IMPRESIÓN Y DESCARGA FORMAL EN PDF - CHECKLIST SST
// Frikaz S.A.S. — Sede Bosa, Bogotá D.C.
// ============================================================================

import React from 'react';
import { Printer, X, Download, ShieldCheck, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { ItemChecklistNecesidad, CargoChecklistInterno } from '../../../types/partesInteresadas';
import {
  getBadgeClassesEstadoFrikaz,
  normalizarEstadoEstandar,
} from '../../../services/gerenteControlService';

interface ModalImpresionPdfChecklistProps {
  cargo: CargoChecklistInterno;
  items: ItemChecklistNecesidad[];
  isOpen: boolean;
  onClose: () => void;
}

export const ModalImpresionPdfChecklist: React.FC<ModalImpresionPdfChecklistProps> = ({
  cargo,
  items,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const nombresCargos: Record<CargoChecklistInterno, string> = {
    gerente: 'GERENTE (DIRECCIÓN)',
    operarios: 'OPERARIOS (PRODUCCIÓN Y PLANTA)',
    conductor: 'CONDUCTOR (ENTREGAS Y REPARTO)',
  };

  const itemsCargo = items.filter((it) => it.cargo === cargo);
  const cumplidas = itemsCargo.filter((it) => {
    const est = normalizarEstadoEstandar(it.estado);
    return est === 'Cumplido' || est === 'Aprobado';
  }).length;
  const enProceso = itemsCargo.filter((it) => {
    const est = normalizarEstadoEstandar(it.estado);
    return est === 'En proceso' || est === 'Pendiente de revisión';
  }).length;
  const pendientes = itemsCargo.filter((it) => {
    const est = normalizarEstadoEstandar(it.estado);
    return est === 'Por hacer' || est === 'Devuelto para ajustes';
  }).length;
  const porcentaje = itemsCargo.length > 0 ? Math.round((cumplidas / itemsCargo.length) * 100) : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:w-full">
        {/* Barra superior de acciones (oculta al imprimir) */}
        <div className="bg-slate-900 p-4 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-orange-400" />
            <div>
              <h3 className="font-bold text-sm">Vista Lista para PDF o Impresión</h3>
              <p className="text-xs text-slate-400">
                Lista de Necesidades de Seguridad — {nombresCargos[cargo]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir o Guardar como PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Contenido imprimible del documento formal */}
        <div className="p-8 overflow-y-auto space-y-6 text-slate-800 text-xs print:p-6 print:text-black">
          {/* Encabezado formal */}
          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <div className="grid grid-cols-4 divide-x divide-slate-300 border-b border-slate-300">
              <div className="col-span-1 p-4 bg-slate-50 flex flex-col items-center justify-center text-center">
                <span className="text-base font-black text-orange-600 tracking-wider">FRIKAZ S.A.S.</span>
                <span className="text-[10px] text-slate-500 font-mono">NIT: 901.458.723-1</span>
                <span className="text-[9px] text-slate-400">Bosa, Bogotá D.C.</span>
              </div>
              <div className="col-span-2 p-4 text-center flex flex-col justify-center">
                <h2 className="font-black text-sm text-slate-900 uppercase">
                  SEGURIDAD Y SALUD EN EL TRABAJO (SG-SST)
                </h2>
                <h3 className="font-bold text-xs text-orange-600 mt-0.5 uppercase">
                  LISTA DE REVISIÓN DE NECESIDADES — {nombresCargos[cargo]}
                </h3>
                <span className="text-[10px] text-slate-500 mt-1">
                  Cumpliendo con el Decreto 1072 de 2015 y la Resolución 0312 de 2019
                </span>
              </div>
              <div className="col-span-1 p-3 bg-slate-50 flex flex-col justify-center text-[10px] space-y-1 font-mono text-slate-600">
                <div><strong>Código:</strong> CK-SST-PI-{cargo.toUpperCase().slice(0, 3)}</div>
                <div><strong>Versión:</strong> 01-2026</div>
                <div><strong>Fecha:</strong> {new Date().toLocaleDateString('es-CO')}</div>
                <div><strong>Página:</strong> 1 de 1</div>
              </div>
            </div>

            {/* Ficha de datos del proceso */}
            <div className="grid grid-cols-3 divide-x divide-slate-300 p-3 bg-white text-[11px] gap-2">
              <div>
                <span className="text-slate-500 block text-[10px]">Cargo del Equipo:</span>
                <strong className="text-slate-900">{nombresCargos[cargo]}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Actividad de Frikaz S.A.S.:</span>
                <span className="text-slate-800">Elaboración y entrega de snacks</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Avance de Hoy:</span>
                <strong className="text-orange-600 font-black">{porcentaje}% Cumplido</strong> ({cumplidas} de {itemsCargo.length} puntos)
              </div>
            </div>
          </div>

          {/* Tabla detallada de necesidades */}
          <div>
            <h4 className="font-bold text-xs text-slate-900 mb-2 uppercase flex items-center justify-between">
              <span>Lo que Necesita este Cargo para Trabajar Seguro</span>
              <span className="text-[10px] font-normal text-slate-500 lowercase">
                ({cumplidas} cumplidas · {enProceso} en proceso · {pendientes} pendientes)
              </span>
            </h4>

            <table className="w-full border-collapse border border-slate-300 text-[10px]">
              <thead>
                <tr className="bg-slate-100 text-slate-900 border-b border-slate-300">
                  <th className="p-2 border border-slate-300 text-center w-8">#</th>
                  <th className="p-2 border border-slate-300 text-left">Qué se necesita</th>
                  <th className="p-2 border border-slate-300 text-center w-24">Estado</th>
                  <th className="p-2 border border-slate-300 text-left w-48">Notas y cómo está hoy</th>
                  <th className="p-2 border border-slate-300 text-left w-40">Pruebas / documentos</th>
                  <th className="p-2 border border-slate-300 text-left w-28">Encargado</th>
                  <th className="p-2 border border-slate-300 text-center w-20">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {itemsCargo.map((item) => (
                  <tr key={item.id} className="border-b border-slate-200">
                    <td className="p-2 border border-slate-300 text-center font-bold text-slate-700">
                      {item.numero}
                    </td>
                    <td className="p-2 border border-slate-300 font-medium text-slate-900">
                      {item.necesidad}
                    </td>
                    <td className="p-2 border border-slate-300 text-center">
                      {(() => {
                        const badge = getBadgeClassesEstadoFrikaz(item.estado);
                        return (
                          <span
                            className={`inline-block px-2 py-0.5 rounded border text-[9px] font-bold ${badge.light}`}
                          >
                            {badge.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-2 border border-slate-300 text-slate-600">
                      {item.observaciones || '—'}
                    </td>
                    <td className="p-2 border border-slate-300 text-slate-600 italic">
                      {item.evidencias || '—'}
                    </td>
                    <td className="p-2 border border-slate-300 text-slate-700 font-semibold">
                      {item.responsable || '—'}
                    </td>
                    <td className="p-2 border border-slate-300 text-center font-mono text-slate-600">
                      {item.fechaVerificacion || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Declaración de conformidad y seguimiento */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[10px] text-slate-600 leading-relaxed">
            <strong>Compromiso de seguimiento:</strong> Esta lista ayuda a revisar que las personas de este cargo tengan lo necesario para cuidar su salud y evitar accidentes. Todo lo que aparezca como &quot;Pendiente&quot; o &quot;En proceso&quot; pasa al Plan Anual de Seguridad (SG-SST) de Frikaz S.A.S. para resolverlo a tiempo.
          </div>

          {/* Espacio para firmas formales */}
          <div className="pt-8 grid grid-cols-2 gap-12 text-[11px]">
            <div className="border-t border-slate-900 pt-2 text-center">
              <strong className="block text-slate-900 uppercase">
                {cargo === 'gerente'
                  ? 'GERENTE GENERAL / REPRESENTANTE LEGAL'
                  : cargo === 'conductor'
                  ? 'REPRESENTANTE DEL CONDUCTOR / LOGÍSTICA'
                  : 'REPRESENTANTE DE LOS OPERARIOS DE PLANTA'}
              </strong>
              <span className="text-slate-500 text-[10px] block">Frikaz S.A.S. — Sede Bosa</span>
              <span className="text-slate-400 text-[9px] block">Firma y C.C.</span>
            </div>

            <div className="border-t border-slate-900 pt-2 text-center">
              <strong className="block text-slate-900 uppercase">
                COORDINADOR DE SST / VIGÍA DE SST
              </strong>
              <span className="text-slate-500 text-[10px] block">Responsable del SG-SST / Licencia SST</span>
              <span className="text-slate-400 text-[9px] block">Firma y Registro Profesional</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
