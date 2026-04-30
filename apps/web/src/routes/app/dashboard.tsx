import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '../../pages/DashboardPage'

export const Route = createFileRoute('/app/dashboard' as never)({
  component: DashboardPage,
})
