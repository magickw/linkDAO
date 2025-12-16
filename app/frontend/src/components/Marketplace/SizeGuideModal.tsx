import React, { useState } from 'react';
import { XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { SizeCategory, SIZE_CATEGORIES, getSizeCategory } from '@/types/sizeSystem';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string;
}

const SizeGuideModal: React.FC<SizeGuideModalProps> = ({
  isOpen,
  onClose,
  initialCategory = 'clothing-tops'
}) => {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [activeTab, setActiveTab] = useState<'chart' | 'measure'>('chart');

  if (!isOpen) return null;

  const currentCategory = getSizeCategory(selectedCategory);

  const renderSizeChart = () => {
    if (!currentCategory) return null;

    const isFootwear = selectedCategory.includes('footwear');
    const hasInternationalSizes = currentCategory.sizes.some(s => s.equivalent);

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Size
              </th>
              {hasInternationalSizes && (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    US
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    UK
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    EU
                  </th>
                  {isFootwear && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      JP
                    </th>
                  )}
                </>
              )}
              {currentCategory.sizes[0]?.measurements && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Measurements
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentCategory.sizes.map((size) => (
              <tr key={size.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {size.name}
                </td>
                {hasInternationalSizes && (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {size.equivalent?.US || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {size.equivalent?.UK || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {size.equivalent?.EU || '-'}
                    </td>
                    {isFootwear && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {size.equivalent?.JP || '-'}
                      </td>
                    )}
                  </>
                )}
                {size.measurements && (
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="space-y-1">
                      {size.measurements.chest && (
                        <div>Chest: {size.measurements.chest}cm</div>
                      )}
                      {size.measurements.waist && (
                        <div>Waist: {size.measurements.waist}cm</div>
                      )}
                      {size.measurements.hips && (
                        <div>Hips: {size.measurements.hips}cm</div>
                      )}
                      {size.measurements.length && (
                        <div>Length: {size.measurements.length}cm</div>
                      )}
                      {size.measurements.inseam && (
                        <div>Inseam: {size.measurements.inseam}cm</div>
                      )}
                      {size.measurements.footLength && (
                        <div>Foot Length: {size.measurements.footLength}cm</div>
                      )}
                      {size.measurements.footWidth && (
                        <div>Foot Width: {size.measurements.footWidth}cm</div>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMeasurementGuide = () => {
    const guides = {
      'clothing-tops': {
        title: 'How to Measure Tops',
        steps: [
          'Chest: Measure around the fullest part of your chest',
          'Waist: Measure around your natural waistline',
          'Length: Measure from shoulder to hem'
        ]
      },
      'clothing-bottoms': {
        title: 'How to Measure Bottoms',
        steps: [
          'Waist: Measure around your natural waistline',
          'Hips: Measure around the fullest part of your hips',
          'Inseam: Measure from crotch to ankle'
        ]
      },
      'clothing-dresses': {
        title: 'How to Measure Dresses',
        steps: [
          'Bust: Measure around the fullest part of your bust',
          'Waist: Measure around your natural waistline',
          'Hips: Measure around the fullest part of your hips'
        ]
      },
      'footwear-mens': {
        title: 'How to Measure Feet',
        steps: [
          'Place your foot on a piece of paper',
          'Mark the longest toe and heel',
          'Measure the distance between marks in cm',
          'Measure width at the widest point'
        ]
      },
      'footwear-womens': {
        title: 'How to Measure Feet',
        steps: [
          'Place your foot on a piece of paper',
          'Mark the longest toe and heel',
          'Measure the distance between marks in cm',
          'Measure width at the widest point'
        ]
      }
    };

    const guide = guides[selectedCategory as keyof typeof guides] || {
      title: 'How to Measure',
      steps: ['Follow standard measuring procedures']
    };

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">{guide.title}</h3>
          <ol className="list-decimal list-inside space-y-3">
            {guide.steps.map((step, index) => (
              <li key={index} className="text-gray-700">{step}</li>
            ))}
          </ol>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <InformationCircleIcon className="h-5 w-5 text-blue-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Measuring Tips</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Use a flexible measuring tape</li>
                  <li>Measure over lightweight clothing</li>
                  <li>Keep the tape snug but not tight</li>
                  <li>Take measurements twice for accuracy</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Size Guide</h2>
              <button
                onClick={onClose}
                className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Category Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <div className="flex overflow-x-auto">
                {SIZE_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      selectedCategory === category.id
                        ? 'text-indigo-600 border-indigo-600'
                        : 'text-gray-500 border-transparent hover:text-gray-700'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart/Measure Toggle */}
            <div className="flex space-x-4 mb-6">
              <button
                onClick={() => setActiveTab('chart')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'chart'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Size Chart
              </button>
              <button
                onClick={() => setActiveTab('measure')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'measure'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                How to Measure
              </button>
            </div>

            {/* Content */}
            <div className="mt-4">
              {activeTab === 'chart' ? renderSizeChart() : renderMeasurementGuide()}
            </div>

            {/* Category Description */}
            {currentCategory && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">{currentCategory.description}</p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SizeGuideModal;