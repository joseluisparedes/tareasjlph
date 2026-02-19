import React, { useState } from 'react';
import { CatalogItem, CatalogoItem, CatalogType, User, ITRequest } from '../../types';
import { Shield, Trash2, UserPlus, FolderPlus, AlertTriangle, Edit2, Save, X, Plus, Tag, LayoutGrid, List } from 'lucide-react';

interface AdminPanelProps {
    domains: CatalogItem[];
    users: User[];
    onUpdateDomain: (domain: CatalogItem) => void;
    onAddDomain: (name: string) => void;
    catalogos: CatalogoItem[];
    onAddCatalogo: (tipo: CatalogType, valor: string) => void;
    onUpdateCatalogo: (id: string, cambios: Partial<Pick<CatalogoItem, 'valor' | 'esta_activo' | 'color' | 'abreviatura'>>) => void;
    onDeleteCatalogo: (id: string) => void;
    getModo: (tipo: CatalogType) => 'desplegable' | 'cuadros';
    setModo: (tipo: CatalogType, modo: 'desplegable' | 'cuadros') => void;
    requests: ITRequest[];
}

type AdminTab = 'domains' | 'catalogs' | 'users';

const CATALOG_SECTIONS: { tipo: CatalogType; label: string }[] = [
    { tipo: 'tipo_requerimiento', label: 'Tipo de Requerimiento' },
    { tipo: 'prioridad_negocio', label: 'Prioridad del Negocio' },
    { tipo: 'estado', label: 'Estado' },
    { tipo: 'usuario_solicitante', label: 'Usuario Solicitante' },
    { tipo: 'direccion_solicitante', label: 'Dirección Solicitante' },
    { tipo: 'asignado_a', label: 'Asignado A' },
    { tipo: 'brm', label: 'BRM' },
    { tipo: 'institucion', label: 'Institución' },
    { tipo: 'tipo_tarea', label: 'Tipo de Tarea' },
    { tipo: 'complejidad', label: 'Complejidad' },
];

// ─── Sub-componente: lista de un catálogo ───────────────────────────────────
const CatalogSection: React.FC<{
    tipo: CatalogType;
    label: string;
    items: CatalogoItem[];
    modo: 'desplegable' | 'cuadros';
    onAdd: (tipo: CatalogType, valor: string) => void;
    onUpdate: (id: string, cambios: Partial<Pick<CatalogoItem, 'valor' | 'esta_activo' | 'color' | 'abreviatura'>>) => void;
    onDelete: (id: string) => void;
    onToggleModo: () => void;
    requests: ITRequest[];
}> = ({ tipo, label, items, modo, onAdd, onUpdate, onDelete, onToggleModo, requests }) => {
    const [adding, setAdding] = useState(false);
    const [newVal, setNewVal] = useState('');
    const [newAbrev, setNewAbrev] = useState('');
    const [editId, setEditId] = useState<string | null>(null);
    const [editVal, setEditVal] = useState('');
    const [editAbrev, setEditAbrev] = useState('');

    const handleAdd = () => {
        if (newVal.trim()) {
            onAdd(tipo, newVal.trim());
            // Guardar abreviatura si se ingresó — se hace en un segundo paso tras crear
            setNewVal(''); setNewAbrev(''); setAdding(false);
        }
    };
    const handleSaveEdit = (id: string) => {
        if (editVal.trim()) {
            onUpdate(id, { valor: editVal.trim(), abreviatura: editAbrev.trim() || null });
            setEditId(null);
        }
    };

    const handleDeleteClick = (item: CatalogoItem) => {
        if (tipo === 'estado') {
            const count = requests.filter(r => r.status === item.valor).length;
            if (count > 0) {
                if (confirm(`ADVERTENCIA CRÍTICA:\n\nEl estado "${item.valor}" contiene ${count} solicitudes.\nSi lo eliminas, SE ELIMINARÁN TODAS ESTAS SOLICITUDES permanentemente.\n\n¿Estás realmente seguro de continuar?`)) {
                    onDelete(item.id);
                }
                return;
            }
        }

        if (confirm(`¿Eliminar "${item.valor}"?`)) onDelete(item.id);
    };

    return (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <Tag size={14} className="text-blue-500" />
                    <span className="text-sm font-semibold text-slate-700">{label}</span>
                    <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">{items.length}</span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Toggle modo visualización */}
                    <button
                        onClick={onToggleModo}
                        title={modo === 'desplegable' ? 'Cambiar a cuadros de selección rápida' : 'Cambiar a lista desplegable'}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${modo === 'cuadros'
                            ? 'bg-violet-50 border-violet-300 text-violet-700 hover:bg-violet-100'
                            : 'bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200'
                            }`}
                    >
                        {modo === 'cuadros' ? <LayoutGrid size={11} /> : <List size={11} />}
                        {modo === 'cuadros' ? 'Cuadros' : 'Desplegable'}
                    </button>
                    <button onClick={() => setAdding(true)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                        <Plus size={12} /> Agregar
                    </button>
                </div>
            </div>

            {adding && (
                <div className="px-4 py-3 bg-blue-50 border-b border-slate-200 space-y-2">
                    <div className="flex items-center gap-2">
                        <input autoFocus type="text" placeholder="Valor completo (ej: Análisis)"
                            className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm bg-white text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                            value={newVal} onChange={e => setNewVal(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }} />
                        <input type="text" placeholder="Abrev. (ej: ANL)"
                            className="w-24 border border-slate-300 rounded px-2 py-1 text-sm bg-white text-slate-900 focus:ring-1 focus:ring-violet-500 outline-none"
                            value={newAbrev} onChange={e => setNewAbrev(e.target.value)} />
                        <button onClick={handleAdd} className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"><Save size={13} /></button>
                        <button onClick={() => { setAdding(false); setNewVal(''); setNewAbrev(''); }} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded"><X size={13} /></button>
                    </div>
                    <p className="text-xs text-slate-400">La abreviatura se muestra en modo "Cuadros" en el formulario.</p>
                </div>
            )}

            {items.length === 0 && !adding ? (
                <p className="text-xs text-slate-400 text-center py-4">Sin valores. Agrega el primero.</p>
            ) : (
                <div className="divide-y divide-slate-100">
                    {items.map(item => (
                        <div key={item.id} className={`flex items-center justify-between px-4 py-2.5 ${!item.esta_activo ? 'bg-slate-50' : 'bg-white'}`}>
                            {editId === item.id ? (
                                <div className="flex items-center gap-2 flex-1">
                                    <input autoFocus type="text" placeholder="Valor"
                                        className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm bg-white text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                                        value={editVal} onChange={e => setEditVal(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(item.id); if (e.key === 'Escape') setEditId(null); }} />
                                    <input type="text" placeholder="Abrev."
                                        className="w-20 border border-slate-300 rounded px-2 py-1 text-sm bg-white text-slate-900 focus:ring-1 focus:ring-violet-500 outline-none"
                                        value={editAbrev} onChange={e => setEditAbrev(e.target.value)} />
                                    <button onClick={() => handleSaveEdit(item.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save size={13} /></button>
                                    <button onClick={() => setEditId(null)} className="p-1 text-red-500 hover:bg-red-50 rounded"><X size={13} /></button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${item.esta_activo ? 'bg-green-500' : 'bg-slate-300'}`} />
                                        {tipo === 'prioridad_negocio' && (
                                            <label className="cursor-pointer" title="Cambiar color">
                                                <div className="w-5 h-5 rounded border border-slate-300 shadow-sm flex-shrink-0"
                                                    style={{ backgroundColor: item.color || '#94a3b8' }} />
                                                <input type="color" className="sr-only"
                                                    value={item.color || '#94a3b8'}
                                                    onChange={e => onUpdate(item.id, { color: e.target.value })} />
                                            </label>
                                        )}
                                        <span className={`text-sm ${!item.esta_activo ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.valor}</span>
                                        {item.abreviatura && (
                                            <span className="text-xs bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded font-mono font-medium">
                                                {item.abreviatura}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => { setEditId(item.id); setEditVal(item.valor); setEditAbrev(item.abreviatura || ''); }}
                                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded"><Edit2 size={12} /></button>
                                        <button onClick={() => onUpdate(item.id, { esta_activo: !item.esta_activo })}
                                            className={`text-xs px-2 py-0.5 rounded border transition-colors ${item.esta_activo ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                                            {item.esta_activo ? 'Desact.' : 'Activar'}
                                        </button>
                                        <button onClick={() => handleDeleteClick(item)}
                                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={12} /></button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Componente principal ────────────────────────────────────────────────────
export const AdminPanel: React.FC<AdminPanelProps> = ({
    domains, users: initialUsers, onUpdateDomain, onAddDomain,
    catalogos, onAddCatalogo, onUpdateCatalogo, onDeleteCatalogo,
    getModo, setModo, requests
}) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('domains');
    const [isAddingDomain, setIsAddingDomain] = useState(false);
    const [newDomainName, setNewDomainName] = useState('');
    const [editingDomainId, setEditingDomainId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const handleToggleDomain = (domain: CatalogItem) => {
        if (confirm(`¿${domain.isActive ? 'Desactivar' : 'Activar'} el dominio "${domain.name}"?`)) {
            onUpdateDomain({ ...domain, isActive: !domain.isActive });
        }
    };

    const handleSaveNewDomain = () => {
        if (newDomainName.trim()) { onAddDomain(newDomainName.trim()); setNewDomainName(''); setIsAddingDomain(false); }
    };

    const tabs: { id: AdminTab; label: string }[] = [
        { id: 'domains', label: 'Dominios TI' },
        { id: 'catalogs', label: 'Catálogos' },
        { id: 'users', label: 'Usuarios' },
    ];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[600px]">
            {/* Header */}
            <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Shield className="text-blue-600" size={22} /> Panel de Administración
                </h2>
                <p className="text-slate-500 text-sm mt-1">Gestiona dominios, catálogos de valores y usuarios del sistema.</p>
            </div>

            <div className="flex">
                {/* Sidebar nav */}
                <div className="w-56 border-r border-slate-200 p-4 space-y-1 flex-shrink-0">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 p-6">

                    {/* ── TAB: Dominios TI ── */}
                    {activeTab === 'domains' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-lg text-slate-800">Dominios TI</h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setModo('dominios', getModo('dominios') === 'desplegable' ? 'cuadros' : 'desplegable')}
                                        title={getModo('dominios') === 'desplegable' ? 'Cambiar a cuadros de selección rápida' : 'Cambiar a lista desplegable'}
                                        className={`flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-lg border font-medium transition-colors ${getModo('dominios') === 'cuadros'
                                            ? 'bg-violet-50 border-violet-300 text-violet-700 hover:bg-violet-100'
                                            : 'bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200'
                                            }`}
                                    >
                                        {getModo('dominios') === 'cuadros' ? <LayoutGrid size={14} /> : <List size={14} />}
                                        {getModo('dominios') === 'cuadros' ? 'Vista Cuadros' : 'Vista Desplegable'}
                                    </button>
                                    <button onClick={() => setIsAddingDomain(true)}
                                        className="flex items-center gap-2 text-sm bg-slate-800 text-white px-3 py-2 rounded-lg hover:bg-slate-700">
                                        <FolderPlus size={15} /> Agregar Dominio
                                    </button>
                                </div>
                            </div>

                            {isAddingDomain && (
                                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-2">
                                    <input autoFocus type="text" placeholder="Nombre del nuevo dominio TI"
                                        className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm bg-white text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                                        value={newDomainName} onChange={e => setNewDomainName(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveNewDomain(); if (e.key === 'Escape') setIsAddingDomain(false); }} />
                                    <button onClick={handleSaveNewDomain} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Save size={15} /></button>
                                    <button onClick={() => setIsAddingDomain(false)} className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg"><X size={15} /></button>
                                </div>
                            )}

                            <div className="rounded-lg border border-slate-200 overflow-hidden">
                                {domains.map(domain => (
                                    <div key={domain.id} className="flex items-center justify-between p-4 border-b border-slate-100 last:border-0 bg-white hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${domain.isActive ? 'bg-green-500' : 'bg-red-400'}`} />
                                            {editingDomainId === domain.id ? (
                                                <div className="flex items-center gap-2 flex-1 max-w-sm">
                                                    <input type="text"
                                                        className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm bg-white text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                                                        value={editName} onChange={e => setEditName(e.target.value)} />
                                                    <button onClick={() => { if (editName.trim()) { onUpdateDomain({ ...domain, name: editName.trim() }); setEditingDomainId(null); } }} className="text-green-600 hover:bg-green-50 p-1 rounded"><Save size={14} /></button>
                                                    <button onClick={() => setEditingDomainId(null)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={14} /></button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className={`font-medium text-sm ${!domain.isActive ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{domain.name}</span>
                                                    {!domain.isActive && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Inactivo</span>}
                                                    <button onClick={() => { setEditingDomainId(domain.id); setEditName(domain.name); }} className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-slate-100"><Edit2 size={13} /></button>
                                                </>
                                            )}
                                        </div>
                                        <button onClick={() => handleToggleDomain(domain)}
                                            className={`text-xs px-3 py-1.5 rounded border transition-colors ${domain.isActive ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                                            {domain.isActive ? 'Desactivar' : 'Activar'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-3 text-xs text-slate-400 flex items-center gap-1">
                                <AlertTriangle size={11} /> Desactivar un dominio no elimina las solicitudes históricas.
                            </p>
                        </div>
                    )}

                    {/* ── TAB: Catálogos ── */}
                    {activeTab === 'catalogs' && (
                        <div>
                            <div className="mb-5">
                                <h3 className="font-semibold text-lg text-slate-800">Catálogos de Valores</h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Configura los valores y el modo de visualización de cada campo del formulario.
                                    Usa <span className="font-semibold text-violet-600">Cuadros</span> para selección rápida con abreviatura, o <span className="font-semibold text-slate-600">Desplegable</span> para listas largas.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                {CATALOG_SECTIONS.map(({ tipo, label }) => (
                                    <CatalogSection
                                        key={tipo}
                                        tipo={tipo}
                                        label={label}
                                        items={catalogos.filter(c => c.tipo === tipo)}
                                        modo={getModo(tipo)}
                                        onAdd={onAddCatalogo}
                                        onUpdate={onUpdateCatalogo}
                                        onDelete={onDeleteCatalogo}
                                        onToggleModo={() => setModo(tipo, getModo(tipo) === 'desplegable' ? 'cuadros' : 'desplegable')}
                                        requests={requests}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── TAB: Usuarios ── */}
                    {activeTab === 'users' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-lg text-slate-800">Miembros del Equipo</h3>
                                <button className="flex items-center gap-2 text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700">
                                    <UserPlus size={15} /> Invitar Usuario
                                </button>
                            </div>
                            {initialUsers.length === 0 ? (
                                <div className="text-center py-16 text-slate-400">
                                    <p className="font-medium">No hay usuarios registrados aún.</p>
                                    <p className="text-sm mt-1">Los usuarios aparecerán aquí cuando se registren en el sistema.</p>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-slate-200 overflow-hidden">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuario</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Rol</th>
                                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-100">
                                            {initialUsers.map(user => (
                                                <tr key={user.id} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-medium text-slate-900">{user.name}</div>
                                                        <div className="text-xs text-slate-500">{user.email}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${user.role === 'Administrador' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                                            {user.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};