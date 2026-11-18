import { useEffect, useState } from 'react';
import { getCasesPage } from '../services/api';
import { mapCase } from '../components/cases/caseUi';

/**
 * Loads one page of cases from the server (GET /api/cases?page=...).
 * Returns to page 1 whenever the filter, search text or scope query changes.
 * The search text is debounced so typing does not send a request per key.
 *
 * @param {object} options
 * @param {object} [options.query]   scope params, e.g. { role: 'my_created_only' }
 * @param {string} [options.filter]  'all' | 'active' | 'mine' | 'resolved' | 'severe'
 * @param {string} [options.search]  free-text search
 * @param {number} [options.pageSize]
 * @param {boolean} [options.enabled] skip loading while false
 * @param {(row: object) => object} [options.map] row mapper (default: mapCase)
 */
export function usePagedCases({ query = {}, filter = 'all', search = '', pageSize = 10, enabled = true, map = mapCase } = {}) {
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(search.trim());

  const queryKey = JSON.stringify(query);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  // New filter, search or scope: start again from the first page.
  useEffect(() => {
    setPage(0);
  }, [filter, debouncedSearch, queryKey]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }
    let mounted = true;
    setLoading(true);
    getCasesPage({ ...JSON.parse(queryKey), filter, q: debouncedSearch, page, pageSize })
      .then((result) => {
        if (!mounted) return;
        setRows((result?.rows || []).map(map));
        setTotal(result?.total || 0);
        setError('');
      })
      .catch((loadError) => mounted && setError(loadError?.message || 'Failed to load cases.'))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
    // `map` is expected to be a stable function reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, queryKey, filter, debouncedSearch, page, pageSize]);

  return { rows, total, page, setPage, loading, error };
}
