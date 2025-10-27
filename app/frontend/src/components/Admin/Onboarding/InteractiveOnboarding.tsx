import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, Play, Book, Award, Target, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button, GlassPanel } from '@/design-system';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  type: 'introduction' | 'interactive_tour' | 'video' | 'quiz' | 'sandbox';
  completed: boolean;
  locked: boolean;
  estimatedMinutes: number;
  content?: {
    videoUrl?: string;
    tourSteps?: TourStep[];
    quizQuestions?: QuizQuestion[];
    sandboxTasks?: SandboxTask[];
  };
}

interface TourStep {
  target: string;
  title: string;
  content: string;
  action?: 'highlight' | 'click' | 'input';
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface SandboxTask {
  id: string;
  instruction: string;
  completed: boolean;
  validation?: string;
}

const ONBOARDING_MODULES: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to LinkDAO Admin',
    description: 'Get started with the admin dashboard and learn the basics',
    type: 'introduction',
    completed: false,
    locked: false,
    estimatedMinutes: 2,
  },
  {
    id: 'dashboard_tour',
    title: 'Dashboard Overview',
    description: 'Interactive tour of the admin dashboard and key metrics',
    type: 'interactive_tour',
    completed: false,
    locked: false,
    estimatedMinutes: 5,
    content: {
      tourSteps: [
        {
          target: '[data-testid="stats-grid"]',
          title: 'Key Metrics',
          content: 'Monitor platform health with real-time metrics including pending moderations, user counts, and system status.',
          action: 'highlight',
          position: 'bottom',
        },
        {
          target: 'button:has-text("Moderation")',
          title: 'Moderation Queue',
          content: 'Access content that needs review. Click here to see pending items.',
          action: 'highlight',
          position: 'bottom',
        },
        {
          target: 'button:has-text("Analytics")',
          title: 'Analytics Dashboard',
          content: 'View detailed analytics and reports about platform usage and trends.',
          action: 'highlight',
          position: 'bottom',
        },
      ],
    },
  },
  {
    id: 'moderation_basics',
    title: 'Content Moderation Basics',
    description: 'Learn how to review and moderate user-generated content',
    type: 'video',
    completed: false,
    locked: true,
    estimatedMinutes: 8,
    content: {
      videoUrl: '/videos/moderation-basics.mp4',
    },
  },
  {
    id: 'moderation_practice',
    title: 'Moderation Practice',
    description: 'Try moderating content in a safe sandbox environment',
    type: 'sandbox',
    completed: false,
    locked: true,
    estimatedMinutes: 10,
    content: {
      sandboxTasks: [
        {
          id: 'approve_good_content',
          instruction: 'Approve content that follows community guidelines',
          completed: false,
        },
        {
          id: 'reject_spam',
          instruction: 'Reject spam or inappropriate content',
          completed: false,
        },
        {
          id: 'escalate_complex',
          instruction: 'Escalate complex cases to senior moderators',
          completed: false,
        },
      ],
    },
  },
  {
    id: 'moderation_quiz',
    title: 'Moderation Policy Quiz',
    description: 'Test your knowledge of moderation guidelines',
    type: 'quiz',
    completed: false,
    locked: true,
    estimatedMinutes: 8,
    content: {
      quizQuestions: [
        {
          question: 'What should you do when you encounter content with mild profanity?',
          options: [
            'Immediately reject it',
            'Review the context and apply community standards',
            'Always approve it',
            'Escalate to senior moderator',
          ],
          correctAnswer: 1,
          explanation: 'Context matters in moderation. Consider the overall tone, intent, and community standards before making a decision.',
        },
        {
          question: 'When should you escalate a moderation case?',
          options: [
            'Never, decide everything yourself',
            'Only for legal issues',
            'When unsure, involves public figures, or is particularly sensitive',
            'Always escalate everything',
          ],
          correctAnswer: 2,
          explanation: 'Escalate when you\'re uncertain, when the case involves public figures, legal concerns, or particularly sensitive topics.',
        },
        {
          question: 'What is the primary goal of content moderation?',
          options: [
            'To reject as much content as possible',
            'To maintain a safe, respectful community while allowing free expression',
            'To approve everything quickly',
            'To punish users who break rules',
          ],
          correctAnswer: 1,
          explanation: 'Moderation balances community safety with free expression, creating a respectful environment for all users.',
        },
      ],
    },
  },
  {
    id: 'analytics_overview',
    title: 'Analytics & Reporting',
    description: 'Understand platform analytics and generate reports',
    type: 'interactive_tour',
    completed: false,
    locked: true,
    estimatedMinutes: 7,
  },
  {
    id: 'advanced_features',
    title: 'Advanced Features',
    description: 'Explore workflow automation, AI moderation, and more',
    type: 'introduction',
    completed: false,
    locked: true,
    estimatedMinutes: 10,
  },
];

export const InteractiveOnboarding: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [modules, setModules] = useState<OnboardingStep[]>(ONBOARDING_MODULES);
  const [tourActive, setTourActive] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [sandboxTasks, setSandboxTasks] = useState<SandboxTask[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    // Load progress from localStorage
    const savedProgress = localStorage.getItem('admin-onboarding-progress');
    if (savedProgress) {
      const progress = JSON.parse(savedProgress);
      setModules(progress.modules || ONBOARDING_MODULES);
      setCurrentStep(progress.currentStep || 0);
    }

    // Calculate overall progress
    calculateProgress();
  }, []);

  useEffect(() => {
    // Save progress to localStorage
    localStorage.setItem('admin-onboarding-progress', JSON.stringify({
      modules,
      currentStep,
    }));

    // Calculate overall progress
    calculateProgress();
  }, [modules, currentStep]);

  const calculateProgress = () => {
    const completed = modules.filter(m => m.completed).length;
    const progress = Math.round((completed / modules.length) * 100);
    setOverallProgress(progress);
  };

  const completeStep = (stepId: string) => {
    setModules(prev => prev.map(module => {
      if (module.id === stepId) {
        return { ...module, completed: true };
      }
      return module;
    }));

    // Unlock next step
    const currentIndex = modules.findIndex(m => m.id === stepId);
    if (currentIndex < modules.length - 1) {
      setModules(prev => prev.map((module, idx) => {
        if (idx === currentIndex + 1) {
          return { ...module, locked: false };
        }
        return module;
      }));
    }
  };

  const startTour = () => {
    setTourActive(true);
    setTourStepIndex(0);
  };

  const nextTourStep = () => {
    const currentModule = modules[currentStep];
    const tourSteps = currentModule.content?.tourSteps || [];
    
    if (tourStepIndex < tourSteps.length - 1) {
      setTourStepIndex(prev => prev + 1);
    } else {
      // Tour complete
      setTourActive(false);
      setTourStepIndex(0);
      completeStep(currentModule.id);
    }
  };

  const prevTourStep = () => {
    if (tourStepIndex > 0) {
      setTourStepIndex(prev => prev - 1);
    }
  };

  const submitQuiz = () => {
    setQuizSubmitted(true);
    const currentModule = modules[currentStep];
    const questions = currentModule.content?.quizQuestions || [];
    
    // Check if passed (>80% correct)
    const correctCount = questions.filter((q, idx) => quizAnswers[idx] === q.correctAnswer).length;
    const score = correctCount / questions.length;
    
    if (score >= 0.8) {
      completeStep(currentModule.id);
    }
  };

  const initializeSandbox = () => {
    const currentModule = modules[currentStep];
    const tasks = currentModule.content?.sandboxTasks || [];
    setSandboxTasks(tasks);
  };

  const completeSandboxTask = (taskId: string) => {
    setSandboxTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: true } : task
    ));

    // Check if all tasks completed
    const allCompleted = sandboxTasks.every(t => t.id === taskId || t.completed);
    if (allCompleted) {
      completeStep(modules[currentStep].id);
    }
  };

  const renderStepContent = () => {
    const module = modules[currentStep];

    switch (module.type) {
      case 'introduction':
        return (
          <div className="space-y-6">
            <div className="prose prose-invert max-w-none">
              <h2 className="text-2xl font-bold text-white mb-4">{module.title}</h2>
              <p className="text-gray-300 mb-6">{module.description}</p>
              
              {module.id === 'welcome' && (
                <div className="space-y-4">
                  <p>Welcome to the LinkDAO Admin System! This interactive onboarding will help you:</p>
                  <ul className="list-disc list-inside space-y-2 text-gray-300">
                    <li>Navigate the admin dashboard effectively</li>
                    <li>Learn content moderation best practices</li>
                    <li>Understand analytics and reporting tools</li>
                    <li>Discover advanced automation features</li>
                  </ul>
                  <p className="mt-6">Complete all modules to earn your Admin Certification badge!</p>
                </div>
              )}
              
              {module.id === 'advanced_features' && (
                <div className="space-y-4">
                  <p>Now that you've mastered the basics, explore advanced features:</p>
                  <ul className="list-disc list-inside space-y-2 text-gray-300">
                    <li><strong>Workflow Automation:</strong> Create custom workflows to automate routine tasks</li>
                    <li><strong>AI-Powered Moderation:</strong> Leverage AI to pre-screen content</li>
                    <li><strong>Advanced Analytics:</strong> Deep dive into user behavior and platform trends</li>
                    <li><strong>Real-time Monitoring:</strong> Set up alerts and dashboards for critical metrics</li>
                  </ul>
                </div>
              )}
            </div>
            
            <Button
              onClick={() => completeStep(module.id)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        );

      case 'interactive_tour':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">{module.title}</h2>
            <p className="text-gray-300">{module.description}</p>
            
            {!tourActive ? (
              <Button
                onClick={startTour}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Play className="w-4 h-4 mr-2" /> Start Interactive Tour
              </Button>
            ) : (
              <GlassPanel className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">
                      Step {tourStepIndex + 1} of {module.content?.tourSteps?.length || 0}
                    </span>
                    <span className="text-sm text-gray-400">
                      {Math.round(((tourStepIndex + 1) / (module.content?.tourSteps?.length || 1)) * 100)}%
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${((tourStepIndex + 1) / (module.content?.tourSteps?.length || 1)) * 100}%` }}
                    />
                  </div>
                  
                  {module.content?.tourSteps?.[tourStepIndex] && (
                    <div className="space-y-2 pt-4">
                      <h3 className="text-lg font-semibold text-white">
                        {module.content.tourSteps[tourStepIndex].title}
                      </h3>
                      <p className="text-gray-300">
                        {module.content.tourSteps[tourStepIndex].content}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-4">
                    {tourStepIndex > 0 && (
                      <Button
                        onClick={prevTourStep}
                        variant="secondary"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Previous
                      </Button>
                    )}
                    <Button
                      onClick={nextTourStep}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {tourStepIndex === (module.content?.tourSteps?.length || 0) - 1 ? 'Complete Tour' : 'Next'} 
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </GlassPanel>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">{module.title}</h2>
            <p className="text-gray-300">{module.description}</p>
            
            <div className="bg-gray-800 rounded-lg aspect-video flex items-center justify-center">
              <div className="text-center space-y-4">
                <Play className="w-16 h-16 text-gray-600 mx-auto" />
                <p className="text-gray-400">Video content would load here</p>
                <p className="text-sm text-gray-500">({module.estimatedMinutes} minutes)</p>
              </div>
            </div>
            
            <Button
              onClick={() => completeStep(module.id)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Mark as Complete
            </Button>
          </div>
        );

      case 'quiz':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">{module.title}</h2>
            <p className="text-gray-300">{module.description}</p>
            <p className="text-sm text-gray-400">Passing score: 80% or higher</p>
            
            <div className="space-y-6">
              {module.content?.quizQuestions?.map((question, idx) => (
                <GlassPanel key={idx} className="p-6">
                  <h3 className="font-semibold text-white mb-4">
                    {idx + 1}. {question.question}
                  </h3>
                  <div className="space-y-2">
                    {question.options.map((option, optIdx) => {
                      const isSelected = quizAnswers[idx] === optIdx;
                      const isCorrect = optIdx === question.correctAnswer;
                      const showResult = quizSubmitted;
                      
                      return (
                        <button
                          key={optIdx}
                          onClick={() => !quizSubmitted && setQuizAnswers(prev => ({ ...prev, [idx]: optIdx }))}
                          disabled={quizSubmitted}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            showResult && isCorrect
                              ? 'border-green-500 bg-green-500/10'
                              : showResult && isSelected && !isCorrect
                              ? 'border-red-500 bg-red-500/10'
                              : isSelected
                              ? 'border-purple-500 bg-purple-500/10'
                              : 'border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          <span className="text-white">{option}</span>
                        </button>
                      );
                    })}
                  </div>
                  
                  {quizSubmitted && (
                    <div className={`mt-4 p-4 rounded-lg ${
                      quizAnswers[idx] === question.correctAnswer
                        ? 'bg-green-500/20 text-green-200'
                        : 'bg-red-500/20 text-red-200'
                    }`}>
                      <p className="text-sm font-medium mb-2">
                        {quizAnswers[idx] === question.correctAnswer ? '✓ Correct!' : '✗ Incorrect'}
                      </p>
                      <p className="text-sm">{question.explanation}</p>
                    </div>
                  )}
                </GlassPanel>
              ))}
            </div>
            
            {!quizSubmitted ? (
              <Button
                onClick={submitQuiz}
                disabled={Object.keys(quizAnswers).length < (module.content?.quizQuestions?.length || 0)}
                className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
              >
                Submit Quiz
              </Button>
            ) : (
              <div className="space-y-4">
                <GlassPanel className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white mb-2">
                      Score: {Math.round((Object.values(quizAnswers).filter((ans, idx) => 
                        ans === module.content?.quizQuestions?.[idx].correctAnswer
                      ).length / (module.content?.quizQuestions?.length || 1)) * 100)}%
                    </p>
                    <p className="text-gray-400">
                      {Object.values(quizAnswers).filter((ans, idx) => 
                        ans === module.content?.quizQuestions?.[idx].correctAnswer
                      ).length} out of {module.content?.quizQuestions?.length} correct
                    </p>
                  </div>
                </GlassPanel>
                
                {module.completed ? (
                  <div className="text-center text-green-400">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                    <p className="font-semibold">Congratulations! You passed!</p>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <p className="text-red-400">You need 80% or higher to pass. Please try again.</p>
                    <Button
                      onClick={() => {
                        setQuizSubmitted(false);
                        setQuizAnswers({});
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Retry Quiz
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'sandbox':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">{module.title}</h2>
            <p className="text-gray-300">{module.description}</p>
            <p className="text-sm text-gray-400">Complete all tasks to finish this module</p>
            
            {sandboxTasks.length === 0 && (
              <Button
                onClick={initializeSandbox}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Play className="w-4 h-4 mr-2" /> Start Practice Sandbox
              </Button>
            )}
            
            {sandboxTasks.length > 0 && (
              <div className="space-y-4">
                {sandboxTasks.map((task) => (
                  <GlassPanel key={task.id} className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {task.completed ? (
                          <CheckCircle className="w-6 h-6 text-green-500" />
                        ) : (
                          <Circle className="w-6 h-6 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-2">{task.instruction}</h3>
                        {!task.completed && (
                          <Button
                            onClick={() => completeSandboxTask(task.id)}
                            size="small"
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            Complete Task
                          </Button>
                        )}
                      </div>
                    </div>
                  </GlassPanel>
                ))}
                
                {sandboxTasks.every(t => t.completed) && (
                  <div className="text-center text-green-400">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                    <p className="font-semibold">All tasks completed!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Onboarding</h1>
          <p className="text-gray-400">Complete your training to become a certified LinkDAO admin</p>
          
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Overall Progress</span>
              <span className="text-sm font-semibold text-white">{overallProgress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Module List */}
          <div className="lg:col-span-1">
            <GlassPanel className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Book className="w-5 h-5" />
                Training Modules
              </h2>
              
              <div className="space-y-2">
                {modules.map((module, idx) => (
                  <button
                    key={module.id}
                    onClick={() => !module.locked && setCurrentStep(idx)}
                    disabled={module.locked}
                    className={`w-full text-left p-4 rounded-lg transition-all ${
                      idx === currentStep
                        ? 'bg-purple-600 text-white'
                        : module.completed
                        ? 'bg-green-500/20 text-green-200 hover:bg-green-500/30'
                        : module.locked
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {module.completed ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : module.locked ? (
                          <Circle className="w-5 h-5" />
                        ) : (
                          <Target className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{module.title}</div>
                        <div className="text-xs opacity-75 mt-1">
                          {module.estimatedMinutes} min
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              {overallProgress === 100 && (
                <div className="mt-6 p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg border-2 border-yellow-500">
                  <div className="flex items-center gap-3">
                    <Award className="w-8 h-8 text-yellow-400" />
                    <div>
                      <p className="font-semibold text-yellow-200">Certification Earned!</p>
                      <p className="text-sm text-yellow-300">Admin Pro</p>
                    </div>
                  </div>
                </div>
              )}
            </GlassPanel>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-2">
            <GlassPanel className="p-8">
              {renderStepContent()}
            </GlassPanel>
          </div>
        </div>
      </div>
    </div>
  );
};
