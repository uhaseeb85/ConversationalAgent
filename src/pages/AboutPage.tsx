import { Mail, Send, Sparkles, MessageSquare, Database } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8">
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <Send className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">About WorkFlow Studio</h1>
        <p className="text-muted-foreground">
          A conversational onboarding and data-collection platform that lets you build
          typeform-style flows and execute the resulting SQL against your target database.
        </p>
      </div>

      {/* Feature highlights */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Key Features</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">AI Flow Builder</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Describe your data-collection goal in plain text and let the AI generate questions, column mappings, and SQL operations for you.
                Access it via the <strong>AI Flow Builder</strong> link in the sidebar or the{' '}
                <Link to="/" className="text-primary underline">Home</Link>{' '}
                page hero. You can also have a back-and-forth conversation with the AI to refine the DML operations before saving your flow.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Conversational Onboarding UI</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Every flow gets a chat-style interface that guides customers through questions one at a time for a smooth, friendly experience.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">SQL Generation & Execution</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Map question answers to database columns and auto-generate INSERT / UPDATE / DELETE statements that can be executed directly against your target database.
              </p>
            </div>
          </div>
        </div>
        <div className="pt-2">
          <Link to="/ai-flow-builder">
            <Button>
              <Sparkles className="h-4 w-4 mr-2" />
              Try the AI Flow Builder
            </Button>
          </Link>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Contact</h2>
        <p className="text-muted-foreground">
          Have questions, feedback, or want to get in touch? Feel free to reach out.
        </p>
        <a
          href="mailto:uhaseeb85@gmail.com"
          className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
        >
          <Mail className="h-4 w-4" />
          uhaseeb85@gmail.com
        </a>
      </Card>
    </div>
  )
}
