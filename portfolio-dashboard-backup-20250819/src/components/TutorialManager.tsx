import React, { useState, useEffect } from 'react';
import { getTutorialsByDifficulty, Tutorial } from '../services/educationalContent';
import InteractiveTutorial from './InteractiveTutorial';
import { usePortfolio } from '../contexts/PortfolioContext';

interface TutorialManagerProps {
  autoStart?: boolean;
  userLevel?: 'beginner' | 'intermediate' | 'advanced';
  onComplete?: (tutorialId: string) => void;
}

const TutorialManager: React.FC<TutorialManagerProps> = ({
  autoStart = false,
  userLevel = 'beginner',
  onComplete
}) => {
  const [isOpen, setIsOpen] = useState(autoStart);
  const [activeTutorial, setActiveTutorial] = useState<string | null>(null);
  const [completedTutorials, setCompletedTutorials] = useState<Set<string>>(new Set());
  const [selectedDifficulty, setSelectedDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>(userLevel);
  
  const { state } = usePortfolio();

  const allTutorials = {
    beginner: getTutorialsByDifficulty('beginner'),
    intermediate: getTutorialsByDifficulty('intermediate'),
    advanced: getTutorialsByDifficulty('advanced')
  };

  const currentTutorials = allTutorials[selectedDifficulty];

  useEffect(() => {
    // Load completed tutorials from localStorage
    const saved = localStorage.getItem('portfolio-completed-tutorials');
    if (saved) {
      setCompletedTutorials(new Set(JSON.parse(saved)));
    }
  }, []);

  const handleStartTutorial = (tutorialId: string) => {
    setActiveTutorial(tutorialId);
  };

  const handleCompleteTutorial = (tutorialId: string) => {
    const newCompleted = new Set(completedTutorials);
    newCompleted.add(tutorialId);
    setCompletedTutorials(newCompleted);
    
    // Save to localStorage
    localStorage.setItem('portfolio-completed-tutorials', JSON.stringify([...newCompleted]));
    
    setActiveTutorial(null);
    onComplete?.(tutorialId);
  };

  const handleSkipTutorial = () => {
    setActiveTutorial(null);
  };

  const getProgressForDifficulty = (difficulty: 'beginner' | 'intermediate' | 'advanced') => {
    const tutorials = allTutorials[difficulty];
    const completed = tutorials.filter(t => completedTutorials.has(t.id)).length;
    return { completed, total: tutorials.length };
  };

  const getTutorialIcon = (tutorialId: string) => {
    const icons: Record<string, string> = {
      'first-portfolio': '🎯',
      'risk-return': '⚖️',
      'diversification-simulation': '🌐',
      'rebalancing-strategy': '🔄'
    };
    return icons[tutorialId] || '📚';
  };

  if (activeTutorial) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-screen overflow-y-auto">
          <InteractiveTutorial
            tutorialId={activeTutorial}
            onComplete={() => handleCompleteTutorial(activeTutorial)}
            onSkip={handleSkipTutorial}
          />
        </div>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-40"
        title="Open Learning Center"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Learning Center</h2>
                <p className="text-gray-600">Interactive tutorials to master portfolio optimization</p>
              </div>
            </div>
            
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Overview */}
          <div className="grid grid-cols-3 gap-4">
            {(['beginner', 'intermediate', 'advanced'] as const).map((level) => {
              const progress = getProgressForDifficulty(level);
              const percentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
              
              return (
                <div key={level} className="text-center">
                  <div className="relative w-16 h-16 mx-auto mb-2">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="4"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        fill="none"
                        stroke={level === 'beginner' ? '#10b981' : level === 'intermediate' ? '#f59e0b' : '#8b5cf6'}
                        strokeWidth="4"
                        strokeDasharray={`${percentage * 1.76} 176`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-900">
                        {progress.completed}/{progress.total}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900 capitalize">{level}</div>
                  <div className="text-xs text-gray-500">{percentage.toFixed(0)}% Complete</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Difficulty Selector */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setSelectedDifficulty(level)}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors capitalize ${
                  selectedDifficulty === level
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Tutorial List */}
        <div className="p-6">
          <div className="space-y-4">
            {currentTutorials.map((tutorial) => {
              const isCompleted = completedTutorials.has(tutorial.id);
              const progress = getProgressForDifficulty(selectedDifficulty);
              
              return (
                <div
                  key={tutorial.id}
                  className={`border-2 rounded-lg p-6 transition-all ${
                    isCompleted
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="text-3xl">{getTutorialIcon(tutorial.id)}</div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {tutorial.title}
                          </h3>
                          {isCompleted && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Completed
                            </span>
                          )}
                        </div>
                        
                        <p className="text-gray-600 mb-3">{tutorial.description}</p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {tutorial.estimatedTime} min
                          </div>
                          <div className="flex items-center capitalize">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            {tutorial.difficulty}
                          </div>
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {tutorial.steps.length} steps
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      <button
                        onClick={() => handleStartTutorial(tutorial.id)}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                          isCompleted
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isCompleted ? 'Review' : 'Start'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Learning Path Suggestion */}
          {selectedDifficulty === 'beginner' && getProgressForDifficulty('beginner').completed >= 2 && (
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">Ready for the Next Level?</h3>
                  <p className="text-blue-700">You've mastered the basics! Try intermediate tutorials for advanced strategies.</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDifficulty('intermediate')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Explore Intermediate Tutorials
              </button>
            </div>
          )}

          {/* Gamification Elements */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🏆</span>
                <div>
                  <div className="font-semibold text-yellow-800">Achievement Status</div>
                  <div className="text-sm text-yellow-700">
                    {completedTutorials.size} tutorials completed across all levels
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">⭐</span>
                <div>
                  <div className="font-semibold text-purple-800">Learning Streak</div>
                  <div className="text-sm text-purple-700">
                    {state.showEducationalTooltips ? 'Educational mode active' : 'Enable educational mode to continue learning'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialManager;