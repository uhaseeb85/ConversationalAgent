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
import { CheckCircle2, Bot, User, Copy, ArrowLeft, RotateCcw, Sparkles, Square, AlertTriangle, Send } from 'lucide-react'
import { streamChatCompletion, loadAIConfig } from '@/lib/ai-client'
import { extractAnswer } from '@/lib/answer-extractor'
import { streamCustomSQL, detectDangerousSQL, extractSQLFromResponse, CustomSQLMessage } from '@/lib/ai-sql-generator'
import { Textarea } from '@/components/ui/Textarea'


export function OnboardPage() {
  const { flowId } = useParams<{ flowId: string }>()
  const navigate = useNavigate()
  const addSubmission = useStore((state) => state.addSubmission)

  const [flow, setFlow] = useState<OnboardingFlow | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [responses, setResponses] = useState<Response[]>([])
  const [currentValue, setCurrentValue] = useState<string | string[]>('')
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; type: 'bot' | 'user'; content: string; questionId?: string }>>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [generatedSQL, setGeneratedSQL] = useState<string>('')
  const [completedSubmission, setCompletedSubmission] = useState<Submission | null>(null)
  const [copiedSQL, setCopiedSQL] = useState(false)
  const [startedAt] = useState(new Date())
  const [validationError, setValidationError] = useState<string | null>(null)

  // AI custom SQL chat state
  const [showCustomSQLChat, setShowCustomSQLChat] = useState(false)
  const [customSQLMessages, setCustomSQLMessages] = useState<CustomSQLMessage[]>([])
  const [customSQLInput, setCustomSQLInput] = useState('')
  const [customSQLStreaming, setCustomSQLStreaming] = useState('')
  const [isGeneratingSQL, setIsGeneratingSQL] = useState(false)
  const [sqlWarnings, setSqlWarnings] = useState<string[]>([])
  const [warningAcknowledged, setWarningAcknowledged] = useState(false)
  const [copiedCustomSQL, setCopiedCustomSQL] = useState<string | null>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const aiStreamAbortRef = useRef<AbortController | null>(null)
  const customSQLAbortRef = useRef<AbortController | null>(null)
  const customSQLEndRef = useRef<HTMLDivElement>(null)

  // Abort any in-flight AI stream when the component unmounts
  useEffect(() => {
    return () => {
      aiStreamAbortRef.current?.abort()
      customSQLAbortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    // Read flows directly from the store to avoid restarting onboarding on unrelated store updates
    const foundFlow = useStore.getState().flows.find((f) => f.id === flowId)
    if (!foundFlow) {
      navigate('/')
      return
    }
    setFlow(foundFlow)

    // Initial welcome message
    const welcomeText = foundFlow.welcomeMessage ||
      `Welcome! I'll help you get onboarded. Let's get started with a few questions.`
    setChatMessages([
      {
        id: generateId(),
        type: 'bot',
        content: welcomeText,
      },
    ])
    showNextQuestion(foundFlow, 0, [])
  }, [flowId, navigate])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, isTyping])

  // Auto-scroll custom SQL chat
  useEffect(() => {
    customSQLEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [customSQLMessages, customSQLStreaming])

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

  /** Check a single validation rule; returns error message or null */
  const checkRule = (
    rule: { type: string; value?: string | number; message?: string },
    raw: string | string[],
    str: string
  ): string | null => {
    switch (rule.type) {
      case 'required':
        return (Array.isArray(raw) ? raw.length === 0 : !str.trim()) ? (rule.message ?? 'This field is required') : null
      case 'min-length':
        return str.length < Number(rule.value ?? 0) ? (rule.message ?? `Minimum ${rule.value} characters`) : null
      case 'max-length':
        return str.length > Number(rule.value ?? Infinity) ? (rule.message ?? `Maximum ${rule.value} characters`) : null
      case 'pattern': {
        if (!rule.value || !str) return null
        try {
          return !new RegExp(String(rule.value)).test(str) ? (rule.message ?? 'Invalid format') : null
        } catch {
          // Invalid regex pattern — skip it rather than freezing the browser
          return null
        }
      }
      case 'min': {
        const n = Number.parseFloat(str)
        return !Number.isNaN(n) && n < Number(rule.value ?? -Infinity) ? (rule.message ?? `Minimum value is ${rule.value}`) : null
      }
      case 'max': {
        const n = Number.parseFloat(str)
        return !Number.isNaN(n) && n > Number(rule.value ?? Infinity) ? (rule.message ?? `Maximum value is ${rule.value}`) : null
      }
      default:
        return null
    }
  }

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
      case 'greater-than': {
        const numResp = Number.parseFloat(responseValue)
        const numCond = Number.parseFloat(conditionValue)
        return !Number.isNaN(numResp) && !Number.isNaN(numCond) && numResp > numCond
      }
      case 'less-than': {
        const numResp = Number.parseFloat(responseValue)
        const numCond = Number.parseFloat(conditionValue)
        return !Number.isNaN(numResp) && !Number.isNaN(numCond) && numResp < numCond
      }
      default:
        return true
    }
  }

  /** Count only questions that are visible given current responses */
  const getVisibleQuestionCount = (flowData: OnboardingFlow, existingResponses: Response[]): number => {
    return flowData.questions.filter((q) => shouldShowQuestion(q, existingResponses)).length
  }

  /** Validate an answer against the question's validationRules */
  const validateAnswer = (question: Question, value: string | string[]): string | null => {
    const rules = question.validationRules ?? []
    if (rules.length === 0) return null
    const strValue = Array.isArray(value) ? value.join(', ') : value
    for (const rule of rules) {
      const msg = checkRule(rule, value, strValue)
      if (msg) return msg
    }
    return null
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
    const aiConfig = loadAIConfig()

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
        { id: generateId(), type: 'bot' as const, content: '', questionId: nextQuestion.id },
      ])

      // Abort any previous stream before starting a new one
      aiStreamAbortRef.current?.abort()
      const abortController = new AbortController()
      aiStreamAbortRef.current = abortController

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
        aiConfig,
        abortController.signal
      ).finally(() => {
        setIsTyping(false)
        setCurrentQuestionIndex(qIndex)
      })
    } else {
      setChatMessages((prev) => [
        ...prev,
        { id: generateId(), type: 'bot', content: nextQuestion.label, questionId: nextQuestion.id },
      ])
      setCurrentQuestionIndex(qIndex)
    }
  }

  const handleSubmitAnswer = async (overrideValue?: string | string[]) => {
    if (!flow) return

    const currentQuestion = flow.questions[currentQuestionIndex]
    if (!currentQuestion) return

    const rawValue = overrideValue !== undefined ? overrideValue : currentValue

    // Run validation rules
    const error = validateAnswer(currentQuestion, rawValue as string | string[])
    if (error) {
      setValidationError(error)
      return
    }
    setValidationError(null)

    // Use raw value immediately — extraction runs in background
    const displayValue = Array.isArray(rawValue)
      ? rawValue.join(', ')
      : (rawValue as string)

    setChatMessages((prev) => [
      ...prev,
      { id: generateId(), type: 'user', content: displayValue || '(skipped)' },
    ])

    // Save response with raw value and show next question immediately
    const newResponse: Response = {
      questionId: currentQuestion.id,
      value: rawValue || null,
    }

    const updatedResponses = [...responses, newResponse]
    setResponses(updatedResponses)

    // Show next question without waiting for extraction
    showNextQuestion(flow, currentQuestionIndex + 1, updatedResponses)

    // Run AI extraction in background and update the response value
    if (typeof rawValue === 'string' && rawValue.trim()) {
      const currentAiConfig = loadAIConfig()
      const questionIdForExtraction = currentQuestion.id  // capture before async
      extractAnswer(rawValue, currentQuestion, currentAiConfig)
        .then((extracted) => {
          if (extracted !== rawValue) {
            setResponses((prev) =>
              prev.map((r) =>
                r.questionId === questionIdForExtraction
                  ? { ...r, value: extracted }
                  : r
              )
            )
          }
        })
        .catch(() => { /* keep raw value on failure */ })
    }
  }

  const completeOnboarding = async (finalResponses: Response[]) => {
    if (!flow) return

    setIsComplete(true)

    const completionText = flow.completionMessage || 
      'Thank you! Your information has been collected successfully.'
    setChatMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        type: 'bot',
        content: completionText,
      },
    ])

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

    addSubmission(submission)
  }

  const handleCustomSQLSubmit = async () => {
    if (!flow || !customSQLInput.trim() || isGeneratingSQL) return

    const userPrompt = customSQLInput.trim()
    setCustomSQLInput('')
    setSqlWarnings([])
    setWarningAcknowledged(false)

    // Add user message to history
    const updatedHistory: CustomSQLMessage[] = [
      ...customSQLMessages,
      { role: 'user', content: userPrompt },
    ]
    setCustomSQLMessages(updatedHistory)

    // Start streaming
    setIsGeneratingSQL(true)
    setCustomSQLStreaming('')

    customSQLAbortRef.current?.abort()
    const abortController = new AbortController()
    customSQLAbortRef.current = abortController

    try {
      const fullText = await streamCustomSQL(
        flow,
        responses,
        customSQLMessages, // pass history without the latest user message (it's added inside streamCustomSQL)
        userPrompt,
        (token) => {
          setCustomSQLStreaming((prev) => prev + token)
        },
        undefined,
        abortController.signal
      )

      // Check for dangerous operations
      const extracted = extractSQLFromResponse(fullText)
      const { warnings } = detectDangerousSQL(extracted)
      setSqlWarnings(warnings)

      // Add assistant response to history
      setCustomSQLMessages((prev) => [
        ...prev,
        { role: 'assistant', content: fullText },
      ])
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled — keep partial output as message
        setCustomSQLMessages((prev) => [
          ...prev,
          { role: 'assistant', content: customSQLStreaming || '(generation cancelled)' },
        ])
      } else {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        setCustomSQLMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Error: ${errorMsg}` },
        ])
      }
    } finally {
      setIsGeneratingSQL(false)
      setCustomSQLStreaming('')
    }
  }

  const handleStopGeneration = () => {
    customSQLAbortRef.current?.abort()
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
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitAnswer()}
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
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitAnswer()}
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
            onChange={(e) => {
              const val = e.target.value
              if (val) {
                setCurrentValue(val)
                handleSubmitAnswer(val)
              }
            }}
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
    <div className="max-w-4xl mx-auto px-0 sm:px-4">
      <div className="bg-card rounded-none sm:rounded-xl shadow-lg overflow-hidden border-y sm:border border-border">
        <div className="border-b bg-card p-3 sm:p-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div className="text-center flex-1">
            <h1 className="text-base sm:text-xl font-semibold truncate px-2">{flow.name}</h1>
            {!isComplete && currentQuestion && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Question {responses.length + 1} of {getVisibleQuestionCount(flow, responses)}
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
              style={{ width: `${Math.round((responses.length / Math.max(getVisibleQuestionCount(flow, responses), 1)) * 100)}%` }}
            />
          </div>
        )}

        <div className="h-[60vh] min-h-[300px] max-h-[600px] overflow-y-auto p-4 sm:p-6 space-y-4 bg-muted/30">
          <AnimatePresence>
            {chatMessages.map((message) => (
              <motion.div
                key={message.id}
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
                  className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base ${
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
          <div className="border-t p-3 sm:p-4 bg-card">
            <div className="flex items-center gap-2 sm:gap-3">
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
                      setValidationError(null)
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
              {currentQuestion.type !== 'yes-no' && currentQuestion.type !== 'single-select' && (
                <Button onClick={() => handleSubmitAnswer()} size="lg" className="px-8">
                  Advance
                </Button>
              )}
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            {validationError && (
              <p className="text-sm text-red-500 mt-1 ml-12">{validationError}</p>
            )}
            {!currentQuestion.required && (
              <button
                onClick={() => {
                  setValidationError(null)
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
                    <div key={response.questionId} className="grid grid-cols-1 sm:grid-cols-2 text-sm gap-0.5 sm:gap-0">
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

            {/* AI Custom SQL Chat */}
            {loadAIConfig().enabled && (
              <div className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowCustomSQLChat((v) => !v)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    <span className="font-medium text-sm">Ask AI to Generate Custom SQL</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {showCustomSQLChat ? 'Collapse' : 'Expand'}
                  </span>
                </button>

                {showCustomSQLChat && (
                  <div className="border-t">
                    {/* Chat history */}
                    <div className="max-h-[300px] overflow-y-auto p-4 space-y-3 bg-muted/20">
                      {customSQLMessages.length === 0 && !isGeneratingSQL && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Describe the SQL you need. The AI has full context of your collected answers and schema.
                        </p>
                      )}

                      {customSQLMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          {msg.role === 'assistant' ? (
                            <div className="max-w-[90%] space-y-2">
                              <div className="bg-slate-900 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                                    <span className="text-xs text-slate-400">AI Generated SQL</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      navigator.clipboard.writeText(extractSQLFromResponse(msg.content))
                                      setCopiedCustomSQL(String(idx))
                                      setTimeout(() => setCopiedCustomSQL(null), 2000)
                                    }}
                                    className="text-white hover:bg-slate-800 h-6 px-2 text-xs"
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    {copiedCustomSQL === String(idx) ? 'Copied!' : 'Copy'}
                                  </Button>
                                </div>
                                <pre className="text-sm text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">
                                  <code>{msg.content}</code>
                                </pre>
                              </div>
                            </div>
                          ) : (
                            <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl px-3 py-2 text-sm">
                              {msg.content}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Streaming output */}
                      {isGeneratingSQL && customSQLStreaming && (
                        <div className="flex justify-start">
                          <div className="max-w-[90%] space-y-2">
                            <div className="bg-slate-900 rounded-lg p-3">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Sparkles className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
                                <span className="text-xs text-slate-400">Generating...</span>
                              </div>
                              <pre className="text-sm text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">
                                <code>{customSQLStreaming}</code>
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Typing indicator */}
                      {isGeneratingSQL && !customSQLStreaming && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-2xl px-4 py-3">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div ref={customSQLEndRef} />
                    </div>

                    {/* Safety warnings */}
                    {sqlWarnings.length > 0 && !warningAcknowledged && (
                      <div className="mx-4 mt-3 mb-1 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Potentially dangerous SQL detected</p>
                            <ul className="mt-1 text-xs text-amber-700 dark:text-amber-300 space-y-0.5">
                              {sqlWarnings.map((w, i) => (
                                <li key={i}>• {w}</li>
                              ))}
                            </ul>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setWarningAcknowledged(true)}
                              className="mt-2 text-xs h-7 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/30"
                            >
                              I understand the risks
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Input area */}
                    <div className="p-3 border-t flex items-end gap-2">
                      <Textarea
                        value={customSQLInput}
                        onChange={(e) => setCustomSQLInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleCustomSQLSubmit()
                          }
                        }}
                        placeholder="Describe the SQL you need, e.g. 'Insert these values into the users table'"
                        className="flex-1 min-h-[40px] max-h-[120px] text-sm resize-none"
                        rows={1}
                        disabled={isGeneratingSQL}
                      />
                      {isGeneratingSQL ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleStopGeneration}
                          className="flex-shrink-0 h-10"
                        >
                          <Square className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={handleCustomSQLSubmit}
                          disabled={!customSQLInput.trim()}
                          className="flex-shrink-0 h-10"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
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
