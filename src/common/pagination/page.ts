import type { PaginationQueryDto } from './pagination.dto.js';

export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export function mapPage<T>(
  items: T[],
  total: number,
  query: PaginationQueryDto,
): Page<T> {
  return { items, page: query.page, limit: query.limit, total };
}

export function pageOffset(query: PaginationQueryDto): number {
  return (query.page - 1) * query.limit;
}

export function searchPattern(search: string): string {
  return `%${search.replace(/[\\%_]/g, '\\$&')}%`;
}
