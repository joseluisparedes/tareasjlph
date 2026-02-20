import React, { useState, useRef } from 'react';
import { ITRequest, Status, RequestType, Urgency, CatalogItem, CatalogoItem, CatalogType } from '../../types';
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Save, Trash2, X } from 'lucide-react';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { SelectorCampo } from '../shared/SelectorCampo';

// Definición de tipos para la importación
interface ImportRow {
    titulo: string;
    descripcion: string;
    tarea_sn?: string;
    ticket_rit?: string;
    urgency?: string; // Urgency enum or string
    tipo?: string; // RequestType enum or string
    dominio?: string;
    estado?: string; // Status enum or string

    // Nuevos campos
    solicitante?: string; // email or name
    asignado_a?: string; // id or name
    priority?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    direccion_solicitante?: string;
    brm?: string;
    institucion?: string;
    tipo_tarea?: string;
    complejidad?: string;
}

interface ValidatedRow extends ImportRow {
    isValid: boolean;
    errors: string[];
    fieldErrors: Record<string, boolean>; // Para resaltar celdas
    id: string; // ID temporal para la tabla
}

interface BulkOperationsProps {
    requests: ITRequest[];
    onImport: (newRequests: Partial<ITRequest>[]) => Promise<void>;
    domains: CatalogItem[];
    catalogos: CatalogoItem[];
    getModo?: (tipo: CatalogType) => 'desplegable' | 'cuadros';
}

export const BulkOperations: React.FC<BulkOperationsProps> = ({ requests, onImport, domains, catalogos, getModo }) => {
    const [mode, setMode] = useState<'menu' | 'import' | 'export'>('menu');
    const [importData, setImportData] = useState<ValidatedRow[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Helpers para catálogos
    const getCats = (tipo: CatalogType) => catalogos.filter(c => c.tipo === tipo && c.esta_activo);
    const getM = (t: CatalogType) => getModo?.(t) ?? 'desplegable';

    // Helper para incluir valor actual si no existe (para visualización)
    const getOptionsWithCurrent = (tipo: CatalogType, currentValue: string | undefined): CatalogoItem[] => {
        const options = getCats(tipo);
        if (currentValue && !options.some(o => o.valor === currentValue)) {
            return [...options, { id: 'temp-new', tipo, valor: currentValue, esta_activo: true, orden: 999 }];
        }
        return options;
    };

    // --- Lógica de Exportación ---
    const handleExportCSV = () => {
        const data = requests.map(req => ({
            ID: req.id,
            Titulo: req.title,
            Descripcion: req.description,
            Estado: req.status,
            Urgencia: req.urgency,
            Tipo: req.type,
            Dominio: req.domain,
            Solicitante: req.requester,
            Asignado: req.assigneeId || '',
            Fecha_Creacion: new Date(req.createdAt).toLocaleDateString(),
            Prioridad: req.priority || '',
            Tarea_SN: req.tareaSN || '',
            Ticket_RIT: req.ticketRIT || '',
            Fecha_Inicio: req.fechaInicio || '',
            Fecha_Fin: req.fechaFin || '',
            Direccion: req.direccionSolicitante || '',
            BRM: req.brm || '',
            Institucion: req.institucion || '',
            Tipo_Tarea: req.tipoTarea || '',
            Complejidad: req.complejidad || ''
        }));

        const csv = Papa.unparse(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, `requerimientos_ti_${new Date().toISOString().slice(0, 10)}.csv`);
    };

    const handleExportExcel = () => {
        const data = requests.map(req => ({
            ID: req.id,
            Titulo: req.title,
            Descripcion: req.description,
            Estado: req.status,
            Urgencia: req.urgency,
            Tipo: req.type,
            Dominio: req.domain,
            Solicitante: req.requester,
            Asignado: req.assigneeId || '',
            Fecha_Creacion: new Date(req.createdAt).toLocaleDateString(),
            Prioridad: req.priority || '',
            Tarea_SN: req.tareaSN || '',
            Ticket_RIT: req.ticketRIT || '',
            Fecha_Inicio: req.fechaInicio || '',
            Fecha_Fin: req.fechaFin || '',
            Direccion: req.direccionSolicitante || '',
            BRM: req.brm || '',
            Institucion: req.institucion || '',
            Tipo_Tarea: req.tipoTarea || '',
            Complejidad: req.complejidad || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Requerimientos");
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
        saveAs(blob, `requerimientos_ti_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    // --- Lógica de Importación ---
    // --- Lógica de Importación ---
    const parseDate = (dateStr: string | number | undefined): string => {
        if (!dateStr) return '';
        if (typeof dateStr === 'number') {
            // Excel serial date
            const date = XLSX.SSF.parse_date_code(dateStr);
            return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
        }
        if (typeof dateStr === 'string') {
            // Check for DD/MM/YYYY
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    // Assume DD/MM/YYYY if distinct, or safe guess
                    const [day, month, year] = parts.map(Number);
                    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    }
                }
            }
            // Si ya es YYYY-MM-DD, retornarlo
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                return dateStr;
            }
            // Si no se pudo parsear, retornar vacío (para que sea opcional y no marque error)
            return '';
        }
        return '';
    };

    const validateRow = (row: ImportRow): { isValid: boolean, errors: string[], fieldErrors: Record<string, boolean> } => {
        const errors: string[] = [];
        const fieldErrors: Record<string, boolean> = {};

        const checkRequired = (field: keyof ImportRow, label: string) => {
            if (!row[field] || row[field]?.toString().trim() === '') {
                errors.push(`${label} está vacío`);
                fieldErrors[field] = true;
            }
        };

        // Validaciones obligatorias
        checkRequired('titulo', 'Título');
        // checkRequired('descripcion', 'Descripción'); // Opcional
        checkRequired('dominio', 'Dominio');
        checkRequired('estado', 'Estado');
        checkRequired('tipo', 'Tipo');
        checkRequired('urgency', 'Urgencia');
        checkRequired('solicitante', 'Solicitante');

        // Nuevas validaciones solicitadas
        checkRequired('complejidad', 'Complejidad');
        checkRequired('tipo_tarea', 'Tipo de Tarea');

        // Validaciones condicionales o advertencias (si se requieren como obligatorias, descomentar)
        // checkRequired('asignado_a', 'Asignado A');
        // checkRequired('brm', 'BRM');
        // checkRequired('institucion', 'Institución');
        // checkRequired('direccion_solicitante', 'Dirección');

        // Validación de fechas
        if (row.fecha_inicio && row.fecha_inicio.trim() !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(row.fecha_inicio)) {
            errors.push('Fecha Inicio inválida');
            fieldErrors['fecha_inicio'] = true;
        }
        if (row.fecha_fin && row.fecha_fin.trim() !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(row.fecha_fin)) {
            errors.push('Fecha Fin inválida');
            fieldErrors['fecha_fin'] = true;
        }

        return {
            isValid: errors.length === 0,
            errors,
            fieldErrors
        };
    };

    const [normalizationCount, setNormalizationCount] = useState(0);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws) as any[];

            // Función para normalizar claves (headers)
            const normalizeKey = (key: string) => {
                return key.toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar tildes
                    .trim();
            };

            // Función para normalizar valores de catálogo
            const normalizeStr = (str: string) => str ? str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

            let normCounter = 0;

            const getNormalizedValue = (tipo: CatalogType, valor: string): string => {
                if (!valor) return '';
                const normalizedInput = normalizeStr(valor);
                const match = catalogos.find(c => c.tipo === tipo && normalizeStr(c.valor) === normalizedInput);

                if (match) {
                    if (match.valor !== valor) {
                        normCounter++; // Contar corrección (ej: jose -> José)
                    }
                    return match.valor;
                }
                return valor; // Si no existe, devuelve el original (se creará)
            };

            // Mapeo flexible de columnas
            const mappedData: ValidatedRow[] = data.map((row, index) => {
                // Crear un mapa de claves normalizadas a valores
                const normalizedRow: { [key: string]: any } = {};
                Object.keys(row).forEach(key => {
                    normalizedRow[normalizeKey(key)] = row[key];
                });

                // Helper para extraer y normalizar
                const extract = (keys: string[], tipoCatalogo?: CatalogType) => {
                    let val = '';
                    for (const k of keys) {
                        if (normalizedRow[k]) {
                            val = normalizedRow[k];
                            break;
                        }
                    }
                    if (tipoCatalogo && val) {
                        return getNormalizedValue(tipoCatalogo, val.toString());
                    }
                    return val;
                };

                const rawRow: ImportRow = {
                    titulo: extract(['titulo', 'title']),
                    descripcion: extract(['descripcion', 'description', 'desc']),
                    tarea_sn: extract(['tarea_sn', 'tareasn', 'tarea sn', 'tarea', 'task', 'sn_task']),
                    ticket_rit: extract(['ticket_rit', 'ticketrit', 'ticket rit', 'ritm', 'ticket', 'rit']),
                    urgency: extract(['urgencia', 'urgency', 'prioridad', 'priority'], 'urgencia') || 'Media',
                    tipo: extract(['tipo', 'type', 'tipo requerimiento', 'tipo_requerimiento'], 'tipo_requerimiento') || 'Nuevo Pedido',
                    dominio: extract(['dominio', 'domain']) || domains[0]?.name || '',
                    estado: extract(['estado', 'status'], 'estado') || 'Pendiente',

                    solicitante: extract(['solicitante', 'requester'], 'usuario_solicitante'),
                    asignado_a: extract(['asignado', 'asignado_a', 'assignee'], 'asignado_a'),
                    priority: extract(['prioridad', 'priority', 'prioridad_negocio', 'prioridad negocio', 'n de prioridad', 'n prioridad', 'prioridad numero'], 'prioridad'), // Prioridad numérica/catálogo
                    fecha_inicio: parseDate(normalizedRow['fecha_inicio'] || normalizedRow['start_date'] || normalizedRow['inicio']),
                    fecha_fin: parseDate(normalizedRow['fecha_fin'] || normalizedRow['end_date'] || normalizedRow['fin']),
                    direccion_solicitante: extract(['direccion', 'direction', 'direccion_solicitante'], 'direccion_solicitante'),
                    brm: extract(['brm'], 'brm'),
                    institucion: extract(['institucion', 'institution'], 'institucion'),
                    tipo_tarea: extract(['tipo_tarea', 'task_type'], 'tipo_tarea'),
                    complejidad: extract(['complejidad', 'complexity'], 'complejidad'),
                };

                const validation = validateRow(rawRow);

                return {
                    id: `temp-${index}`,
                    ...rawRow,
                    isValid: validation.isValid,
                    errors: validation.errors,
                    fieldErrors: validation.fieldErrors
                };
            });

            setImportData(mappedData);
            setNormalizationCount(normCounter);
            setMode('import');
        };
        reader.readAsBinaryString(file);

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSaveImport = async () => {
        const validRows = importData.filter(r => r.isValid);
        if (validRows.length === 0) return;

        setIsProcessing(true);
        try {
            const newRequests: Partial<ITRequest>[] = validRows.map(row => ({
                title: row.titulo,
                description: row.descripcion,
                tareaSN: row.tarea_sn,
                ticketRIT: row.ticket_rit,
                urgency: (row.urgency as Urgency) || Urgency.Medium,
                type: (row.tipo as RequestType) || RequestType.NewOrder,
                domain: row.dominio || domains[0]?.name || 'General',
                status: row.estado as Status || Status.Pending,
                requester: row.solicitante || 'Importado',
                assigneeId: row.asignado_a || null,
                priority: row.priority || null,
                fechaInicio: row.fecha_inicio || undefined,
                fechaFin: row.fecha_fin || undefined,
                direccionSolicitante: row.direccion_solicitante || undefined,
                brm: row.brm || undefined,
                institucion: row.institucion || undefined,
                tipoTarea: row.tipo_tarea || undefined,
                complejidad: row.complejidad || undefined,
            }));

            await onImport(newRequests);
            setImportData([]);
            setMode('menu');
            alert(`${newRequests.length} requerimientos importados exitosamente.`);
        } catch (error) {
            console.error(error);
            alert('Error al guardar los requerimientos.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteRow = (id: string) => {
        setImportData(prev => prev.filter(r => r.id !== id));
    };

    const handleUpdateRow = (id: string, field: keyof ImportRow, value: string) => {
        setImportData(prev => prev.map(row => {
            if (row.id !== id) return row;

            const updated: ImportRow = { ...row, [field]: value };
            const validation = validateRow(updated);

            return {
                ...updated,
                id: row.id, // Preserve ID
                isValid: validation.isValid,
                errors: validation.errors,
                fieldErrors: validation.fieldErrors
            };
        }));
    };

    if (mode === 'import') {
        return (
            <div className="h-full flex flex-col gap-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Vista Previa de Importación</h2>
                        <p className="text-sm text-slate-500">Revisa y corrige los datos antes de guardar.</p>
                        {normalizationCount > 0 && (
                            <div className="mt-2 flex items-center gap-2 text-amber-700 bg-amber-50 p-2 rounded text-xs border border-amber-200">
                                <AlertCircle size={16} />
                                <span>Se han normalizado <strong>{normalizationCount}</strong> valores para coincidir con el catálogo existente (ej: Jose → José).</span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setMode('menu')}
                            className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            <X size={18} /> Cancelar
                        </button>
                        <button
                            onClick={handleSaveImport}
                            disabled={isProcessing || importData.filter(r => r.isValid).length === 0}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            {isProcessing ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Save size={18} />}
                            Guardar {importData.filter(r => r.isValid).length} Registros
                        </button>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex-1 overflow-hidden flex flex-col">
                    <div className="overflow-x-auto overflow-y-auto flex-1 p-1">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-12 sticky left-0 bg-slate-50 z-20">Valid</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[200px]">Título *</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[250px]">Descripción *</th>

                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[150px]">Dominio</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[150px]">Estado</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[150px]">Tipo</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[150px]">Urgencia</th>

                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[120px]">Tarea SN</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[120px]">Ticket RIT</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[120px]">Prioridad</th>

                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[180px]">Solicitante</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[180px]">Dirección</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[180px]">Institución</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[180px]">BRM</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[180px]">Asignado A</th>

                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[150px]">Tipo Tarea</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[150px]">Complejidad</th>

                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[140px]">F. Inicio</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[140px]">F. Fin</th>

                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider w-16 sticky right-0 bg-slate-50 z-20">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {importData.map((row) => (
                                    <tr key={row.id} className={!row.isValid ? 'bg-red-50' : ''}>
                                        <td className="px-4 py-2 whitespace-nowrap sticky left-0 bg-white z-10">
                                            {row.isValid
                                                ? <CheckCircle className="text-green-500" size={20} />
                                                : <div className="group relative">
                                                    <AlertCircle className="text-red-500" size={20} />
                                                    <div className="absolute left-6 top-0 bg-red-800 text-white text-xs p-2 rounded w-64 hidden group-hover:block z-50 shadow-lg cursor-pointer">
                                                        <ul className="list-disc pl-3">
                                                            {row.errors.map((err, i) => <li key={i}>{err}</li>)}
                                                        </ul>
                                                    </div>
                                                </div>
                                            }
                                        </td>
                                        <td className={`px-4 py-2 ${row.fieldErrors['titulo'] ? 'bg-red-100' : ''}`}>
                                            <input type="text" value={row.titulo} onChange={e => handleUpdateRow(row.id, 'titulo', e.target.value)}
                                                className={`w-full border p-1 rounded text-sm ${row.fieldErrors['titulo'] ? 'border-red-500 bg-red-50' : 'border-slate-200'}`} />
                                        </td>
                                        <td className={`px-4 py-2 ${row.fieldErrors['descripcion'] ? 'bg-red-100' : ''}`}>
                                            <textarea rows={1} value={row.descripcion} onChange={e => handleUpdateRow(row.id, 'descripcion', e.target.value)}
                                                className={`w-full border p-1 rounded text-sm ${row.fieldErrors['descripcion'] ? 'border-red-500 bg-red-50' : 'border-slate-200'}`} />
                                        </td>

                                        <td className={`px-4 py-2 ${row.fieldErrors['dominio'] ? 'bg-red-100' : ''}`}>
                                            <select value={row.dominio} onChange={e => handleUpdateRow(row.id, 'dominio', e.target.value)}
                                                className={`w-full text-xs p-1 border rounded ${row.fieldErrors['dominio'] ? 'border-red-500 bg-red-50' : ''}`}>
                                                {domains.filter(d => d.isActive).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                            </select>
                                        </td>
                                        <td className={`px-4 py-2 ${row.fieldErrors['estado'] ? 'bg-red-100' : ''}`}>
                                            <SelectorCampo valor={row.estado || ''} onChange={v => handleUpdateRow(row.id, 'estado', v)}
                                                opciones={getOptionsWithCurrent('estado', row.estado)} modo={getM('estado')} compact />
                                        </td>
                                        <td className={`px-4 py-2 ${row.fieldErrors['tipo'] ? 'bg-red-100' : ''}`}>
                                            <SelectorCampo valor={row.tipo || ''} onChange={v => handleUpdateRow(row.id, 'tipo', v)}
                                                opciones={getOptionsWithCurrent('tipo_requerimiento', row.tipo)} modo={getM('tipo_requerimiento')} compact />
                                        </td>
                                        <td className={`px-4 py-2 ${row.fieldErrors['urgency'] ? 'bg-red-100' : ''}`}>
                                            <SelectorCampo valor={row.urgency || ''} onChange={v => handleUpdateRow(row.id, 'urgency', v)}
                                                opciones={getOptionsWithCurrent('urgencia', row.urgency)} modo={getM('urgencia')} compact />
                                        </td>

                                        <td className="px-4 py-2">
                                            <input type="text" value={row.tarea_sn || ''} onChange={e => handleUpdateRow(row.id, 'tarea_sn', e.target.value)} className="w-full text-xs border rounded p-1" />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input type="text" value={row.ticket_rit || ''} onChange={e => handleUpdateRow(row.id, 'ticket_rit', e.target.value)} className="w-full text-xs border rounded p-1" />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input type="text" value={row.priority || ''} onChange={e => handleUpdateRow(row.id, 'priority', e.target.value)} className="w-full text-xs border rounded p-1" />
                                        </td>

                                        <td className={`px-4 py-2 ${row.fieldErrors['solicitante'] ? 'bg-red-100' : ''}`}>
                                            <SelectorCampo valor={row.solicitante || ''} onChange={v => handleUpdateRow(row.id, 'solicitante', v)}
                                                opciones={getOptionsWithCurrent('usuario_solicitante', row.solicitante)} modo={getM('usuario_solicitante')} placeholder="Nombre..." compact />
                                        </td>
                                        <td className="px-4 py-2">
                                            <SelectorCampo valor={row.direccion_solicitante || ''} onChange={v => handleUpdateRow(row.id, 'direccion_solicitante', v)}
                                                opciones={getOptionsWithCurrent('direccion_solicitante', row.direccion_solicitante)} modo={getM('direccion_solicitante')} compact />
                                        </td>
                                        <td className="px-4 py-2">
                                            <SelectorCampo valor={row.institucion || ''} onChange={v => handleUpdateRow(row.id, 'institucion', v)}
                                                opciones={getOptionsWithCurrent('institucion', row.institucion)} modo={getM('institucion')} compact />
                                        </td>
                                        <td className="px-4 py-2">
                                            <SelectorCampo valor={row.brm || ''} onChange={v => handleUpdateRow(row.id, 'brm', v)}
                                                opciones={getOptionsWithCurrent('brm', row.brm)} modo={getM('brm')} compact />
                                        </td>
                                        <td className="px-4 py-2">
                                            <SelectorCampo valor={row.asignado_a || ''} onChange={v => handleUpdateRow(row.id, 'asignado_a', v)}
                                                opciones={getOptionsWithCurrent('asignado_a', row.asignado_a)} modo={getM('asignado_a')} compact />
                                        </td>

                                        <td className={`px-4 py-2 ${row.fieldErrors['tipo_tarea'] ? 'bg-red-100' : ''}`}>
                                            <SelectorCampo valor={row.tipo_tarea || ''} onChange={v => handleUpdateRow(row.id, 'tipo_tarea', v)}
                                                opciones={getOptionsWithCurrent('tipo_tarea', row.tipo_tarea)} modo={getM('tipo_tarea')} compact />
                                        </td>
                                        <td className={`px-4 py-2 ${row.fieldErrors['complejidad'] ? 'bg-red-100' : ''}`}>
                                            <SelectorCampo valor={row.complejidad || ''} onChange={v => handleUpdateRow(row.id, 'complejidad', v)}
                                                opciones={getOptionsWithCurrent('complejidad', row.complejidad)} modo={getM('complejidad')} compact />
                                        </td>

                                        <td className={`px-4 py-2 ${row.fieldErrors['fecha_inicio'] ? 'bg-red-100' : ''}`}>
                                            <input type="date" value={row.fecha_inicio || ''} onChange={e => handleUpdateRow(row.id, 'fecha_inicio', e.target.value)}
                                                className={`w-full text-xs border rounded p-1 ${row.fieldErrors['fecha_inicio'] ? 'border-red-500 bg-red-50' : ''}`} />
                                        </td>
                                        <td className={`px-4 py-2 ${row.fieldErrors['fecha_fin'] ? 'bg-red-100' : ''}`}>
                                            <input type="date" value={row.fecha_fin || ''} onChange={e => handleUpdateRow(row.id, 'fecha_fin', e.target.value)}
                                                className={`w-full text-xs border rounded p-1 ${row.fieldErrors['fecha_fin'] ? 'border-red-500 bg-red-50' : ''}`} />
                                        </td>

                                        <td className="px-4 py-2 text-right sticky right-0 bg-white z-10">
                                            <button onClick={() => handleDeleteRow(row.id)} className="text-red-400 hover:text-red-600">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col items-center justify-center p-8 overflow-y-auto">
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Panel de Importación */}
                <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 flex flex-col items-center text-center hover:shadow-xl transition-shadow group">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-colors">
                        <Upload className="text-blue-600" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Importar Masivamente</h3>
                    <p className="text-slate-500 mb-8 text-sm leading-relaxed">
                        Carga requerimientos desde un archivo Excel o CSV.<br />
                        Soporta todas las columnas del modelo de datos.
                    </p>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                        className="hidden"
                    />

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <FileSpreadsheet size={20} />
                        Seleccionar Archivo
                    </button>
                    <p className="text-xs text-slate-400 mt-4">
                        Formatos soportados: .xlsx, .csv
                    </p>
                </div>

                {/* Panel de Exportación */}
                <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 flex flex-col items-center text-center hover:shadow-xl transition-shadow group">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-6 group-hover:bg-green-100 transition-colors">
                        <Download className="text-green-600" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Exportar Todo</h3>
                    <p className="text-slate-500 mb-8 text-sm leading-relaxed">
                        Descarga todos los requerimientos actuales a un archivo para reporte o respaldo offline.
                    </p>

                    <div className="flex flex-col w-full gap-3">
                        <button
                            onClick={handleExportExcel}
                            className="w-full py-3 bg-white border-2 border-green-600 text-green-700 hover:bg-green-50 rounded-lg font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <FileSpreadsheet size={20} />
                            Descargar Excel (.xlsx)
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="w-full py-3 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <span className="font-mono font-bold text-xs border border-current px-1 rounded">CSV</span>
                            Descargar CSV
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
