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
import { CheckCircle2, Bot, User, Copy, ArrowLeft } from 'lucide-react'


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

    setIsTyping(true)
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        { type: 'bot', content: nextQuestion.label, questionId: nextQuestion.id },
      ])
      setIsTyping(false)
      setCurrentQuestionIndex(flowData.questions.indexOf(nextQuestion))
    }, 800)
  }

  const handleSubmitAnswer = () => {
    if (!flow) return

    const currentQuestion = flow.questions[currentQuestionIndex]
    if (!currentQuestion) return

    // Validation
    if (currentQuestion.required && !currentValue) {
      alert('This question is required')
      return
    }

    // Add user response to chat
    const displayValue = Array.isArray(currentValue)
      ? currentValue.join(', ')
      : currentValue

    setChatMessages((prev) => [
      ...prev,
      { type: 'user', content: displayValue || '(skipped)' },
    ])

    // Save response
    const newResponse: Response = {
      questionId: currentQuestion.id,
      value: currentValue || null,
    }

    const updatedResponses = [...responses, newResponse]
    setResponses(updatedResponses)
    setCurrentValue('')

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
              onClick={() => setCurrentValue('yes')}
              className="flex-1"
            >
              Yes
            </Button>
            <Button
              variant={currentValue === 'no' ? 'default' : 'outline'}
              onClick={() => setCurrentValue('no')}
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
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        <div className="border-b bg-white p-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="text-center flex-1">
            <h1 className="text-xl font-semibold">{flow.name}</h1>
            {!isComplete && (
              <p className="text-xs text-muted-foreground mt-0.5">Complete</p>
            )}
          </div>
          <div className="w-16"></div>
        </div>

        <div className="h-[500px] overflow-y-auto p-6 space-y-4 bg-gray-50">
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
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-900'
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
          <div className="border-t p-4 bg-white">
            <div className="flex items-center gap-3">
              <div className="flex-1">{renderInput(currentQuestion)}</div>
              {currentQuestion.type !== 'yes-no' && currentQuestion.type !== 'multi-select' && (
                <Button onClick={handleSubmitAnswer} size="lg" className="px-8">
                  Advance
                </Button>
              )}
              {currentQuestion.type === 'multi-select' && (
                <Button onClick={handleSubmitAnswer} size="lg" className="px-8">
                  Advance
                </Button>
              )}
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                <User className="h-5  w-5 text-gray-600" />
              </div>
            </div>
            {!currentQuestion.required && (
              <button
                onClick={() => {
                  setCurrentValue('')
                  handleSubmitAnswer()
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
            <div className="bg-gray-50 rounded-lg p-4">
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
