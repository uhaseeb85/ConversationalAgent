import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { Question, Response, OnboardingFlow, Submission } from '@/types'
import { generateId } from '@/lib/utils'
import { generateSQL } from '@/lib/sql-generator'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { CheckCircle2, Bot, User, Copy, ArrowLeft, RotateCcw } from 'lucide-react'
import { streamChatCompletion, loadAIConfig, AIConfig } from '@/lib/ai-client'


export function OnboardPage() {
  const { flowId } = useParams<{ flowId: string }>()
  const navigate = useNavigate()
  const flows = useStore((state) => state.flows)
  const addSubmission = useStore((state) => state.addSubmission)

  const [flow, setFlow] = useState<OnboardingFlow | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [responses, setResponses] = useState<Response[]>([])
  const [currentValue, setCurrentValue] = useState<string | string[]>('')
  const [chatMessages, setChatMessages] = useState<Array<{ type: 'bot' | 'user'; content: string; questionId?: string }>>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [generatedSQL, setGeneratedSQL] = useState<string>('')
  const [completedSubmission, setCompletedSubmission] = useState<Submission | null>(null)
  const [copiedSQL, setCopiedSQL] = useState(false)
  const [startedAt] = useState(new Date())
  const [aiConfig] = useState<AIConfig>(() => loadAIConfig())

  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const foundFlow = flows.find((f) => f.id === flowId)
    if (!foundFlow) {
      navigate('/')
      return
    }
    setFlow(foundFlow)

    // Initial welcome message
    setTimeout(() => {
      const welcomeText = foundFlow.welcomeMessage || 
        `Welcome! I'll help you get onboarded. Let's get started with a few questions.`
      setChatMessages([
        {
          type: 'bot',
          content: welcomeText,
        },
      ])
      setTimeout(() => showNextQuestion(foundFlow, 0, []), 1000)
    }, 500)
  }, [flowId, flows, navigate])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, isTyping])

  useEffect(() => {
    if (!isComplete && !isTyping) {
      inputRef.current?.focus()
    }
  }, [currentQuestionIndex, isTyping, isComplete])

  // Initialize currentValue based on question type when question changes
  useEffect(() => {
    if (!flow) return
    const q = flow.questions[currentQuestionIndex]
    if (!q) return
    setCurrentValue(q.type === 'multi-select' ? [] : '')
  }, [currentQuestionIndex, flow])

  const shouldShowQuestion = (question: Question, existingResponses: Response[]): boolean => {
    if (!question.conditionalLogic) return true

    const { questionId, operator, value } = question.conditionalLogic
    const response = existingResponses.find((r) => r.questionId === questionId)

    if (!response) return false

    const responseValue = String(response.value).toLowerCase()
    const conditionValue = String(value).toLowerCase()

    switch (operator) {
      case 'equals':
        return responseValue === conditionValue
      case 'not-equals':
        return responseValue !== conditionValue
      case 'contains':
        return responseValue.includes(conditionValue)
      default:
        return true
    }
  }

  const getNextQuestion = (flowData: OnboardingFlow, currentIdx: number, existingResponses: Response[]): Question | null => {
    for (let i = currentIdx; i < flowData.questions.length; i++) {
      const question = flowData.questions[i]
      if (shouldShowQuestion(question, existingResponses)) {
        return question
      }
    }
    return null
  }

  const showNextQuestion = (flowData: OnboardingFlow, startIdx: number, existingResponses: Response[]) => {
    const nextQuestion = getNextQuestion(flowData, startIdx, existingResponses)

    if (!nextQuestion) {
      // All questions answered
      completeOnboarding(existingResponses)
      return
    }

    const qIndex = flowData.questions.indexOf(nextQuestion)

    if (aiConfig.enabled) {
      setIsTyping(true)

      const systemPrompt = `You are a friendly onboarding assistant for "${flowData.name}". 
Rephrase and ask this question conversationally in 1-2 sentences: "${nextQuestion.label}"${
  nextQuestion.helpText ? `\nHint: ${nextQuestion.helpText}` : ''
}
Be warm and concise. Do not add unrelated commentary.`

      // Seed an empty bot message that we will stream into
      setChatMessages((prev) => [
        ...prev,
        { type: 'bot' as const, content: '', questionId: nextQuestion.id },
      ])

      streamChatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Ask the question now.' },
        ],
        (chunk) => {
          setChatMessages((prev) => {
            // Find the last bot message (the one we just seeded)
            let lastBotIdx = -1
            for (let i = prev.length - 1; i >= 0; i--) {
              if (prev[i].type === 'bot') { lastBotIdx = i; break }
            }
            if (lastBotIdx < 0) return prev
            const updated = [...prev]
            updated[lastBotIdx] = { ...updated[lastBotIdx], content: updated[lastBotIdx].content + chunk }
            return updated
          })
        },
        aiConfig
      ).finally(() => {
        setIsTyping(false)
        setCurrentQuestionIndex(qIndex)
      })
    } else {
      setIsTyping(true)
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          { type: 'bot', content: nextQuestion.label, questionId: nextQuestion.id },
        ])
        setIsTyping(false)
        setCurrentQuestionIndex(qIndex)
      }, 800)
    }
  }

  const handleSubmitAnswer = (overrideValue?: string | string[]) => {
    if (!flow) return

    const currentQuestion = flow.questions[currentQuestionIndex]
    if (!currentQuestion) return

    const valueToSubmit = overrideValue !== undefined ? overrideValue : currentValue

    // Validation
    const isEmpty = Array.isArray(valueToSubmit) ? valueToSubmit.length === 0 : !valueToSubmit
    if (currentQuestion.required && isEmpty) {
      alert('This question is required')
      return
    }

    // Add user response to chat
    const displayValue = Array.isArray(valueToSubmit)
      ? valueToSubmit.join(', ')
      : valueToSubmit

    setChatMessages((prev) => [
      ...prev,
      { type: 'user', content: displayValue || '(skipped)' },
    ])

    // Save response
    const newResponse: Response = {
      questionId: currentQuestion.id,
      value: valueToSubmit || null,
    }

    const updatedResponses = [...responses, newResponse]
    setResponses(updatedResponses)

    // Show next question
    setTimeout(() => {
      showNextQuestion(flow, currentQuestionIndex + 1, updatedResponses)
    }, 300)
  }

  const completeOnboarding = async (finalResponses: Response[]) => {
    if (!flow) return

    setIsComplete(true)
    setIsTyping(true)

    setTimeout(async () => {
      const completionText = flow.completionMessage || 
        'Thank you! Your information has been collected successfully.'
      setChatMessages((prev) => [
        ...prev,
        {
          type: 'bot',
          content: completionText,
        },
      ])
      setIsTyping(false)

      // Save submission
      const submission: Submission = {
        id: generateId(),
        flowId: flow.id,
        flowName: flow.name,
        responses: finalResponses,
        startedAt,
        completedAt: new Date(),
        status: 'pending' as const,
      }

      // Generate SQL
      const sql = generateSQL(submission, flow)
      setGeneratedSQL(sql)
      setCompletedSubmission(submission)

      await addSubmission(submission)
    }, 800)
  }

  const renderInput = (question: Question) => {
    switch (question.type) {
      case 'email':
      case 'phone':
      case 'text':
        return (
          <Input
            ref={inputRef}
            type={question.type === 'email' ? 'email' : question.type === 'phone' ? 'tel' : 'text'}
            value={currentValue as string}
            onChange={(e) => setCurrentValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmitAnswer()}
            placeholder={question.placeholder || 'Type your answer...'}
            className="flex-1"
          />
        )

      case 'number':
        return (
          <Input
            ref={inputRef}
            type="number"
            value={currentValue as string}
            onChange={(e) => setCurrentValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmitAnswer()}
            placeholder={question.placeholder || 'Enter a number...'}
            className="flex-1"
          />
        )

      case 'date':
        return (
          <Input
            ref={inputRef}
            type="date"
            value={currentValue as string}
            onChange={(e) => setCurrentValue(e.target.value)}
            className="flex-1"
          />
        )

      case 'single-select':
        return (
          <Select
            value={currentValue as string}
            onChange={(e) => setCurrentValue(e.target.value)}
            className="flex-1"
          >
            <option value="">Select an option...</option>
            {question.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        )

      case 'multi-select':
        return (
          <div className="flex-1 space-y-2">
            {question.options?.map((option) => (
              <label key={option} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(currentValue as string[]).includes(option)}
                  onChange={(e) => {
                    const values = currentValue as string[]
                    if (e.target.checked) {
                      setCurrentValue([...values, option])
                    } else {
                      setCurrentValue(values.filter((v) => v !== option))
                    }
                  }}
                  className="rounded border-gray-300"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        )

      case 'yes-no':
        return (
          <div className="flex space-x-2">
            <Button
              variant={currentValue === 'yes' ? 'default' : 'outline'}
              onClick={() => handleSubmitAnswer('yes')}
              className="flex-1"
            >
              Yes
            </Button>
            <Button
              variant={currentValue === 'no' ? 'default' : 'outline'}
              onClick={() => handleSubmitAnswer('no')}
              className="flex-1"
            >
              No
            </Button>
          </div>
        )

      default:
        return null
    }
  }

  if (!flow) {
    return <div>Loading...</div>
  }

  const currentQuestion = flow.questions[currentQuestionIndex]

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="bg-card rounded-xl shadow-lg overflow-hidden border border-border">
        <div className="border-b bg-card p-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="text-center flex-1">
            <h1 className="text-xl font-semibold">{flow.name}</h1>
            {!isComplete && currentQuestion && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Question {responses.length + 1} of {flow.questions.length}
              </p>
            )}
            {isComplete && (
              <p className="text-xs text-muted-foreground mt-0.5">Complete</p>
            )}
          </div>
          <div className="w-16"></div>
        </div>

        {/* Progress bar */}
        {!isComplete && (
          <div className="h-1 bg-muted">
            <div
              className="h-1 bg-primary transition-all duration-500"
              style={{ width: `${Math.round((responses.length / flow.questions.length) * 100)}%` }}
            />
          </div>
        )}

        <div className="h-[500px] overflow-y-auto p-6 space-y-4 bg-muted/30">
          <AnimatePresence>
            {chatMessages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {message.content}
                </div>
                {message.type === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-muted rounded-2xl px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>

        {!isComplete && currentQuestion && !isTyping && (
          <div className="border-t p-4 bg-card">
            <div className="flex items-center gap-3">
              {responses.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Remove last response
                    const prevResponses = responses.slice(0, -1)
                    const lastResponse = responses[responses.length - 1]
                    setResponses(prevResponses)

                    // Find the question index for the previous response
                    const prevQIdx = flow.questions.findIndex((q) => q.id === lastResponse.questionId)
                    if (prevQIdx >= 0) {
                      // Remove last user+bot messages from chat
                      setChatMessages((prev) => {
                        const msgs = [...prev]
                        // Remove from the end: last user message and the bot message before it
                        let removed = 0
                        for (let i = msgs.length - 1; i >= 0 && removed < 2; i--) {
                          if (msgs[i].type === 'user' || (msgs[i].type === 'bot' && msgs[i].questionId === lastResponse.questionId)) {
                            msgs.splice(i, 1)
                            removed++
                          }
                        }
                        return msgs
                      })
                      setCurrentQuestionIndex(prevQIdx)
                      const prevValue = lastResponse.value
                      if (Array.isArray(prevValue)) {
                        setCurrentValue(prevValue)
                      } else {
                        setCurrentValue(prevValue != null ? String(prevValue) : '')
                      }
                    }
                  }}
                  title="Go back to previous question"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
              <div className="flex-1">{renderInput(currentQuestion)}</div>
              {currentQuestion.type !== 'yes-no' && (
                <Button onClick={() => handleSubmitAnswer()} size="lg" className="px-8">
                  Advance
                </Button>
              )}
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            {!currentQuestion.required && (
              <button
                onClick={() => {
                  handleSubmitAnswer('')
                }}
                className="text-sm text-muted-foreground hover:text-foreground mt-2"
              >
                Skip this question
              </button>
            )}
          </div>
        )}

        {isComplete && generatedSQL && completedSubmission && (
          <div className="border-t p-6 space-y-6">
            <div className="flex items-center justify-center space-x-2 text-green-600 mb-4">
              <CheckCircle2 className="h-6 w-6" />
              <span className="font-semibold text-lg">Onboarding Complete</span>
            </div>

            {/* Generated SQL */}
            <div className="bg-slate-900 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-medium text-sm">Generated SQL</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedSQL)
                    setCopiedSQL(true)
                    setTimeout(() => setCopiedSQL(false), 2000)
                  }}
                  className="text-white hover:bg-slate-800"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  {copiedSQL ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <pre className="text-sm text-green-400 font-mono overflow-x-auto">
                <code>{generatedSQL}</code>
              </pre>
            </div>

            {/* Collected Information */}
            <div className="bg-muted rounded-lg p-4">
              <h3 className="font-medium text-sm mb-3">Collected Information</h3>
              <div className="space-y-2">
                {completedSubmission.responses.map((response) => {
                  const question = flow.questions.find((q) => q.id === response.questionId)
                  if (!question) return null
                  return (
                    <div key={response.questionId} className="grid grid-cols-2 text-sm">
                      <div className="text-muted-foreground">{question.label}</div>
                      <div className="font-medium">
                        {Array.isArray(response.value)
                          ? response.value.join(', ')
                          : String(response.value || '—')}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
              <Button onClick={() => navigate('/submissions')} className="flex-1">
                View All Submissions
              </Button>
            </div>
          </div>
        )}

        {isComplete && !generatedSQL && (
          <div className="border-t p-6 bg-green-50 flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
            <span className="text-green-700 font-medium">Generating SQL...</span>
          </div>
        )}
      </div>
    </div>
  )
}
