import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h1 className="text-6xl font-bold text-muted-foreground mb-4">404</h1>
      <p className="text-xl text-muted-foreground mb-8">Page not found</p>
      <Button onClick={() => navigate('/')}>Go Home</Button>
    </div>
  )
}
