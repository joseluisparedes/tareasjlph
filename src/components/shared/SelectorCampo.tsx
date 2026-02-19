import React from 'react';
import { CatalogoItem } from '../../types';

interface SelectorCampoProps {
    label?: string;
    valor: string;
    onChange: (v: string) => void;
    opciones: CatalogoItem[];
    modo: 'desplegable' | 'cuadros';
    required?: boolean;
    placeholder?: string;
    fallbackOptions?: string[];
    className?: string; // Allow custom styling
    compact?: boolean; // New prop for table view
}

const labelClass = "block text-xs font-semibold text-slate-600 uppercase tracking-wide";
const inputClass = "mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm border p-2 bg-white text-slate-900";

export const SelectorCampo: React.FC<SelectorCampoProps> = ({
    label, valor, onChange, opciones, modo, required, placeholder = "-- Selecciona --", fallbackOptions, className, compact
}) => {

    const tieneOpciones = opciones.length > 0;
    const listaOpciones = tieneOpciones
        ? opciones
        : (fallbackOptions?.map(opt => ({ id: opt, valor: opt } as CatalogoItem)) || []);

    return (
        <div className={className || "col-span-6 sm:col-span-3"}>
            {label && <label className={labelClass}>{label} {required && <span className="text-red-500 normal-case">*</span>}</label>}

            {modo === 'cuadros' && listaOpciones.length > 0 ? (
                <div className={`mt-1 flex flex-wrap gap-1.5 ${compact ? 'flex-nowrap overflow-x-auto no-scrollbar' : ''}`}>
                    {!required && (
                        <button type="button"
                            onClick={() => onChange('')}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all whitespace-nowrap ${!valor
                                ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
                                }`}>
                            {compact ? '—' : (placeholder || '—')}
                        </button>
                    )}

                    {listaOpciones.map(op => {
                        const val = op.valor;
                        const labelText = op.abreviatura || val;
                        const selected = valor === val;
                        return (
                            <button
                                key={op.id || val}
                                type="button"
                                title={val}
                                onClick={() => onChange(val)}
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all whitespace-nowrap ${selected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                                    }`}
                                style={selected && op.color ? { backgroundColor: op.color, borderColor: op.color } : undefined}
                            >
                                {labelText}
                            </button>
                        );
                    })}
                    {required && !valor && <input type="text" required readOnly value="" className="sr-only" aria-hidden />}
                </div>
            ) : (
                <select
                    required={required}
                    className={compact ? "w-full text-xs p-1 border rounded bg-transparent focus:bg-white" : inputClass}
                    value={valor || ''}
                    onChange={e => onChange(e.target.value)}
                >
                    <option value="">{placeholder}</option>
                    {listaOpciones.map(op => (
                        <option key={op.id || op.valor} value={op.valor}>
                            {op.valor}
                        </option>
                    ))}
                </select>
            )}
        </div>
    );
};
