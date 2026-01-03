
import React, { useState, useMemo } from 'react';
import { X, User, Briefcase, Mail, Phone, Tag, AlignLeft, Users, Check, Cake } from 'lucide-react';
import { Contact } from '../types';

interface AddContactFormProps {
  onClose: () => void;
  onAdd: (contact: Contact) => void;
  existingContacts: Contact[];
}

const AddContactForm: React.FC<AddContactFormProps> = ({ onClose, onAdd, existingContacts }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    tags: '',
    notes: '',
    birthday: ''
  });
  const [selectedRelatedIds, setSelectedRelatedIds] = useState<string[]>([]);
  const [searchRelated, setSearchRelated] = useState('');

  const filteredExisting = useMemo(() => {
    if (!searchRelated) return [];
    return existingContacts.filter(c => 
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchRelated.toLowerCase()) &&
      !selectedRelatedIds.includes(c.id)
    );
  }, [existingContacts, searchRelated, selectedRelatedIds]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newContact: Contact = {
      id: Date.now().toString(),
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      company: formData.company,
      position: formData.position,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
      lastContacted: null,
      nextFollowUp: null,
      notes: formData.notes,
      avatar: `https://picsum.photos/seed/${formData.firstName}${formData.lastName}/200`,
      status: 'active',
      relatedContactIds: selectedRelatedIds,
      birthday: formData.birthday ? formData.birthday.slice(5) : undefined, // Convert YYYY-MM-DD to MM-DD
    };

    onAdd(newContact);
    onClose();
  };

  const toggleRelated = (id: string) => {
    setSelectedRelatedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
    setSearchRelated('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-8 border-b border-slate-100">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Add New Contact</h2>
            <p className="text-slate-500 text-sm">Expand your network with a new relationship.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <User size={14} /> First Name
              </label>
              <input
                required
                type="text"
                placeholder="Jane"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                value={formData.firstName}
                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <User size={14} /> Last Name
              </label>
              <input
                required
                type="text"
                placeholder="Doe"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                value={formData.lastName}
                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Briefcase size={14} /> Company
              </label>
              <input
                type="text"
                placeholder="Global Corp"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                value={formData.company}
                onChange={e => setFormData({ ...formData, company: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Briefcase size={14} /> Position
              </label>
              <input
                type="text"
                placeholder="Product Manager"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                value={formData.position}
                onChange={e => setFormData({ ...formData, position: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Mail size={14} /> Email
              </label>
              <input
                type="email"
                placeholder="jane.doe@example.com"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Phone size={14} /> Phone
              </label>
              <input
                type="tel"
                placeholder="+1 555-0000"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Cake size={14} /> Birthday
              </label>
              <input
                type="date"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                value={formData.birthday}
                onChange={e => setFormData({ ...formData, birthday: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Users size={14} /> Related Contacts
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search to link existing contacts..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                value={searchRelated}
                onChange={e => setSearchRelated(e.target.value)}
              />
              {filteredExisting.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                  {filteredExisting.map(contact => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => toggleRelated(contact.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors"
                    >
                      <img src={contact.avatar} className="w-8 h-8 rounded-full" alt="" />
                      <span className="text-sm font-medium text-slate-700">{contact.firstName} {contact.lastName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedRelatedIds.map(id => {
                const contact = existingContacts.find(c => c.id === id);
                return contact ? (
                  <div key={id} className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100">
                    <img src={contact.avatar} className="w-4 h-4 rounded-full" alt="" />
                    {contact.firstName}
                    <button type="button" onClick={() => toggleRelated(id)}><X size={12}/></button>
                  </div>
                ) : null;
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Tag size={14} /> Tags (comma separated)
            </label>
            <input
              type="text"
              placeholder="Engineering, Mentor, Investor"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              value={formData.tags}
              onChange={e => setFormData({ ...formData, tags: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <AlignLeft size={14} /> Initial Notes
            </label>
            <textarea
              placeholder="Met at the networking event last week..."
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all resize-none"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all"
            >
              Save Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddContactForm;
