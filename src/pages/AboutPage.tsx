import { Mail, MessageSquare, Database, Sparkles, Settings, Globe } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-10 py-4">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-3">
          <MessageSquare className="h-4 w-4 mr-2" />
          About WorkFlow Studio
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          About{' '}
          <span className="bg-gradient-to-r from-slate-700 to-slate-500 dark:from-slate-300 dark:to-slate-400 bg-clip-text text-transparent">
            WorkFlow Studio
          </span>
        </h1>
        <p className="text-muted-foreground sm:text-lg max-w-2xl mx-auto">
          A conversational onboarding platform that lets you build intelligent question flows,
          collect customer data through a friendly chat interface, and generate SQL for seamless
          system integration.
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-5 w-5 text-primary" />
              Conversational UI
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            A natural chat interface that guides users through each question smoothly, making data
            collection feel effortless.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-5 w-5 text-primary" />
              Customizable Flows
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Build flexible question sequences with various input types, validations, and conditional
            logic to match any onboarding scenario.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-5 w-5 text-primary" />
              SQL Generation
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Automatically generate INSERT, UPDATE, and DELETE statements ready to execute against
            your target database.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-primary" />
              AI-Powered Builder
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Use an OpenAI-compatible AI assistant to generate question flows from a database schema
            or plain-language description.
          </CardContent>
        </Card>

        <Card className="sm:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-5 w-5 text-primary" />
              Open & Extensible
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Built with React, TypeScript, and Express — easy to self-host, extend, and integrate
            with your existing tools and databases.
          </CardContent>
        </Card>
      </div>

      {/* Contact */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-primary" />
            Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>Have questions, feedback, or want to contribute? Reach out directly:</p>
          <a
            href="mailto:uhaseeb85@gmail.com"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline"
          >
            <Mail className="h-4 w-4" />
            uhaseeb85@gmail.com
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
