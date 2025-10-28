import useSWR from 'swr';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
  views: number;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch');
  const data = await response.json();
  return data.data || [];
};

export const useFAQWithCache = (category?: string, search?: string) => {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (search) params.append('search', search);
  
  const { data, error, isLoading } = useSWR(
    `/api/support/faq?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 minutes - FAQ changes less frequently
    }
  );

  return {
    faqs: data || [],
    loading: isLoading,
    error,
  };
};
