import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <h1 className="text-4xl font-bold text-center py-8">Home Run Derby 2.0</h1>
          <p className="text-center text-muted-foreground">Application is ready for development</p>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
