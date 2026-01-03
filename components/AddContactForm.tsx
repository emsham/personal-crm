
import React, { useState, useMemo } from 'react';
import { X, User, Briefcase, Mail, Phone, Tag, AlignLeft, Users, Cake, Sparkles } from 'lucide-react';
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
      birthday: formData.birthday ? formData.birthday.slice(5) : undefined,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="glass-strong w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-8 border border-white/10">
        <div className="flex justify-between items-center p-8 border-b border-white/5">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Sparkles size={20} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Add New Contact</h2>
            </div>
            <p className="text-slate-400 text-sm mt-2">Expand your network with a new relationship.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <User size={12} /> First Name
              </label>
              <input
                required
                type="text"
                placeholder="Jane"
                className="w-full px-4 py-3.5 input-dark rounded-xl"
                value={formData.firstName}
                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <User size={12} /> Last Name
              </label>
              <input
                required
                type="text"
                placeholder="Doe"
                className="w-full px-4 py-3.5 input-dark rounded-xl"
                value={formData.lastName}
                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Briefcase size={12} /> Company
              </label>
              <input
                type="text"
                placeholder="Global Corp"
                className="w-full px-4 py-3.5 input-dark rounded-xl"
                value={formData.company}
                onChange={e => setFormData({ ...formData, company: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Briefcase size={12} /> Position
              </label>
              <input
                type="text"
                placeholder="Product Manager"
                className="w-full px-4 py-3.5 input-dark rounded-xl"
                value={formData.position}
                onChange={e => setFormData({ ...formData, position: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Mail size={12} /> Email
              </label>
              <input
                type="email"
                placeholder="jane.doe@example.com"
                className="w-full px-4 py-3.5 input-dark rounded-xl"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Phone size={12} /> Phone
              </label>
              <input
                type="tel"
                placeholder="+1 555-0000"
                className="w-full px-4 py-3.5 input-dark rounded-xl"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Cake size={12} /> Birthday
              </label>
              <input
                type="date"
                className="w-full px-4 py-3.5 input-dark rounded-xl"
                value={formData.birthday}
                onChange={e => setFormData({ ...formData, birthday: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Users size={12} /> Related Contacts
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search to link existing contacts..."
                className="w-full px-4 py-3.5 input-dark rounded-xl"
                value={searchRelated}
                onChange={e => setSearchRelated(e.target.value)}
              />
              {filteredExisting.length > 0 && (
                <div className="absolute z-10 w-full mt-2 glass-strong border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                  {filteredExisting.map(contact => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => toggleRelated(contact.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 text-left transition-colors"
                    >
                      <img src={contact.avatar} className="w-8 h-8 rounded-lg ring-2 ring-white/10" alt="" />
                      <span className="text-sm font-medium text-white">{contact.firstName} {contact.lastName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedRelatedIds.map(id => {
                const contact = existingContacts.find(c => c.id === id);
                return contact ? (
                  <div key={id} className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/20 text-violet-300 text-xs font-bold rounded-lg border border-violet-500/30">
                    <img src={contact.avatar} className="w-4 h-4 rounded-md" alt="" />
                    {contact.firstName}
                    <button type="button" onClick={() => toggleRelated(id)} className="hover:text-white transition-colors"><X size={12}/></button>
                  </div>
                ) : null;
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Tag size={12} /> Tags (comma separated)
            </label>
            <input
              type="text"
              placeholder="Engineering, Mentor, Investor"
              className="w-full px-4 py-3.5 input-dark rounded-xl"
              value={formData.tags}
              onChange={e => setFormData({ ...formData, tags: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <AlignLeft size={12} /> Initial Notes
            </label>
            <textarea
              placeholder="Met at the networking event last week..."
              rows={3}
              className="w-full px-4 py-3.5 input-dark rounded-xl resize-none"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 text-slate-400 font-semibold hover:text-white hover:bg-white/5 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-4 bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 transition-all"
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
