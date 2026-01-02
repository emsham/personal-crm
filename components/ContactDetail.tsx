
import React, { useState } from 'react';
import { Contact, Interaction, InteractionType } from '../types';
import { Mail, Phone, Calendar, Tag, Plus, MessageSquare, Sparkles, Send, ArrowLeft, Loader2, Users } from 'lucide-react';
import { generateFollowUpEmail, analyzeRelationship } from '../services/geminiService';

interface ContactDetailProps {
  contact: Contact;
  interactions: Interaction[];
  allContacts: Contact[];
  onBack: () => void;
  onSelectContact: (contact: Contact) => void;
  onAddInteraction: (contactId: string, type: InteractionType, notes: string) => void;
}

const ContactDetail: React.FC<ContactDetailProps> = ({ 
  contact, 
  interactions, 
  allContacts, 
  onBack, 
  onSelectContact,
  onAddInteraction 
}) => {
  const [newInteractionNotes, setNewInteractionNotes] = useState('');
  const [interactionType, setInteractionType] = useState<InteractionType>(InteractionType.EMAIL);
  const [aiDraft, setAiDraft] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState({ draft: false, analysis: false });

  const relatedContacts = allContacts.filter(c => contact.relatedContactIds.includes(c.id));

  const handleGenerateDraft = async () => {
    setIsLoading(prev => ({ ...prev, draft: true }));
    const draft = await generateFollowUpEmail(contact, "Catching up after a few weeks.");
    setAiDraft(draft || '');
    setIsLoading(prev => ({ ...prev, draft: false }));
  };

  const handleAnalyze = async () => {
    setIsLoading(prev => ({ ...prev, analysis: true }));
    const result = await analyzeRelationship(contact, interactions);
    setAiAnalysis(result);
    setIsLoading(prev => ({ ...prev, analysis: false }));
  };

  const handleSubmitInteraction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInteractionNotes.trim()) return;
    onAddInteraction(contact.id, interactionType, newInteractionNotes);
    setNewInteractionNotes('');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={onBack}
        className="flex items-center space-x-2 text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft size={20} />
        <span className="font-medium">Back to Network</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center">
            <img className="h-32 w-32 rounded-3xl mx-auto object-cover shadow-lg border-4 border-white mb-4" src={contact.avatar} alt="" />
            <h2 className="text-2xl font-bold text-slate-900">{contact.firstName} {contact.lastName}</h2>
            <p className="text-indigo-600 font-medium">{contact.position} @ {contact.company}</p>
            
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {contact.tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full flex items-center gap-1">
                  <Tag size={12} /> {tag}
                </span>
              ))}
            </div>

            <div className="mt-8 space-y-4">
              <a href={`mailto:${contact.email}`} className="flex items-center space-x-3 w-full p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <Mail className="text-slate-400" size={18} />
                <span className="text-slate-700 text-sm truncate">{contact.email}</span>
              </a>
              <div className="flex items-center space-x-3 w-full p-3 bg-slate-50 rounded-xl">
                <Phone className="text-slate-400" size={18} />
                <span className="text-slate-700 text-sm">{contact.phone}</span>
              </div>
            </div>

            {/* Related Contacts Section */}
            {relatedContacts.length > 0 && (
              <div className="mt-8 pt-8 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                  <Users size={14} /> Network Connections
                </h3>
                <div className="flex flex-wrap justify-center gap-3">
                  {relatedContacts.map(related => (
                    <button
                      key={related.id}
                      onClick={() => onSelectContact(related)}
                      className="group relative"
                      title={`${related.firstName} ${related.lastName}`}
                    >
                      <img 
                        src={related.avatar} 
                        className="w-10 h-10 rounded-full border-2 border-white shadow-sm group-hover:scale-110 transition-transform cursor-pointer" 
                        alt={related.firstName} 
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Relationship AI Analysis */}
          <div className="bg-indigo-900 rounded-3xl p-6 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Sparkles size={20} /> Nexus AI Insight
                </h3>
                {aiAnalysis && (
                  <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">
                    Score: {aiAnalysis.healthScore}/10
                  </div>
                )}
              </div>
              
              {!aiAnalysis ? (
                <div className="space-y-4">
                  <p className="text-indigo-100 text-sm opacity-80">
                    Get an AI-powered analysis of your relationship health and personalized next steps.
                  </p>
                  <button 
                    onClick={handleAnalyze}
                    disabled={isLoading.analysis}
                    className="w-full py-3 bg-white text-indigo-900 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                  >
                    {isLoading.analysis ? <Loader2 className="animate-spin" size={20} /> : "Run Relationship Analysis"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-indigo-100 text-sm">{aiAnalysis.summary}</p>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-indigo-300 uppercase">Recommended Next Steps</p>
                    <ul className="space-y-2">
                      {aiAnalysis.nextSteps.map((step: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button onClick={() => setAiAnalysis(null)} className="text-xs text-indigo-300 hover:text-white underline">Re-analyze</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Interactions & History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Follow-up Draft Section */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Send size={20} className="text-indigo-500" /> AI Outreach Draft
              </h3>
              <button 
                onClick={handleGenerateDraft}
                disabled={isLoading.draft}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 disabled:opacity-50"
              >
                {isLoading.draft ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                Generate Smart Follow-up
              </button>
            </div>
            
            {aiDraft ? (
              <div className="space-y-4">
                <textarea 
                  className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={aiDraft}
                  onChange={(e) => setAiDraft(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={() => setAiDraft('')} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Discard</button>
                  <button className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-xl text-sm shadow-md hover:bg-indigo-700 transition-all">Copy to Clipboard</button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                <MessageSquare className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-slate-400 text-sm">Generate a tailored message based on your history.</p>
              </div>
            )}
          </div>

          {/* Interaction Log */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex-1">
            <h3 className="font-bold text-lg text-slate-900 mb-6 flex items-center gap-2">
              <Calendar size={20} className="text-indigo-500" /> Interaction History
            </h3>

            <form onSubmit={handleSubmitInteraction} className="mb-8">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex gap-4 mb-3">
                  <select 
                    className="bg-white border border-slate-200 rounded-lg px-3 py-1 text-xs font-bold text-slate-600"
                    value={interactionType}
                    onChange={(e) => setInteractionType(e.target.value as InteractionType)}
                  >
                    {Object.values(InteractionType).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <textarea 
                  className="w-full bg-transparent border-none focus:ring-0 text-sm text-slate-700 placeholder:text-slate-400 min-h-[80px]"
                  placeholder="What did you talk about? Any action items?"
                  value={newInteractionNotes}
                  onChange={(e) => setNewInteractionNotes(e.target.value)}
                />
                <div className="flex justify-end mt-2">
                  <button type="submit" className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-2 hover:bg-slate-800 transition-all">
                    <Plus size={14} /> Log Interaction
                  </button>
                </div>
              </div>
            </form>

            <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pl-8">
              {interactions.length === 0 ? (
                <p className="text-slate-400 text-sm py-4">No interactions logged yet.</p>
              ) : (
                interactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(interaction => (
                  <div key={interaction.id} className="relative">
                    <div className="absolute -left-[41px] top-0 w-4 h-4 rounded-full bg-white border-2 border-indigo-500" />
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{interaction.type}</span>
                      <span className="text-xs font-medium text-slate-400">{interaction.date}</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{interaction.notes}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactDetail;
