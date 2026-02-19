import React, { useState, useRef } from 'react';
import { ITRequest, Status, RequestType, Priority, CatalogItem, CatalogoItem, CatalogType } from '../../types';
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
    prioridad?: string; // Priority enum or string
    tipo?: string; // RequestType enum or string
    dominio?: string;
    estado?: string; // Status enum or string

    // Nuevos campos
    solicitante?: string; // email or name
    asignado_a?: string; // id or name
    prioridad_negocio?: string;
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

    // --- Lógica de Exportación ---
    const handleExportCSV = () => {
        const data = requests.map(req => ({
            ID: req.id,
            Titulo: req.title,
            Descripcion: req.description,
            Estado: req.status,
            Prioridad: req.priority,
            Tipo: req.type,
            Dominio: req.domain,
            Solicitante: req.requester,
            Asignado: req.assigneeId || '',
            Fecha_Creacion: new Date(req.createdAt).toLocaleDateString(),
            Prioridad_Negocio: req.prioridadNegocio || '',
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
            Prioridad: req.priority,
            Tipo: req.type,
            Dominio: req.domain,
            Solicitante: req.requester,
            Asignado: req.assigneeId || '',
            Fecha_Creacion: new Date(req.createdAt).toLocaleDateString(),
            Prioridad_Negocio: req.prioridadNegocio || '',
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

            // Mapeo flexible de columnas
            const mappedData: ValidatedRow[] = data.map((row, index) => {
                // Crear un mapa de claves normalizadas a valores
                const normalizedRow: { [key: string]: any } = {};
                Object.keys(row).forEach(key => {
                    normalizedRow[normalizeKey(key)] = row[key];
                });

                const titulo = normalizedRow['titulo'] || normalizedRow['title'] || '';
                const descripcion = normalizedRow['descripcion'] || normalizedRow['description'] || normalizedRow['desc'] || '';

                const errors: string[] = [];
                if (!titulo) errors.push('El título es obligatorio');
                if (!descripcion) errors.push('La descripción es obligatoria');

                return {
                    id: `temp-${index}`,
                    titulo,
                    descripcion,
                    tarea_sn: normalizedRow['tareasn'] || normalizedRow['tarea'] || normalizedRow['task'] || normalizedRow['sn_task'],
                    ticket_rit: normalizedRow['ticketrit'] || normalizedRow['ritm'] || normalizedRow['ticket'] || normalizedRow['rit'],
                    prioridad: normalizedRow['prioridad'] || normalizedRow['priority'] || 'Media',
                    tipo: normalizedRow['tipo'] || normalizedRow['type'] || 'Nuevo Pedido',
                    dominio: normalizedRow['dominio'] || normalizedRow['domain'] || domains[0]?.name || '',
                    estado: normalizedRow['estado'] || normalizedRow['status'] || 'Pendiente',

                    solicitante: normalizedRow['solicitante'] || normalizedRow['requester'] || '',
                    asignado_a: normalizedRow['asignado'] || normalizedRow['assignee'] || '',
                    prioridad_negocio: normalizedRow['prioridad_negocio'] || normalizedRow['prioridad negocio'] || '',
                    fecha_inicio: normalizedRow['fecha_inicio'] || normalizedRow['start_date'] || '',
                    fecha_fin: normalizedRow['fecha_fin'] || normalizedRow['end_date'] || '',
                    direccion_solicitante: normalizedRow['direccion'] || normalizedRow['direction'] || '',
                    brm: normalizedRow['brm'] || '',
                    institucion: normalizedRow['institucion'] || normalizedRow['institution'] || '',
                    tipo_tarea: normalizedRow['tipo_tarea'] || normalizedRow['task_type'] || '',
                    complejidad: normalizedRow['complejidad'] || normalizedRow['complexity'] || '',

                    isValid: errors.length === 0,
                    errors
                };
            });

            setImportData(mappedData);
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
                priority: (row.prioridad as Priority) || Priority.Medium,
                type: (row.tipo as RequestType) || RequestType.NewOrder,
                domain: row.dominio || domains[0]?.name || 'General',
                status: row.estado as Status || Status.Pending,
                requester: row.solicitante || 'Importado',
                assigneeId: row.asignado_a || null,
                prioridadNegocio: row.prioridad_negocio || null,
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

            const updated = { ...row, [field]: value };
            const errors: string[] = [];
            if (!updated.titulo) errors.push('El título es obligatorio');
            if (!updated.descripcion) errors.push('La descripción es obligatoria');

            return {
                ...updated,
                isValid: errors.length === 0,
                errors
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
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[150px]">Prioridad</th>

                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[120px]">Tarea SN</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[120px]">Ticket RIT</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[120px]">N° Prioridad</th>

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
                                                    <div className="absolute left-6 top-0 bg-red-800 text-white text-xs p-2 rounded w-48 hidden group-hover:block z-50 shadow-lg">
                                                        {row.errors.join(', ')}
                                                    </div>
                                                </div>
                                            }
                                        </td>
                                        <td className="px-4 py-2">
                                            <input type="text" value={row.titulo} onChange={e => handleUpdateRow(row.id, 'titulo', e.target.value)}
                                                className={`w-full border p-1 rounded text-sm ${!row.titulo ? 'border-red-300 bg-red-50' : 'border-slate-200'}`} />
                                        </td>
                                        <td className="px-4 py-2">
                                            <textarea rows={1} value={row.descripcion} onChange={e => handleUpdateRow(row.id, 'descripcion', e.target.value)}
                                                className={`w-full border p-1 rounded text-sm ${!row.descripcion ? 'border-red-300 bg-red-50' : 'border-slate-200'}`} />
                                        </td>

                                        <td className="px-4 py-2">
                                            <select value={row.dominio} onChange={e => handleUpdateRow(row.id, 'dominio', e.target.value)} className="w-full text-xs p-1 border rounded">
                                                {domains.filter(d => d.isActive).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-4 py-2">
                                            <SelectorCampo valor={row.estado || ''} onChange={v => handleUpdateRow(row.id, 'estado', v)}
                                                opciones={getCats('estado')} modo={getM('estado')} fallbackOptions={Object.values(Status)} compact />
                                        </td>
                                        <td className="px-4 py-2">
                                            <SelectorCampo valor={row.tipo || ''} onChange={v => handleUpdateRow(row.id, 'tipo', v)}
                                                opciones={getCats('tipo_requerimiento')} modo={getM('tipo_requerimiento')} fallbackOptions={Object.values(RequestType)} compact />
                                        </td>
                                        <td className="px-4 py-2">
                                            <SelectorCampo valor={row.prioridad || ''} onChange={v => handleUpdateRow(row.id, 'prioridad', v)}
                                                opciones={getCats('prioridad_negocio')} modo={getM('prioridad_negocio')} fallbackOptions={Object.values(Priority)} compact />
                                        </td>

                                        <td className="px-4 py-2">
                                            <input type="text" value={row.tarea_sn || ''} onChange={e => handleUpdateRow(row.id, 'tarea_sn', e.target.value)} className="w-full text-xs border rounded p-1" />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input type="text" value={row.ticket_rit || ''} onChange={e => handleUpdateRow(row.id, 'ticket_rit', e.target.value)} className="w-full text-xs border rounded p-1" />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input type="text" value={row.prioridad_negocio || ''} onChange={e => handleUpdateRow(row.id, 'prioridad_negocio', e.target.value)} className="w-full text-xs border rounded p-1" />
                                        </td>

                                        <td className="px-4 py-2">
                                            <SelectorCampo valor={row.solicitante || ''} onChange={v => handleUpdateRow(row.id, 'solicitante', v)}
                                                opciones={getCats('usuario_solicitante')} modo={getM('usuario_solicitante')} placeholder="Nombre..." compact />
                                            {/* Fallback input if selector empty handled by compact mode/selector */}
                                        </td>
                                        <td className="px-4 py-2">
                                            <SelectorCampo valor={row.direccion_solicitante || ''} onChange={v => handleUpdateRow(row.id, 'direccion_solicitante', v)}
                                                opciones={getCats('direccion_solicitante')} modo={getM('direccion_solicitante')} compact />
                                        </td>
                                        <td className="px-4 py-2">
                                            <SelectorCampo valor={row.institucion || ''} onChange={v => handleUpdateRow(row.id, 'institucion', v)}
                                                opciones={getCats('institucion')} modo={getM('institucion')} compact />
                                        </td>
                                        <td className="px-4 py-2">
                                            <SelectorCampo valor={row.brm || ''} onChange={v => handleUpdateRow(row.id, 'brm', v)}
                                                opciones={getCats('brm')} modo={getM('brm')} compact />
                                        </td>
                                        <td className="px-4 py-2">
                                            <SelectorCampo valor={row.asignado_a || ''} onChange={v => handleUpdateRow(row.id, 'asignado_a', v)}
                                                opciones={getCats('asignado_a')} modo={getM('asignado_a')} compact />
                                        </td>

                                        <td className="px-4 py-2">
                                            <SelectorCampo valor={row.tipo_tarea || ''} onChange={v => handleUpdateRow(row.id, 'tipo_tarea', v)}
                                                opciones={getCats('tipo_tarea')} modo={getM('tipo_tarea')} compact />
                                        </td>
                                        <td className="px-4 py-2">
                                            <SelectorCampo valor={row.complejidad || ''} onChange={v => handleUpdateRow(row.id, 'complejidad', v)}
                                                opciones={getCats('complejidad')} modo={getM('complejidad')} compact />
                                        </td>

                                        <td className="px-4 py-2">
                                            <input type="date" value={row.fecha_inicio || ''} onChange={e => handleUpdateRow(row.id, 'fecha_inicio', e.target.value)} className="w-full text-xs border rounded p-1" />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input type="date" value={row.fecha_fin || ''} onChange={e => handleUpdateRow(row.id, 'fecha_fin', e.target.value)} className="w-full text-xs border rounded p-1" />
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
