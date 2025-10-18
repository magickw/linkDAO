import React, { createContext, useContext, useState, useEffect } from 'react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  content: React.ReactNode;
  action?: () => void;
  skippable?: boolean;
}

interface OnboardingTour {
  id: string;
  name: string;
  description: string;
  steps: OnboardingStep[];
  category: 'basic' | 'advanced' | 'feature-specific';
  estimatedTime: number;
  prerequisites?: string[];
}

interface OnboardingProgress {
  completedTours: string[];
  completedSteps: string[];
  currentTour?: string;
  currentStep?: number;
  startedAt?: Date;
  lastActivity?: Date;
}

interface OnboardingContextType {
  tours: OnboardingTour[];
  progress: OnboardingProgress;
  currentTour: OnboardingTour | null;
  currentStep: OnboardingStep | null;
  isActive: boolean;
  startTour: (tourId: string) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipStep: () => void;
  completeTour: () => void;
  exitTour: () => void;
  markStepComplete: (stepId: string) => void;
  resetProgress: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

const defaultTours: OnboardingTour[] = [
  {
    id: 'admin-basics',
    name: 'Admin Dashboard Basics',
    description: 'Learn the fundamentals of the admin dashboard',
    category: 'basic',
    estimatedTime: 10,
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to LinkDAO Admin',
        description: 'Let\'s take a quick tour of your admin dashboard',
        target: '.admin-dashboard',
        position: 'bottom',
        content: (
          <div>
            <p>Welcome to the LinkDAO Admin System! This tour will help you get familiar with the key features and navigation.</p>
            <p>You can exit this tour at any time by clicking the X button.</p>
          </div>
        )
      },
      {
        id: 'navigation',
        title: 'Navigation Sidebar',
        description: 'Your main navigation hub',
        target: '.admin-sidebar',
        position: 'right',
        content: (
          <div>
            <p>The sidebar contains all the main sections of the admin system:</p>
            <ul>
              <li><strong>Dashboard:</strong> Overview and key metrics</li>
              <li><strong>Users:</strong> User management tools</li>
              <li><strong>Content:</strong> Moderation and content management</li>
              <li><strong>Analytics:</strong> Detailed reports and insights</li>
            </ul>
          </div>
        )
      },
      {
        id: 'dashboard-widgets',
        title: 'Dashboard Widgets',
        description: 'Customizable information panels',
        target: '.dashboard-widgets',
        position: 'top',
        content: (
          <div>
            <p>Dashboard widgets show real-time information about your platform:</p>
            <ul>
              <li>Drag widgets to rearrange them</li>
              <li>Click the + button to add new widgets</li>
              <li>Use the X button to remove widgets</li>
              <li>Resize widgets by dragging the corners</li>
            </ul>
          </div>
        )
      },
      {
        id: 'notifications',
        title: 'Notification Center',
        description: 'Stay updated with alerts and messages',
        target: '.notification-center',
        position: 'left',
        content: (
          <div>
            <p>The notification center keeps you informed about:</p>
            <ul>
              <li>System alerts and warnings</li>
              <li>Moderation queue updates</li>
              <li>User reports and appeals</li>
              <li>System maintenance notifications</li>
            </ul>
          </div>
        )
      }
    ]
  },
  {
    id: 'moderation-workflow',
    name: 'Content Moderation Workflow',
    description: 'Learn how to effectively moderate content',
    category: 'feature-specific',
    estimatedTime: 15,
    prerequisites: ['admin-basics'],
    steps: [
      {
        id: 'moderation-queue',
        title: 'Moderation Queue',
        description: 'Your content review workspace',
        target: '.moderation-queue',
        position: 'top',
        content: (
          <div>
            <p>The moderation queue shows content that needs review:</p>
            <ul>
              <li>Items are prioritized by severity</li>
              <li>AI recommendations help guide decisions</li>
              <li>Click on items to see full details</li>
            </ul>
          </div>
        )
      },
      {
        id: 'ai-assistance',
        title: 'AI Moderation Assistant',
        description: 'Leverage AI to make better decisions',
        target: '.ai-recommendations',
        position: 'right',
        content: (
          <div>
            <p>The AI assistant provides:</p>
            <ul>
              <li>Risk scores and confidence levels</li>
              <li>Policy violation detection</li>
              <li>Similar case suggestions</li>
              <li>Recommended actions</li>
            </ul>
            <p>Always use your judgment alongside AI recommendations.</p>
          </div>
        )
      },
      {
        id: 'moderation-actions',
        title: 'Taking Action',
        description: 'Apply appropriate moderation responses',
        target: '.moderation-actions',
        position: 'left',
        content: (
          <div>
            <p>Available actions include:</p>
            <ul>
              <li><strong>Approve:</strong> Content meets guidelines</li>
              <li><strong>Remove:</strong> Delete violating content</li>
              <li><strong>Warn:</strong> Educate user about policies</li>
              <li><strong>Escalate:</strong> Send to senior moderator</li>
            </ul>
          </div>
        )
      }
    ]
  },
  {
    id: 'analytics-reporting',
    name: 'Analytics and Reporting',
    description: 'Generate insights and custom reports',
    category: 'advanced',
    estimatedTime: 20,
    prerequisites: ['admin-basics'],
    steps: [
      {
        id: 'analytics-dashboard',
        title: 'Analytics Overview',
        description: 'Understand your platform metrics',
        target: '.analytics-dashboard',
        position: 'top',
        content: (
          <div>
            <p>The analytics dashboard provides insights into:</p>
            <ul>
              <li>User growth and engagement</li>
              <li>Content performance</li>
              <li>Moderation effectiveness</li>
              <li>System performance</li>
            </ul>
          </div>
        )
      },
      {
        id: 'report-builder',
        title: 'Custom Report Builder',
        description: 'Create tailored reports',
        target: '.report-builder',
        position: 'right',
        content: (
          <div>
            <p>Build custom reports by:</p>
            <ul>
              <li>Selecting data sources</li>
              <li>Choosing metrics and dimensions</li>
              <li>Applying filters and date ranges</li>
              <li>Scheduling automated delivery</li>
            </ul>
          </div>
        )
      }
    ]
  }
];

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [tours] = useState<OnboardingTour[]>(defaultTours);
  const [progress, setProgress] = useState<OnboardingProgress>(() => {
    const saved = localStorage.getItem('admin-onboarding-progress');
    return saved ? JSON.parse(saved) : {
      completedTours: [],
      completedSteps: [],
    };
  });

  const [currentTour, setCurrentTour] = useState<OnboardingTour | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  const currentStep = currentTour?.steps[currentStepIndex] || null;
  const isActive = currentTour !== null;

  // Save progress to localStorage
  useEffect(() => {
    localStorage.setItem('admin-onboarding-progress', JSON.stringify(progress));
  }, [progress]);

  const startTour = (tourId: string) => {
    const tour = tours.find(t => t.id === tourId);
    if (!tour) return;

    // Check prerequisites
    if (tour.prerequisites) {
      const missingPrereqs = tour.prerequisites.filter(
        prereq => !progress.completedTours.includes(prereq)
      );
      if (missingPrereqs.length > 0) {
        alert(`Please complete these tours first: ${missingPrereqs.join(', ')}`);
        return;
      }
    }

    setCurrentTour(tour);
    setCurrentStepIndex(0);
    setProgress(prev => ({
      ...prev,
      currentTour: tourId,
      currentStep: 0,
      startedAt: new Date(),
      lastActivity: new Date()
    }));
  };

  const nextStep = () => {
    if (!currentTour) return;

    if (currentStepIndex < currentTour.steps.length - 1) {
      const newIndex = currentStepIndex + 1;
      setCurrentStepIndex(newIndex);
      setProgress(prev => ({
        ...prev,
        currentStep: newIndex,
        lastActivity: new Date()
      }));
    } else {
      completeTour();
    }
  };

  const previousStep = () => {
    if (currentStepIndex > 0) {
      const newIndex = currentStepIndex - 1;
      setCurrentStepIndex(newIndex);
      setProgress(prev => ({
        ...prev,
        currentStep: newIndex,
        lastActivity: new Date()
      }));
    }
  };

  const skipStep = () => {
    if (currentStep?.skippable !== false) {
      nextStep();
    }
  };

  const completeTour = () => {
    if (!currentTour) return;

    setProgress(prev => ({
      ...prev,
      completedTours: [...prev.completedTours, currentTour.id],
      completedSteps: [
        ...prev.completedSteps,
        ...currentTour.steps.map(step => step.id)
      ],
      currentTour: undefined,
      currentStep: undefined
    }));

    setCurrentTour(null);
    setCurrentStepIndex(0);
  };

  const exitTour = () => {
    setCurrentTour(null);
    setCurrentStepIndex(0);
    setProgress(prev => ({
      ...prev,
      currentTour: undefined,
      currentStep: undefined
    }));
  };

  const markStepComplete = (stepId: string) => {
    setProgress(prev => ({
      ...prev,
      completedSteps: [...prev.completedSteps, stepId]
    }));
  };

  const resetProgress = () => {
    setProgress({
      completedTours: [],
      completedSteps: []
    });
    setCurrentTour(null);
    setCurrentStepIndex(0);
  };

  const contextValue: OnboardingContextType = {
    tours,
    progress,
    currentTour,
    currentStep,
    isActive,
    startTour,
    nextStep,
    previousStep,
    skipStep,
    completeTour,
    exitTour,
    markStepComplete,
    resetProgress
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
};