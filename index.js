export const name = 'cheat-sheet'
export const inject = ['agents', 'connection']

const DEFAULT_HINT =
  '说话像人：短句，一句一行；不摆清单、不归纳成金句、不写承诺句。' +
  '奥卡姆剃刀：能删的多余先删，再动手。' +
  '干活时：数字、路径、结论一个字不改；报结果三句。' +
  '改或复述规则时，先照抄原文，再动，不凭记忆重写。'

const SECTION_NAME = 'cheat-sheet:hint'
const SECTION_ORDER = 9000

export function apply(ctx, config = {}) {
  const logger = ctx.logger(name)
  const baseHint = typeof config.hint === 'string' && config.hint.trim() !== '' ? config.hint : DEFAULT_HINT

  let lastError = ''
  /** sessionId -> { enabled, hint } */
  const state = new Map()
  /** sessionId -> disposer */
  const installed = new Map()
  /** sessionId -> agent (captured on agent/created, its ctx carries scoped services) */
  const agents = new Map()

  const entry = (sid) => {
    let s = state.get(sid)
    if (s === undefined) {
      s = { enabled: false, hint: baseHint }
      state.set(sid, s)
    }
    return s
  }

  const uninstall = (sid) => {
    const dispose = installed.get(sid)
    installed.delete(sid)
    if (typeof dispose === 'function') {
      try { dispose() } catch (error) { logger.warn('cheat-sheet: dispose failed (%s)', error?.message ?? error) }
    }
  }

  const install = (sid) => {
    uninstall(sid)
    const s = entry(sid)
    if (!s.enabled) return
    const agent = agents.get(sid)
    if (agent === undefined) { lastError = 'no agent for session'; return }
    const scope = agent.ctx ?? agent
    const prompt = scope?.systemPrompt
    if (prompt === undefined || typeof prompt.section !== 'function') {
      lastError = 'systemPrompt unavailable on agent.ctx'
      logger.warn('cheat-sheet: %s', lastError)
      return
    }
    try {
      const dispose = prompt.section({ name: SECTION_NAME, order: SECTION_ORDER, text: s.hint })
      installed.set(sid, typeof dispose === 'function' ? dispose : () => {})
      lastError = ''
      logger.info('cheat-sheet: installed for %s', sid)
    } catch (error) {
      lastError = String(error?.message ?? error)
      logger.error('cheat-sheet: section failed (%s)', lastError)
    }
  }

  const json = (status, payload) =>
    new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } })

  const route = {
    path: '/api/cheat-sheet/state',
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      let body = null
      try { body = await request.json() } catch { body = null }
      if (body === null || typeof body !== 'object') return json(400, { ok: false })
      const sid = typeof body.sessionId === 'string' ? body.sessionId : ''
      if (sid === '') return json(400, { ok: false })
      const s = entry(sid)
      if (typeof body.enabled === 'boolean') s.enabled = body.enabled
      if (typeof body.hint === 'string' && body.hint.trim() !== '') s.hint = body.hint.slice(0, 600)
      if (!agents.has(sid)) {
        const found = ctx.agents.get(sid)
        if (found !== undefined) agents.set(sid, found)
      }
      install(sid)
      return json(200, {
        ok: true,
        enabled: s.enabled,
        applied: agents.has(sid),
        installed: installed.has(sid),
        error: lastError,
      })
    },
  }

  ctx.effect(() => {
    try {
      return ctx.connection.fetch.register(route)
    } catch (error) {
      logger.error('cheat-sheet: route registration failed (%s)', error?.message ?? error)
      return () => {}
    }
  }, 'cheat-sheet: state route')

  ctx.effect(() => {
    const off = ctx.on('agent/created', (agent) => {
      const sid = agent?.session?.id
      if (typeof sid !== 'string' || sid === '') return
      agents.set(sid, agent)
      if (entry(sid).enabled) install(sid)
    })
    return () => {
      try { off?.() } catch (_) {}
      for (const sid of Array.from(installed.keys())) uninstall(sid)
    }
  }, 'cheat-sheet: agents')
}
