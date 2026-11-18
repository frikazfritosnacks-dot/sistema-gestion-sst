// ============================================================================
// COMPONENTE PRINCIPAL: SUBCATEGORÍA PARTES INTERESADAS - FRIKAZ S.A.S.
// Integrado dentro de «Configuración Dinámica»
// ============================================================================

import React, { useState } from 'react';
import {
  ParteInteresada,
  ItemChecklistNecesidad,
  RegistroHistorialChecklist,
  CargoChecklistInterno,
} from '../../../types/partesInteresadas';
import {
  getStoredPartesInteresadas,
  getStoredChecklistItems,
  getStoredHistorialChecklist,
} from '../../../services/partesInteresadasService';
import { MatrizPartesInteresadasTab } from './MatrizPartesInteresadasTab';
import { PartesInternasTab } from './PartesInternasTab';
import { PartesExternasTab } from './PartesExternasTab';
import { ChecklistNecesidadesTab } from './ChecklistNecesidadesTab';
import { IndicadoresCumplimientoTab } from './IndicadoresCumplimientoTab';
import { DescargaDocumentosTab } from './DescargaDocumentosTab';
import {
  Table,
  Building2,
  Globe2,
  ClipboardCheck,
  BarChart2,
  Download,
  Users2,
  Shield,
  Layers,
} from 'lucide-react';

export type TabPartesInteresadas =
  | 'matriz'
  | 'internas'
  | 'externas'
  | 'checklist'
  | 'indicadores'
  | 'descargas';

export const PartesInteresadasView: React.FC = () => {
  const [partes, setPartes] = useState<ParteInteresada[]>(() => getStoredPartesInteresadas());
  const [checklistItems, setChecklistItems] = useState<ItemChecklistNecesidad[]>(() =>
    getStoredChecklistItems()
  );
  const [historialChecklist, setHistorialChecklist] = useState<RegistroHistorialChecklist[]>(() =>
    getStoredHistorialChecklist()
  );

  const [activeTab, setActiveTab] = useState<TabPartesInteresadas>('matriz');
  const [cargoActivoChecklist, setCargoActivoChecklist] = useState<CargoChecklistInterno>('gerente');

  const irACargoEnChecklist = (cargo: CargoChecklistInterno) => {
    setCargoActivoChecklist(cargo);
    setActiveTab('checklist');
  };

  const tabs: {
    id: TabPartesInteresadas;
    numero: string;
    nombre: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'matriz',
      numero: '1',
      nombre: 'Tabla General',
      icon: <Table className="h-4 w-4" />,
    },
    {
      id: 'internas',
      numero: '2',
      nombre: 'Equipo de la Empresa',
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      id: 'externas',
      numero: '3',
      nombre: 'Entidades y Clientes',
      icon: <Globe2 className="h-4 w-4" />,
    },
    {
      id: 'checklist',
      numero: '4',
      nombre: 'Lista de Necesidades',
      icon: <ClipboardCheck className="h-4 w-4" />,
    },
    {
      id: 'indicadores',
      numero: '5',
      nombre: 'Avance y Resultados',
      icon: <BarChart2 className="h-4 w-4" />,
    },
    {
      id: 'descargas',
      numero: '6',
      nombre: 'Descargar Archivos',
      icon: <Download className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header oficial del módulo de Partes Interesadas */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-700/80 bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0a192f] p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-500/20 px-2.5 py-0.5 text-xs font-bold text-purple-300 border border-purple-500/30">
                <Users2 className="h-3.5 w-3.5 text-purple-400" />
                Personas y Entidades Clave · Mi Empresa
              </span>
              <span className="rounded-md bg-orange-500/20 px-2.5 py-0.5 text-xs font-bold text-orange-300 border border-orange-500/30">
                Decreto 1072/2015 · Res. 0312/2019 · ISO 45001
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Personas y Entidades Interesadas</span>
              <span className="text-orange-400 text-lg font-mono">[FRIKAZ S.A.S.]</span>
            </h1>

            <p className="text-xs text-slate-300 leading-relaxed">
              Aquí ves quiénes hacen parte de nuestra seguridad: nuestro equipo interno (Gerente, Operarios y Conductor) y quienes se relacionan desde afuera (proveedores, ingeniero asesor, ministerios, Secretaría de Salud y clientes). Revisa qué necesita cada uno para trabajar sin peligros y descarga listas en Excel o PDF.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700 shrink-0 text-xs">
            <div className="text-right font-mono">
              <span className="block text-slate-400 text-[10px]">Total Registradas</span>
              <span className="text-white font-bold text-sm">{partes.length} Personas/Entidades</span>
            </div>
            <div className="h-8 w-px bg-slate-700" />
            <div className="text-left font-mono">
              <span className="block text-slate-400 text-[10px]">Puntos por Revisar</span>
              <span className="text-orange-400 font-bold text-sm">{checklistItems.length} Necesidades</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navegación por pestañas (6 pestañas oficiales) */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-1">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[150px] flex items-center justify-center sm:justify-start gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg shrink-0 ${
                  isSelected ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {tab.icon}
              </div>
              <span className="truncate">
                {tab.numero}. {tab.nombre}
              </span>
            </button>
          );
        })}
      </div>

      {/* RENDERIZADO DE LA PESTAÑA ACTIVA */}
      {activeTab === 'matriz' && (
        <MatrizPartesInteresadasTab
          partes={partes}
          onActualizarPartes={setPartes}
          onIrAChecklist={() => setActiveTab('checklist')}
        />
      )}

      {activeTab === 'internas' && (
        <PartesInternasTab
          partes={partes}
          onSeleccionarCargoChecklist={irACargoEnChecklist}
        />
      )}

      {activeTab === 'externas' && (
        <PartesExternasTab partes={partes} />
      )}

      {activeTab === 'checklist' && (
        <ChecklistNecesidadesTab
          items={checklistItems}
          onActualizarItems={setChecklistItems}
          historial={historialChecklist}
          onActualizarHistorial={setHistorialChecklist}
          cargoActivo={cargoActivoChecklist}
          onCambiarCargoActivo={setCargoActivoChecklist}
        />
      )}

      {activeTab === 'indicadores' && (
        <IndicadoresCumplimientoTab
          items={checklistItems}
          onSeleccionarCargoChecklist={irACargoEnChecklist}
        />
      )}

      {activeTab === 'descargas' && (
        <DescargaDocumentosTab
          items={checklistItems}
          partes={partes}
        />
      )}
    </div>
  );
};
