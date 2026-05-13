/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Folder as FolderIcon, 
  Settings, 
  FileBox, 
  Trash2, 
  Edit2, 
  ChevronRight, 
  Upload, 
  Download, 
  Search,
  Wrench,
  Layers,
  Camera,
  ArrowLeft,
  Scissors,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Item, Folder, ItemType, AppData, PlasmaCalculation } from './types';
import { supabase } from './lib/supabase';

// Constants
const DEFAULT_DATA: AppData = {
  folders: [],
  items: [],
  plasmaCalculations: []
};

// --- Components ---

export default function App() {
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'plasma' | 'settings'>('inventory');
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [confirmAction, setConfirmAction] = useState<{ 
    title: string, 
    message: string, 
    onConfirm: () => void,
    confirmText?: string,
    confirmVariant?: 'danger' | 'success'
  } | null>(null);

  // Load data from Supabase
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [foldersRes, itemsRes, calcsRes] = await Promise.all([
        supabase.from('folders').select('*').order('created_at', { ascending: true }),
        supabase.from('items').select('*').order('created_at', { ascending: false }),
        supabase.from('calculations').select('*').order('created_at', { ascending: false })
      ]);

      setData({
        folders: (foldersRes.data || []).map(f => ({ 
          id: f.id,
          name: f.name,
          description: f.description,
          createdAt: new Date(f.created_at).getTime() 
        })),
        items: (itemsRes.data || []).map(i => ({ 
          id: i.id,
          folderId: i.folder_id,
          name: i.name,
          type: i.type,
          material: i.material,
          dimensions: i.dimensions,
          quantity: i.quantity,
          photoUrl: i.photo_url,
          notes: i.notes,
          createdAt: new Date(i.created_at).getTime() 
        })),
        plasmaCalculations: (calcsRes.data || []).map(c => ({ 
          id: c.id,
          sheetWidth: c.sheet_width,
          sheetHeight: c.sheet_height,
          partWidth: c.part_width,
          partHeight: c.part_height,
          margin: c.margin,
          result: c.result,
          createdAt: new Date(c.created_at).getTime(),
        }))
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const addFolder = async (name: string, description: string) => {
    const { data: newFolder, error } = await supabase
      .from('folders')
      .insert([{ name, description }])
      .select()
      .single();

    if (!error && newFolder) {
      setData(prev => ({ 
        ...prev, 
        folders: [...prev.folders, { ...newFolder, createdAt: new Date(newFolder.created_at).getTime() }] 
      }));
    }
    setIsAddingFolder(false);
  };

  const updateFolder = async (id: string, name: string, description: string) => {
    const { error } = await supabase
      .from('folders')
      .update({ name, description })
      .eq('id', id);

    if (!error) {
      setData(prev => ({
        ...prev,
        folders: prev.folders.map(f => f.id === id ? { ...f, name, description } : f)
      }));
      if (selectedFolder?.id === id) {
        setSelectedFolder(prev => prev ? { ...prev, name, description } : null);
      }
    }
    setEditingFolder(null);
  };

  const deleteFolder = (id: string) => {
    setConfirmAction({
      title: 'Excluir Pasta',
      message: 'Tem certeza que deseja deletar esta pasta? Todos os itens nela serão perdidos permanentemente.',
      confirmText: 'Confirmar Exclusão',
      confirmVariant: 'danger',
      onConfirm: async () => {
        // Supabase foreign key should handle item deletion if ON DELETE CASCADE is set
        const { error } = await supabase.from('folders').delete().eq('id', id);
        if (!error) {
          setData(prev => ({
            ...prev,
            folders: prev.folders.filter(f => f.id !== id),
            items: prev.items.filter(i => i.folderId !== id)
          }));
          if (selectedFolder?.id === id) setSelectedFolder(null);
        }
        setConfirmAction(null);
      }
    });
  };

  const addItem = async (item: Omit<Item, 'id' | 'createdAt'>) => {
    const { data: newItem, error } = await supabase
      .from('items')
      .insert([{
        folder_id: item.folderId,
        name: item.name,
        type: item.type,
        material: item.material,
        dimensions: item.dimensions,
        quantity: item.quantity,
        photo_url: item.photoUrl,
        notes: item.notes
      }])
      .select()
      .single();

    if (!error && newItem) {
      setData(prev => ({ 
        ...prev, 
        items: [{ 
          id: newItem.id,
          folderId: newItem.folder_id,
          name: newItem.name,
          type: newItem.type,
          material: newItem.material,
          dimensions: newItem.dimensions,
          quantity: newItem.quantity,
          photoUrl: newItem.photo_url,
          notes: newItem.notes,
          createdAt: new Date(newItem.created_at).getTime() 
        }, ...prev.items] 
      }));
    }
    setIsAddingItem(false);
  };

  const updateItem = async (id: string, updates: Partial<Item>) => {
    const { error } = await supabase
      .from('items')
      .update({
        folder_id: updates.folderId,
        name: updates.name,
        type: updates.type,
        material: updates.material,
        dimensions: updates.dimensions,
        quantity: updates.quantity,
        photo_url: updates.photoUrl,
        notes: updates.notes
      })
      .eq('id', id);

    if (!error) {
      setData(prev => ({
        ...prev,
        items: prev.items.map(i => i.id === id ? { ...i, ...updates } : i)
      }));
    }
    setEditingItem(null);
  };

  const deleteItem = (id: string) => {
    setConfirmAction({
      title: 'Deletar Peça',
      message: 'Deseja realmente excluir este item do inventário?',
      confirmText: 'Confirmar Exclusão',
      confirmVariant: 'danger',
      onConfirm: async () => {
        const { error } = await supabase.from('items').delete().eq('id', id);
        if (!error) {
          setData(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));
        }
        setConfirmAction(null);
      }
    });
  };

  const saveCalculation = async (calc: Omit<PlasmaCalculation, 'id' | 'createdAt'>) => {
    const { data: newCalc, error } = await supabase
      .from('calculations')
      .insert([{
        sheet_width: calc.sheetWidth,
        sheet_height: calc.sheetHeight,
        part_width: calc.partWidth,
        part_height: calc.partHeight,
        margin: calc.margin,
        result: calc.result
      }])
      .select()
      .single();

    if (!error && newCalc) {
      const formattedCalc = {
        ...calc,
        id: newCalc.id,
        createdAt: new Date(newCalc.created_at).getTime()
      } as PlasmaCalculation;
      setData(prev => ({ ...prev, plasmaCalculations: [formattedCalc, ...prev.plasmaCalculations] }));
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (importedData.folders && importedData.items) {
          setData(importedData);
          alert('Dados importados com sucesso!');
        }
      } catch (e) {
        alert('Erro ao importar arquivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_caldeiraria_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const filteredItems = useMemo(() => {
    return data.items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.material.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFolder = selectedFolder ? item.folderId === selectedFolder.id : true;
      return matchesSearch && matchesFolder;
    });
  }, [data.items, searchQuery, selectedFolder]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row pb-16 md:pb-0">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-white border-b border-slate-200 p-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-black text-slate-800 tracking-tight uppercase">Torne<span className="text-orange-500">Gestão</span></h1>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          <button onClick={() => setIsAddingFolder(true)} className="p-2 text-indigo-600 bg-indigo-50 rounded-xl">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Sidebar Navigation (Desktop Only) */}
      <nav className="hidden md:flex w-64 border-r border-slate-200 flex-col p-6 space-y-8 bg-white shadow-sm h-screen sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-100">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">TORNE<span className="text-orange-500">GESTÃO</span></h1>
        </div>

        <div className="space-y-1">
          <button 
            onClick={() => { setActiveTab('inventory'); setSelectedFolder(null); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold",
              activeTab === 'inventory' ? "bg-orange-50 text-orange-600 shadow-sm" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <FileBox className="w-5 h-5" />
            <span className="font-sans">Inventário</span>
          </button>
          <button 
            onClick={() => setActiveTab('plasma')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold",
              activeTab === 'plasma' ? "bg-orange-50 text-orange-600 shadow-sm" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <Scissors className="w-5 h-5" />
            <span className="font-sans">Corte Plasma</span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold",
              activeTab === 'settings' ? "bg-orange-50 text-orange-600 shadow-sm" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <Settings className="w-5 h-5" />
            <span className="font-sans">Ajustes</span>
          </button>
        </div>

        {/* Categories / Folders List */}
        <div className="pt-4 space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pastas / Locais</span>
            <button onClick={() => setIsAddingFolder(true)} className="p-1 hover:bg-slate-50 rounded-full transition-colors text-orange-500">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1">
            {data.folders.map(folder => (
              <div 
                key={folder.id}
                onClick={() => { setSelectedFolder(folder); setActiveTab('inventory'); }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm transition-all group border border-transparent cursor-pointer",
                  selectedFolder?.id === folder.id ? "bg-orange-50 text-slate-900 font-bold border-orange-200" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn("w-2.5 h-2.5 rounded-full border border-white shadow-sm", selectedFolder?.id === folder.id ? "bg-orange-500" : "bg-slate-300")} />
                  <span>{folder.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Efficiency Widget placeholder */}
        <div className="mt-auto bg-gradient-to-br from-slate-900 to-indigo-900 rounded-2xl p-4 text-white shadow-xl shadow-indigo-100">
          <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider mb-2">Supabase Cloud</p>
          <div className="text-2xl font-black mb-1 flex items-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sincronizado'}
          </div>
          <p className="text-[10px] text-indigo-200 leading-tight italic">
            Banco de dados profissional ativo
          </p>
          <div className="w-full bg-indigo-950 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className={cn("h-full bg-emerald-400 transition-all duration-1000", loading ? "w-1/2" : "w-full")}></div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => { setActiveTab('inventory'); setSelectedFolder(null); }}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'inventory' ? "text-orange-600" : "text-slate-400"
          )}
        >
          <FileBox className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">Estoque</span>
        </button>
        <button 
          onClick={() => setActiveTab('plasma')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'plasma' ? "text-orange-600" : "text-slate-400"
          )}
        >
          <Scissors className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">Corte</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'settings' ? "text-orange-600" : "text-slate-400"
          )}
        >
          <Settings className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">Ajustes</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'inventory' && (
            <motion.div 
              key="inventory"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-6xl mx-auto space-y-8"
            >
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  {/* Folder horizontal pill list for mobile */}
                  <div className="md:hidden mb-6 -mx-4 px-4 overflow-x-auto scrollbar-hide flex items-center gap-2 no-scrollbar">
                    <button 
                      onClick={() => setSelectedFolder(null)}
                      className={cn(
                        "whitespace-nowrap px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border transition-all",
                        !selectedFolder ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200"
                      )}
                    >
                      Geral
                    </button>
                    {data.folders.map(folder => (
                      <button 
                        key={folder.id}
                        onClick={() => setSelectedFolder(folder)}
                        className={cn(
                          "whitespace-nowrap px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border transition-all",
                          selectedFolder?.id === folder.id ? "bg-orange-500 text-white border-orange-500" : "bg-white text-slate-500 border-slate-200"
                        )}
                      >
                        {folder.name}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <button onClick={() => setSelectedFolder(null)} className="hover:text-orange-500 transition-colors font-bold text-xs uppercase tracking-widest">TorneGestão</button>
                    {selectedFolder && (
                      <>
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-orange-600 font-bold text-xs uppercase tracking-widest">{selectedFolder.name}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <h2 className="text-4xl font-black text-slate-800 tracking-tight">
                      {selectedFolder ? selectedFolder.name : 'Almoxarifado Geral'}
                    </h2>
                    {selectedFolder && (
                      <div className="flex gap-1">
                         <button 
                          onClick={() => setEditingFolder(selectedFolder)}
                          className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Editar Pasta"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteFolder(selectedFolder.id)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                          title="Excluir Pasta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-slate-500 mt-1 font-medium">{selectedFolder ? selectedFolder.description : 'Gestão profissional de peças e materiais para caldeiraria e usinagem'}</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Pesquisar..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all shadow-sm"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      if (data.folders.length === 0) {
                        setConfirmAction({
                          title: 'Pasta Necessária',
                          message: 'Antes de cadastrar uma peça, você precisa criar pelo menos uma pasta ou local para organizá-la.',
                          confirmText: 'Criar Pasta',
                          confirmVariant: 'success',
                          onConfirm: () => {
                            setConfirmAction(null);
                            setIsAddingFolder(true);
                          }
                        });
                      } else {
                        setIsAddingItem(true);
                      }
                    }}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-100 active:scale-95"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Novo Item</span>
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total de Itens" value={filteredItems.length} icon={<Layers className="w-5 h-5" />} />
                <StatCard label="Caldeiraria" value={filteredItems.filter(i => i.type === 'caldeiraria').length} icon={<Wrench className="w-5 h-5" />} />
                <StatCard label="Usinagem" value={filteredItems.filter(i => i.type === 'usinagem').length} icon={<Edit2 className="w-5 h-5" />} />
                <StatCard label="Materiais" value={new Set(filteredItems.map(i => i.material)).size} icon={<FileBox className="w-5 h-5" />} />
              </div>

              {/* Mobile Stats Card */}
              <div className="md:hidden bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-2 divide-x divide-y divide-slate-100">
                  <div className="p-4 flex flex-col items-center text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Total Itens</p>
                    <p className="text-2xl font-black text-slate-800">{filteredItems.length}</p>
                  </div>
                  <div className="p-4 flex flex-col items-center text-center border-t-0!">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Caldeiraria</p>
                    <p className="text-2xl font-black text-slate-800">{filteredItems.filter(i => i.type === 'caldeiraria').length}</p>
                  </div>
                  <div className="p-4 flex flex-col items-center text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Usinagem</p>
                    <p className="text-2xl font-black text-slate-800">{filteredItems.filter(i => i.type === 'usinagem').length}</p>
                  </div>
                  <div className="p-4 flex flex-col items-center text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Materiais</p>
                    <p className="text-2xl font-black text-slate-800">{new Set(filteredItems.map(i => i.material)).size}</p>
                  </div>
                </div>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredItems.map(item => (
                    <ItemCard 
                      key={item.id} 
                      item={item} 
                      onEdit={() => setEditingItem(item)} 
                      onDelete={() => deleteItem(item.id)} 
                    />
                  ))}
                </AnimatePresence>
                {filteredItems.length === 0 && (
                  <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
                    <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileBox className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-xl font-bold text-slate-400 tracking-tight">Nenhum item encontrado</p>
                    <button onClick={() => setIsAddingItem(true)} className="text-orange-500 font-bold hover:underline mt-2">Começar a cadastrar agora</button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'plasma' && (
            <motion.div 
              key="plasma"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto"
            >
              <PlasmaTool onSaveCalc={saveCalculation} />
              
              <div className="mt-12 space-y-6">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180" />
                  Histórico de Cálculos
                </h3>
                <div className="space-y-3">
                  {data.plasmaCalculations.map(calc => (
                    <div key={calc.id} className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                      <div className="flex gap-8">
                        <div>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">CHAPA</p>
                          <p className="font-bold text-slate-700">{calc.sheetWidth}x{calc.sheetHeight}mm</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">PEÇA</p>
                          <p className="font-bold text-slate-700">{calc.partWidth}x{calc.partHeight}mm</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">RENDIMENTO</p>
                          <p className="font-black text-orange-500">{calc.result?.totalParts} un</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(calc.createdAt).toLocaleDateString()}</p>
                        <p className="text-sm font-black text-emerald-600">{calc.result?.efficiency}% eficiên.</p>
                      </div>
                    </div>
                  ))}
                  {data.plasmaCalculations.length === 0 && (
                    <p className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-3xl font-bold bg-white/50">Nenhum cálculo salvo ainda.</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto space-y-10"
            >
              <div>
                <h2 className="text-3xl font-black mb-6 text-slate-800 tracking-tight">Ajustes & Banco de Dados</h2>
                <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-8 shadow-xl">
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                      <Download className="w-5 h-5 text-orange-500" />
                      Backup dos Dados
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      Exporte todo o seu banco de dados (pastas, peças e cálculos) para um arquivo JSON. Você pode enviar este arquivo para outros dispositivos ou usá-lo como backup.
                    </p>
                    <button 
                      onClick={handleExport}
                      className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-2xl font-black transition-all border border-slate-200 flex items-center justify-center gap-2 shadow-sm"
                    >
                      Exportar Banco de Dados (.json)
                    </button>
                  </div>

                  <div className="h-px bg-slate-100" />

                  <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-indigo-600">
                      <Upload className="w-5 h-5" />
                      Importar Dados
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      Se você tem um arquivo de backup (.json), você pode restaurá-lo aqui. Aviso: Isso substituirá todos os dados atuais.
                    </p>
                    <label className="w-full flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-200 hover:border-indigo-400/50 rounded-2xl cursor-pointer transition-all bg-slate-50/50 hover:bg-white group">
                      <Upload className="w-10 h-10 mb-3 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                      <span className="font-bold text-slate-400 group-hover:text-indigo-600">Selecione o arquivo de backup</span>
                      <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                    </label>
                  </div>

                  <div className="h-px bg-slate-100" />

                  <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-rose-500">
                      <Trash2 className="w-5 h-5" />
                      Limpar Sistema
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      Remove todas as informações salvas. Tenha certeza de que fez o backup antes.
                    </p>
                    <button 
                      onClick={() => {
                        setConfirmAction({
                          title: 'Restaurar Sistema',
                          message: 'Isso apagará TUDO permanentemente. Continuar?',
                          confirmText: 'Apagar Tudo',
                          confirmVariant: 'danger',
                          onConfirm: () => {
                            setData(DEFAULT_DATA);
                            localStorage.clear();
                            window.location.reload();
                          }
                        });
                      }}
                      className="text-rose-500 hover:text-rose-600 font-bold transition-colors text-sm underline underline-offset-4"
                    >
                      Restaurar configurações de fábrica (Apagar tudo)
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      {isAddingFolder && (
        <Modal title="Nova Pasta" onClose={() => setIsAddingFolder(false)}>
          <FolderForm onSubmit={addFolder} />
        </Modal>
      )}

      {editingFolder && (
        <Modal title="Editar Pasta" onClose={() => setEditingFolder(null)}>
          <FolderForm 
            initialData={editingFolder} 
            onSubmit={(name, desc) => updateFolder(editingFolder.id, name, desc)} 
          />
        </Modal>
      )}

      {editingItem || isAddingItem ? (
        <Modal 
          title={editingItem ? 'Editar Peça' : 'Nova Peça'} 
          onClose={() => { setIsAddingItem(false); setEditingItem(null); }}
        >
          <ItemForm 
            folders={data.folders} 
            initialData={editingItem}
            onSubmit={(val) => editingItem ? updateItem(editingItem.id, val) : addItem(val as any)} 
          />
        </Modal>
      ) : null}

      {confirmAction && (
        <Modal title={confirmAction.title} onClose={() => setConfirmAction(null)}>
          <div className="space-y-6">
            <p className="text-slate-500 leading-relaxed">{confirmAction.message}</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmAction.onConfirm}
                className={cn(
                  "flex-1 py-3 text-white font-bold rounded-xl transition-all shadow-lg",
                  confirmAction.confirmVariant === 'success' 
                    ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100" 
                    : "bg-red-500 hover:bg-red-600 shadow-red-100"
                )}
              >
                {confirmAction.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// --- Specific Components ---

function StatCard({ label, value, icon }: { label: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
      <div className="absolute -top-2 -right-2 p-6 opacity-5 group-hover:scale-125 transition-transform text-orange-500 bg-orange-50 rounded-full">
        {icon}
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
      <div className="flex items-end gap-2">
        <p className="text-4xl font-black text-slate-800 tracking-tight">{value}</p>
        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mb-2" />
      </div>
    </div>
  );
}

interface ItemCardProps {
  key?: string | number;
  item: Item;
  onEdit: () => void;
  onDelete: () => void;
}

function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
      className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow flex flex-col group relative"
    >
      <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button onClick={onEdit} className="p-2 bg-white rounded-xl text-slate-400 hover:text-indigo-600 transition-all shadow-lg border border-slate-100">
          <Edit2 className="w-4 h-4" />
        </button>
        <button onClick={onDelete} className="p-2 bg-white rounded-xl text-slate-400 hover:text-red-500 transition-all shadow-lg border border-slate-100">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="relative aspect-video bg-slate-50 overflow-hidden border-b border-slate-100">
        {item.photoUrl ? (
          <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-200 group-hover:text-orange-200 transition-colors">
            <Camera className="w-12 h-12 mb-2" />
            <span className="text-[10px] font-black uppercase tracking-widest">Sem Imagem</span>
          </div>
        )}
        <div className="absolute bottom-3 left-3 flex gap-2">
          <span className={cn(
            "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm backdrop-blur-md border",
            item.type === 'caldeiraria' ? "bg-orange-500/90 text-white border-orange-400" : "bg-indigo-600/90 text-white border-indigo-500"
          )}>
            {item.type}
          </span>
        </div>
      </div>
      
      <div className="p-6 flex-1 space-y-4">
        <div>
          <h4 className="font-black text-xl leading-tight text-slate-800 group-hover:text-orange-500 transition-colors">{item.name}</h4>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-tighter mt-1">ID: #CLM-{item.id.slice(-4).toUpperCase()} • {item.material}</p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-500">Qtd: <span className="text-slate-900 font-black">{item.quantity} und</span></span>
          </div>
          <div className="text-orange-500 font-black text-xs uppercase tracking-tighter">Plasma OK</div>
        </div>
      </div>
    </motion.div>
  );
}

function PlasmaTool({ onSaveCalc }: { onSaveCalc: (calc: PlasmaCalculation) => void }) {
  const [calc, setCalc] = useState<Omit<PlasmaCalculation, 'id' | 'createdAt'>>({
    sheetWidth: 3000,
    sheetHeight: 1500,
    partWidth: 200,
    partHeight: 200,
    margin: 10
  });

  const result = useMemo(() => {
    const margin = Math.max(0, calc.margin);
    const sW = Math.max(0, calc.sheetWidth);
    const sH = Math.max(0, calc.sheetHeight);
    const pWidth = Math.max(1, calc.partWidth);
    const pHeight = Math.max(1, calc.partHeight);
    
    // Check orientation 1: Normal
    const pW1 = pWidth + margin;
    const pH1 = pHeight + margin;
    const partsPerRow1 = Math.floor((sW + margin) / pW1);
    const partsPerCol1 = Math.floor((sH + margin) / pH1);
    const totalParts1 = Math.max(0, partsPerRow1) * Math.max(0, partsPerCol1);

    // Check orientation 2: Rotated
    const pW2 = pHeight + margin; // W is now H
    const pH2 = pWidth + margin;  // H is now W
    const partsPerRow2 = Math.floor((sW + margin) / pW2);
    const partsPerCol2 = Math.floor((sH + margin) / pH2);
    const totalParts2 = Math.max(0, partsPerRow2) * Math.max(0, partsPerCol2);

    // Pick the best one
    const isRotatedBetter = totalParts2 > totalParts1;
    const totalParts = isRotatedBetter ? totalParts2 : totalParts1;
    const partsPerRow = isRotatedBetter ? partsPerRow2 : partsPerRow1;
    const partsPerCol = isRotatedBetter ? partsPerCol2 : partsPerCol1;
    
    const partsArea = totalParts * (pWidth * pHeight);
    const sheetArea = sW * sH;
    const efficiency = sheetArea > 0 ? (partsArea / sheetArea) * 100 : 0;
    
    return {
      partsPerRow,
      partsPerCol,
      totalParts,
      efficiency: Math.round(efficiency * 10) / 10,
      wastePercent: Math.round(Math.max(0, 100 - efficiency) * 10) / 10,
      isRotated: isRotatedBetter
    };
  }, [calc]);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl">
      <div className="bg-indigo-600 p-6 text-white flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md shrink-0">
            <Scissors className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter leading-none">Otimizador Plasma</h3>
            <p className="text-[10px] md:text-xs font-bold opacity-70 uppercase tracking-widest mt-1">Cálculo de Aproveitamento</p>
          </div>
        </div>
        <button 
          onClick={() => onSaveCalc({ ...calc, id: Date.now().toString(), createdAt: Date.now(), result })}
          className="w-full md:w-auto bg-orange-500 text-white px-4 md:px-6 py-2.5 rounded-xl font-black hover:bg-orange-600 transition-all shadow-lg text-xs md:text-sm active:scale-95 uppercase tracking-widest"
        >
          Salvar Cálculo
        </button>
      </div>
      
      <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Largura Chapa (mm)" value={calc.sheetWidth} onChange={v => setCalc(c => ({...c, sheetWidth: v}))} />
            <InputField label="Altura Chapa (mm)" value={calc.sheetHeight} onChange={v => setCalc(c => ({...c, sheetHeight: v}))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Largura Peça (mm)" value={calc.partWidth} onChange={v => setCalc(c => ({...c, partWidth: v}))} />
            <InputField label="Altura Peça (mm)" value={calc.partHeight} onChange={v => setCalc(c => ({...c, partHeight: v}))} />
          </div>
          <InputField label="Espaçamento (mm)" value={calc.margin} onChange={v => setCalc(c => ({...c, margin: v}))} />
        </div>

        <div className="flex flex-col h-full bg-slate-50 rounded-2xl border border-slate-200 p-6 md:p-8 shadow-inner">
          <div className="flex-1 space-y-6 md:space-y-8">
            <div className="text-center relative">
              <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1 md:mb-2 text-center">RENDIMENTO ESTIMADO</span>
              <p className="text-6xl md:text-8xl font-black text-indigo-600 tracking-tighter leading-none">{result.totalParts}</p>
              <div className="flex items-center justify-center gap-2 mt-1 md:mt-2">
                <span className="text-[10px] md:text-xs font-black text-indigo-400 uppercase tracking-widest">Unidades por Chapa</span>
                {result.isRotated && (
                  <span className="bg-indigo-100 text-indigo-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">Rotacionado</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Eficiência</p>
                <p className="text-2xl font-black text-emerald-600">{result.efficiency}%</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Desperdício</p>
                <p className="text-2xl font-black text-rose-500">{result.wastePercent}%</p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-700 ease-out" 
                  style={{ width: `${result.efficiency}%` }} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange }: { label: string, value: number, onChange: (val: number) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</label>
      <input 
        type="number"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-800 transition-all shadow-sm"
      />
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white border border-slate-200 w-[calc(100%-2rem)] max-w-md rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <h3 className="text-lg font-black text-slate-800 tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-50 rounded-full transition-colors text-slate-400">
            <Plus className="rotate-45 w-5 h-5 outline-none" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function FolderForm({ onSubmit, initialData }: { onSubmit: (name: string, desc: string) => void, initialData?: Folder | null }) {
  const [name, setName] = useState(initialData?.name || '');
  const [desc, setDesc] = useState(initialData?.description || '');

  return (
    <form className="space-y-6" onSubmit={e => { e.preventDefault(); onSubmit(name, desc); }}>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nome da Pasta</label>
        <input 
          autoFocus
          required
          value={name} 
          onChange={e => setName(e.target.value)}
          placeholder="Ex: Prateleira A1"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500/20 transition-all font-bold text-slate-800"
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Descrição (Opcional)</label>
        <textarea 
          value={desc} 
          onChange={e => setDesc(e.target.value)}
          placeholder="Para que serve este local?"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 min-h-[100px] focus:ring-2 focus:ring-orange-500/20 transition-all font-bold text-slate-800"
        />
      </div>
      <button className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl hover:bg-orange-600 transition-all active:scale-95 shadow-lg shadow-orange-100">
        {initialData ? 'Salvar Alterações' : 'Criar Localização'}
      </button>
    </form>
  );
}

function ItemForm({ folders, onSubmit, initialData }: { folders: Folder[], onSubmit: (item: any) => void, initialData?: Item | null }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    type: initialData?.type || 'caldeiraria' as ItemType,
    material: initialData?.material || '',
    dimensions: initialData?.dimensions || '',
    quantity: initialData?.quantity || 1,
    folderId: initialData?.folderId || (folders[0]?.id || ''),
    notes: initialData?.notes || '',
    photoUrl: initialData?.photoUrl || ''
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <form className="space-y-3 max-h-[75vh] md:max-h-[70vh] overflow-y-auto pr-1" onSubmit={e => { e.preventDefault(); onSubmit(formData); }}>
      <div className="flex flex-col md:flex-row gap-3">
        <div 
          onClick={() => document.getElementById('photo-upload')?.click()}
          className="w-full md:w-28 h-32 md:h-28 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-orange-500/50 transition-all overflow-hidden relative shrink-0"
        >
          {formData.photoUrl ? (
            <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <>
              <Camera className="w-6 h-6 text-slate-300" />
              <span className="text-[8px] font-black text-slate-400 uppercase mt-0.5 tracking-widest">Foto</span>
            </>
          )}
          <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </div>

        <div className="flex-1 space-y-2">
          <div className="space-y-0.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Nome da Peça</label>
            <input 
              required
              value={formData.name} 
              onChange={e => setFormData(p => ({...p, name: e.target.value}))}
              placeholder="Ex: Eixo de Transmissão"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500/20 font-bold text-slate-800 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
             <div className="space-y-0.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Tipo</label>
                <select 
                  value={formData.type} 
                  onChange={e => setFormData(p => ({...p, type: e.target.value as ItemType}))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 focus:ring-2 focus:ring-orange-500/20 font-bold text-slate-800 appearance-none text-sm"
                >
                  <option value="caldeiraria">Caldeira</option>
                  <option value="usinagem">Usinagem</option>
                </select>
              </div>
              <div className="space-y-0.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Qtd</label>
                <input 
                  type="number"
                  min="0"
                  value={formData.quantity} 
                  onChange={e => setFormData(p => ({...p, quantity: Number(e.target.value)}))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500/20 font-bold text-slate-800 text-sm"
                />
              </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Material</label>
          <input 
            placeholder="Ex: Aço 1020"
            value={formData.material} 
            onChange={e => setFormData(p => ({...p, material: e.target.value}))}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500/20 font-bold text-slate-800 text-sm"
          />
        </div>
        <div className="space-y-0.5">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Medidas</label>
          <input 
            placeholder="Ex: Ø50 x 200mm"
            value={formData.dimensions} 
            onChange={e => setFormData(p => ({...p, dimensions: e.target.value}))}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500/20 font-bold text-slate-800 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Pasta</label>
          <select 
            required
            value={formData.folderId} 
            onChange={e => setFormData(p => ({...p, folderId: e.target.value}))}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500/20 font-bold text-slate-800 text-sm"
          >
            {folders.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-0.5">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Obs</label>
          <input 
            placeholder="Opcional..."
            value={formData.notes} 
            onChange={e => setFormData(p => ({...p, notes: e.target.value}))}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500/20 font-bold text-slate-800 text-sm"
          />
        </div>
      </div>

      <button className="w-full py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100 mt-1 uppercase text-xs tracking-widest">
        {initialData ? 'Atualizar' : 'Cadastrar'}
      </button>
    </form>
  );
}
