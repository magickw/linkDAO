import React, { useState } from 'react';
import { Button, GlassPanel } from '@/design-system';
import { Input } from '@/components/ui/input';
import { TextArea } from '@/components/ui/textarea';
import { 
  CheckCircle, 
  User, 
  Shield, 
  BarChart3, 
  Settings, 
  ArrowRight, 
  ArrowLeft,
  Home,
  BookOpen,
  HelpCircle
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  completed: boolean;
}

export const AdminOnboarding: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [profileData, setProfileData] = useState({
    fullName: '',
    role: '',
    department: '',
    bio: ''
  });

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Admin Dashboard',
      description: 'Get started with your administrative journey',
      icon: <Home className="w-6 h-6" />,
      content: (
        <div className="text-center py-8">
          <div className="mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full w-24 h-24 flex items-center justify-center mb-6">
            <User className="w-12 h-12 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Welcome to LinkDAO Admin</h3>
          <p className="text-gray-600 mb-6">
            This guided tour will help you get familiar with the admin dashboard and its powerful features.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-blue-800">
              <strong>Tip:</strong> You can always revisit this onboarding by clicking the help icon in the top navigation.
            </p>
          </div>
        </div>
      ),
      completed: completedSteps['welcome'] || false
    },
    {
      id: 'profile',
      title: 'Set Up Your Profile',
      description: 'Configure your admin profile and preferences',
      icon: <User className="w-6 h-6" />,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Profile Setup</h3>
            <p className="text-gray-600">
              Tell us a bit about yourself to personalize your admin experience.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={profileData.fullName}
              onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
              placeholder="Enter your full name"
            />
            
            <Input
              label="Role"
              value={profileData.role}
              onChange={(e) => setProfileData({...profileData, role: e.target.value})}
              placeholder="e.g., Content Moderator, System Admin"
            />
            
            <Input
              label="Department"
              value={profileData.department}
              onChange={(e) => setProfileData({...profileData, department: e.target.value})}
              placeholder="e.g., Content, Security, Operations"
            />
          </div>
          
          <TextArea
            label="Bio"
            value={profileData.bio}
            onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
            placeholder="Tell us about your experience and interests..."
            rows={3}
          />
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Privacy Note</h4>
            <p className="text-sm text-gray-600">
              Your profile information is only visible to other administrators and will be used to 
              personalize your dashboard experience.
            </p>
          </div>
        </div>
      ),
      completed: completedSteps['profile'] || false
    },
    {
      id: 'security',
      title: 'Security Best Practices',
      description: 'Learn essential security measures for admin accounts',
      icon: <Shield className="w-6 h-6" />,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Security Best Practices</h3>
            <p className="text-gray-600">
              Keep your admin account secure with these essential practices.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div className="ml-3">
                <h4 className="text-lg font-medium text-gray-900">Use Strong Passwords</h4>
                <p className="text-gray-600 mt-1">
                  Create passwords with at least 12 characters including uppercase, lowercase, numbers, and symbols.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div className="ml-3">
                <h4 className="text-lg font-medium text-gray-900">Enable Two-Factor Authentication</h4>
                <p className="text-gray-600 mt-1">
                  Add an extra layer of security by enabling 2FA on your account.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div className="ml-3">
                <h4 className="text-lg font-medium text-gray-900">Regular Session Reviews</h4>
                <p className="text-gray-600 mt-1">
                  Periodically review your active sessions and log out of unfamiliar devices.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div className="ml-3">
                <h4 className="text-lg font-medium text-gray-900">Report Suspicious Activity</h4>
                <p className="text-gray-600 mt-1">
                  Immediately report any unusual activity or security concerns to the security team.
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <HelpCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800">Need Help?</h4>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    For security-related questions, contact the security team at{' '}
                    <a href="mailto:security@linkdao.io" className="font-medium underline">
                      security@linkdao.io
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      completed: completedSteps['security'] || false
    },
    {
      id: 'features',
      title: 'Key Dashboard Features',
      description: 'Explore the main features and capabilities',
      icon: <BarChart3 className="w-6 h-6" />,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Dashboard Features</h3>
            <p className="text-gray-600">
              Discover the powerful tools available in your admin dashboard.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassPanel className="p-5">
              <div className="flex items-center mb-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="ml-3 text-lg font-semibold text-gray-900">Content Moderation</h4>
              </div>
              <p className="text-gray-600 mb-3">
                Review and manage user-generated content with powerful moderation tools.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Real-time content queue</li>
                <li>• Automated moderation suggestions</li>
                <li>• Detailed audit trails</li>
              </ul>
            </GlassPanel>
            
            <GlassPanel className="p-5">
              <div className="flex items-center mb-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <User className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="ml-3 text-lg font-semibold text-gray-900">User Management</h4>
              </div>
              <p className="text-gray-600 mb-3">
                Manage user accounts, permissions, and security settings.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Account suspension and restoration</li>
                <li>• Role-based access control</li>
                <li>• User activity monitoring</li>
              </ul>
            </GlassPanel>
            
            <GlassPanel className="p-5">
              <div className="flex items-center mb-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="ml-3 text-lg font-semibold text-gray-900">Analytics & Reporting</h4>
              </div>
              <p className="text-gray-600 mb-3">
                Gain insights with comprehensive analytics and custom reports.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Real-time dashboard metrics</li>
                <li>• Custom report builder</li>
                <li>• Export capabilities</li>
              </ul>
            </GlassPanel>
            
            <GlassPanel className="p-5">
              <div className="flex items-center mb-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Settings className="w-6 h-6 text-orange-600" />
                </div>
                <h4 className="ml-3 text-lg font-semibold text-gray-900">System Configuration</h4>
              </div>
              <p className="text-gray-600 mb-3">
                Configure platform settings and policies.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Policy management</li>
                <li>• Notification settings</li>
                <li>• Integration configuration</li>
              </ul>
            </GlassPanel>
          </div>
        </div>
      ),
      completed: completedSteps['features'] || false
    },
    {
      id: 'resources',
      title: 'Helpful Resources',
      description: 'Access documentation and support',
      icon: <BookOpen className="w-6 h-6" />,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Helpful Resources</h3>
            <p className="text-gray-600">
              Access documentation, tutorials, and support when you need them.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassPanel className="p-5 text-center">
              <div className="mx-auto bg-blue-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Documentation</h4>
              <p className="text-gray-600 mb-4">
                Comprehensive guides and API documentation.
              </p>
              <Button variant="outline" className="w-full">
                View Docs
              </Button>
            </GlassPanel>
            
            <GlassPanel className="p-5 text-center">
              <div className="mx-auto bg-green-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <HelpCircle className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Support</h4>
              <p className="text-gray-600 mb-4">
                Get help from our support team 24/7.
              </p>
              <Button variant="outline" className="w-full">
                Contact Support
              </Button>
            </GlassPanel>
            
            <GlassPanel className="p-5 text-center">
              <div className="mx-auto bg-purple-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Community</h4>
              <p className="text-gray-600 mb-4">
                Connect with other admins and share knowledge.
              </p>
              <Button variant="outline" className="w-full">
                Join Community
              </Button>
            </GlassPanel>
          </div>
          
          <div className="bg-gray-50 p-5 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Quick Tips</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                <span>Use keyboard shortcuts to navigate faster (Ctrl+K for search)</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                <span>Bookmark frequently used pages for quick access</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                <span>Customize your dashboard layout in Settings</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                <span>Set up notifications for important events</span>
              </li>
            </ul>
          </div>
        </div>
      ),
      completed: completedSteps['resources'] || false
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => ({ ...prev, [steps[currentStep].id]: true }));
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setCompletedSteps(prev => ({ ...prev, [steps[currentStep].id]: true }));
    alert('Onboarding completed! You\'re ready to use the admin dashboard.');
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Onboarding</h1>
          <p className="text-gray-300 mt-2">
            Get started with your administrative dashboard
          </p>
        </div>
        
        <GlassPanel className="p-6 rounded-xl">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
          
          {/* Step navigation */}
          <div className="flex flex-wrap gap-2 mb-8">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  index === currentStep
                    ? 'bg-blue-100 text-blue-800'
                    : completedSteps[step.id]
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">{step.icon}</span>
                {step.title}
                {completedSteps[step.id] && index !== currentStep && (
                  <CheckCircle className="w-4 h-4 ml-2 text-green-500" />
                )}
              </button>
            ))}
          </div>
          
          {/* Step content */}
          <div className="mb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{steps[currentStep].title}</h2>
              <p className="text-gray-600 mt-2">{steps[currentStep].description}</p>
            </div>
            
            {steps[currentStep].content}
          </div>
          
          {/* Navigation buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            {currentStep === steps.length - 1 ? (
              <Button onClick={handleComplete}>
                Complete Onboarding
                <CheckCircle className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};