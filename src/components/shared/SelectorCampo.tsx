import React, { useState, useEffect, useRef } from 'react';
import { CatalogoItem } from '../../types';
import { Search, Plus, Check, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface SelectorCampoProps {
    label?: string;
    valor: string;
    onChange: (v: string) => void;
    opciones: CatalogoItem[];
    modo: 'desplegable' | 'cuadros';
    required?: boolean;
    placeholder?: string;
    fallbackOptions?: string[];
    className?: string;
    compact?: boolean;
}

const labelClass = "block text-xs font-semibold text-slate-600 uppercase tracking-wide";

export const SelectorCampo: React.FC<SelectorCampoProps> = ({
    label, valor, onChange, opciones, modo, required, placeholder = "-- Selecciona --", fallbackOptions, className, compact
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const tieneOpciones = opciones.length > 0;
    const listaOpciones = tieneOpciones
        ? opciones
        : (fallbackOptions?.map(opt => ({ id: opt, valor: opt } as CatalogoItem)) || []);

    // Cerrar al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = listaOpciones.filter(op =>
        op.valor.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleCreate = () => {
        if (searchTerm.trim()) {
            onChange(searchTerm.trim());
            setIsOpen(false);
            setSearchTerm('');
        }
    };

    // Modo Cuadros (Tags)
    if (modo === 'cuadros' && listaOpciones.length > 0) {
        return (
            <div className={className || "col-span-6 sm:col-span-3"}>
                {label && <label className={labelClass}>{label} {required && <span className="text-red-500 normal-case">*</span>}</label>}
                <div className={`mt-1 flex flex-wrap gap-1.5 ${compact ? 'flex-nowrap overflow-x-auto no-scrollbar' : ''}`}>
                    {!required && (
                        <button type="button" onClick={() => onChange('')}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all whitespace-nowrap ${!valor
                                ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'}`}>
                            {compact ? '—' : (placeholder || '—')}
                        </button>
                    )}
                    {listaOpciones.map(op => {
                        const val = op.valor;
                        const selected = valor === val;
                        return (
                            <button key={op.id || val} type="button" title={val} onClick={() => onChange(val)}
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all whitespace-nowrap ${selected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                                    }`}
                                style={selected && op.color ? { backgroundColor: op.color, borderColor: op.color } : undefined}>
                                {op.abreviatura || val}
                            </button>
                        );
                    })}
                </div>
                {required && !valor && <input type="text" required readOnly value="" className="sr-only" aria-hidden />}
            </div>
        );
    }

    // Modo Desplegable (Combobox Searchable)
    return (
        <div className={className || "col-span-6 sm:col-span-3"} ref={containerRef}>
            {label && <label className={labelClass}>{label} {required && <span className="text-red-500 normal-case">*</span>}</label>}
            <div className="relative mt-1">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`relative w-full cursor-default rounded-md border bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-xs ${compact ? 'h-8' : ''} ${!valor ? 'text-slate-500' : 'text-slate-900'} border-slate-300`}
                >
                    <span className="block truncate">{valor || placeholder}</span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronsUpDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    </span>
                </button>

                {isOpen && (
                    <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-xs">
                        {/* Search Input inside dropdown */}
                        <div className="px-2 pb-2 pt-1 sticky top-0 bg-white border-b border-slate-100 mb-1">
                            <div className="relative">
                                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    className="w-full rounded-md border border-slate-300 py-1.5 pl-8 pr-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
                                    placeholder="Buscar o crear..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            // Select first match or create
                                            if (filteredOptions.length > 0) handleSelect(filteredOptions[0].valor);
                                            else handleCreate();
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {filteredOptions.length === 0 ? (
                            <button
                                type="button"
                                onClick={handleCreate}
                                className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-blue-600 hover:bg-blue-50 w-full text-left flex items-center gap-2"
                            >
                                <Plus size={14} />
                                <span>Crear "{searchTerm || 'Nuevo'}"</span>
                            </button>
                        ) : (
                            filteredOptions.map((op) => (
                                <button
                                    key={op.id || op.valor}
                                    type="button"
                                    onClick={() => handleSelect(op.valor)}
                                    className={`relative cursor-pointer select-none py-2 pl-3 pr-9 w-full text-left hover:bg-slate-100 ${valor === op.valor ? 'bg-blue-50 text-blue-900 font-semibold' : 'text-slate-900'}`}
                                >
                                    <span className="block truncate">{op.valor}</span>
                                    {valor === op.valor && (
                                        <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600">
                                            <Check className="h-4 w-4" aria-hidden="true" />
                                        </span>
                                    )}
                                </button>
                            ))
                        )}
                        {!required && (
                            <button
                                type="button"
                                onClick={() => handleSelect('')}
                                className="relative cursor-default select-none py-2 pl-3 pr-9 w-full text-left text-slate-400 hover:bg-slate-50 border-t border-slate-100 mt-1"
                            >
                                <span className="block truncate italic">-- Ninguno --</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
            {required && !valor && <input type="text" required readOnly value="" className="sr-only" aria-hidden />}
        </div>
    );
};
