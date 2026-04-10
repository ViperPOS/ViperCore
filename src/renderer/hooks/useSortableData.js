import { useMemo, useState } from 'react';

export function useSortableData(data, defaultSortKey = null) {
  const [sortConfig, setSortConfig] = useState({ key: defaultSortKey, direction: 'asc' });

  const sorted = useMemo(() => {
    if (!sortConfig.key) return data;
    const sorted = [...data].sort((a, b) => {
      const aVal = a?.[sortConfig.key];
      const bVal = b?.[sortConfig.key];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [data, sortConfig]);

  const requestSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  return { sorted, sortConfig, requestSort };
}