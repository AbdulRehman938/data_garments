import { useState, useEffect } from 'react';
import { getCache, setCache } from '../utils/db';

interface UsePaginatedDataOptions<T> {
  key: string;
  fetcher: (page: number, pageSize: number) => Promise<{ data: T[]; total: number }>;
  pageSize?: number;
  enabled?: boolean;
}

export const usePaginatedData = <T>({
  key,
  fetcher,
  pageSize = 10,
  enabled = true,
}: UsePaginatedDataOptions<T>) => {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (currentPage: number, isFresh = false) => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);

    const cacheKey = `${key}-page-${currentPage}-size-${pageSize}`;
    try {
      let result = isFresh ? null : await getCache(cacheKey);
      if (!result) {
        result = await fetcher(currentPage, pageSize);
        await setCache(cacheKey, result);
      }

      if (currentPage === 1) {
        setData(result.data);
      } else {
        setData((prev) => [...prev, ...result.data]);
      }
      setTotal(result.total);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1, true);
  }, [key, enabled]); // Reset to page 1 when key changes

  const nextPage = () => {
    if (isLoading) return;
    const totalPages = Math.ceil(total / pageSize);
    if (page < totalPages) {
      const nextPageNum = page + 1;
      setPage(nextPageNum);
      fetchData(nextPageNum);
    }
  };

  const refresh = () => {
    setPage(1);
    fetchData(1, true);
  };

  return {
    data,
    total,
    page,
    isLoading,
    error,
    nextPage,
    refresh,
    hasMore: page < Math.ceil(total / pageSize),
  };
};
