export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date
  category: string;
  daysUntil: number;
  relevantMarketIds: string[];
}
