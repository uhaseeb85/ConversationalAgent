import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore, initStore } from '@/lib/store'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Plus, Edit, Trash2, MessageSquare, Calendar, Settings, Database, FileText, Globe } from 'lucide-react'
import { format } from 'date-fns'
import type { OnboardingFlow } from '@/types'

export function HomePage() {
  const { user } = useAuth()
  const flows = useStore((state) => state.flows)
  const submissions = useStore((state) => state.submissions)
  const deleteFlow = useStore((state) => state.deleteFlow)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    initStore().then(() => setIsLoading(false))
  }, [])

  const getSubmissionCount = (flowId: string) => {
    return submissions.filter((s) => s.flowId === flowId).length
  }

  const canModifyFlow = (flow: OnboardingFlow) => {
    if (!user) return false
    return user.role === 'admin' || flow.createdBy === user.id
  }

  const handleDelete = async (flowId: string, flowName: string) => {
    if (window.confirm(`Are you sure you want to delete "${flowName}"?`)) {
      await deleteFlow(flowId)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading flows...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-16 py-12">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-6">
          <MessageSquare className="h-4 w-4 mr-2" />
          Conversational Customer Onboarding
        </div>
        <h1 className="text-5xl font-bold mb-4">
          Onboard customers with{' '}
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            intelligent conversations
          </span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
          Create customizable question flows, collect customer information through a friendly chat interface, and generate SQL statements for seamless system integration.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/flows/new">
            <Button size="lg" className="shadow-lg shadow-primary/20">
              <Plus className="h-5 w-5 mr-2" />
              Create New Flow
            </Button>
          </Link>
          <Link to="/submissions">
            <Button size="lg" variant="outline">
              <FileText className="h-5 w-5 mr-2" />
              View Submissions
            </Button>
          </Link>
        </div>
      </div>

      {/* Active Flows Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Active Onboarding Flows</h2>
            <p className="text-muted-foreground text-sm mt-1">Select a flow to start onboarding a customer</p>
          </div>
          {flows.length > 0 && (
            <Link to="/flows/new" className="text-primary hover:underline text-sm flex items-center">
              Manage All Flows
              <span className="ml-1">→</span>
            </Link>
          )}
        </div>
      </div>

      {flows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No flows yet</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Get started by creating your first onboarding flow. Define custom questions and start collecting customer data.
            </p>
            <Link to="/flows/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Flow
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flows.map((flow) => (
            <Card
              key={flow.id}
              className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex gap-2">
                    <Badge variant={flow.isActive ? 'success' : 'secondary'}>
                      {flow.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {flow.isPublic && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <Globe className="h-3 w-3 mr-1" />
                        Public
                      </Badge>
                    )}
                  </div>
                  {canModifyFlow(flow) && (
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link to={`/flows/${flow.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(flow.id, flow.name)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
                <CardTitle className="text-xl">{flow.name}</CardTitle>
                <CardDescription className="line-clamp-2">{flow.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    <span>{flow.questions.length} questions</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Created {format(new Date(flow.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">{getSubmissionCount(flow.id)}</span>{' '}
                    <span className="text-muted-foreground">submissions</span>
                  </div>
                  <div className="pt-3">
                    <Link to={`/onboard/${flow.id}`} className="block">
                      <Button className="w-full" variant="outline">
                        Preview Flow
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Features Section */}
      {flows.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Conversational UI</h3>
            <p className="text-sm text-muted-foreground">
              Natural chat interface that guides customers through each question smoothly
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Customizable Flows</h3>
            <p className="text-sm text-muted-foreground">
              Build flexible question sequences with various input types and validations
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">SQL Generation</h3>
            <p className="text-sm text-muted-foreground">
              Automatically generate INSERT statements ready for your database
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
