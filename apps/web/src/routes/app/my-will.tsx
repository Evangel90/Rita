import { createFileRoute } from '@tanstack/react-router'
import { MyWillPage } from '../../pages/MyWillPage'

export const Route = createFileRoute('/app/my-will' as never)({
  component: MyWillPage,
})
