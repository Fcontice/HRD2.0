/**
 * Database Service Layer using Supabase
 * Replaces Prisma operations with Supabase queries
 */

import supabaseAdmin from '../config/supabase.js'

// ==================== USER OPERATIONS ====================

export const userDb = {
  async findUnique(where: { id?: string; email?: string; username?: string }) {
    const { data, error } = await supabaseAdmin
      .from('User')
      .select('*')
      .match(where)
      .is('deletedAt', null)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found
    return data
  },

  async findFirst(where: any) {
    let query = supabaseAdmin
      .from('User')
      .select('*')
      .is('deletedAt', null)

    // Handle complex where conditions
    Object.entries(where).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' && 'gt' in value) {
          query = query.gt(key, value.gt)
        } else if (typeof value === 'object' && 'gte' in value) {
          query = query.gte(key, value.gte)
        } else if (typeof value === 'object' && 'lt' in value) {
          query = query.lt(key, value.lt)
        } else if (typeof value === 'object' && 'lte' in value) {
          query = query.lte(key, value.lte)
        } else {
          query = query.eq(key, value)
        }
      }
    })

    const { data, error } = await query.limit(1).single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async create(data: any) {
    // Filter out null/undefined id to let database generate it
    const { id, ...cleanData } = data

    // Add timestamps
    const now = new Date().toISOString()
    const insertData = {
      ...(id ? { id } : {}),
      ...cleanData,
      createdAt: cleanData.createdAt || now,
      updatedAt: cleanData.updatedAt || now
    }

    const { data: user, error } = await supabaseAdmin
      .from('User')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    return user
  },

  async update(where: { id: string }, data: any) {
    // Add updatedAt timestamp
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    }

    const { data: user, error } = await supabaseAdmin
      .from('User')
      .update(updateData)
      .eq('id', where.id)
      .select()
      .single()

    if (error) throw error
    return user
  },

  async delete(where: { id: string }) {
    const { error } = await supabaseAdmin
      .from('User')
      .update({ deletedAt: new Date().toISOString() })
      .eq('id', where.id)

    if (error) throw error
  }
}

// ==================== PLAYER OPERATIONS ====================

export const playerDb = {
  async findMany(where: any = {}, options: any = {}) {
    let query = supabaseAdmin.from('Player').select('*')

    // Apply filters
    Object.entries(where).forEach(([key, value]) => {
      if (value !== undefined) {
        if (typeof value === 'object' && 'in' in value) {
          query = query.in(key, value.in)
        } else if (typeof value === 'object' && 'gte' in value) {
          query = query.gte(key, value.gte)
        } else if (typeof value === 'object' && 'lte' in value) {
          query = query.lte(key, value.lte)
        } else if (typeof value === 'object' && 'contains' in value) {
          query = query.ilike(key, `%${value.contains}%`)
        } else {
          query = query.eq(key, value)
        }
      }
    })

    // Apply ordering
    if (options.orderBy) {
      const field = Object.keys(options.orderBy)[0]
      const direction = options.orderBy[field]
      query = query.order(field, { ascending: direction === 'asc' })
    }

    // Apply pagination
    if (options.take) query = query.limit(options.take)
    if (options.skip) query = query.range(options.skip, options.skip + (options.take || 100) - 1)

    const { data, error } = await query

    if (error) throw error
    return data || []
  },

  async findUnique(where: { id: string }, include: any = {}) {
    let selectQuery = '*'

    if (include?.teamPlayers) {
      selectQuery = `
        *,
        teamPlayers:TeamPlayer(
          id,
          teamId,
          position,
          team:Team(
            id,
            name,
            userId
          )
        )
      `
    }

    const { data, error } = await supabaseAdmin
      .from('Player')
      .select(selectQuery)
      .eq('id', where.id)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async create(data: any) {
    // Filter out null/undefined id to let database generate it
    const { id, ...cleanData } = data

    // Add timestamps
    const now = new Date().toISOString()
    const insertData = {
      ...(id ? { id } : {}),
      ...cleanData,
      createdAt: cleanData.createdAt || now,
      updatedAt: cleanData.updatedAt || now
    }

    const { data: player, error } = await supabaseAdmin
      .from('Player')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    return player
  },

  async upsert(where: { mlbId: string }, create: any, update: any) {
    // Check if exists
    const existing = await this.findFirst({ mlbId: where.mlbId })

    if (existing) {
      return await this.update({ id: existing.id }, update)
    } else {
      return await this.create(create)
    }
  },

  async update(where: { id: string }, data: any) {
    // Add updatedAt timestamp
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    }

    const { data: player, error } = await supabaseAdmin
      .from('Player')
      .update(updateData)
      .eq('id', where.id)
      .select()
      .single()

    if (error) throw error
    return player
  },

  async findFirst(where: any) {
    const { data, error } = await supabaseAdmin
      .from('Player')
      .select('*')
      .match(where)
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async count(where: any = {}) {
    let query = supabaseAdmin
      .from('Player')
      .select('*', { count: 'exact', head: true })

    Object.entries(where).forEach(([key, value]) => {
      if (value !== undefined) {
        query = query.eq(key, value)
      }
    })

    const { count, error } = await query

    if (error) throw error
    return count || 0
  },

  async aggregate(options: any) {
    const { where = {}, _count, _avg, _max, _min } = options

    let query = supabaseAdmin.from('Player').select('*')

    // Apply where filters
    Object.entries(where).forEach(([key, value]) => {
      if (value !== undefined) {
        if (typeof value === 'object' && 'gte' in value) {
          query = query.gte(key, value.gte)
        } else if (typeof value === 'object' && 'lte' in value) {
          query = query.lte(key, value.lte)
        } else {
          query = query.eq(key, value)
        }
      }
    })

    const { data, error } = await query

    if (error) throw error

    const result: any = {}

    if (_count) {
      result._count = data.length
    }

    if (_avg) {
      result._avg = {}
      Object.keys(_avg).forEach(field => {
        const values = data.map(p => p[field]).filter(v => v != null)
        result._avg[field] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null
      })
    }

    if (_max) {
      result._max = {}
      Object.keys(_max).forEach(field => {
        const values = data.map(p => p[field]).filter(v => v != null)
        result._max[field] = values.length > 0 ? Math.max(...values) : null
      })
    }

    if (_min) {
      result._min = {}
      Object.keys(_min).forEach(field => {
        const values = data.map(p => p[field]).filter(v => v != null)
        result._min[field] = values.length > 0 ? Math.min(...values) : null
      })
    }

    return result
  },

  async groupBy(options: any) {
    const { by, where = {}, _count, orderBy } = options

    let query = supabaseAdmin.from('Player').select('*')

    // Apply where filters
    Object.entries(where).forEach(([key, value]) => {
      if (value !== undefined) {
        if (typeof value === 'object' && 'gte' in value) {
          query = query.gte(key, value.gte)
        } else if (typeof value === 'object' && 'lte' in value) {
          query = query.lte(key, value.lte)
        } else {
          query = query.eq(key, value)
        }
      }
    })

    const { data, error } = await query

    if (error) throw error

    // Group the data
    const groups: any = {}
    const groupByField = by[0] // Assuming single field grouping for now

    data.forEach(item => {
      const key = item[groupByField]
      if (!groups[key]) {
        groups[key] = { [groupByField]: key, _count: 0 }
      }
      groups[key]._count++
    })

    let result = Object.values(groups)

    // Apply ordering if specified
    if (orderBy && orderBy._count) {
      const orderField = Object.keys(orderBy._count)[0]
      const direction = orderBy._count[orderField]

      result.sort((a: any, b: any) => {
        if (direction === 'desc') {
          return b._count - a._count
        } else {
          return a._count - b._count
        }
      })
    }

    return result
  }
}

// ==================== TEAM OPERATIONS ====================

export const teamDb = {
  async findMany(where: any = {}, options: any = {}) {
    let query = supabaseAdmin.from('Team').select(`
      *,
      teamPlayers:TeamPlayer(
        id,
        position,
        player:Player(*)
      )
    `)

    // Filter by userId
    if (where.userId) query = query.eq('userId', where.userId)
    if (where.seasonYear) query = query.eq('seasonYear', where.seasonYear)

    // Handle deletedAt filter
    if (where.deletedAt === null || where.deletedAt === undefined) {
      query = query.is('deletedAt', null)
    } else if (where.deletedAt) {
      query = query.not('deletedAt', 'is', null)
    }

    // Apply ordering
    if (options.orderBy) {
      const field = Object.keys(options.orderBy)[0]
      const direction = options.orderBy[field]
      query = query.order(field, { ascending: direction === 'asc' })
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  },

  async findUnique(where: { id: string }, include: any = {}) {
    let selectQuery = '*'

    if (include?.teamPlayers && include?.user) {
      selectQuery = `
        *,
        user:User(
          id,
          username,
          email,
          avatarUrl
        ),
        teamPlayers:TeamPlayer(
          id,
          position,
          player:Player(*)
        )
      `
    } else if (include?.teamPlayers) {
      selectQuery = `
        *,
        teamPlayers:TeamPlayer(
          id,
          position,
          player:Player(*)
        )
      `
    } else if (include?.user) {
      selectQuery = `
        *,
        user:User(
          id,
          username,
          email,
          avatarUrl
        )
      `
    }

    const { data, error } = await supabaseAdmin
      .from('Team')
      .select(selectQuery)
      .eq('id', where.id)
      .is('deletedAt', null)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async create(data: any) {
    // Separate teamPlayers from team data
    const { teamPlayers, id, ...teamData } = data

    // Add timestamps
    const now = new Date().toISOString()
    const insertData = {
      ...(id ? { id } : {}),
      ...teamData,
      createdAt: teamData.createdAt || now,
      updatedAt: teamData.updatedAt || now
    }

    // Create team
    const { data: team, error: teamError } = await supabaseAdmin
      .from('Team')
      .insert(insertData)
      .select()
      .single()

    if (teamError) throw teamError

    // Create team players if provided
    if (teamPlayers?.create) {
      const players = teamPlayers.create.map((tp: any) => {
        const { id: tpId, ...tpData } = tp
        const tpNow = new Date().toISOString()
        return {
          ...(tpId ? { id: tpId } : {}),
          teamId: team.id,
          ...tpData,
          createdAt: tpData.createdAt || tpNow
        }
      })

      const { error: playersError } = await supabaseAdmin
        .from('TeamPlayer')
        .insert(players)

      if (playersError) throw playersError
    }

    // Return team with players
    return await this.findUnique({ id: team.id }, { teamPlayers: true })
  },

  async update(where: { id: string }, data: any) {
    const { teamPlayers, ...teamData } = data

    // Add updatedAt timestamp
    const updateData = {
      ...teamData,
      updatedAt: new Date().toISOString()
    }

    // Update team
    const { data: team, error: teamError } = await supabaseAdmin
      .from('Team')
      .update(updateData)
      .eq('id', where.id)
      .select()
      .single()

    if (teamError) throw teamError

    // Update team players if provided
    if (teamPlayers) {
      // Delete existing players
      if (teamPlayers.deleteMany) {
        await supabaseAdmin
          .from('TeamPlayer')
          .delete()
          .eq('teamId', where.id)
      }

      // Create new players
      if (teamPlayers.create) {
        const now = new Date().toISOString()
        const players = teamPlayers.create.map((tp: any) => ({
          ...tp,
          teamId: where.id,
          createdAt: tp.createdAt || now
        }))

        await supabaseAdmin
          .from('TeamPlayer')
          .insert(players)
      }
    }

    return await this.findUnique({ id: where.id }, { teamPlayers: true })
  },

  async delete(where: { id: string }) {
    const { error } = await supabaseAdmin
      .from('Team')
      .update({ deletedAt: new Date().toISOString() })
      .eq('id', where.id)

    if (error) throw error
  }
}

// ==================== PLAYER SEASON STATS OPERATIONS ====================

export const playerSeasonStatsDb = {
  async findMany(where: any = {}, options: any = {}) {
    let query = supabaseAdmin.from('PlayerSeasonStats').select(`
      *,
      player:Player(
        id,
        name,
        mlbId,
        teamAbbr,
        photoUrl
      )
    `)

    // Apply filters
    if (where.seasonYear !== undefined) {
      query = query.eq('seasonYear', where.seasonYear)
    }
    if (where.playerId) {
      query = query.eq('playerId', where.playerId)
    }
    if (where.hrsTotal?.gte) {
      query = query.gte('hrsTotal', where.hrsTotal.gte)
    }

    // Apply ordering
    if (options.orderBy) {
      const field = Object.keys(options.orderBy)[0]
      const direction = options.orderBy[field]
      query = query.order(field, { ascending: direction === 'asc' })
    }

    // Apply pagination
    if (options.take) query = query.limit(options.take)
    if (options.skip) query = query.range(options.skip, options.skip + (options.take || 100) - 1)

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async findUnique(where: { playerId: string; seasonYear: number }) {
    const { data, error } = await supabaseAdmin
      .from('PlayerSeasonStats')
      .select(`
        *,
        player:Player(*)
      `)
      .eq('playerId', where.playerId)
      .eq('seasonYear', where.seasonYear)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async create(data: any) {
    // Filter out null/undefined id to let database generate it
    const { id, ...cleanData } = data

    // Add timestamps
    const now = new Date().toISOString()
    const insertData = {
      ...(id ? { id } : {}),
      ...cleanData,
      createdAt: cleanData.createdAt || now,
      updatedAt: cleanData.updatedAt || now
    }

    const { data: stats, error } = await supabaseAdmin
      .from('PlayerSeasonStats')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    return stats
  },

  async upsert(where: { playerId: string; seasonYear: number }, create: any, update: any) {
    // Check if exists
    const existing = await this.findUnique(where)

    if (existing) {
      return await this.update(where, update)
    } else {
      return await this.create({ ...where, ...create })
    }
  },

  async update(where: { playerId: string; seasonYear: number }, data: any) {
    // Add updatedAt timestamp
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    }

    const { data: stats, error } = await supabaseAdmin
      .from('PlayerSeasonStats')
      .update(updateData)
      .eq('playerId', where.playerId)
      .eq('seasonYear', where.seasonYear)
      .select()
      .single()

    if (error) throw error
    return stats
  },

  // Get all seasons for one player (for comparison)
  async findByPlayer(playerId: string) {
    const { data, error } = await supabaseAdmin
      .from('PlayerSeasonStats')
      .select('*')
      .eq('playerId', playerId)
      .order('seasonYear', { ascending: false })

    if (error) throw error
    return data || []
  },

  // Get eligible players for a specific contest year
  // e.g., getEligibleForContest(2026) returns 2025 players with ≥10 HRs
  async getEligibleForContest(contestYear: number) {
    const previousYear = contestYear - 1

    const { data, error } = await supabaseAdmin
      .from('PlayerSeasonStats')
      .select(`
        *,
        player:Player(*)
      `)
      .eq('seasonYear', previousYear)
      .gte('hrsTotal', 10)
      .order('hrsTotal', { ascending: false })

    if (error) throw error
    return data || []
  },

  async count(where: any = {}) {
    let query = supabaseAdmin
      .from('PlayerSeasonStats')
      .select('*', { count: 'exact', head: true })

    if (where.seasonYear !== undefined) {
      query = query.eq('seasonYear', where.seasonYear)
    }

    const { count, error } = await query

    if (error) throw error
    return count || 0
  },

  async aggregate(options: any) {
    const { where = {}, _count, _avg, _max, _min } = options

    let query = supabaseAdmin.from('PlayerSeasonStats').select('*')

    if (where.seasonYear !== undefined) {
      query = query.eq('seasonYear', where.seasonYear)
    }

    const { data, error } = await query

    if (error) throw error

    const result: any = {}

    if (_count) {
      result._count = data.length
    }

    if (_avg) {
      result._avg = {}
      Object.keys(_avg).forEach(field => {
        const values = data.map(p => p[field]).filter(v => v != null)
        result._avg[field] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null
      })
    }

    if (_max) {
      result._max = {}
      Object.keys(_max).forEach(field => {
        const values = data.map(p => p[field]).filter(v => v != null)
        result._max[field] = values.length > 0 ? Math.max(...values) : null
      })
    }

    if (_min) {
      result._min = {}
      Object.keys(_min).forEach(field => {
        const values = data.map(p => p[field]).filter(v => v != null)
        result._min[field] = values.length > 0 ? Math.min(...values) : null
      })
    }

    return result
  },

  async groupBy(options: any) {
    const { by, where = {}, _count, orderBy } = options

    let query = supabaseAdmin.from('PlayerSeasonStats').select('*')

    if (where.seasonYear !== undefined) {
      query = query.eq('seasonYear', where.seasonYear)
    }

    const { data, error } = await query

    if (error) throw error

    // Group the data
    const groups: any = {}
    const groupByField = by[0] // Assuming single field grouping

    data.forEach(item => {
      const key = item[groupByField]
      if (!groups[key]) {
        groups[key] = { [groupByField]: key, _count: 0 }
      }
      groups[key]._count++
    })

    let result = Object.values(groups)

    // Apply ordering if specified
    if (orderBy && orderBy._count) {
      const orderField = Object.keys(orderBy._count)[0]
      const direction = orderBy._count[orderField]

      result.sort((a: any, b: any) => {
        if (direction === 'desc') {
          return b._count - a._count
        } else {
          return a._count - b._count
        }
      })
    }

    return result
  }
}

// ==================== TEAM PLAYER OPERATIONS ====================

export const teamPlayerDb = {
  async findMany(where: any = {}) {
    let query = supabaseAdmin.from('TeamPlayer').select('*')

    // Apply filters
    Object.entries(where).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value)
      }
    })

    const { data, error } = await query

    if (error) throw error
    return data || []
  },

  async findUnique(where: { id: string }) {
    const { data, error } = await supabaseAdmin
      .from('TeamPlayer')
      .select('*')
      .eq('id', where.id)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async create(data: any) {
    // Filter out null/undefined id to let database generate it
    const { id, ...cleanData } = data

    // Add timestamps
    const now = new Date().toISOString()
    const insertData = {
      ...(id ? { id } : {}),
      ...cleanData,
      createdAt: cleanData.createdAt || now
    }

    const { data: teamPlayer, error } = await supabaseAdmin
      .from('TeamPlayer')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    return teamPlayer
  },

  async delete(where: { id: string } | { teamId: string }) {
    let query = supabaseAdmin.from('TeamPlayer').delete()

    if ('id' in where) {
      query = query.eq('id', where.id)
    } else if ('teamId' in where) {
      query = query.eq('teamId', where.teamId)
    }

    const { error } = await query

    if (error) throw error
  },

  async count(where: any = {}) {
    let query = supabaseAdmin
      .from('TeamPlayer')
      .select('*', { count: 'exact', head: true })

    Object.entries(where).forEach(([key, value]) => {
      if (value !== undefined) {
        query = query.eq(key, value)
      }
    })

    const { count, error } = await query

    if (error) throw error
    return count || 0
  }
}

// Export a db object that mimics Prisma's structure
export const db = {
  user: userDb,
  player: playerDb,
  team: teamDb,
  teamPlayer: teamPlayerDb,
  playerSeasonStats: playerSeasonStatsDb,

  // Raw query support
  async $queryRaw(query: string, ...params: any[]) {
    const { data, error } = await supabaseAdmin.rpc('execute_sql', { query_text: query })
    if (error) throw error
    return data
  },

  async $connect() {
    // Test connection
    const { error } = await supabaseAdmin.from('User').select('id').limit(1)
    if (error && error.code !== 'PGRST116') throw error
  },

  async $disconnect() {
    // Supabase client doesn't need explicit disconnect
  }
}

export default db
