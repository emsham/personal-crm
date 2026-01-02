
import { Contact, Interaction, InteractionType } from './types';

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: '1',
    firstName: 'Sarah',
    lastName: 'Chen',
    email: 'sarah.c@techcorp.com',
    phone: '+1 555-0123',
    company: 'TechCorp',
    position: 'VP of Engineering',
    tags: ['Mentor', 'SaaS', 'Hiring'],
    lastContacted: '2023-11-20',
    nextFollowUp: '2023-12-20',
    notes: 'Expert in scaling engineering teams. Met at the Web Summit.',
    avatar: 'https://picsum.photos/seed/sarah/200',
    status: 'active',
    relatedContactIds: ['3']
  },
  {
    id: '2',
    firstName: 'Marcus',
    lastName: 'Johnson',
    email: 'marcus.j@designstudio.io',
    phone: '+1 555-0144',
    company: 'Design Studio',
    position: 'Creative Director',
    tags: ['Design', 'UX', 'Contractor'],
    lastContacted: '2023-08-15',
    nextFollowUp: '2023-11-30',
    notes: 'Great UI designer for mobile apps. Worked together on Project Phoenix.',
    avatar: 'https://picsum.photos/seed/marcus/200',
    status: 'drifting',
    relatedContactIds: []
  },
  {
    id: '3',
    firstName: 'Elena',
    lastName: 'Rodriguez',
    email: 'elena@venturehub.vc',
    phone: '+1 555-0199',
    company: 'Venture Hub',
    position: 'General Partner',
    tags: ['Investor', 'VC', 'Finance'],
    lastContacted: '2023-11-10',
    nextFollowUp: '2024-01-15',
    notes: 'Interested in early-stage AI startups. Prefers morning coffee meetings.',
    avatar: 'https://picsum.photos/seed/elena/200',
    status: 'active',
    relatedContactIds: ['1']
  }
];

export const INITIAL_INTERACTIONS: Interaction[] = [
  {
    id: '101',
    contactId: '1',
    date: '2023-11-20',
    type: InteractionType.MEETING,
    notes: 'Discussed potential candidates for the senior dev role.'
  },
  {
    id: '102',
    contactId: '2',
    date: '2023-08-15',
    type: InteractionType.CALL,
    notes: 'Brief catch-up about current projects.'
  }
];
