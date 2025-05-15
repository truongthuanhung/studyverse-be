export interface SearchQuery {
  q: string;
  page?: string;
  limit?: string;
  type?: 'user' | 'group' | 'post';
}
