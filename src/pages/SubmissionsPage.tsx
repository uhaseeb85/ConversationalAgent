import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { Submission, SubmissionStatus } from '@/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { generateSQL } from '@/lib/sql-generator'
import { Copy, Check, Eye, Database, Calendar, FileCode, Trash2, Download } from 'lucide-react'
import { format } from 'date-fns'

export function SubmissionsPage() {
  const { id } = useParams()
  const submissions = useStore((state) => state.submissions)
  const flows = useStore((state) => state.flows)
  const updateSubmission = useStore((state) => state.updateSubmission)
  const deleteSubmission = useStore((state) => state.deleteSubmission)

  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [generatedSQL, setGeneratedSQL] = useState<string>('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | SubmissionStatus>('all')

  useEffect(() => {
    if (id) {
      const submission = submissions.find((s) => s.id === id)
      if (submission) {
        setSelectedSubmission(submission)
        handleGenerateSQL(submission)
      }
    }
  }, [id, submissions])

  const handleGenerateSQL = (submission: Submission) => {
    const flow = flows.find((f) => f.id === submission.flowId)
    if (!flow) return

    const sql = generateSQL(submission, flow)
    setGeneratedSQL(sql)
    
    // Update submission with generated SQL
    if (!submission.generatedSQL) {
      updateSubmission(submission.id, { generatedSQL: sql })
    }
  }

  const handleViewSubmission = (submission: Submission) => {
    setSelectedSubmission(submission)
    handleGenerateSQL(submission)
  }

  const handleCopySQL = async (sql: string, submissionId: string) => {
    await navigator.clipboard.writeText(sql)
    setCopiedId(submissionId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleStatusChange = async (submissionId: string, status: SubmissionStatus) => {
    await updateSubmission(submissionId, { status })
  }

  const filteredSubmissions = filter === 'all' 
    ? submissions 
    : submissions.filter(s => s.status === filter)

  const sortedSubmissions = [...filteredSubmissions].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  )

  const handleExportSubmissions = () => {
    const dataStr = JSON.stringify(sortedSubmissions, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `submissions-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDeleteSubmission = (submissionId: string) => {
    if (!confirm('Are you sure you want to delete this submission?')) return
    deleteSubmission(submissionId)
    if (selectedSubmission?.id === submissionId) {
      setSelectedSubmission(null)
      setGeneratedSQL('')
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            Submissions
          </h1>
          <p className="text-muted-foreground">
            View collected customer data and generated SQL statements
          </p>
        </div>
        {sortedSubmissions.length > 0 && (
          <Button variant="outline" onClick={handleExportSubmissions}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        )}
      </div>

      <div className="mb-6 flex space-x-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          size="sm"
        >
          All ({submissions.length})
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          onClick={() => setFilter('pending')}
          size="sm"
        >
          Pending ({submissions.filter(s => s.status === 'pending').length})
        </Button>
        <Button
          variant={filter === 'executed' ? 'default' : 'outline'}
          onClick={() => setFilter('executed')}
          size="sm"
        >
          Executed ({submissions.filter(s => s.status === 'executed').length})
        </Button>
        <Button
          variant={filter === 'failed' ? 'default' : 'outline'}
          onClick={() => setFilter('failed')}
          size="sm"
        >
          Failed ({submissions.filter(s => s.status === 'failed').length})
        </Button>
      </div>

      {sortedSubmissions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Database className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No submissions yet</h3>
            <p className="text-muted-foreground text-center max-w-md">
              When customers complete onboarding flows, their submissions will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">All Submissions</h2>
            {sortedSubmissions.map((submission) => (
              <Card
                key={submission.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedSubmission?.id === submission.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleViewSubmission(submission)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{submission.flowName}</CardTitle>
                      <CardDescription className="flex items-center mt-1">
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(new Date(submission.completedAt), 'MMM d, yyyy h:mm a')}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        submission.status === 'executed'
                          ? 'success'
                          : submission.status === 'failed'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {submission.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {submission.responses.length} responses
                    </span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteSubmission(submission.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="lg:sticky lg:top-24 lg:h-fit">
            {selectedSubmission ? (
              <Card>
                <CardHeader>
                  <CardTitle>Submission Details</CardTitle>
                  <CardDescription>
                    {selectedSubmission.flowName} •{' '}
                    {format(new Date(selectedSubmission.completedAt), 'MMM d, yyyy h:mm a')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">Responses</h3>
                    <div className="space-y-3">
                      {(() => {
                        const flow = flows.find((f) => f.id === selectedSubmission.flowId)
                        if (!flow) return <p className="text-muted-foreground">Flow not found</p>

                        return selectedSubmission.responses.map((response) => {
                          const question = flow.questions.find((q) => q.id === response.questionId)
                          if (!question) return null

                          return (
                            <div key={response.questionId} className="border-b pb-2">
                              <p className="text-sm font-medium text-muted-foreground">
                                {question.label}
                              </p>
                              <p className="mt-1">
                                {Array.isArray(response.value)
                                  ? response.value.join(', ')
                                  : response.value?.toString() || '(no answer)'}
                              </p>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold flex items-center">
                        <FileCode className="h-4 w-4 mr-2" />
                        Generated SQL
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopySQL(generatedSQL, selectedSubmission.id)}
                      >
                        {copiedId === selectedSubmission.id ? (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto">
                      <code>{generatedSQL}</code>
                    </pre>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Update Status</h3>
                    <div className="flex space-x-2">
                      <Button
                        variant={selectedSubmission.status === 'pending' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleStatusChange(selectedSubmission.id, 'pending')}
                      >
                        Pending
                      </Button>
                      <Button
                        variant={selectedSubmission.status === 'executed' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleStatusChange(selectedSubmission.id, 'executed')}
                      >
                        Executed
                      </Button>
                      <Button
                        variant={selectedSubmission.status === 'failed' ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={() => handleStatusChange(selectedSubmission.id, 'failed')}
                      >
                        Failed
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Eye className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Select a submission to view details and SQL
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
