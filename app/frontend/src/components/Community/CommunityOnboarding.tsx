import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { X, ChevronRight, Sparkles, Users, Hash, Globe } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ENV_CONFIG } from '@/config/environment';

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

interface Tag {
  id: string;
  name: string;
  category: string;
}

interface OnboardingData {
  preferredCategories: string[];
  preferredTags: string[];
}

export default function CommunityOnboarding() {
  const router = useRouter();
  const { address, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // Check if user needs onboarding
  useEffect(() => {
    if (!isAuthenticated || !address) return;

    const checkOnboardingStatus = async () => {
      try {
        const response = await fetch(`${ENV_CONFIG.API_URL}/api/onboarding/status`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.needsOnboarding) {
            setIsOpen(true);
          }
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkOnboardingStatus();
  }, [isAuthenticated, address]);

  // Fetch categories and tags
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, tagsRes] = await Promise.all([
          fetch(`${ENV_CONFIG.API_URL}/api/onboarding/categories`),
          fetch(`${ENV_CONFIG.API_URL}/api/onboarding/tags`)
        ]);

        if (categoriesRes.ok && tagsRes.ok) {
          const categoriesData = await categoriesRes.json();
          const tagsData = await tagsRes.json();
          
          setCategories(categoriesData.data || []);
          setTags(tagsData.data || []);
        }
      } catch (error) {
        console.error('Error fetching onboarding data:', error);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSkip = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${ENV_CONFIG.API_URL}/api/onboarding/skip`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setIsOpen(false);
        addToast('Onboarding skipped. You can update your preferences later in settings.', 'info');
      }
    } catch (error) {
      addToast('Failed to skip onboarding', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedCategories.length === 0) {
      addToast('Please select at least one category', 'warning');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${ENV_CONFIG.API_URL}/api/onboarding/preferences`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          preferredCategories: selectedCategories,
          preferredTags: selectedTags
        })
      });

      if (response.ok) {
        setIsOpen(false);
        addToast('Preferences saved! Your feed will now be personalized.', 'success');
        // Refresh the page to show personalized feed
        router.reload();
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      addToast('Failed to save preferences', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTags = tags.filter(tag => 
    selectedCategories.length === 0 || 
    selectedCategories.includes(tag.category)
  );

  if (!isOpen || isCheckingStatus) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Welcome to LinkDAO Communities!
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Step {step} of 2: Personalize your feed
                </p>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              disabled={isLoading}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Select your interests
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Choose categories that interest you to personalize your community feed
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryToggle(category.id)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedCategories.includes(category.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${category.color}`}>
                        {category.icon}
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {category.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {category.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={handleSkip}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  disabled={isLoading}
                >
                  Skip for now
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={selectedCategories.length === 0 || isLoading}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Refine with tags
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Select specific topics to get more targeted content
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {filteredTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleTagToggle(tag.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      selectedTags.includes(tag.id)
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    #{tag.name}
                  </button>
                ))}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  disabled={isLoading}
                >
                  Back
                </button>
                <div className="flex space-x-3">
                  <button
                    onClick={handleSubmit}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}