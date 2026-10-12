import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Shield, Key, CreditCard, FileText, Users, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Button } from '../components/ui';

const steps = [
  {
    title: 'Welcome to Digital Vault',
    description: 'Your secure digital life management platform.',
    icon: Lock,
  },
  {
    title: 'Organize Everything',
    description: 'Your digital life is scattered across dozens of services. Digital Vault helps you organize it all in one secure place — passwords, accounts, subscriptions, and documents.',
    icon: Key,
  },
  {
    title: 'Your Security, Our Priority',
    description: 'All sensitive data is encrypted on your device using AES-256-GCM before storage. Your master password never leaves your browser. We use a zero-knowledge architecture — even we cannot access your data.',
    icon: Shield,
  },
  {
    title: 'What would you like to manage?',
    description: 'Select what matters most to you. You can always manage everything later.',
    icon: Users,
    isSelection: true,
  },
];

const options = [
  { id: 'passwords', label: 'Passwords & Credentials', icon: Key, desc: 'Store and manage login credentials' },
  { id: 'accounts', label: 'Online Accounts', icon: Users, desc: 'Track where you have accounts' },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard, desc: 'Manage paid services and renewals' },
  { id: 'documents', label: 'Documents', icon: FileText, desc: 'Store important files securely' },
  { id: 'everything', label: 'Everything', icon: Shield, desc: 'Full digital life management' },
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selected, setSelected] = useState<string[]>(['everything']);
  const { completeOnboarding } = useAuth();
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
      navigate('/dashboard');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleSkip = () => {
    completeOnboarding();
    navigate('/dashboard');
  };

  const toggleOption = (id: string) => {
    if (id === 'everything') {
      setSelected(['everything']);
    } else {
      setSelected(prev => {
        const filtered = prev.filter(p => p !== 'everything');
        if (filtered.includes(id)) return filtered.filter(f => f !== id);
        return [...filtered, id];
      });
    }
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= currentStep ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
          ))}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/20">
              <Icon size={32} className="text-blue-500" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{step.title}</h1>
            <p className="mt-3 text-gray-500 dark:text-gray-400 leading-relaxed">{step.description}</p>
          </div>

          {/* Selection Options */}
          {step.isSelection && (
            <div className="space-y-2 mb-6">
              {options.map(opt => {
                const OptIcon = opt.icon;
                const isSelected = selected.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleOption(opt.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      <OptIcon size={18} className={isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{opt.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</p>
                    </div>
                    {isSelected && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div>
              {currentStep > 0 && (
                <Button variant="ghost" onClick={handleBack}>
                  <ArrowLeft size={16} /> Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleSkip} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                Skip
              </button>
              <Button onClick={handleNext}>
                {currentStep === steps.length - 1 ? (
                  <span className="flex items-center gap-2">Get Started <ArrowRight size={16} /></span>
                ) : (
                  <span className="flex items-center gap-2">Continue <ArrowRight size={16} /></span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
