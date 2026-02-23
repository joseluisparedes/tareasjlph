import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';

interface MultiSelectDropdownProps {
    label: string;
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    className?: string;
}

export function MultiSelectDropdown({
    label,
    options,
    selected,
    onChange,
    placeholder = 'Seleccionar...',
    className = ''
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
                className="flex items-center justify-between w-full min-w-[140px] border border-slate-300 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white hover:bg-slate-50 transition-colors text-sm text-left"
            >
                <div className="flex flex-col flex-1 overflow-hidden pr-2">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 leading-none mb-0.5">{label}</span>
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
            </button>

            {isOpen && (
                <div className="absolute z-50 w-64 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl top-full left-0 max-h-80 flex flex-col">
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
                                        className={`flex items-start gap-2 px-2 py-1.5 rounded cursor-pointer text-sm transition-colors ${isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'
                                            }`}
                                    >
                                        <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
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
