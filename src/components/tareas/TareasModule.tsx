import React, { useState } from 'react';
import { TareasBoard } from './TareasBoard';
import { TareasList } from './TareasList';

export const TareasModule: React.FC = () => {
    const [vistaActiva, setVistaActiva] = useState<'Tablero' | 'Lista'>('Tablero');

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-50">
            <div className="flex bg-white shadow-sm px-6 py-3 justify-between items-center rounded-lg border border-slate-200 mb-4 flex-shrink-0">
                <div className="flex space-x-1 border border-slate-200 rounded-lg p-1 bg-slate-50">
                    <button
                        onClick={() => setVistaActiva('Tablero')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${vistaActiva === 'Tablero' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Vista Tablero
                    </button>
                    <button
                        onClick={() => setVistaActiva('Lista')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${vistaActiva === 'Lista' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Tareas Terminadas
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {vistaActiva === 'Tablero' ? <TareasBoard /> : <TareasList />}
            </div>
        </div>
    );
};
