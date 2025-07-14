import { useState, useEffect, useCallback } from 'react';
import { AuthWrapper } from './components/AuthWrapper';
import { ProfilePage } from './components/ProfilePage';
import { SettingsPage } from './components/SettingsPage';
import { LeaderboardPage } from './components/LeaderboardPage';
import { useAuth } from './hooks/useAuth';
import { saveTestToSupabase, updateTestInSupabase, getTestHistoryFromSupabase, deleteTestFromSupabase, clearAllTestHistoryFromSupabase } from './services/testHistoryService';
import Header from './components/Header';
import { HomeView } from './components/HomeView';
import { TestSetupForm } from './components/TestSetupForm';
import { TestConfirmationView } from './components/TestConfirmationView';
import TestInterface from './components/TestInterface';
import ResultsView from './components/ResultsView';
import ReviewView from './components/ReviewView';
import { HistoryView } from './components/HistoryView'; 
import { ResumeTestBanner } from './components/ResumeTestBanner';
import { Question, TestInputMethod, TimeSettings, TestPhase, QuestionStatus, LanguageOption, NegativeMarkingSettings, PendingTestConfig, TestHistoryEntry, InProgressTestState, DocumentWithViewTransitions } from './types';
import { generateQuestionsFromContent, extractTextFromInlineData } from './services/geminiService';
import { SUPPORTED_PDF_MIME_TYPE, LOCAL_STORAGE_IN_PROGRESS_KEY } from './constants'; 
import {XCircleIcon } from './components/Icons';
import Button from './components/Button';

// Modern loading screen component
const GeneratingTestView: React.FC<{ testName: string }> = ({ testName }) => {
  const loadingMessages = [
    "Writing the first chapter...",
    "Illustrating the pages...",
    "Crafting challenging questions...",
    "Proofreading the content...",
    "Binding the test volume...",
    "Finalizing the table of contents...",
    "Almost ready to open the book...",
  ];
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    // The animation is 7s long
    const messageInterval = 7000 / loadingMessages.length;
    const intervalId = setInterval(() => {
      setCurrentMessageIndex(prevIndex => (prevIndex + 1) % loadingMessages.length);
    }, messageInterval); 

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="book-loader flex flex-col items-center justify-center text-center p-4">
       <div className="book">
        <div className="book__pg-shadow"></div>
        <div className="book__pg"></div>
        <div className="book__pg book__pg--2"></div>
        <div className="book__pg book__pg--3"></div>
        <div className="book__pg book__pg--4"></div>
        <div className="book__pg book__pg--5"></div>
      </div>
      <h2 className="text-2xl font-bold text-foreground mt-8 mb-2">
        Generating "{testName || 'Your Test'}"
      </h2>
      <p className="text-lg text-muted-foreground min-h-[2.25rem]">
        {loadingMessages[currentMessageIndex]}
      </p>
    </div>
  );
};

export function App() {
  const { user } = useAuth();
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [testPhase, setTestPhase] = useState<TestPhase>(TestPhase.HOME);
  const [currentPage, setCurrentPage] = useState<'app' | 'profile' | 'settings' | 'leaderboard'>('app');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(0);
  const [testDurationSeconds, setTestDurationSeconds] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const [currentTestInputMethod, setCurrentTestInputMethod] = useState<TestInputMethod | null>(null);
  const [currentTestName, setCurrentTestName] = useState<string>("");


  const [currentSetupConfig, setCurrentSetupConfig] = useState<PendingTestConfig | null>(null);
  const [testHistory, setTestHistory] = useState<TestHistoryEntry[]>([]);
  const [currentTestSessionId, setCurrentTestSessionId] = useState<string | null>(null);
  const [isRetakeMode, setIsRetakeMode] = useState<boolean>(false);
  const [savedInProgressTest, setSavedInProgressTest] = useState<InProgressTestState | null>(null);
  const [viewingHistoryEntry, setViewingHistoryEntry] = useState<TestHistoryEntry | null>(null);
  const [isViewingFromHistory, setIsViewingFromHistory] = useState<boolean>(false);


  useEffect(() => {
    // Load test history from Supabase when user is authenticated
    if (user) {
      loadTestHistory();
    }
    
    // Check for in-progress test
    const savedInProgressData = localStorage.getItem(LOCAL_STORAGE_IN_PROGRESS_KEY);
    if (savedInProgressData) {
      try {
        const parsedData = JSON.parse(savedInProgressData) as InProgressTestState;
        if (parsedData.questions && parsedData.currentSetupConfig) {
          setSavedInProgressTest(parsedData);
        } else {
          localStorage.removeItem(LOCAL_STORAGE_IN_PROGRESS_KEY);
        }
      } catch (error) {
        console.error("Failed to parse in-progress test from localStorage:", error);
        localStorage.removeItem(LOCAL_STORAGE_IN_PROGRESS_KEY);
      }
    }
  }, [user]);

  const loadTestHistory = async () => {
    const history = await getTestHistoryFromSupabase();
    setTestHistory(history);
  };

  useEffect(() => {
    if (testPhase === TestPhase.IN_PROGRESS && currentSetupConfig && currentTestSessionId && questions.length > 0) {
      const stateToSave: InProgressTestState = {
        questions,
        currentQuestionIndex,
        timeRemainingSeconds,
        testDurationSeconds,
        currentSetupConfig,
        currentTestSessionId,
        testPhase: TestPhase.IN_PROGRESS,
      };
      localStorage.setItem(LOCAL_STORAGE_IN_PROGRESS_KEY, JSON.stringify(stateToSave));
      setSavedInProgressTest(stateToSave);
    }
  }, [testPhase, questions, currentQuestionIndex, timeRemainingSeconds, testDurationSeconds, currentSetupConfig, currentTestSessionId]);


  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = (event: React.MouseEvent) => {
    const doc = document as DocumentWithViewTransitions;
    if (!doc.startViewTransition) {
      setDarkMode(!darkMode);
      return;
    }
    
    document.documentElement.style.setProperty('--clip-x', event.clientX + 'px');
    document.documentElement.style.setProperty('--clip-y', event.clientY + 'px');
    
    doc.startViewTransition(() => {
      setDarkMode(!darkMode);
    });
  };
  
  const handleNavigateToProfile = () => {
    setCurrentPage('profile');
  };

  const handleNavigateToSettings = () => {
    setCurrentPage('settings');
  };

  const handleNavigateToLeaderboard = () => {
    setCurrentPage('leaderboard');
  };

  const handleBackToApp = () => {
    setCurrentPage('app');
  };

  const clearInProgressTest = useCallback(() => {
    localStorage.removeItem(LOCAL_STORAGE_IN_PROGRESS_KEY);
    setSavedInProgressTest(null);
  }, []);

  const handleNavigateToSetup = (method: TestInputMethod) => {
    setCurrentTestInputMethod(method);
    if (testPhase !== TestPhase.SETUP || currentSetupConfig?.inputMethod !== method || isRetakeMode) {
        setCurrentSetupConfig(null); 
    }
    setIsRetakeMode(false); 
    setTestPhase(TestPhase.SETUP);
    setError(null); 
  };

  const handleStartGenerationProcess = useCallback(async (
    inputMethod: TestInputMethod,
    content: string,
    numQuestionsToRequest: number,
    timeSettings: TimeSettings,
    negativeMarking: NegativeMarkingSettings,
    mimeType?: string,
    originalFileName?: string,
    selectedLanguage?: LanguageOption,
    difficultyLevel?: number,
    customInstructions?: string
  ) => {
    setError(null);
    setIsLoading(true);
    
    let defaultTestName = `Test from ${inputMethod}`;
    if (inputMethod === TestInputMethod.DOCUMENT && originalFileName) {
        defaultTestName = originalFileName.split('.').slice(0, -1).join('.') || originalFileName; 
    } else if (inputMethod === TestInputMethod.SYLLABUS) {
        defaultTestName = "Syllabus-based Test";
    } else if (inputMethod === TestInputMethod.TOPIC) {
        defaultTestName = "Topic-based Test";
    }

    const configForGeneration: PendingTestConfig = {
      inputMethod,
      content,
      numQuestions: numQuestionsToRequest,
      timeSettings,
      negativeMarking,
      mimeType,
      originalFileName,
      selectedLanguage,
      difficultyLevel,
      customInstructions, 
      testName: isRetakeMode && currentSetupConfig ? currentSetupConfig.testName : (currentSetupConfig?.testName || defaultTestName), 
    };
    
    let regenerateQuestions = true;
    if (isRetakeMode && questions.length > 0) { // If it's a retake, we reuse questions
        regenerateQuestions = false;
    } else if (questions.length > 0 && currentSetupConfig && !isRetakeMode) { 
        const prevConf = currentSetupConfig;
        const newConf = configForGeneration;

        if (
            prevConf.inputMethod === newConf.inputMethod &&
            (
                (prevConf.inputMethod === TestInputMethod.DOCUMENT && prevConf.originalFileName === newConf.originalFileName && prevConf.mimeType === newConf.mimeType && prevConf.selectedLanguage === newConf.selectedLanguage && prevConf.content === newConf.content) ||
                (prevConf.inputMethod !== TestInputMethod.DOCUMENT && prevConf.content === newConf.content && prevConf.numQuestions === newConf.numQuestions && prevConf.difficultyLevel === newConf.difficultyLevel && prevConf.selectedLanguage === newConf.selectedLanguage && prevConf.customInstructions === newConf.customInstructions)
            )
        ) {
            // If core content and generation params are the same, no need to regenerate questions
            // Only time/negative marking changes don't require regeneration
            if (prevConf.timeSettings.type === newConf.timeSettings.type &&
                (prevConf.timeSettings.type === 'untimed' || (prevConf.timeSettings.type === 'timed' && newConf.timeSettings.type === 'timed' && prevConf.timeSettings.totalSeconds === newConf.timeSettings.totalSeconds)) &&
                prevConf.negativeMarking.enabled === newConf.negativeMarking.enabled &&
                prevConf.negativeMarking.marksPerQuestion === newConf.negativeMarking.marksPerQuestion
              ) {
               regenerateQuestions = false; 
            }
        }
    }


    setCurrentSetupConfig(configForGeneration); 
    setTestPhase(TestPhase.GENERATING);
    setCurrentTestName(configForGeneration.testName); 

    try {
      if (regenerateQuestions) {
        let processedContent = configForGeneration.content;
        // For document uploads (non-TXT) or PDF syllabus, content is base64 and needs text extraction
        if (configForGeneration.inputMethod === TestInputMethod.DOCUMENT && configForGeneration.mimeType && 
            (configForGeneration.mimeType.startsWith('image/') || configForGeneration.mimeType === SUPPORTED_PDF_MIME_TYPE)) {
              processedContent = await extractTextFromInlineData(configForGeneration.content, configForGeneration.mimeType);
        }
        // For SYLLABUS method, if mimeType is PDF, content would be base64.
        // The extraction for syllabus PDF is now handled directly in TestSetupForm and `content` is already text.
        // So, the above check for DOCUMENT is sufficient for base64 content.

        if (!processedContent.trim() && configForGeneration.inputMethod === TestInputMethod.DOCUMENT) { // Check only if content was supposed to be extracted
          throw new Error(`Could not extract any text from the uploaded ${configForGeneration.mimeType === SUPPORTED_PDF_MIME_TYPE ? 'PDF' : 'image/document'}. Please try a clearer file or a different one.`);
        }
        

        const generatedQuestions = await generateQuestionsFromContent(
          configForGeneration.inputMethod, 
          processedContent, 
          configForGeneration.numQuestions,
          configForGeneration.selectedLanguage,
          configForGeneration.difficultyLevel,
          configForGeneration.customInstructions
        );
        
        if (!generatedQuestions || generatedQuestions.length === 0) {
          throw new Error("No questions were generated. Please check your input, selected language, difficulty, or try different settings.");
        }
        setQuestions(generatedQuestions.map(q => ({ ...q, status: QuestionStatus.UNVISITED, userAnswerIndex: undefined, explanation: undefined, wasCorrectedByUser: false, isMarkedForReview: false })));
      } else { // Reusing questions (e.g., for retake with only time/neg marking change or no change in core params)
        setQuestions(prevQs => prevQs.map(q => ({ ...q, status: QuestionStatus.UNVISITED, userAnswerIndex: undefined, explanation: undefined, wasCorrectedByUser: false, isMarkedForReview: false })));
      }

      setCurrentQuestionIndex(0);
      
      let totalTime: number;
      if (configForGeneration.timeSettings.type === 'untimed') {
        totalTime = Number.POSITIVE_INFINITY;
      } else {
        totalTime = configForGeneration.timeSettings.totalSeconds;
      }
      
      setTestDurationSeconds(totalTime);
      setTimeRemainingSeconds(totalTime);
      
      setTestPhase(TestPhase.CONFIRMATION); 
    } catch (err) {
      console.error("Test Generation Error:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred during test generation.");
      setTestPhase(TestPhase.SETUP); 
    } finally {
      setIsLoading(false);
    }
  }, [questions, currentSetupConfig, isRetakeMode]); 


  const handleStartTestAfterConfirmation = useCallback((updatedTestName: string) => {
    setCurrentTestName(updatedTestName); 
    if (!currentTestSessionId || (questions.some(q => q.wasCorrectedByUser) && testPhase !== TestPhase.REVIEW) || isRetakeMode) { 
        setCurrentTestSessionId(Date.now().toString());
    }
    // Reset wasCorrectedByUser for a fresh test session, especially for retakes
    setQuestions(prevQs => prevQs.map(q => ({ ...q, wasCorrectedByUser: false, isMarkedForReview: false })));
    setTestPhase(TestPhase.IN_PROGRESS);
  }, [currentTestSessionId, questions, testPhase, isRetakeMode]);


  const handleEditSettingsFromConfirmation = () => {
    // isRetakeMode remains true if it was already a retake flow
    setTestPhase(TestPhase.SETUP); 
    setError(null); 
  };

  const saveOrUpdateTestInHistory = useCallback((questionsToScore: Question[], isFromReviewCorrection: boolean) => {
    if (!currentSetupConfig || questionsToScore.length === 0 || !currentTestSessionId || !user) return;

    const attemptedCount = questionsToScore.filter(q => q.status === QuestionStatus.ATTEMPTED).length;
    const correctCount = questionsToScore.filter(q => q.userAnswerIndex === q.correctAnswerIndex && q.status === QuestionStatus.ATTEMPTED).length;
    
    let score = 0;
    if (questionsToScore.length > 0) {
      const rawScore = (correctCount / questionsToScore.length) * 100;
      score = rawScore;
      if (currentSetupConfig.negativeMarking.enabled) {
        const incorrectAttemptedCount = questionsToScore.filter(q => 
          q.userAnswerIndex !== undefined && 
          q.userAnswerIndex !== q.correctAnswerIndex &&
          q.status === QuestionStatus.ATTEMPTED
        ).length;
        const penalty = incorrectAttemptedCount * currentSetupConfig.negativeMarking.marksPerQuestion;
        const marksObtained = correctCount - penalty;
        score = (marksObtained / questionsToScore.length) * 100;
        score = Math.max(0, score);
      }
    }
    
    const finalTestNameForHistory = currentTestName || currentSetupConfig.testName || "Untitled Test";
    const sessionHasUserCorrections = isFromReviewCorrection || questionsToScore.some(q => q.wasCorrectedByUser);

    // Check if this is an update to existing test
    const existingEntry = testHistory.find(entry => entry.id === currentTestSessionId);
    
    if (existingEntry) {
      // Update existing test
      updateTestInSupabase(currentTestSessionId, questionsToScore, sessionHasUserCorrections)
        .then(success => {
          if (success) {
            loadTestHistory(); // Reload from Supabase
          }
        });
    } else {
      // Save new test
      saveTestToSupabase(
        finalTestNameForHistory,
        questionsToScore,
        { ...currentSetupConfig, testName: finalTestNameForHistory },
        currentSetupConfig.negativeMarking
      ).then(testId => {
        if (testId) {
          setCurrentTestSessionId(testId);
          loadTestHistory(); // Reload from Supabase
        }
      });
    }
  }, [currentSetupConfig, currentTestName, currentTestSessionId, testHistory, user, loadTestHistory]);


  const handleSubmitTest = useCallback(() => {
    const finalQuestions = questions.map(q => 
      q.status === QuestionStatus.UNVISITED ? { ...q, status: QuestionStatus.SKIPPED } : q
    );
    setQuestions(finalQuestions); 
    saveOrUpdateTestInHistory(finalQuestions, false); 
    clearInProgressTest();
    setTestPhase(TestPhase.COMPLETED);
  }, [questions, saveOrUpdateTestInHistory, clearInProgressTest]);


  useEffect(() => {
    let timerId: number | undefined; 
    if (testPhase === TestPhase.IN_PROGRESS && timeRemainingSeconds > 0 && timeRemainingSeconds !== Number.POSITIVE_INFINITY) {
      timerId = window.setInterval(() => { 
        setTimeRemainingSeconds(prev => prev - 1);
      }, 1000);
    } else if (testPhase === TestPhase.IN_PROGRESS && timeRemainingSeconds === 0 && testDurationSeconds > 0 && testDurationSeconds !== Number.POSITIVE_INFINITY) {
      handleSubmitTest();
    }
    return () => window.clearInterval(timerId); 
  }, [testPhase, timeRemainingSeconds, testDurationSeconds, handleSubmitTest]);

  const handleAnswerSelect = (questionIdx: number, optionIdx: number) => {
    setQuestions(prevQs =>
      prevQs.map((q, i) =>
        i === questionIdx ? { ...q, userAnswerIndex: optionIdx, status: QuestionStatus.ATTEMPTED } : q
      )
    );
  };

  const handleNavigateQuestion = (index: number) => {
    if (questions[currentQuestionIndex] && questions[currentQuestionIndex].status === QuestionStatus.UNVISITED && currentQuestionIndex !== index) {
       setQuestions(prevQs =>
        prevQs.map((q, i) =>
          i === currentQuestionIndex ? { ...q, status: QuestionStatus.SKIPPED } : q
        )
      );
    }
    setCurrentQuestionIndex(index);
  };
  
  const handleStartNewTest = () => {
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setTimeRemainingSeconds(0);
    setTestDurationSeconds(0);
    setError(null);
    setCurrentTestInputMethod(null); 
    setCurrentSetupConfig(null);
    setCurrentTestName("");
    setCurrentTestSessionId(null);
    setIsRetakeMode(false);
    clearInProgressTest();
    setViewingHistoryEntry(null);
    setIsViewingFromHistory(false);
    setTestPhase(TestPhase.HOME); 
  };

  const handleNavigateHome = () => {
    setTestPhase(TestPhase.HOME);
  };

  const handleResumeTest = () => {
    if (savedInProgressTest) {
      setQuestions(savedInProgressTest.questions);
      setCurrentQuestionIndex(savedInProgressTest.currentQuestionIndex);
      setTimeRemainingSeconds(savedInProgressTest.timeRemainingSeconds);
      setTestDurationSeconds(savedInProgressTest.testDurationSeconds);
      setCurrentSetupConfig(savedInProgressTest.currentSetupConfig);
      setCurrentTestSessionId(savedInProgressTest.currentTestSessionId);
      setCurrentTestName(savedInProgressTest.currentSetupConfig.testName);
      setIsRetakeMode(false);
      setTestPhase(TestPhase.IN_PROGRESS);
    }
  };

  const handleCancelInProgressTest = () => {
    if (window.confirm("Are you sure you want to cancel this test? All progress will be lost.")) {
      clearInProgressTest();
    }
  };

  const handleReviewAnswers = () => {
    setQuestions(prevQs => prevQs.map(q => ({...q, wasCorrectedByUser: q.wasCorrectedByUser || false})));
    setTestPhase(TestPhase.REVIEW);
  };
  
  const handleBackToResults = () => {
    setTestPhase(TestPhase.COMPLETED);
  };

  const handleNavigateToHistory = () => {
    setError(null);
    setIsRetakeMode(false);
    setTestPhase(TestPhase.HISTORY);
  };

  const handleRetakeTestFromHistory = (entry: TestHistoryEntry) => {
    // Calculate new name for the retake
    const baseName = entry.testName.split(' - Retake ')[0];
    const retakeCount = testHistory.filter(h => 
        h.originalConfig.testName.split(' - Retake ')[0] === baseName && h.id !== entry.id
    ).length + 1;
    const newTestName = `${baseName} - Retake ${retakeCount}`;

    // Use original config but with the new name
    const configForRetake = { ...entry.originalConfig, testName: newTestName };

    setCurrentTestInputMethod(entry.originalConfig.inputMethod);
    setCurrentSetupConfig(configForRetake);
    setQuestions(entry.questions); // Pre-load questions for the retake

    setCurrentTestSessionId(Date.now().toString());
    setIsRetakeMode(true);
    setTestPhase(TestPhase.SETUP);
    setError(null);
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear all test history? This action cannot be undone.")) {
      clearAllTestHistoryFromSupabase().then(success => {
        if (success) {
          setTestHistory([]);
        }
      });
    }
  };
  
  const handleDeleteHistoryEntry = (idToDelete: string) => {
    if (window.confirm("Are you sure you want to delete this test from your history? This action cannot be undone.")) {
      deleteTestFromSupabase(idToDelete).then(success => {
        if (success) {
          loadTestHistory();
        }
      });
    }
  };

  const handleViewHistoryDetails = (entry: TestHistoryEntry) => {
    setViewingHistoryEntry(entry);
    setTestPhase(TestPhase.VIEW_HISTORY_DETAILS);
  };
  
  const handleViewScoreFromHistory = (entry: TestHistoryEntry) => {
    setQuestions(entry.questions);
    setCurrentSetupConfig(entry.originalConfig);
    setCurrentTestName(entry.testName);
    setCurrentTestSessionId(entry.id);
    setIsViewingFromHistory(true);
    setTestPhase(TestPhase.COMPLETED);
  };

  const handleApplyUserCorrections = (correctedQuestions: Question[]) => {
    setQuestions(correctedQuestions); 
    saveOrUpdateTestInHistory(correctedQuestions, true); 
    clearInProgressTest();
    setTestPhase(TestPhase.COMPLETED); 
  };

  const handleMarkForReview = (questionIndex: number) => {
    setQuestions(prevQs =>
      prevQs.map((q, i) =>
        i === questionIndex ? { ...q, isMarkedForReview: !q.isMarkedForReview } : q
      )
    );
  };

  const handleClearSelection = (questionIndex: number) => {
    setQuestions(prevQs =>
      prevQs.map((q, i) =>
        i === questionIndex 
          ? { 
              ...q, 
              userAnswerIndex: undefined, 
              // If it was attempted, mark as skipped. If unvisited, it stays unvisited.
              status: q.status === QuestionStatus.ATTEMPTED ? QuestionStatus.SKIPPED : q.status 
            } 
          : q
      )
    );
  };

  const renderContent = () => {
    if (!process.env.API_KEY) {
      return (
        <div className="flex flex-col items-center justify-center h-screen text-center p-4">
            <div className="bg-card border border-destructive/50 p-8 rounded-lg shadow-lg max-w-md w-full">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-destructive/20 mb-4">
                    <XCircleIcon className="h-6 w-6 text-destructive" aria-hidden="true" />
                </div>
                <h2 className="text-2xl font-semibold text-destructive mb-2">API Key Not Configured</h2>
                <p className="text-muted-foreground">
                    The Gemini API key is not set up. Please ensure the <code>API_KEY</code> environment variable is correctly configured for the application to function.
                </p>
            </div>
        </div>
      );
    }

    switch (testPhase) {
      case TestPhase.HOME:
        return <HomeView onNavigateToSetup={handleNavigateToSetup} />;
      case TestPhase.SETUP:
        if (!currentTestInputMethod && !isRetakeMode) { 
             setError("No input method selected. Please go back to home.");
             return <div className="container mx-auto py-8 px-4"><p>{error}</p> <Button onClick={handleStartNewTest}>Go Home</Button></div>;
        }
        // For retake mode, currentTestInputMethod might be derived from currentSetupConfig
        const inputMethodForForm = isRetakeMode && currentSetupConfig ? currentSetupConfig.inputMethod : currentTestInputMethod;
        if (!inputMethodForForm) {
             setError("Configuration error for retake. Please start a new test.");
             return <div className="container mx-auto py-8 px-4"><p>{error}</p> <Button onClick={handleStartNewTest}>Go Home</Button></div>;
        }
        return (
          <div className="container mx-auto py-8 px-4">
            {error && !isLoading && <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md">{error}</div>}
            <TestSetupForm 
              onStartGenerationProcess={handleStartGenerationProcess} 
              isLoading={isLoading} 
              initialInputMethod={inputMethodForForm}
              isRetakeMode={isRetakeMode}
              key={inputMethodForForm + (currentSetupConfig ? `_config_${currentSetupConfig.testName}_${currentSetupConfig.originalFileName || 'nofile'}_${currentSetupConfig.difficultyLevel || 'nodiff'}_${currentSetupConfig.customInstructions || 'noinstr'}` : '_new_setup') + (isRetakeMode ? '_retake' : '')}
              initialConfig={currentSetupConfig} 
              onBackToHome={() => {
                setError(null);
                setCurrentSetupConfig(null); 
                setQuestions([]); 
                setIsRetakeMode(false);
                setTestPhase(TestPhase.HOME);
              }}
            />
          </div>
        );
      case TestPhase.CONFIRMATION:
        if (!currentSetupConfig || questions.length === 0) { 
            setError("No test configuration or generated questions found to confirm. Please start over.");
            setTestPhase(TestPhase.SETUP); 
            return <div className="container mx-auto py-8 px-4"><p>{error || "Confirmation error."}</p><Button onClick={handleStartNewTest}>Go Home</Button></div>;
        }
        return (
            <div className="container mx-auto py-8 px-4">
                 {error && !isLoading && <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md">{error}</div>}
                <TestConfirmationView
                    initialTestName={currentTestName}
                    actualNumQuestions={questions.length}
                    timeSettings={currentSetupConfig.timeSettings}
                    negativeMarking={currentSetupConfig.negativeMarking}
                    inputMethod={currentSetupConfig.inputMethod}
                    originalFileName={currentSetupConfig.originalFileName}
                    selectedLanguage={currentSetupConfig.selectedLanguage}
                    difficultyLevel={currentSetupConfig.difficultyLevel}
                    customInstructions={currentSetupConfig.customInstructions} 
                    onStartTest={handleStartTestAfterConfirmation}
                    onEditSettings={handleEditSettingsFromConfirmation}
                    isLoading={isLoading} 
                    isRetakeMode={isRetakeMode}
                />
            </div>
        );
      case TestPhase.GENERATING:
        return <GeneratingTestView testName={currentTestName} />;
      case TestPhase.IN_PROGRESS:
        return (
          <TestInterface
            questions={questions}
            currentQuestionIndex={currentQuestionIndex}
            timeRemainingSeconds={timeRemainingSeconds}
            onAnswerSelect={handleAnswerSelect}
            onNavigateQuestion={handleNavigateQuestion}
            onSubmitTest={handleSubmitTest}
            onMarkForReview={handleMarkForReview}
            onClearSelection={handleClearSelection}
          />
        );
      case TestPhase.COMPLETED:
        return <ResultsView 
                  questions={questions} 
                  negativeMarkingSettings={currentSetupConfig?.negativeMarking || null} 
                  onStartNewTest={handleStartNewTest} 
                  onReviewAnswers={handleReviewAnswers}
                  inputMethod={currentSetupConfig?.inputMethod || null}
                  isHistoryViewMode={isViewingFromHistory}
                  onBackToHistory={() => {
                    setIsViewingFromHistory(false);
                    setTestPhase(TestPhase.HISTORY);
                  }}
                />;
      case TestPhase.REVIEW:
        return <ReviewView 
                  initialQuestions={questions} 
                  onBack={handleBackToResults}
                  onApplyUserCorrections={handleApplyUserCorrections} 
                />;
      case TestPhase.HISTORY:
        return <HistoryView 
                  history={testHistory} 
                  onRetakeTest={handleRetakeTestFromHistory} 
                  onViewDetails={handleViewHistoryDetails}
                  onViewScore={handleViewScoreFromHistory}
                  onDeleteEntry={handleDeleteHistoryEntry}
                  onClearHistory={handleClearHistory}
                  onBackToHome={handleStartNewTest} 
                />;
      case TestPhase.VIEW_HISTORY_DETAILS:
        if (!viewingHistoryEntry) {
            setError("Could not find the test history details to display.");
            setTestPhase(TestPhase.HISTORY);
            return null;
        }
        return <ReviewView
            initialQuestions={viewingHistoryEntry.questions}
            onBack={() => setTestPhase(TestPhase.HISTORY)}
            isHistoryViewMode={true}
        />;
      default:
        return <div>Unknown test phase. <Button onClick={handleStartNewTest}>Go Home</Button></div>;
    }
  };

  // Handle page navigation
  if (currentPage === 'profile') {
    return (
      <AuthWrapper>
        <ProfilePage 
          onNavigateHome={handleBackToApp}
          onNavigateToHistory={() => {
            setCurrentPage('app');
            setTestPhase(TestPhase.HISTORY);
          }}
          onNavigateToSettings={handleNavigateToSettings}
        />
      </AuthWrapper>
    );
  }

  if (currentPage === 'settings') {
    return (
      <AuthWrapper>
        <SettingsPage 
          onNavigateHome={handleBackToApp}
          onNavigateToProfile={handleNavigateToProfile}
          onNavigateToHistory={() => {
            setCurrentPage('app');
            setTestPhase(TestPhase.HISTORY);
          }}
          darkMode={darkMode}
          toggleDarkMode={() => toggleDarkMode({} as React.MouseEvent)}
        />
      </AuthWrapper>
    );
  }

  if (currentPage === 'leaderboard') {
    return (
      <AuthWrapper>
        <LeaderboardPage onNavigateHome={handleBackToApp} />
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <div className="min-h-screen flex flex-col bg-background">
        <div className="sticky top-0 z-50">
          <Header 
            darkMode={darkMode} 
            toggleDarkMode={toggleDarkMode} 
            onNavigateToHistory={handleNavigateToHistory} 
            onNavigateHome={handleNavigateHome}
            onNavigateToLeaderboard={handleNavigateToLeaderboard}
            onNavigateToProfile={handleNavigateToProfile}
          />
          {savedInProgressTest && testPhase !== TestPhase.IN_PROGRESS && (
            <ResumeTestBanner 
              onResume={handleResumeTest}
              onCancel={handleCancelInProgressTest}
              testName={savedInProgressTest.currentSetupConfig.testName}
            />
          )}
        </div>
        <div className={`flex-grow overflow-auto ${testPhase === TestPhase.GENERATING ? 'flex items-center justify-center' : ''}`}>
          {renderContent()}
        </div>
      </div>
    </AuthWrapper>
  );
}