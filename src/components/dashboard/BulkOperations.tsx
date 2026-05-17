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
    ingresado_gestion_demanda?: string;
    es_proyecto_spo?: string;
    id_demanda?: string;
}

interface ValidatedRow extends ImportRow {
    isValid: boolean;
    errors: string[];
    fieldErrors: Record<string, boolean>; // Para resaltar celdas
    id: string; // ID temporal para la tabla
}

interface BulkOperationsProps {
    requests: ITRequest[];
    onImport: (requests: Partial<ITRequest>[]) => Promise<void>;
    domains: CatalogItem[];
    catalogos: CatalogoItem[];
    getModo?: (tipo: CatalogType) => 'desplegable' | 'cuadros';
    importFields?: string[];
    exportFields?: string[];
}

export const BulkOperations: React.FC<BulkOperationsProps> = ({ requests, onImport, domains, catalogos, getModo, importFields = [], exportFields = [] }) => {
    const [mode, setMode] = useState<'menu' | 'import' | 'export'>('menu');
    const [importData, setImportData] = useState<ValidatedRow[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Helpers para catálogos
    const getCats = (tipo: CatalogType) => catalogos.filter(c => c.tipo === tipo && c.esta_activo);
    const getM = (t: CatalogType) => getModo?.(t) ?? 'desplegable';
    const isI = (f: string) => {
        if (importFields.length === 0) return true;
        if (importFields.includes(f)) return true;
        const synonyms: Record<string, string[]> = {
            'solicitante': ['usuario_solicitante'],
            'usuario_solicitante': ['solicitante'],
            'tipo': ['tipo_requerimiento'],
            'tipo_requerimiento': ['tipo'],
            'urgency': ['urgencia'],
            'urgencia': ['urgency'],
            'priority': ['prioridad'],
            'prioridad': ['priority']
        };
        const list = synonyms[f] || [];
        return list.some(syn => importFields.includes(syn));
    };

    // Helper para incluir valor actual si no existe (para visualización)
    const getOptionsWithCurrent = (tipo: CatalogType, currentValue: string | undefined): CatalogoItem[] => {
        return getCats(tipo);
    };

    // --- Lógica de Exportación ---
    const getExportData = () => {
        const fieldMapping: Record<string, { label: string, getValue: (req: ITRequest) => any }> = {
            'id': { label: 'ID Iniciativa', getValue: req => req.id },
            'titulo': { label: 'Título', getValue: req => req.title },
            'descripcion': { label: 'Descripción', getValue: req => req.description },
            'solicitante': { label: 'Solicitante', getValue: req => req.requester },
            'direccion_solicitante': { label: 'Dirección Solicitante', getValue: req => req.direccionSolicitante },
            'brm': { label: 'BRM', getValue: req => req.brm },
            'institucion': { label: 'Institución', getValue: req => req.institucion },
            'dominio': { label: 'Dominio TI', getValue: req => req.domain },
            'urgencia': { label: 'Urgencia', getValue: req => req.urgency },
            'estado': { label: 'Estado', getValue: req => req.status },
            'prioridad': { label: 'Prioridad', getValue: req => req.priority },
            'tipo_tarea': { label: 'Tipo de Tarea', getValue: req => req.tipoTarea },
            'complejidad': { label: 'Complejidad', getValue: req => req.complejidad },
            'ingresado_gestion_demanda': { label: 'Ingresado GD', getValue: req => req.ingresadoGestionDemanda },
            'es_proyecto_spo': { label: '¿Es proyecto SPO?', getValue: req => req.esProyectoSpo },
            'id_demanda': { label: 'ID de la demanda', getValue: req => req.idDemanda },
            'fecha_inicio': { label: 'Fecha Inicio', getValue: req => req.fechaInicio },
            'fecha_fin': { label: 'Fecha Fin', getValue: req => req.fechaFin },
            'asignado_a': { label: 'Asignado a', getValue: req => req.assigneeId },
            'id_externo': { label: 'ID Externo', getValue: req => req.externalId },
            
            // Compatibilidad y campos adicionales
            'usuario_solicitante': { label: 'Solicitante', getValue: req => req.requester },
            'tipo_requerimiento': { label: 'Tipo', getValue: req => req.type },
            'fecha_creacion': { label: 'Fecha Creación', getValue: req => new Date(req.createdAt).toLocaleDateString() },
            'tarea_sn': { label: 'Tarea SN', getValue: req => req.tareaSN },
            'ticket_rit': { label: 'Ticket RIT', getValue: req => req.ticketRIT },
        };

        return requests.map(req => {
            const row: any = {};
            
            if (exportFields && exportFields.length > 0) {
                exportFields.forEach(field => {
                    if (fieldMapping[field]) {
                        row[fieldMapping[field].label] = fieldMapping[field].getValue(req) || '';
                    }
                });
            } else {
                Object.keys(fieldMapping).forEach(key => {
                    row[fieldMapping[key].label] = fieldMapping[key].getValue(req) || '';
                });
            }

            return row;
        });
    };

    const handleExportCSV = () => {
        const data = getExportData();
        const csv = Papa.unparse(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, `requerimientos_ti_${new Date().toISOString().slice(0, 10)}.csv`);
    };

    const handleExportExcel = () => {
        const data = getExportData();
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Requerimientos");
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
        saveAs(blob, `requerimientos_ti_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handleDownloadTemplate = () => {
        const fieldMapping: Record<string, { label: string, example: any }> = {
            'id': { label: 'ID Iniciativa', example: 'REQ-1001' },
            'titulo': { label: 'Título', example: 'Ejemplo de nueva iniciativa' },
            'descripcion': { label: 'Descripción', example: 'Descripción detallada de la necesidad...' },
            'solicitante': { label: 'Solicitante', example: 'Juan Pérez' },
            'direccion_solicitante': { label: 'Dirección Solicitante', example: 'Dirección de Finanzas' },
            'brm': { label: 'BRM', example: 'BRM asignado' },
            'institucion': { label: 'Institución', example: 'Institución ABC' },
            'dominio': { label: 'Dominio TI', example: 'Aplicaciones' },
            'urgencia': { label: 'Urgencia', example: 'Media' },
            'estado': { label: 'Estado', example: 'Pendiente' },
            'prioridad': { label: 'Prioridad', example: 'Media' },
            'tipo_tarea': { label: 'Tipo de Tarea', example: 'Desarrollo' },
            'complejidad': { label: 'Complejidad', example: 'Media' },
            'ingresado_gestion_demanda': { label: 'Ingresado GD', example: 'Sí' },
            'es_proyecto_spo': { label: '¿Es proyecto SPO?', example: 'No' },
            'id_demanda': { label: 'ID de la demanda', example: 'DEM-2024' },
            'fecha_inicio': { label: 'Fecha Inicio', example: '2024-01-15' },
            'fecha_fin': { label: 'Fecha Fin', example: '2024-06-30' },
            'asignado_a': { label: 'Asignado a', example: 'María Gómez' },
            'id_externo': { label: 'ID Externo', example: 'EXT-999' },
            
            // Compatibilidad
            'usuario_solicitante': { label: 'Solicitante', example: 'Juan Pérez' },
            'tipo_requerimiento': { label: 'Tipo', example: 'Nuevo Proyecto' },
            'tarea_sn': { label: 'Tarea SN', example: 'TSK000123' },
            'ticket_rit': { label: 'Ticket RIT', example: 'RITM000456' },
        };

        const templateRow: Record<string, any> = {};

        if (importFields && importFields.length > 0) {
            importFields.forEach(field => {
                if (fieldMapping[field]) {
                    templateRow[fieldMapping[field].label] = fieldMapping[field].example;
                }
            });
        } else {
            Object.keys(fieldMapping).forEach(key => {
                templateRow[fieldMapping[key].label] = fieldMapping[key].example;
            });
        }

        const worksheet = XLSX.utils.json_to_sheet([templateRow]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla Importación");

        // --- Generar Hoja 2: Diccionario y Valores Permitidos ---
        const getCatalogValues = (tipo: CatalogType) => catalogos.filter(c => c.tipo === tipo && c.esta_activo).map(c => c.valor).join(', ');

        const fieldRules: Record<string, { label: string, type: string, req: string, vals: string }> = {
            'id': { label: 'ID Iniciativa', type: 'Texto', req: 'Opcional', vals: 'Dejar vacío para crear una nueva iniciativa. Para actualizar una existente, ingresa su ID.' },
            'titulo': { label: 'Título', type: 'Texto', req: 'Obligatorio', vals: 'Cualquier texto descriptivo' },
            'descripcion': { label: 'Descripción', type: 'Texto Largo', req: 'Opcional', vals: 'Cualquier texto' },
            'solicitante': { label: 'Solicitante', type: 'Texto', req: 'Obligatorio', vals: 'Nombre o Correo del solicitante' },
            'direccion_solicitante': { label: 'Dirección Solicitante', type: 'Lista', req: 'Obligatorio', vals: getCatalogValues('direccion_solicitante') },
            'brm': { label: 'BRM', type: 'Lista', req: 'Obligatorio', vals: getCatalogValues('brm') },
            'institucion': { label: 'Institución', type: 'Lista', req: 'Opcional', vals: getCatalogValues('institucion') },
            'dominio': { label: 'Dominio TI', type: 'Lista', req: 'Obligatorio', vals: domains.map(d => d.name).join(', ') },
            'urgencia': { label: 'Urgencia', type: 'Lista', req: 'Obligatorio', vals: getCatalogValues('urgencia') || 'Baja, Media, Alta, Crítica' },
            'estado': { label: 'Estado', type: 'Lista', req: 'Obligatorio', vals: getCatalogValues('estado') || 'Pendiente, En Progreso, Cerrado' },
            'prioridad': { label: 'Prioridad', type: 'Lista', req: 'Opcional', vals: getCatalogValues('prioridad') || 'Baja, Media, Alta' },
            'tipo_tarea': { label: 'Tipo de Tarea', type: 'Lista', req: 'Opcional', vals: getCatalogValues('tipo_tarea') },
            'complejidad': { label: 'Complejidad', type: 'Lista', req: 'Opcional', vals: getCatalogValues('complejidad') },
            'ingresado_gestion_demanda': { label: 'Ingresado GD', type: 'Lista', req: 'Opcional', vals: getCatalogValues('ingresado_gestion_demanda') || 'Sí, No' },
            'es_proyecto_spo': { label: '¿Es proyecto SPO?', type: 'Lista', req: 'Opcional', vals: getCatalogValues('es_proyecto_spo') || 'Sí, No' },
            'id_demanda': { label: 'ID de la demanda', type: 'Texto', req: 'Opcional', vals: 'Cualquier texto' },
            'fecha_inicio': { label: 'Fecha Inicio', type: 'Fecha', req: 'Opcional', vals: 'Formato recomendado: AAAA-MM-DD (ej: 2024-12-31) o Fecha de Excel.' },
            'fecha_fin': { label: 'Fecha Fin', type: 'Fecha', req: 'Opcional', vals: 'Formato recomendado: AAAA-MM-DD (ej: 2024-12-31) o Fecha de Excel.' },
            'asignado_a': { label: 'Asignado a', type: 'Lista', req: 'Opcional', vals: getCatalogValues('asignado_a') || 'Nombres de los usuarios activos' },
            'id_externo': { label: 'ID Externo', type: 'Texto', req: 'Opcional', vals: 'Cualquier identificador externo' },
            
            // Compatibilidad
            'usuario_solicitante': { label: 'Solicitante', type: 'Texto', req: 'Obligatorio', vals: 'Nombre o Correo' },
            'tipo_requerimiento': { label: 'Tipo', type: 'Lista', req: 'Obligatorio', vals: getCatalogValues('tipo_requerimiento') },
            'tarea_sn': { label: 'Tarea SN', type: 'Texto', req: 'Opcional', vals: 'Cualquier texto' },
            'ticket_rit': { label: 'Ticket RIT', type: 'Texto', req: 'Opcional', vals: 'Cualquier texto' },
        };

        const dictRows: any[] = [];
        
        if (importFields && importFields.length > 0) {
            importFields.forEach(field => {
                if (fieldRules[field]) {
                    dictRows.push({
                        'Columna Excel': fieldRules[field].label,
                        'Tipo de Dato': fieldRules[field].type,
                        'Requerido': fieldRules[field].req,
                        'Valores Permitidos / Formato': fieldRules[field].vals || 'Cualquier valor'
                    });
                }
            });
        } else {
            Object.keys(fieldRules).forEach(key => {
                dictRows.push({
                    'Columna Excel': fieldRules[key].label,
                    'Tipo de Dato': fieldRules[key].type,
                    'Requerido': fieldRules[key].req,
                    'Valores Permitidos / Formato': fieldRules[key].vals || 'Cualquier valor'
                });
            });
        }

        const dictWorksheet = XLSX.utils.json_to_sheet(dictRows);
        
        // Auto-ajustar el ancho de las columnas en el diccionario para mejor legibilidad
        dictWorksheet['!cols'] = [
            { wch: 25 }, // Columna Excel
            { wch: 15 }, // Tipo de Dato
            { wch: 15 }, // Requerido
            { wch: 80 }  // Valores Permitidos
        ];

        XLSX.utils.book_append_sheet(workbook, dictWorksheet, "Diccionario y Valores");

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
        saveAs(blob, `plantilla_importacion.xlsx`);
    };

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
        const isI = (f: string) => {
            if (importFields.length === 0) return true;
            if (importFields.includes(f)) return true;
            const synonyms: Record<string, string[]> = {
                'solicitante': ['usuario_solicitante'],
                'usuario_solicitante': ['solicitante'],
                'tipo': ['tipo_requerimiento'],
                'tipo_requerimiento': ['tipo'],
                'urgency': ['urgencia'],
                'urgencia': ['urgency'],
                'priority': ['prioridad'],
                'prioridad': ['priority']
            };
            const list = synonyms[f] || [];
            return list.some(syn => importFields.includes(syn));
        };

        const checkRequired = (field: keyof ImportRow, label: string, configKey?: string) => {
            if (!isI(configKey || (field as string))) return;
            if (!row[field] || row[field]?.toString().trim() === '') {
                errors.push(`${label} está vacío`);
                fieldErrors[field] = true;
            }
        };

        // Validaciones obligatorias reales
        checkRequired('titulo', 'Título');
        checkRequired('dominio', 'Dominio TI', 'dominio');
        checkRequired('estado', 'Estado', 'estado');
        checkRequired('tipo', 'Tipo', 'tipo_requerimiento');
        checkRequired('urgency', 'Urgencia', 'urgencia');
        checkRequired('solicitante', 'Solicitante', 'usuario_solicitante');
        checkRequired('direccion_solicitante', 'Dirección Solicitante', 'direccion_solicitante');
        checkRequired('brm', 'BRM', 'brm');

        // Validación de Catálogo (existencia y estado activo)
        const checkCatalogValue = (field: keyof ImportRow, label: string, tipo: CatalogType) => {
            if (!isI(tipo)) return;
            const val = row[field];
            if (!val || val.toString().trim() === '') return;

            // Si es dominio, es especial porque viene de domains
            if (tipo === 'dominio' as any) {
                const domainExists = domains.some(d => d.name === val && d.isActive);
                if (!domainExists) {
                    errors.push(`${label} "${val}" no es válido o está inactivo`);
                    fieldErrors[field] = true;
                }
                return;
            }

            // Buscar en catalogos
            const matches = catalogos.filter(c => c.tipo === tipo && c.valor === val);
            if (matches.length === 0) {
                errors.push(`${label} "${val}" no existe en el catálogo`);
                fieldErrors[field] = true;
            } else if (matches.every(c => !c.esta_activo)) {
                errors.push(`${label} "${val}" está deshabilitado`);
                fieldErrors[field] = true;
            }
        };

        checkCatalogValue('dominio', 'Dominio TI', 'dominio' as any);
        checkCatalogValue('estado', 'Estado', 'estado');
        checkCatalogValue('tipo', 'Tipo', 'tipo_requerimiento');
        checkCatalogValue('urgency', 'Urgencia', 'urgencia');
        checkCatalogValue('direccion_solicitante', 'Dirección Solicitante', 'direccion_solicitante');
        checkCatalogValue('brm', 'BRM', 'brm');
        checkCatalogValue('institucion', 'Institución', 'institucion');
        checkCatalogValue('tipo_tarea', 'Tipo de Tarea', 'tipo_tarea');
        checkCatalogValue('complejidad', 'Complejidad', 'complejidad');
        checkCatalogValue('ingresado_gestion_demanda', 'Ingresado GD', 'ingresado_gestion_demanda');
        checkCatalogValue('es_proyecto_spo', '¿Es proyecto SPO?', 'es_proyecto_spo');

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
                    ingresado_gestion_demanda: extract(['ingresado_gestion_demanda', 'gestion_demanda'], 'ingresado_gestion_demanda'),
                    es_proyecto_spo: extract(['es_proyecto_spo', 'es_spo', 'spo_project', 'spo'], 'es_proyecto_spo'),
                    id_demanda: extract(['id_demanda', 'demanda_id', 'demanda', 'demand_id']),
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
                tareaSN: isI('tarea_sn') ? row.tarea_sn : undefined,
                ticketRIT: isI('ticket_rit') ? row.ticket_rit : undefined,
                urgency: (row.urgency as Urgency) || Urgency.Medium,
                type: (row.tipo as RequestType) || RequestType.NewOrder,
                domain: row.dominio || domains[0]?.name || 'General',
                status: row.estado as Status || Status.Pending,
                requester: row.solicitante || 'Importado',
                assigneeId: isI('asignado_a') ? (row.asignado_a || null) : undefined,
                priority: isI('prioridad') ? (row.priority || null) : undefined,
                fechaInicio: isI('fecha_inicio') ? (row.fecha_inicio || undefined) : undefined,
                fechaFin: isI('fecha_fin') ? (row.fecha_fin || undefined) : undefined,
                direccionSolicitante: isI('direccion_solicitante') ? (row.direccion_solicitante || undefined) : undefined,
                brm: isI('brm') ? (row.brm || undefined) : undefined,
                institucion: isI('institucion') ? (row.institucion || undefined) : undefined,
                tipoTarea: isI('tipo_tarea') ? (row.tipo_tarea || undefined) : undefined,
                complejidad: isI('complejidad') ? (row.complejidad || undefined) : undefined,
                ingresadoGestionDemanda: isI('ingresado_gestion_demanda') ? (row.ingresado_gestion_demanda || undefined) : undefined,
                esProyectoSpo: isI('es_proyecto_spo') ? (row.es_proyecto_spo || undefined) : undefined,
                idDemanda: isI('id_demanda') ? (row.id_demanda || undefined) : undefined,
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
                                    {isI('titulo') && <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[200px]">Título *</th>}
                                    {isI('descripcion') && <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[250px]">Descripción</th>}

                                    {isI('dominio') && <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[150px]">Dominio TI *</th>}
                                    {isI('estado') && <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[150px]">Estado *</th>}
                                    {isI('tipo_requerimiento') && <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[150px]">Tipo *</th>}
                                    {isI('urgencia') && <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[150px]">Urgencia *</th>}

                                    {isI('tarea_sn') && <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[120px]">Tarea SN</th>}
                                    {isI('ticket_rit') && <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[120px]">Ticket RIT</th>}
                                    {isI('prioridad') && <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[120px]">Prioridad</th>}

                                    {isI('usuario_solicitante') && <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[180px]">Solicitante *</th>}
                                    {isI('direccion_solicitante') && <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[180px]">Dirección *</th>}
                                    {isI('institucion') && <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[180px]">Institución</th>}
                                    {isI('brm') && <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[180px]">BRM *</th>}
                                    {isI('asignado_a') && <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[180px]">Asignado A</th>}

                                    {isI('tipo_tarea') && <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[150px]">Tipo Tarea</th>}
                                    {isI('complejidad') && <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[150px]">Complejidad</th>}
                                    {isI('ingresado_gestion_demanda') && <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[180px]">Ingresado Gestión Demanda</th>}

                                    {isI('fecha_inicio') && <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[140px]">F. Inicio</th>}
                                    {isI('fecha_fin') && <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[140px]">F. Fin</th>}
                                    {isI('es_proyecto_spo') && <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[150px]">¿Es proyecto SPO?</th>}
                                    {isI('id_demanda') && <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[150px]">ID de Demanda</th>}

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
                                        {isI('titulo') && (
                                            <td className={`px-4 py-2 ${row.fieldErrors['titulo'] ? 'bg-red-100' : ''}`}>
                                                <input type="text" value={row.titulo} onChange={e => handleUpdateRow(row.id, 'titulo', e.target.value)}
                                                    className={`w-full border p-1 rounded text-sm ${row.fieldErrors['titulo'] ? 'border-red-500 bg-red-50' : 'border-slate-200'}`} />
                                            </td>
                                        )}
                                        {isI('descripcion') && (
                                            <td className={`px-4 py-2 ${row.fieldErrors['descripcion'] ? 'bg-red-100' : ''}`}>
                                                <textarea rows={1} value={row.descripcion} onChange={e => handleUpdateRow(row.id, 'descripcion', e.target.value)}
                                                    className={`w-full border p-1 rounded text-sm ${row.fieldErrors['descripcion'] ? 'border-red-500 bg-red-50' : 'border-slate-200'}`} />
                                            </td>
                                        )}

                                        {isI('dominio') && (
                                            <td className={`px-4 py-2 ${row.fieldErrors['dominio'] ? 'bg-red-100' : ''}`}>
                                                <select value={row.dominio} onChange={e => handleUpdateRow(row.id, 'dominio', e.target.value)}
                                                    className={`w-full text-xs p-1 border rounded ${row.fieldErrors['dominio'] ? 'border-red-500 bg-red-50' : ''}`}>
                                                    {domains.filter(d => d.isActive).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                                </select>
                                            </td>
                                        )}
                                        {isI('estado') && (
                                            <td className={`px-4 py-2 ${row.fieldErrors['estado'] ? 'bg-red-100' : ''}`}>
                                                <SelectorCampo valor={row.estado || ''} onChange={v => handleUpdateRow(row.id, 'estado', v)}
                                                    opciones={getOptionsWithCurrent('estado', row.estado)} modo={getM('estado')} compact />
                                            </td>
                                        )}
                                        {isI('tipo_requerimiento') && (
                                            <td className={`px-4 py-2 ${row.fieldErrors['tipo'] ? 'bg-red-100' : ''}`}>
                                                <SelectorCampo valor={row.tipo || ''} onChange={v => handleUpdateRow(row.id, 'tipo', v)}
                                                    opciones={getOptionsWithCurrent('tipo_requerimiento', row.tipo)} modo={getM('tipo_requerimiento')} compact />
                                            </td>
                                        )}
                                        {isI('urgencia') && (
                                            <td className={`px-4 py-2 ${row.fieldErrors['urgency'] ? 'bg-red-100' : ''}`}>
                                                <SelectorCampo valor={row.urgency || ''} onChange={v => handleUpdateRow(row.id, 'urgency', v)}
                                                    opciones={getOptionsWithCurrent('urgencia', row.urgency)} modo={getM('urgencia')} compact />
                                            </td>
                                        )}

                                        {isI('tarea_sn') && (
                                            <td className="px-4 py-2">
                                                <input type="text" value={row.tarea_sn || ''} onChange={e => handleUpdateRow(row.id, 'tarea_sn', e.target.value)} className="w-full text-xs border rounded p-1" />
                                            </td>
                                        )}
                                        {isI('ticket_rit') && (
                                            <td className="px-4 py-2">
                                                <input type="text" value={row.ticket_rit || ''} onChange={e => handleUpdateRow(row.id, 'ticket_rit', e.target.value)} className="w-full text-xs border rounded p-1" />
                                            </td>
                                        )}
                                        {isI('prioridad') && (
                                            <td className="px-4 py-2">
                                                <input type="text" value={row.priority || ''} onChange={e => handleUpdateRow(row.id, 'priority', e.target.value)} className="w-full text-xs border rounded p-1" />
                                            </td>
                                        )}

                                        {isI('usuario_solicitante') && (
                                            <td className={`px-4 py-2 ${row.fieldErrors['solicitante'] ? 'bg-red-100' : ''}`}>
                                                <SelectorCampo valor={row.solicitante || ''} onChange={v => handleUpdateRow(row.id, 'solicitante', v)}
                                                    opciones={getOptionsWithCurrent('usuario_solicitante', row.solicitante)} modo={getM('usuario_solicitante')} placeholder="Nombre..." compact />
                                            </td>
                                        )}
                                        {isI('direccion_solicitante') && (
                                            <td className="px-4 py-2">
                                                <SelectorCampo valor={row.direccion_solicitante || ''} onChange={v => handleUpdateRow(row.id, 'direccion_solicitante', v)}
                                                    opciones={getOptionsWithCurrent('direccion_solicitante', row.direccion_solicitante)} modo={getM('direccion_solicitante')} compact />
                                            </td>
                                        )}
                                        {isI('institucion') && (
                                            <td className="px-4 py-2">
                                                <SelectorCampo valor={row.institucion || ''} onChange={v => handleUpdateRow(row.id, 'institucion', v)}
                                                    opciones={getOptionsWithCurrent('institucion', row.institucion)} modo={getM('institucion')} compact />
                                            </td>
                                        )}
                                        {isI('brm') && (
                                            <td className="px-4 py-2">
                                                <SelectorCampo valor={row.brm || ''} onChange={v => handleUpdateRow(row.id, 'brm', v)}
                                                    opciones={getOptionsWithCurrent('brm', row.brm)} modo={getM('brm')} compact />
                                            </td>
                                        )}
                                        {isI('asignado_a') && (
                                            <td className="px-4 py-2">
                                                <SelectorCampo valor={row.asignado_a || ''} onChange={v => handleUpdateRow(row.id, 'asignado_a', v)}
                                                    opciones={getOptionsWithCurrent('asignado_a', row.asignado_a)} modo={getM('asignado_a')} compact />
                                            </td>
                                        )}

                                        {isI('tipo_tarea') && (
                                            <td className={`px-4 py-2 ${row.fieldErrors['tipo_tarea'] ? 'bg-red-100' : ''}`}>
                                                <SelectorCampo valor={row.tipo_tarea || ''} onChange={v => handleUpdateRow(row.id, 'tipo_tarea', v)}
                                                    opciones={getOptionsWithCurrent('tipo_tarea', row.tipo_tarea)} modo={getM('tipo_tarea')} compact />
                                            </td>
                                        )}
                                        {isI('complejidad') && (
                                            <td className={`px-4 py-2 ${row.fieldErrors['complejidad'] ? 'bg-red-100' : ''}`}>
                                                <SelectorCampo valor={row.complejidad || ''} onChange={v => handleUpdateRow(row.id, 'complejidad', v)}
                                                    opciones={getOptionsWithCurrent('complejidad', row.complejidad)} modo={getM('complejidad')} compact />
                                            </td>
                                        )}
                                        {isI('ingresado_gestion_demanda') && (
                                            <td className={`px-4 py-2 ${row.fieldErrors['ingresado_gestion_demanda'] ? 'bg-red-100' : ''}`}>
                                                <SelectorCampo valor={row.ingresado_gestion_demanda || ''} onChange={v => handleUpdateRow(row.id, 'ingresado_gestion_demanda', v)}
                                                    opciones={getOptionsWithCurrent('ingresado_gestion_demanda', row.ingresado_gestion_demanda)} modo={getM('ingresado_gestion_demanda')} compact />
                                            </td>
                                        )}

                                        {isI('fecha_inicio') && (
                                            <td className={`px-4 py-2 ${row.fieldErrors['fecha_inicio'] ? 'bg-red-100' : ''}`}>
                                                <input type="date" value={row.fecha_inicio || ''} onChange={e => handleUpdateRow(row.id, 'fecha_inicio', e.target.value)}
                                                    className={`w-full text-xs border rounded p-1 ${row.fieldErrors['fecha_inicio'] ? 'border-red-500 bg-red-50' : ''}`} />
                                            </td>
                                        )}
                                        {isI('fecha_fin') && (
                                            <td className={`px-4 py-2 ${row.fieldErrors['fecha_fin'] ? 'bg-red-100' : ''}`}>
                                                <input type="date" value={row.fecha_fin || ''} onChange={e => handleUpdateRow(row.id, 'fecha_fin', e.target.value)}
                                                    className={`w-full text-xs border rounded p-1 ${row.fieldErrors['fecha_fin'] ? 'border-red-500 bg-red-50' : ''}`} />
                                            </td>
                                        )}
                                        {isI('es_proyecto_spo') && (
                                            <td className="px-4 py-2">
                                                <SelectorCampo valor={row.es_proyecto_spo || ''} onChange={v => handleUpdateRow(row.id, 'es_proyecto_spo', v)}
                                                    opciones={getOptionsWithCurrent('es_proyecto_spo', row.es_proyecto_spo)} modo={getM('es_proyecto_spo')} compact />
                                            </td>
                                        )}
                                        {isI('id_demanda') && (
                                            <td className="px-4 py-2">
                                                <input type="text" value={row.id_demanda || ''} onChange={e => handleUpdateRow(row.id, 'id_demanda', e.target.value)} className="w-full text-xs border rounded p-1" />
                                            </td>
                                        )}

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

                    <div className="w-full flex flex-col gap-3">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <FileSpreadsheet size={20} />
                            Seleccionar Archivo
                        </button>
                        <button
                            onClick={handleDownloadTemplate}
                            className="w-full py-2 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 rounded-lg font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
                        >
                            <Download size={16} />
                            Descargar Plantilla
                        </button>
                    </div>
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
