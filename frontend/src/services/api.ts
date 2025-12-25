import axios, { AxiosInstance, AxiosError } from 'axios'

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000'

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - Handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      // Clear tokens and redirect to login
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

export default api

// ==================== TYPE DEFINITIONS ====================

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
}

export interface User {
  id: string
  email: string
  username: string
  role: 'user' | 'admin'
  avatarUrl: string | null
  authProvider: 'email' | 'google'
  emailVerified: boolean
  createdAt: string
}

export interface Player {
  id: string
  mlbId: string
  name: string
  teamAbbr: string
  seasonYear: number
  hrsPreviousSeason: number
  isEligible: boolean
  photoUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface PlayerListResponse {
  players: Player[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export interface PlayerStatsResponse {
  totalPlayers: number
  averageHRs: number
  maxHRs: number
  minHRs: number
  teamDistribution: Array<{
    team: string
    count: number
  }>
}

export interface Team {
  id: string
  userId: string
  name: string
  seasonYear: number
  paymentStatus: 'draft' | 'pending' | 'paid' | 'rejected' | 'refunded'
  stripePaymentId: string | null
  entryStatus: 'draft' | 'entered' | 'locked'
  totalHrs2024: number
  createdAt: string
  updatedAt: string
  lockedAt: string | null
  deletedAt: string | null
  teamPlayers?: Array<{
    id: string
    position: number
    player: Player
  }>
  user?: {
    id: string
    username: string
    avatarUrl: string | null
  }
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

// ==================== AUTH API ====================

export const authApi = {
  register: async (data: {
    email: string
    username: string
    password: string
  }): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.post('/api/auth/register', data)
    return response.data
  },

  login: async (data: {
    email: string
    password: string
  }): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post('/api/auth/login', data)
    return response.data
  },

  verifyEmail: async (token: string): Promise<ApiResponse> => {
    const response = await api.post('/api/auth/verify-email', { token })
    return response.data
  },

  forgotPassword: async (email: string): Promise<ApiResponse> => {
    const response = await api.post('/api/auth/forgot-password', { email })
    return response.data
  },

  resetPassword: async (data: {
    token: string
    password: string
  }): Promise<ApiResponse> => {
    const response = await api.post('/api/auth/reset-password', data)
    return response.data
  },

  getProfile: async (): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.get('/api/auth/me')
    return response.data
  },

  logout: async (): Promise<ApiResponse> => {
    const response = await api.post('/api/auth/logout')
    return response.data
  },

  // Google OAuth - opens in same window
  googleLogin: () => {
    window.location.href = `${API_URL}/api/auth/google`
  },
}

// ==================== USERS API ====================

export const usersApi = {
  updateProfile: async (data: {
    username?: string
    avatarUrl?: string
  }): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.patch('/api/users/me', data)
    return response.data
  },

  deleteAccount: async (): Promise<ApiResponse> => {
    const response = await api.delete('/api/users/me')
    return response.data
  },
}

// ==================== TEAMS API ====================

export const teamsApi = {
  /**
   * Create a new team
   */
  createTeam: async (data: {
    name: string
    seasonYear: number
    playerIds: string[]
  }): Promise<ApiResponse<Team>> => {
    const response = await api.post('/api/teams', data)
    return response.data
  },

  /**
   * Get a team by ID
   */
  getTeamById: async (id: string): Promise<ApiResponse<Team>> => {
    const response = await api.get(`/api/teams/${id}`)
    return response.data
  },

  /**
   * Get current user's teams
   */
  getMyTeams: async (seasonYear?: number): Promise<ApiResponse<Team[]>> => {
    const queryParams = seasonYear ? `?seasonYear=${seasonYear}` : ''
    const response = await api.get(`/api/teams/my-teams${queryParams}`)
    return response.data
  },

  /**
   * Update a team (only before lock date)
   */
  updateTeam: async (
    id: string,
    data: {
      name?: string
      playerIds?: string[]
    }
  ): Promise<ApiResponse<Team>> => {
    const response = await api.patch(`/api/teams/${id}`, data)
    return response.data
  },

  /**
   * Delete a team (only before lock date)
   */
  deleteTeam: async (id: string): Promise<ApiResponse> => {
    const response = await api.delete(`/api/teams/${id}`)
    return response.data
  },
}

// ==================== PLAYERS API ====================

export const playersApi = {
  /**
   * Get all eligible players with optional filters
   */
  getPlayers: async (params?: {
    seasonYear?: number
    minHrs?: number
    maxHrs?: number
    team?: string
    search?: string
    sortBy?: 'name' | 'hrs' | 'team'
    sortOrder?: 'asc' | 'desc'
    limit?: number
    offset?: number
  }): Promise<ApiResponse<PlayerListResponse>> => {
    const queryParams = new URLSearchParams()

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value))
        }
      })
    }

    const response = await api.get(`/api/players?${queryParams.toString()}`)
    return response.data
  },

  /**
   * Get a single player by ID
   */
  getPlayerById: async (id: string): Promise<ApiResponse<Player>> => {
    const response = await api.get(`/api/players/${id}`)
    return response.data
  },

  /**
   * Search players by name
   */
  searchPlayers: async (params: {
    q: string
    seasonYear?: number
    limit?: number
  }): Promise<ApiResponse<Player[]>> => {
    const queryParams = new URLSearchParams()
    queryParams.append('q', params.q)

    if (params.seasonYear) {
      queryParams.append('seasonYear', String(params.seasonYear))
    }
    if (params.limit) {
      queryParams.append('limit', String(params.limit))
    }

    const response = await api.get(`/api/players/search?${queryParams.toString()}`)
    return response.data
  },

  /**
   * Get player pool summary statistics
   */
  getStats: async (seasonYear?: number): Promise<ApiResponse<PlayerStatsResponse>> => {
    const queryParams = seasonYear ? `?seasonYear=${seasonYear}` : ''
    const response = await api.get(`/api/players/stats/summary${queryParams}`)
    return response.data
  },
}

// ==================== LEADERBOARDS API (Placeholder) ====================

export const leaderboardsApi = {
  // Will be implemented in Phase 2
}
