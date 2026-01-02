
export enum InteractionType {
  MEETING = 'Meeting',
  CALL = 'Call',
  EMAIL = 'Email',
  COFFEE = 'Coffee',
  EVENT = 'Event',
  OTHER = 'Other'
}

export interface Interaction {
  id: string;
  contactId: string;
  date: string;
  type: InteractionType;
  notes: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  tags: string[];
  lastContacted: string | null;
  nextFollowUp: string | null;
  notes: string;
  avatar: string;
  status: 'active' | 'drifting' | 'lost';
  relatedContactIds: string[];
}

export interface CRMState {
  contacts: Contact[];
  interactions: Interaction[];
}

export enum View {
  DASHBOARD = 'dashboard',
  CONTACTS = 'contacts',
  ANALYTICS = 'analytics'
}
