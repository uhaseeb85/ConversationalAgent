import { Mail, Send } from 'lucide-react'
import { Card } from '@/components/ui/Card'

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
