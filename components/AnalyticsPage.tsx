import React, { useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Contact, Interaction } from '../types';

interface AnalyticsPageProps {
  contacts: Contact[];
  interactions: Interaction[];
}

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'];

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ contacts, interactions }) => {
  const navigate = useNavigate();

  const monthlyInteractions = useMemo(() => {
    const months: { [key: string]: number } = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      months[key] = 0;
    }

    interactions.forEach(interaction => {
      const d = new Date(interaction.date);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (months[key] !== undefined) {
        months[key]++;
      }
    });

    return Object.entries(months).map(([month, count]) => ({ month, count }));
  }, [interactions]);

  const interactionsByType = useMemo(() => {
    const types: { [key: string]: number } = {};
    interactions.forEach(i => {
      types[i.type] = (types[i.type] || 0) + 1;
    });
    return Object.entries(types)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [interactions]);

  const topContacts = useMemo(() => {
    const contactCounts: { [key: string]: number } = {};
    interactions.forEach(i => {
      contactCounts[i.contactId] = (contactCounts[i.contactId] || 0) + 1;
    });
    return Object.entries(contactCounts)
      .map(([contactId, count]) => {
        const contact = contacts.find(c => c.id === contactId);
        return { contact, count };
      })
      .filter(item => item.contact)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [interactions, contacts]);

  const tagDistribution = useMemo(() => {
    const tags: { [key: string]: number } = {};
    contacts.forEach(c => {
      c.tags.forEach(tag => {
        tags[tag] = (tags[tag] || 0) + 1;
      });
    });
    return Object.entries(tags)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [contacts]);

  return (
    <div className="space-y-6 md:space-y-8 pl-14 lg:pl-0">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-white">Analytics</h2>
        <p className="text-slate-400 mt-1 text-sm md:text-base">Insights into your network and interactions</p>
      </div>

      {/* Monthly Interactions Trend */}
      <div className="glass rounded-2xl p-4 md:p-6 card-hover">
        <h3 className="font-bold text-base md:text-lg text-white mb-4 md:mb-6">Interaction Trend (6 Months)</h3>
        <div className="h-[250px] md:h-[300px]">
          {interactions.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              No interaction data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyInteractions}>
                <defs>
                  <linearGradient id="colorInteractions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(12px)' }} labelStyle={{ color: '#f8fafc' }} itemStyle={{ color: '#a78bfa' }} />
                <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorInteractions)" name="Interactions" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Interaction Types */}
        <div className="glass rounded-2xl p-6 card-hover">
          <h3 className="font-bold text-lg text-white mb-6">By Interaction Type</h3>
          <div className="h-[250px]">
            {interactionsByType.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                No interaction data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={interactionsByType} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis type="category" dataKey="type" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} width={80} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(12px)' }} labelStyle={{ color: '#f8fafc' }} itemStyle={{ color: '#a78bfa' }} />
                  <Bar dataKey="count" fill="url(#barGradient)" radius={[0, 8, 8, 0]} name="Count">
                    {interactionsByType.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Tag Distribution */}
        <div className="glass rounded-2xl p-6 card-hover">
          <h3 className="font-bold text-lg text-white mb-6">Contact Tags</h3>
          <div className="h-[250px]">
            {tagDistribution.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                No tags yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tagDistribution}
                    dataKey="count"
                    nameKey="tag"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} (${((percent || 0) * 100).toFixed(0)}%)`}
                    labelLine={false}
                    stroke="rgba(0,0,0,0.3)"
                    strokeWidth={2}
                  >
                    {tagDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(12px)' }} labelStyle={{ color: '#f8fafc' }} itemStyle={{ color: '#a78bfa' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Top Contacts */}
      <div className="glass rounded-2xl p-6">
        <h3 className="font-bold text-lg text-white mb-6">Most Contacted</h3>
        {topContacts.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No interaction data yet
          </div>
        ) : (
          <div className="space-y-3">
            {topContacts.map((item, index) => (
              <div
                key={item.contact!.id}
                className="flex items-center gap-4 p-4 rounded-xl glass-light hover:bg-white/10 transition-all cursor-pointer group"
                onClick={() => navigate(`/contacts/${item.contact!.id}`)}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-violet-500/20">
                  {index + 1}
                </div>
                <div className="w-12 h-12 rounded-xl bg-black ring-2 ring-white/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-white">
                    {item.contact!.firstName?.charAt(0).toUpperCase() || ''}{item.contact!.lastName?.charAt(0).toUpperCase() || ''}
                  </span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white group-hover:text-violet-300 transition-colors">{item.contact!.firstName} {item.contact!.lastName}</h4>
                  <p className="text-sm text-slate-400">{item.contact!.company}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold gradient-text">{item.count}</div>
                  <div className="text-xs text-slate-500">interactions</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(AnalyticsPage);
