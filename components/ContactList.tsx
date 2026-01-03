
import React from 'react';
import { Contact } from '../types';
import { ChevronRight } from 'lucide-react';

interface ContactListProps {
  contacts: Contact[];
  onSelectContact: (contact: Contact) => void;
}

const ContactList: React.FC<ContactListProps> = ({ contacts, onSelectContact }) => {
  const getStatusClasses = (status: Contact['status']) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'drifting':
        return 'status-drifting';
      case 'lost':
        return 'status-lost';
      default:
        return '';
    }
  };

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <table className="w-full text-left">
        <thead className="border-b border-white/5">
          <tr>
            <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
            <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Company</th>
            <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Last Contacted</th>
            <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {contacts.map((contact) => (
            <tr
              key={contact.id}
              className="hover:bg-white/5 cursor-pointer transition-all group"
              onClick={() => onSelectContact(contact)}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="relative">
                    <img
                      className="h-11 w-11 rounded-xl object-cover ring-2 ring-white/10 group-hover:ring-violet-500/50 transition-all"
                      src={contact.avatar}
                      alt=""
                    />
                    {contact.status === 'active' && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-dark-900 shadow-lg shadow-emerald-500/50" />
                    )}
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors">
                      {contact.firstName} {contact.lastName}
                    </div>
                    <div className="text-xs text-slate-500">{contact.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-slate-300">{contact.position}</div>
                <div className="text-xs text-slate-500">{contact.company}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg ${getStatusClasses(contact.status)}`}>
                  {contact.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-slate-400">
                  {contact.lastContacted || (
                    <span className="text-slate-600 italic">Never</span>
                  )}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <button className="p-2 text-slate-600 group-hover:text-violet-400 rounded-lg hover:bg-white/10 transition-all">
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ContactList;
