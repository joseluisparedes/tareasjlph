import React, { useState } from 'react';
import { CatalogItem, User } from '../../types';
import { Shield, Trash2, UserPlus, FolderPlus, AlertTriangle, Edit2, Save, X } from 'lucide-react';

interface AdminPanelProps {
    domains: CatalogItem[];
    users: User[];
    onUpdateDomain: (domain: CatalogItem) => void;
    onAddDomain: (name: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ domains, users: initialUsers, onUpdateDomain, onAddDomain }) => {
    const [activeTab, setActiveTab] = useState<'domains' | 'users'>('domains');
    const [isAddingDomain, setIsAddingDomain] = useState(false);
    const [newDomainName, setNewDomainName] = useState('');
    const [editingDomainId, setEditingDomainId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const handleToggleDomain = (domain: CatalogItem) => {
        if (confirm(`¿Estás seguro de que deseas ${domain.isActive ? 'desactivar' : 'activar'} este dominio?`)) {
            onUpdateDomain({ ...domain, isActive: !domain.isActive });
        }
    };

    const handleSaveNewDomain = () => {
        if (newDomainName.trim()) {
            onAddDomain(newDomainName.trim());
            setNewDomainName('');
            setIsAddingDomain(false);
        }
    };

    const startEditing = (domain: CatalogItem) => {
        setEditingDomainId(domain.id);
        setEditName(domain.name);
    };

    const saveEditing = (domain: CatalogItem) => {
        if (editName.trim()) {
            onUpdateDomain({ ...domain, name: editName.trim() });
            setEditingDomainId(null);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 min-h-[500px]">
            <div className="border-b border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Shield className="text-blue-600" /> Panel de Administración
                </h2>
                <p className="text-slate-500 mt-1">Gestiona configuraciones del sistema, catálogos y control de acceso de usuarios.</p>
            </div>

            <div className="flex">
                {/* Sidebar */}
                <div className="w-64 border-r border-slate-200 p-4 space-y-1">
                    <button
                        onClick={() => setActiveTab('domains')}
                        className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${activeTab === 'domains' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        Catálogo de Dominios
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${activeTab === 'users' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        Gestión de Usuarios
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-6">
                    {activeTab === 'domains' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-lg">Dominios de Negocio</h3>
                                <button
                                    onClick={() => setIsAddingDomain(true)}
                                    className="flex items-center gap-2 text-sm bg-slate-800 text-white px-3 py-2 rounded-md hover:bg-slate-700"
                                >
                                    <FolderPlus size={16} /> Agregar Dominio
                                </button>
                            </div>

                            {isAddingDomain && (
                                <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Nombre del Nuevo Dominio"
                                        className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                                        value={newDomainName}
                                        onChange={(e) => setNewDomainName(e.target.value)}
                                        autoFocus
                                    />
                                    <button onClick={handleSaveNewDomain} className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                        <Save size={16} />
                                    </button>
                                    <button onClick={() => setIsAddingDomain(false)} className="p-2 text-slate-500 hover:bg-slate-200 rounded-md">
                                        <X size={16} />
                                    </button>
                                </div>
                            )}

                            <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                                {domains.map((domain) => (
                                    <div key={domain.id} className="flex items-center justify-between p-4 border-b border-slate-200 last:border-0 bg-white">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${domain.isActive ? 'bg-green-500' : 'bg-red-400'}`}></div>

                                            {editingDomainId === domain.id ? (
                                                <div className="flex items-center gap-2 flex-1 max-w-sm">
                                                    <input
                                                        type="text"
                                                        className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm bg-white text-gray-900"
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                    />
                                                    <button onClick={() => saveEditing(domain)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Save size={14} /></button>
                                                    <button onClick={() => setEditingDomainId(null)} className="text-red-600 hover:bg-red-50 p-1 rounded"><X size={14} /></button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className={`font-medium ${!domain.isActive ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{domain.name}</span>
                                                    {!domain.isActive && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Inactivo</span>}
                                                    <button onClick={() => startEditing(domain)} className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-slate-100">
                                                        <Edit2 size={14} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleToggleDomain(domain)}
                                            className={`text-xs px-3 py-1.5 rounded border transition-colors ${domain.isActive ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
                                        >
                                            {domain.isActive ? 'Desactivar' : 'Activar'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-4 text-xs text-slate-500 flex items-center gap-1">
                                <AlertTriangle size={12} />
                                Desactivar un dominio no elimina las solicitudes históricas asociadas.
                            </p>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-lg">Miembros del Equipo</h3>
                                <button className="flex items-center gap-2 text-sm bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700">
                                    <UserPlus size={16} /> Invitar Usuario
                                </button>
                            </div>

                            {initialUsers.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <p>No hay usuarios registrados aún.</p>
                                    <p className="text-sm mt-1">Los usuarios aparecerán aquí cuando se registren.</p>
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {initialUsers.map((user) => (
                                            <tr key={user.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                            <div className="text-sm text-gray-500">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button className="text-indigo-600 hover:text-indigo-900">Editar</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};