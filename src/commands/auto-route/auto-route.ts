import type { LocalCommandCall } from '../../types/command.js'
import {
  getAutoRouteConfig,
  setAutoRouteConfig,
  type AutoRouteConfig,
} from '../../utils/model/taskRouter.js'

export const call: LocalCommandCall = async (args, _context) => {
  const current = getAutoRouteConfig()
  const input = args.trim()

  if (!input) {
    // /auto-route → show status
    if (current.pinnedModel) {
      return {
        type: 'text',
        value: `Auto-route is PINNED to "${current.pinnedModel}" — all requests use this model.\nUse /auto-route off to unpin, /auto-route <model> to change.`,
      }
    }
    if (current.enabled) {
      return {
        type: 'text',
        value: `Auto-route is ON — simple queries route to free models.\nUse /auto-route <model> to pin a specific model, /auto-route off to disable.`,
      }
    }
    return {
      type: 'text',
      value: `Auto-route is OFF — all requests use the default model.\nUse /auto-route on to enable, /auto-route <model> to pin a specific model.`,
    }
  }

  const lower = input.toLowerCase()

  if (lower === 'on') {
    const newConfig: AutoRouteConfig = { enabled: true }
    setAutoRouteConfig(newConfig)
    return {
      type: 'text',
      value:
        'Auto-route ON — simple queries will route to free models.\n[Auto-route: ...] notice will appear when routing happens.',
    }
  }

  if (lower === 'off') {
    setAutoRouteConfig({ enabled: false })
    return {
      type: 'text',
      value: 'Auto-route OFF — all requests use the default model.',
    }
  }

  // /auto-route <model> → pin to specific model
  const newConfig: AutoRouteConfig = { enabled: true, pinnedModel: input }
  setAutoRouteConfig(newConfig)
  return {
    type: 'text',
    value: `Auto-route PINNED to "${input}" — all requests will use this model.\nUse /auto-route off to unpin.`,
  }
}
