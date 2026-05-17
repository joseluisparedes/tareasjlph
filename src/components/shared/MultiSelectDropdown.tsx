import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';

interface MultiSelectDropdownProps {
    label: string;
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    className?: string;
    icon?: React.ReactNode;
}

export function MultiSelectDropdown({
    label,
    options,
    selected,
    onChange,
    placeholder = 'Seleccionar...',
    className = '',
    icon
}: MultiSelectDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleOption = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter(item => item !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    const clearSelection = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([]);
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 bg-white hover:bg-slate-50 transition-all text-sm text-left shadow-sm h-10"
            >
                <div className="flex items-center gap-2 flex-1 overflow-hidden">
                    {icon && <div className="text-slate-400 shrink-0">{icon}</div>}
                    <div className="flex flex-col flex-1 min-w-0 pr-1">
                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider leading-none mb-1 truncate">{label}</span>
                    <span className="truncate leading-tight text-xs">
                        {selected.length === 0
                            ? placeholder
                            : selected.length === 1
                                ? selected[0]
                                : `${selected.length} seleccionados`}
                    </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        {selected.length > 0 && (
                            <div
                                onClick={clearSelection}
                                className="p-0.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={12} />
                            </div>
                        )}
                        <ChevronDown size={14} className="text-slate-400" />
                    </div>
                </div>
            </button>

            {isOpen && (
                <div className="absolute z-50 w-72 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl top-full left-0 max-h-[400px] flex flex-col animate-in fade-in zoom-in duration-200 overflow-hidden">
                    {options.length > 5 && (
                        <div className="p-2 border-b border-slate-100 shrink-0">
                            <div className="relative">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Buscar..."
                                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                />
                            </div>
                        </div>
                    )}

                    <div className="overflow-y-auto flex-1 p-1">
                        {filteredOptions.length === 0 ? (
                            <div className="p-3 text-center text-xs text-slate-500">
                                No se encontraron resultados
                            </div>
                        ) : (
                            filteredOptions.map(option => {
                                const isSelected = selected.includes(option);
                                return (
                                    <div
                                        key={option}
                                        onClick={() => toggleOption(option)}
                                        className={`flex items-start gap-3 px-3 py-2 rounded-xl cursor-pointer text-sm transition-all ${isSelected ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-slate-50 text-slate-600'
                                            }`}
                                    >
                                        <div className={`mt-0.5 w-4 h-4 rounded-md flex items-center justify-center border shrink-0 transition-all ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-sm scale-110' : 'border-slate-300 bg-white'
                                            }`}>
                                            {isSelected && <Check size={12} strokeWidth={3} />}
                                        </div>
                                        <span className="flex-1 leading-tight break-words">{option}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
