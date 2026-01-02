
import React, { useState, useMemo } from 'react';
import { Search, Plus, TrendingUp, Clock, AlertCircle, Sparkles, Filter, ChevronRight, BarChart3 } from 'lucide-react';
import Sidebar from './components/Sidebar';
import StatsCard from './components/StatsCard';
import ContactList from './components/ContactList';
import ContactDetail from './components/ContactDetail';
import AddContactForm from './components/AddContactForm';
import { Contact, Interaction, InteractionType, View } from './types';
import { INITIAL_CONTACTS, INITIAL_INTERACTIONS } from './constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const App: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [interactions, setInteractions] = useState<Interaction[]>(INITIAL_INTERACTIONS);
  const [currentView, setView] = useState<View>(View.DASHBOARD);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => 
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [contacts, searchQuery]);

  const driftingContacts = contacts.filter(c => c.status === 'drifting');
  const totalInteractionsLast30Days = 24; // Dummy stat

  const interactionStats = [
    { name: 'Mon', count: 4 },
    { name: 'Tue', count: 3 },
    { name: 'Wed', count: 7 },
    { name: 'Thu', count: 5 },
    { name: 'Fri', count: 2 },
    { name: 'Sat', count: 1 },
    { name: 'Sun', count: 2 },
  ];

  const handleAddInteraction = (contactId: string, type: InteractionType, notes: string) => {
    const newInteraction: Interaction = {
      id: Date.now().toString(),
      contactId,
      date: new Date().toISOString().split('T')[0],
      type,
      notes,
    };
    setInteractions(prev => [...prev, newInteraction]);
    
    // Update contact status and last contacted date
    setContacts(prev => prev.map(c => {
      if (c.id === contactId) {
        return {
          ...c,
          lastContacted: newInteraction.date,
          status: 'active'
        };
      }
      return c;
    }));
  };

  const handleAddContact = (newContact: Contact) => {
    setContacts(prev => [newContact, ...prev]);
    setView(View.CONTACTS);
  };

  const renderDashboard = () => (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Good Morning!</h2>
          <p className="text-slate-500 mt-1">Here's what's happening with your network today.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all transform hover:scale-[1.02]"
        >
          <Plus size={20} /> Add New Contact
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Network Strength" 
          value="84%" 
          icon={TrendingUp} 
          trend="+5%" 
          color="bg-green-500" 
        />
        <StatsCard 
          title="Total Contacts" 
          value={contacts.length} 
          icon={Sparkles} 
          color="bg-indigo-500" 
        />
        <StatsCard 
          title="Needing Attention" 
          value={driftingContacts.length} 
          icon={AlertCircle} 
          color="bg-orange-500" 
        />
        <StatsCard 
          title="Last 30 Days" 
          value={totalInteractionsLast30Days} 
          icon={Clock} 
          color="bg-blue-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-lg text-slate-900">Interaction Velocity</h3>
            <select className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-sm font-medium text-slate-600">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={interactionStats}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-lg text-slate-900 mb-6">Upcoming Follow-ups</h3>
          <div className="space-y-4">
            {contacts.filter(c => c.nextFollowUp).map(contact => (
              <div key={contact.id} className="group flex items-center space-x-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => { setSelectedContact(contact); setView(View.CONTACTS); }}>
                <img src={contact.avatar} alt="" className="w-12 h-12 rounded-xl object-cover" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-900">{contact.firstName} {contact.lastName}</h4>
                  <p className="text-xs text-slate-500">{contact.nextFollowUp}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </div>
            ))}
            {contacts.filter(c => c.nextFollowUp).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No follow-ups scheduled.</p>
            )}
          </div>
          <button className="w-full mt-6 py-3 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors border border-indigo-100 rounded-xl">
            View All Tasks
          </button>
        </div>
      </div>
    </div>
  );

  const renderContacts = () => {
    if (selectedContact) {
      return (
        <ContactDetail 
          contact={selectedContact} 
          interactions={interactions.filter(i => i.contactId === selectedContact.id)}
          allContacts={contacts}
          onBack={() => setSelectedContact(null)}
          onSelectContact={setSelectedContact}
          onAddInteraction={handleAddInteraction}
        />
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-900">Your Network</h2>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all mr-2"
            >
              <Plus size={18} /> New Contact
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search name, company, tags..."
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none w-full md:w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">
              <Filter size={20} />
            </button>
          </div>
        </div>

        <ContactList 
          contacts={filteredContacts} 
          onSelectContact={setSelectedContact} 
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar currentView={currentView} setView={(v) => { setView(v); setSelectedContact(null); }} />
      
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-10">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
            <span>Personal CRM</span>
            <span>/</span>
            <span className="text-indigo-600">{currentView}</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex -space-x-2">
              {contacts.slice(0, 3).map((c, i) => (
                <img key={i} className="w-8 h-8 rounded-full border-2 border-white" src={c.avatar} alt="" />
              ))}
              <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                +{contacts.length > 3 ? contacts.length - 3 : 0}
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              JD
            </div>
          </div>
        </header>

        {currentView === View.DASHBOARD && renderDashboard()}
        {currentView === View.CONTACTS && renderContacts()}
        {currentView === View.ANALYTICS && (
          <div className="flex items-center justify-center h-[60vh] text-slate-400 font-medium">
            <div className="text-center">
              <BarChart3 size={48} className="mx-auto mb-4 opacity-20" />
              <p>Analytics module coming soon.</p>
            </div>
          </div>
        )}
      </main>

      {showAddModal && (
        <AddContactForm 
          onClose={() => setShowAddModal(false)} 
          onAdd={handleAddContact} 
          existingContacts={contacts}
        />
      )}
    </div>
  );
};

export default App;
