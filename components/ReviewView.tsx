

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Question, ChatMessage } from '../types';
import Button from './Button';
import { generateExplanationForQuestion, getGeminiFollowUpChat } from '../services/geminiService';
import { CheckCircleIcon, XCircleIcon, LightBulbIcon, EditIcon, ChevronLeftIcon, ChevronRightIcon, MenuIcon, XIcon, ElsaAvatarIcon, MinusCircleIcon, SendIcon } from './Icons';
import Sidebar from './Sidebar';
import type { Chat } from '@google/genai';

const simpleMarkdownToHtml = (text: string): string => {
    // Escape HTML to prevent XSS.
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Process block-level elements first (lists)
    const lines = html.split('\n');
    const processedLines: string[] = [];
    let isInsideList = false;

    for (const line of lines) {
        const isListItem = line.match(/^\s*[\*-]\s/);
        if (isListItem) {
            if (!isInsideList) {
                processedLines.push('<ul>');
                isInsideList = true;
            }
            processedLines.push(`<li>${line.replace(/^\s*[\*-]\s/, '')}</li>`);
        } else {
            if (isInsideList) {
                processedLines.push('</ul>');
                isInsideList = false;
            }
            processedLines.push(line);
        }
    }

    if (isInsideList) {
        processedLines.push('</ul>');
    }

    html = processedLines.join('\n');

    // Process inline elements
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Convert remaining newlines to <br>, but be careful around list tags.
    return html.replace(/\n/g, '<br />')
        .replace(/<\/ul><br \/>/g, '</ul>')
        .replace(/<br \/><ul>/g, '<ul>')
        .replace(/<\/li><br \/>/g, '</li>');
};


interface ReviewViewProps {
  initialQuestions: Question[];
  onBack: () => void;
  onApplyUserCorrections?: (correctedQuestions: Question[]) => void;
  isHistoryViewMode?: boolean;
}

const ReviewView: React.FC<ReviewViewProps> = ({ 
  initialQuestions, 
  onBack, 
  onApplyUserCorrections, 
  isHistoryViewMode = false 
}) => {
  const [questions, setQuestions] = useState<Question[]>(() => 
    initialQuestions.map(q => ({...q})) 
  );
  const [loadingExplanationFor, setLoadingExplanationFor] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isCorrectingCurrentQuestion, setIsCorrectingCurrentQuestion] = useState<boolean>(false);
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState(false);
  
  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatSession, setActiveChatSession] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);


  const currentQ = questions[currentQuestionIndex];
  
  const scrollToBottom = useCallback(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(scrollToBottom, [messages]);


  useEffect(() => {
    // Reset chat when question or correction mode changes
    setIsChatOpen(false);
  }, [currentQuestionIndex, isCorrectingCurrentQuestion]);


  const fetchExplanation = useCallback(async (qIndex: number) => {
    const questionToExplain = questions[qIndex];
    if (!questionToExplain) return;
    
    if (loadingExplanationFor === questionToExplain.id) return;
    if (questionToExplain.explanation && !isCorrectingCurrentQuestion) return;


    setLoadingExplanationFor(questionToExplain.id);
    try {
      const explanation = await generateExplanationForQuestion(questionToExplain);
      setQuestions(prevQs => 
        prevQs.map((q, idx) => idx === qIndex ? { ...q, explanation } : q)
      );
    } catch (err: any) {
      console.error("Error fetching explanation:", err);
      let errorMessage = "Could not load explanation.";
      if (err.message && err.message.includes("API rate limits")) {
        errorMessage = "Explanation could not be loaded due to API limits. Please try again later.";
      } else if (err.message) {
        errorMessage = `Could not load explanation: ${err.message}`;
      }
      setQuestions(prevQs => 
        prevQs.map((q, idx) => idx === qIndex ? { ...q, explanation: errorMessage } : q)
      );
    } finally {
      setLoadingExplanationFor(null);
    }
  }, [questions, isCorrectingCurrentQuestion, loadingExplanationFor]);

  const handleCorrectAnswerOverride = (optionIndex: number) => {
    setQuestions(prevQs => 
      prevQs.map((q, idx) => {
        if (idx === currentQuestionIndex) {
          return { ...q, correctAnswerIndex: optionIndex, explanation: undefined, wasCorrectedByUser: true }; 
        }
        return q;
      })
    );
    setIsChatOpen(false); 
  };
  

  const handleNavigate = (index: number) => {
    setCurrentQuestionIndex(index);
    setIsCorrectingCurrentQuestion(false);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      handleNavigate(currentQuestionIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      handleNavigate(currentQuestionIndex - 1);
    }
  };

  const toggleMobilePalette = () => setIsMobilePaletteOpen(!isMobilePaletteOpen);

  const navigateAndClosePalette = (index: number) => {
    handleNavigate(index);
    setIsMobilePaletteOpen(false);
  };

  const handleApplyCorrectionsAndGoToResults = () => {
    if (onApplyUserCorrections) {
      onApplyUserCorrections(questions.map(q => ({...q, wasCorrectedByUser: q.wasCorrectedByUser || false }))); 
    }
  };

  const handleToggleCorrectionMode = () => {
    if (isHistoryViewMode) return;
    const newCorrectionMode = !isCorrectingCurrentQuestion;
    setIsCorrectingCurrentQuestion(newCorrectionMode);
  };
  
  const handleToggleChat = () => {
    if (isCorrectingCurrentQuestion) return;
    
    const newIsChatOpen = !isChatOpen;
    setIsChatOpen(newIsChatOpen);

    if (newIsChatOpen && currentQ) {
      const chat = getGeminiFollowUpChat(currentQ, currentQ.explanation);
      setActiveChatSession(chat);
      const greeting: ChatMessage = {
          id: `elsa-greeting-${Date.now()}`,
          sender: 'gemini',
          text: "Hello. I've reviewed the material. What would you like to clarify?",
      };
      setMessages([greeting]);
      setChatError(null);
      setChatInput('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };
  
  const handleSendMessage = useCallback(async () => {
    if (!chatInput.trim() || !activeChatSession || isChatLoading) return;

    const userMessage: ChatMessage = { id: `user-${Date.now()}`, sender: 'user', text: chatInput.trim() };
    const loadingMessageId = `gemini-loading-${Date.now()}`;
    const geminiLoadingMessage: ChatMessage = { id: loadingMessageId, sender: 'gemini', text: "", isLoading: true };

    setMessages(prev => [...prev, userMessage, geminiLoadingMessage]);
    setChatInput('');
    setIsChatLoading(true);
    setChatError(null);

    try {
      const stream = await activeChatSession.sendMessageStream({ message: userMessage.text });
      let geminiResponseText = "";
      
      for await (const chunk of stream) {
        geminiResponseText += chunk.text;
        setMessages(prev => prev.map(msg => 
            msg.id === loadingMessageId ? { ...msg, text: geminiResponseText, isLoading: true } : msg
        ));
      }
      
      setMessages(prev => prev.map(msg => 
          msg.id === loadingMessageId ? { id: `gemini-${Date.now()}`, sender: 'gemini', text: geminiResponseText, isLoading: false } : msg
      ));

    } catch (err: any) {
      console.error("Chat error:", err);
      const errorMessage = err.message || "Failed to get response from AI.";
      setChatError(errorMessage);
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessageId ? { id: `gemini-err-${Date.now()}`, sender: 'gemini', text: `Error: ${errorMessage}`, error: true, isLoading: false } : msg
      ));
    } finally {
      setIsChatLoading(false);
      inputRef.current?.focus();
    }
  }, [chatInput, activeChatSession, isChatLoading]);


  if (!currentQ) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center bg-secondary">
        <div>
          <p className="text-xl text-muted-foreground">No questions to review.</p>
          <Button onClick={onBack} className="mt-4">Back to Results</Button>
        </div>
      </div>
    );
  }
  
  const isUserCorrectBasedOnCurrentCorrectAnswer = currentQ.userAnswerIndex === currentQ.correctAnswerIndex;
  const isAttempted = typeof currentQ.userAnswerIndex === 'number';
  const canOpenChat = !isCorrectingCurrentQuestion && !isHistoryViewMode;


  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4.5rem)] bg-secondary">
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto bg-card border border-border shadow-xl rounded-lg p-4 sm:p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-foreground">{isHistoryViewMode ? "Test Details" : "Review Answers"}</h2>
            <div className="flex items-center gap-2">
              {!isHistoryViewMode && (
                <Button 
                    onClick={handleToggleCorrectionMode}
                    variant="outline"
                    size="sm"
                    leftIcon={<EditIcon className="w-4 h-4" />}
                    disabled={isChatOpen}
                    title={isChatOpen ? "Close chat to enable correction mode" : (isCorrectingCurrentQuestion ? "Done Correcting" : "Dispute AI / Set Correct")}
                >
                    {isCorrectingCurrentQuestion ? "Done" : "Dispute AI"}
                </Button>
              )}
              <div className="md:hidden">
                <Button onClick={toggleMobilePalette} variant="ghost" size="icon" aria-label="Toggle question palette" title="Toggle question palette">
                  <MenuIcon className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="mb-4 p-4 border border-border rounded-md bg-secondary">
            <h3 className="text-lg font-semibold mb-1 text-foreground">
              Question {currentQuestionIndex + 1} <span className="text-sm font-normal text-muted-foreground">of {questions.length}</span>
            </h3>
            {currentQ.passageText && (
              <div 
                className="rendered-html-table mb-2 text-sm text-secondary-foreground whitespace-pre-wrap leading-relaxed"
                dangerouslySetInnerHTML={{ __html: currentQ.passageText }}
              />
            )}
            <div 
              className="rendered-html-table text-foreground whitespace-pre-wrap leading-relaxed"
              dangerouslySetInnerHTML={{ __html: currentQ.questionText }}
            />
          </div>

          <div className="space-y-3 mb-6">
            {currentQ.options.map((option, index) => {
              let optionStyle = "border-border bg-secondary";
              let icon = null;
              const isThisOptionCorrect = index === currentQ.correctAnswerIndex;
              const isThisOptionUserAnswer = index === currentQ.userAnswerIndex;

              if (isThisOptionCorrect) {
                optionStyle = "border-green-500/50 bg-green-500/10";
                icon = <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />;
              }
              
              if (isAttempted && isThisOptionUserAnswer && !isThisOptionCorrect) {
                optionStyle = "border-red-500/50 bg-red-500/10";
                icon = <XCircleIcon className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />;
              }

              return (
                <label key={index} className={`flex items-start p-3 border rounded-md transition-all duration-150 ease-in-out ${optionStyle} ${isCorrectingCurrentQuestion && !isHistoryViewMode ? 'cursor-pointer hover:bg-accent' : ''}`}>
                  {isCorrectingCurrentQuestion && !isHistoryViewMode && (
                    <input
                      type="radio" name={`correction-${currentQ.id}`} checked={isThisOptionCorrect}
                      onChange={() => handleCorrectAnswerOverride(index)}
                      className="form-radio h-4 w-4 text-primary border-muted-foreground focus:ring-primary focus:ring-offset-card mr-3 mt-1 flex-shrink-0 bg-card"
                    />
                  )}
                  {icon && !isCorrectingCurrentQuestion && <span className="mt-0.5">{icon}</span>}
                  <span className="text-foreground whitespace-pre-wrap flex-grow">{option}</span>
                </label>
              );
            })}
          </div>

          <div className="space-y-4">
            {isAttempted && (
                <div className={`p-3 rounded-md flex items-start space-x-2 ${isUserCorrectBasedOnCurrentCorrectAnswer ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                {isUserCorrectBasedOnCurrentCorrectAnswer ? <CheckCircleIcon className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" /> : <XCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />}
                <div>
                    <p className={`font-semibold ${isUserCorrectBasedOnCurrentCorrectAnswer ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    Your answer was {isUserCorrectBasedOnCurrentCorrectAnswer ? "Correct" : "Incorrect"}.
                    </p>
                    {!isUserCorrectBasedOnCurrentCorrectAnswer && <p className="text-sm text-muted-foreground">Correct answer: <span className="font-medium text-foreground whitespace-pre-wrap">{currentQ.options[currentQ.correctAnswerIndex]}</span></p>}
                </div>
                </div>
            )}
            {!isAttempted && (
                <div className="p-3 rounded-md bg-yellow-500/10 flex items-start space-x-2">
                    <MinusCircleIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-yellow-700 dark:text-yellow-300">You did not attempt this question.</p>
                        <p className="text-sm text-muted-foreground">Correct answer: <span className="font-medium text-foreground whitespace-pre-wrap">{currentQ.options[currentQ.correctAnswerIndex]}</span></p>
                    </div>
                </div>
            )}

            <div className="p-4 border border-border rounded-lg bg-secondary">
              <div className="flex justify-between items-center mb-2">
                  <h4 className="text-md font-semibold text-foreground flex items-center">
                  <LightBulbIcon className="w-5 h-5 mr-2 text-yellow-500" /> Explanation
                  </h4>
                  <Button 
                    onClick={handleToggleChat} 
                    variant="ghost" 
                    size="sm" 
                    leftIcon={<ElsaAvatarIcon className="w-6 h-6 rounded-full"/>} 
                    title={isCorrectingCurrentQuestion ? "Finish correcting to enable chat" : (isChatOpen ? "Close chat" : "Ask Elsa")}
                    disabled={!canOpenChat}
                  >
                      {isChatOpen ? "Close Chat" : "Ask Elsa"}
                  </Button>
              </div>
              {loadingExplanationFor === currentQ.id && <p className="text-muted-foreground italic">Loading explanation...</p>}
              {!loadingExplanationFor && currentQ.explanation && <p className="text-secondary-foreground whitespace-pre-wrap">{currentQ.explanation}</p>}
              {!loadingExplanationFor && !currentQ.explanation && 
                <Button onClick={() => fetchExplanation(currentQuestionIndex)} size="sm" variant="outline" isLoading={loadingExplanationFor === currentQ.id}>
                  {loadingExplanationFor === currentQ.id ? "Loading..." : "Load AI Explanation"}
                </Button>
              }

              {isChatOpen && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex flex-col space-y-4 max-h-72 overflow-y-auto mb-4 pr-2">
                      {messages.map(msg => (
                        <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {msg.sender === 'gemini' && <ElsaAvatarIcon className="w-8 h-8 rounded-full flex-shrink-0" />}
                          <div className={`p-3 rounded-2xl max-w-[85%] text-sm break-words chat-bubble-content ${
                            msg.sender === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' :
                            msg.sender === 'gemini' ? `bg-muted text-muted-foreground rounded-bl-none ${msg.error ? 'border border-destructive' : ''}` :
                            'bg-transparent text-muted-foreground italic text-xs text-center w-full'
                          }`}>
                            {msg.isLoading ? 
                              <div className="flex items-center space-x-2"><svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span className="italic">{msg.text || "Thinking..."}</span></div>
                              : msg.sender === 'gemini' && !msg.error ? (
                                <div dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(msg.text) }} />
                              ) : (
                                msg.text
                              )
                            }
                          </div>
                        </div>
                      ))}
                      <div ref={chatMessagesEndRef} />
                  </div>
                  {chatError && <p className="text-xs text-destructive mb-2 text-center">Error: {chatError}</p>}
                  <div className="flex items-center gap-2 p-1 bg-background rounded-lg border border-input focus-within:ring-2 focus-within:ring-primary">
                      <textarea
                        ref={inputRef}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                        placeholder="Ask a follow-up question..."
                        className="flex-grow py-2 px-4 border-none bg-background text-sm focus:ring-0 resize-none h-10 max-h-24"
                        rows={1}
                        disabled={isChatLoading}
                        aria-label="Chat input for AI"
                      />
                      <Button onClick={handleSendMessage} size="icon" className="rounded-full" isLoading={isChatLoading} disabled={!chatInput.trim() || isChatLoading} title="Send Message">
                        <SendIcon className="w-5 h-5"/>
                      </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-8 mb-4">
            <Button onClick={handlePrevQuestion} disabled={currentQuestionIndex === 0} leftIcon={<ChevronLeftIcon className="w-5 h-5" />} variant="secondary">Prev</Button>
            <Button onClick={handleNextQuestion} disabled={currentQuestionIndex === questions.length - 1} rightIcon={<ChevronRightIcon className="w-5 h-5" />} variant="secondary">Next</Button>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
              {isHistoryViewMode ? (
                <Button onClick={onBack} variant="default" size="lg">Back to History</Button>
              ) : (
                <>
                  <Button onClick={handleApplyCorrectionsAndGoToResults} variant="default" size="lg" className="w-full sm:w-auto">Apply Corrections & View Score</Button>
                  <Button onClick={onBack} variant="outline" size="lg" className="w-full sm:w-auto">Back to Original Results</Button>
                </>
              )}
          </div>
        </div>
      </main>

      <aside className="hidden md:block md:w-72 lg:w-80 border-l border-border md:h-full md:overflow-y-auto bg-card">
         <Sidebar questions={questions} currentQuestionIndex={currentQuestionIndex} onNavigate={handleNavigate} reviewMode={true} />
      </aside>

      {isMobilePaletteOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={toggleMobilePalette} aria-hidden="true"></div>
      )}
      <div 
        className={`fixed top-0 right-0 h-full w-80 bg-card shadow-xl z-40 transform transition-transform duration-300 ease-in-out md:hidden flex flex-col
                    ${isMobilePaletteOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog" aria-modal="true" aria-labelledby="mobile-palette-title"
      >
        <div className="p-4 flex justify-between items-center border-b border-border">
            <h3 id="mobile-palette-title" className="text-lg font-semibold text-foreground">Questions</h3>
            <Button onClick={toggleMobilePalette} variant="ghost" size="icon" aria-label="Close question palette" title="Close question palette">
                <XIcon className="w-5 h-5" />
            </Button>
        </div>
        <div className="flex-grow overflow-y-auto">
            <Sidebar questions={questions} currentQuestionIndex={currentQuestionIndex} onNavigate={navigateAndClosePalette} reviewMode={true} />
        </div>
      </div>
      
    </div>
  );
};

export default ReviewView;
