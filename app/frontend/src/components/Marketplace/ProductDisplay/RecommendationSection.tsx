import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { marketplaceService, Product } from '../../../services/marketplaceService';
import { ProductCard } from '../ProductDisplay/ProductCard';

interface RecommendationSectionProps {
  productId?: string;
  title?: string;
  limit?: number;
}

export const RecommendationSection: React.FC<RecommendationSectionProps> = ({
  productId,
  title = 'Recommended for You',
  limit = 4,
}) => {
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        const data = await marketplaceService.getProductRecommendations(productId, limit);
        setRecommendations(data);
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [productId, limit]);

  if (!loading && recommendations.length === 0) return null;

  return (
    <section className="py-12">
      <div className="flex items-center gap-2 mb-8 text-white">
        <Sparkles size={24} className="text-yellow-400" />
        <h2 className="text-3xl font-bold">{title}</h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="h-96 rounded-lg animate-pulse bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {recommendations.map((product) => {
            // Need to transform Product to the format ProductCard expects if they differ
            // For now assuming compatible enough or handled by ProductCard
            return (
              <ProductCard
                key={product.id}
                product={product as any}
                variant="grid"
              />
            );
          })}
        </div>
      )}
    </section>
  );
};
