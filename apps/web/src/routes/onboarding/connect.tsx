import { createFileRoute } from '@tanstack/react-router'
import { OnboardingConnectPage } from '../../pages/OnboardingConnectPage'

export const Route = createFileRoute('/onboarding/connect' as never)({
  component: OnboardingConnectPage,
})
