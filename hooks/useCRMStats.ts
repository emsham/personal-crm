import { useMemo } from 'react';
import { Contact, Interaction } from '../types';

interface UpcomingDate {
  contact: Contact;
  label: string;
  date: string;
  daysUntil: number;
  type: 'birthday' | 'important';
}

interface InteractionStat {
  name: string;
  count: number;
}

interface CRMStats {
  allTags: string[];
  totalInteractionsLast30Days: number;
  interactionStats: InteractionStat[];
  upcomingDates: UpcomingDate[];
}

export const useCRMStats = (contacts: Contact[], interactions: Interaction[]): CRMStats => {
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    contacts.forEach(c => c.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [contacts]);

  const totalInteractionsLast30Days = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return interactions.filter(i => new Date(i.date) >= thirtyDaysAgo).length;
  }, [interactions]);

  const interactionStats = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = new Array(7).fill(0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    interactions.forEach(i => {
      const date = new Date(i.date);
      if (date >= sevenDaysAgo) {
        counts[date.getDay()]++;
      }
    });

    return days.map((name, i) => ({ name, count: counts[i] }));
  }, [interactions]);

  const upcomingDates = useMemo(() => {
    const today = new Date();
    const dates: UpcomingDate[] = [];

    contacts.forEach(contact => {
      if (contact.birthday) {
        const [month, day] = contact.birthday.split('-').map(Number);
        const thisYear = new Date(today.getFullYear(), month - 1, day);
        const nextYear = new Date(today.getFullYear() + 1, month - 1, day);
        const targetDate = thisYear >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) ? thisYear : nextYear;
        const diffTime = targetDate.getTime() - today.getTime();
        const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysUntil <= 30) {
          dates.push({
            contact,
            label: 'Birthday',
            date: contact.birthday,
            daysUntil,
            type: 'birthday',
          });
        }
      }

      contact.importantDates?.forEach(importantDate => {
        const [month, day] = importantDate.date.split('-').map(Number);
        const thisYear = new Date(today.getFullYear(), month - 1, day);
        const nextYear = new Date(today.getFullYear() + 1, month - 1, day);
        const targetDate = thisYear >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) ? thisYear : nextYear;
        const diffTime = targetDate.getTime() - today.getTime();
        const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysUntil <= 30) {
          dates.push({
            contact,
            label: importantDate.label,
            date: importantDate.date,
            daysUntil,
            type: 'important',
          });
        }
      });
    });

    return dates.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [contacts]);

  return {
    allTags,
    totalInteractionsLast30Days,
    interactionStats,
    upcomingDates,
  };
};
