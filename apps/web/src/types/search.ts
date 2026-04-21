export interface SearchResults {
  pages: { id: string; title: string; emoji: string; type: string }[];
  items: { text: string; pageId: string; pageTitle: string; pageEmoji: string }[];
  tasks: { text: string; pageId: string; pageTitle: string; pageEmoji: string }[];
  events: { id: string; title: string; startAt: string; familyId: string }[];
}
