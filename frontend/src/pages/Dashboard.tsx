import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 pt-8">
          <h1 className="text-4xl font-bold text-white">Home Run Derby</h1>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Welcome, {user?.username}!</CardTitle>
              <CardDescription>Your profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="font-medium capitalize">{user?.role}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Auth Provider</p>
                <p className="font-medium capitalize">{user?.authProvider}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Teams</CardTitle>
              <CardDescription>Your fantasy baseball teams</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                No teams created yet. Phase 2 feature coming soon!
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Leaderboard</CardTitle>
              <CardDescription>Current season standings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Leaderboard will be available when the season starts!
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Phase 1 Complete!</CardTitle>
            <CardDescription>Authentication system is fully functional</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Email/password registration and login</li>
              <li>Google OAuth integration</li>
              <li>Email verification flow</li>
              <li>Password reset functionality</li>
              <li>Protected routes</li>
              <li>JWT token management</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              Next up: Phase 2 - Team creation, player selection, and Stripe payments!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
