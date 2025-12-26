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
    const { data: user, error } = await supabaseAdmin
      .from('User')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return user
  },

  async update(where: { id: string }, data: any) {
    const { data: user, error } = await supabaseAdmin
      .from('User')
      .update(data)
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
    const { data: player, error } = await supabaseAdmin
      .from('Player')
      .insert(data)
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
    const { data: player, error } = await supabaseAdmin
      .from('Player')
      .update(data)
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
    const { teamPlayers, ...teamData } = data

    // Create team
    const { data: team, error: teamError } = await supabaseAdmin
      .from('Team')
      .insert(teamData)
      .select()
      .single()

    if (teamError) throw teamError

    // Create team players if provided
    if (teamPlayers?.create) {
      const players = teamPlayers.create.map((tp: any) => ({
        ...tp,
        teamId: team.id
      }))

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

    // Update team
    const { data: team, error: teamError } = await supabaseAdmin
      .from('Team')
      .update(teamData)
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
        const players = teamPlayers.create.map((tp: any) => ({
          ...tp,
          teamId: where.id
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

// Export a db object that mimics Prisma's structure
export const db = {
  user: userDb,
  player: playerDb,
  team: teamDb,

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
