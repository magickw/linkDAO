import React, { useState, useEffect } from 'react';
import { Service, ServiceCategory, ServiceSearchFilters } from '../../../types/service';
import { serviceApiService } from '../../../services/serviceApiService';
import { ServiceCard } from './ServiceCard';
import { ServiceFilters } from './ServiceFilters';
import { CreateServiceModal } from './CreateServiceModal';
import { BookingModal } from './BookingModal';

interface ServiceMarketplaceProps {
  userRole?: 'client' | 'provider' | 'both';
}

export const ServiceMarketplace: React.FC<ServiceMarketplaceProps> = ({ userRole = 'client' }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ServiceSearchFilters>({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    loadCategories();
    searchServices();
  }, []);

  useEffect(() => {
    searchServices();
  }, [filters, pagination.page]);

  const loadCategories = async () => {
    try {
      const categoriesData = await serviceApiService.getCategories();
      setCategories(categoriesData);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const searchServices = async () => {
    try {
      setLoading(true);
      const result = await serviceApiService.searchServices(filters, pagination.page, pagination.limit);
      setServices(result.services);
      setPagination(prev => ({
        ...prev,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: ServiceSearchFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleServiceCreated = (newService: Service) => {
    setServices(prev => [newService, ...prev]);
    setShowCreateModal(false);
  };

  const handleBookService = (service: Service) => {
    setSelectedService(service);
    setShowBookingModal(true);
  };

  const handleBookingCreated = () => {
    setShowBookingModal(false);
    setSelectedService(null);
    // Optionally redirect to bookings page or show success message
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  if (loading && services.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Service Marketplace</h1>
          <p className="text-gray-600 mt-2">
            Discover and book professional services from verified providers
          </p>
        </div>
        
        {(userRole === 'provider' || userRole === 'both') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Service
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <ServiceFilters
            categories={categories}
            filters={filters}
            onFiltersChange={handleFilterChange}
          />
        </div>

        {/* Services Grid */}
        <div className="lg:col-span-3">
          {services.length === 0 && !loading ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
              <p className="text-gray-600">Try adjusting your filters or search criteria</p>
            </div>
          ) : (
            <>
              {/* Results Header */}
              <div className="flex justify-between items-center mb-6">
                <p className="text-gray-600">
                  Showing {services.length} of {pagination.total} services
                </p>
                <select className="border border-gray-300 rounded-lg px-3 py-2">
                  <option>Sort by Relevance</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Rating</option>
                  <option>Newest</option>
                </select>
              </div>

              {/* Services Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onBook={() => handleBookService(service)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-2 border rounded-lg ${
                          pagination.page === page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateServiceModal
          categories={categories}
          onClose={() => setShowCreateModal(false)}
          onServiceCreated={handleServiceCreated}
        />
      )}

      {showBookingModal && selectedService && (
        <BookingModal
          service={selectedService}
          onClose={() => setShowBookingModal(false)}
          onBookingCreated={handleBookingCreated}
        />
      )}
    </div>
  );
};