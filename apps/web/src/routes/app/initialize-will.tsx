import { createFileRoute } from '@tanstack/react-router'
import { InitializeWillPage } from '../../pages/InitializeWillPage'

export const Route = createFileRoute('/app/initialize-will' as never)({
  component: InitializeWillPage,
})
