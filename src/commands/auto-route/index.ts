import type { Command } from '../../commands.js'

const autoRoute = {
  type: 'local',
  name: 'auto-route',
  description:
    'Toggle smart task auto-routing — simple queries → free models, complex → paid models',
  supportsNonInteractive: false,
  load: () => import('./auto-route.js'),
} satisfies Command

export default autoRoute
