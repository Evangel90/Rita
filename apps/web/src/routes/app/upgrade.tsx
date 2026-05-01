import { createFileRoute } from '@tanstack/react-router'
import { UpgradePage } from '../../pages/UpgradePage'

export const Route = createFileRoute('/app/upgrade' as never)({
  component: UpgradePage,
})