import React, { useState, useEffect } from 'react';
import { Service, ServiceBooking, CreateBookingRequest, ServiceAvailability } from '../../../types/service';
import { serviceApiService } from '../../../services/serviceApiService';
import { XMarkIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';

interface BookingModalProps {
  service: Service;
  onClose: () => void;
  onBookingCreated: (booking: ServiceBooking) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  service,
  onClose,
  onBookingCreated,
}) => {
  const [formData, setFormData] = useState<CreateBookingRequest>({
    serviceId: service.id,
    bookingType: 'consultation',
    clientRequirements: '',
    milestones: [],
  });

  const [availability, setAvailability] = useState<ServiceAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  useEffect(() => {
    loadAvailability();
  }, [service.id]);

  const loadAvailability = async () => {
    try {
      const availabilityData = await serviceApiService.getServiceAvailability(service.id);
      setAvailability(availabilityData);
    } catch (err) {
      console.error('Error loading availability:', err);
    }
  };

  const handleInputChange = (field: keyof CreateBookingRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const addMilestone = () => {
    setFormData(prev => ({
      ...prev,
      milestones: [
        ...(prev.milestones || []),
        {
          title: '',
          description: '',
          amount: '',
        },
      ],
    }));
  };

  const updateMilestone = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones?.map((milestone, i) =>
        i === index ? { ...milestone, [field]: value } : milestone
      ) || [],
    }));
  };

  const removeMilestone = (index: number) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones?.filter((_, i) => i !== index) || [],
    }));
  };

  const calculateTotalAmount = () => {
    if (service.pricingModel === 'milestone' && formData.milestones) {
      return formData.milestones.reduce((sum, milestone) => 
        sum + parseFloat(milestone.amount || '0'), 0
      );
    }
    return parseFloat(service.basePrice);
  };

  const getAvailableTimeSlots = (date: string) => {
    const dayOfWeek = new Date(date).getDay();
    const dayAvailability = availability.filter(
      avail => avail.dayOfWeek === dayOfWeek && avail.isAvailable
    );

    const timeSlots: string[] = [];
    dayAvailability.forEach(avail => {
      const start = avail.startTime;
      const end = avail.endTime;
      
      // Generate hourly slots between start and end time
      const startHour = parseInt(start.split(':')[0]);
      const endHour = parseInt(end.split(':')[0]);
      
      for (let hour = startHour; hour < endHour; hour++) {
        timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
      }
    });

    return timeSlots;
  };

  const handleScheduling = () => {
    if (selectedDate && selectedTime) {
      const scheduledStart = new Date(`${selectedDate}T${selectedTime}:00`);
      let scheduledEnd = new Date(scheduledStart);
      
      if (service.durationMinutes) {
        scheduledEnd = new Date(scheduledStart.getTime() + service.durationMinutes * 60000);
      } else {
        scheduledEnd = new Date(scheduledStart.getTime() + 60 * 60000); // Default 1 hour
      }

      handleInputChange('scheduledStart', scheduledStart);
      handleInputChange('scheduledEnd', scheduledEnd);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!formData.bookingType;
      case 2:
        if (service.pricingModel === 'milestone') {
          return !!(formData.milestones && formData.milestones.length > 0 &&
                   formData.milestones.every(m => m.title && m.amount));
        }
        return true;
      case 3:
        return true; // Optional scheduling
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 3) {
        handleScheduling();
      }
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setError(null);

    try {
      const booking = await serviceApiService.createBooking(formData);
      onBookingCreated(booking);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Booking Type</h3>
      
      <div className="grid gap-4">
        {[
          {
            value: 'consultation',
            title: 'Consultation',
            description: 'Initial discussion or advice session',
            icon: '💬',
          },
          {
            value: 'project',
            title: 'Project Work',
            description: 'Complete project with defined deliverables',
            icon: '🚀',
          },
          {
            value: 'ongoing',
            title: 'Ongoing Support',
            description: 'Long-term or recurring service',
            icon: '🔄',
          },
        ].map((option) => (
          <label
            key={option.value}
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              formData.bookingType === option.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input
              type="radio"
              name="bookingType"
              value={option.value}
              checked={formData.bookingType === option.value}
              onChange={(e) => handleInputChange('bookingType', e.target.value)}
              className="sr-only"
            />
            <div className="flex items-start space-x-3">
              <span className="text-2xl">{option.icon}</span>
              <div>
                <div className="font-medium text-gray-900">{option.title}</div>
                <div className="text-sm text-gray-600">{option.description}</div>
              </div>
            </div>
          </label>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Requirements & Details
        </label>
        <textarea
          value={formData.clientRequirements}
          onChange={(e) => handleInputChange('clientRequirements', e.target.value)}
          placeholder="Describe your project requirements, goals, or any specific details..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">
        {service.pricingModel === 'milestone' ? 'Project Milestones' : 'Pricing Details'}
      </h3>
      
      {service.pricingModel === 'milestone' ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Break down your project into milestones with specific deliverables and payments.
          </p>
          
          {formData.milestones?.map((milestone, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-medium text-gray-900">Milestone {index + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeMilestone(index)}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={milestone.title}
                    onChange={(e) => updateMilestone(index, 'title', e.target.value)}
                    placeholder="e.g., Initial Design Concepts"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount ({service.currency}) *
                  </label>
                  <input
                    type="number"
                    value={milestone.amount}
                    onChange={(e) => updateMilestone(index, 'amount', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={milestone.description}
                  onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                  placeholder="Describe what will be delivered in this milestone..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          ))}
          
          <button
            type="button"
            onClick={addMilestone}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
          >
            + Add Milestone
          </button>
          
          {formData.milestones && formData.milestones.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">Total Project Cost:</span>
                <span className="text-lg font-bold text-gray-900">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: service.currency || 'USD',
                  }).format(calculateTotalAmount())}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: service.currency || 'USD',
              }).format(parseFloat(service.basePrice))}
            </div>
            <div className="text-gray-600">
              {service.pricingModel === 'hourly' ? 'per hour' : 'fixed price'}
            </div>
            {service.durationMinutes && (
              <div className="text-sm text-gray-500 mt-1">
                Estimated duration: {Math.floor(service.durationMinutes / 60)}h {service.durationMinutes % 60}m
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Schedule (Optional)</h3>
      
      <p className="text-sm text-gray-600">
        Schedule a specific time for your service, or leave blank to coordinate later.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <CalendarIcon className="h-4 w-4 inline mr-1" />
            Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <ClockIcon className="h-4 w-4 inline mr-1" />
            Time
          </label>
          <select
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            disabled={!selectedDate}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="">Select time</option>
            {selectedDate && getAvailableTimeSlots(selectedDate).map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedDate && getAvailableTimeSlots(selectedDate).length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
          No available time slots for the selected date. Please choose a different date or coordinate scheduling later.
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Review & Confirm</h3>
      
      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <div>
          <h4 className="font-medium text-gray-900">Service</h4>
          <p className="text-gray-700">{service.title}</p>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-900">Booking Type</h4>
          <p className="text-gray-700 capitalize">{formData.bookingType}</p>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-900">Total Cost</h4>
          <p className="text-xl font-bold text-gray-900">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: service.currency || 'USD',
            }).format(calculateTotalAmount())}
          </p>
        </div>
        
        {formData.scheduledStart && (
          <div>
            <h4 className="font-medium text-gray-900">Scheduled Time</h4>
            <p className="text-gray-700">
              {formData.scheduledStart.toLocaleDateString()} at {formData.scheduledStart.toLocaleTimeString()}
            </p>
          </div>
        )}
        
        {formData.clientRequirements && (
          <div>
            <h4 className="font-medium text-gray-900">Requirements</h4>
            <p className="text-gray-700">{formData.clientRequirements}</p>
          </div>
        )}
      </div>
      
      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
        <p className="text-sm">
          By confirming this booking, you agree to the service terms and payment will be held in escrow until completion.
        </p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Book Service</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`flex items-center ${step < 4 ? 'flex-1' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= step
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step}
                </div>
                {step < 4 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <button
              type="button"
              onClick={currentStep === 1 ? onClose : handlePrevious}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              {currentStep === 1 ? 'Cancel' : 'Previous'}
            </button>

            <div className="flex space-x-3">
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!validateStep(currentStep)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Booking...' : 'Confirm Booking'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};