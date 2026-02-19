import React from 'react';
import { LayoutDashboard, Settings, BarChart3, Link as LinkIcon, ChevronLeft, Menu } from 'lucide-react';
import { ViewMode } from '../../types';

interface SidebarProps {
    currentView: ViewMode;
    onChangeView: (view: ViewMode) => void;
    isOpen: boolean;
    toggleSidebar: () => void;
    esAdministrador?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen, toggleSidebar, esAdministrador }) => {
    const todosLosItems: { view: ViewMode; label: string; icon: React.ReactNode; soloAdmin?: boolean }[] = [
        { view: 'Dashboard', label: 'Tablero', icon: <LayoutDashboard size={20} /> },
        { view: 'Reports', label: 'Reportes', icon: <BarChart3 size={20} /> },
        { view: 'Integrations', label: 'Integraciones', icon: <LinkIcon size={20} /> },
        { view: 'Admin', label: 'Admin', icon: <Settings size={20} />, soloAdmin: true },
    ];

    const navItems = todosLosItems.filter(item => !item.soloAdmin || esAdministrador);

    return (
        <aside className={`bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 z-10 shadow-xl transition-all duration-300 ${isOpen ? 'w-64' : 'w-20'}`}>
            <div className={`p-6 border-b border-slate-800 flex items-center ${isOpen ? 'justify-between' : 'justify-center'}`}>
                {isOpen && (
                    <div className="overflow-hidden whitespace-nowrap">
                        <h1 className="text-xl font-bold tracking-tight text-blue-400">Gestor BRM</h1>
                        <p className="text-xs text-slate-400 mt-1">v1.0 - Enterprise</p>
                    </div>
                )}
                <button
                    onClick={toggleSidebar}
                    className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                    title={isOpen ? "Colapsar menú" : "Expandir menú"}
                >
                    {isOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
                </button>
            </div>

            <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
                {navItems.map((item) => (
                    <button
                        key={item.view}
                        onClick={() => onChangeView(item.view)}
                        title={!isOpen ? item.label : ''}
                        className={`w-full flex items-center ${isOpen ? 'gap-3 px-4' : 'justify-center px-2'} py-3 rounded-lg transition-colors duration-200 ${currentView === item.view
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <div className="flex-shrink-0">{item.icon}</div>
                        {isOpen && <span className="font-medium whitespace-nowrap overflow-hidden">{item.label}</span>}
                    </button>
                ))}
            </nav>
        </aside>
    );
};