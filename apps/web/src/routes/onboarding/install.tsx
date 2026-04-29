import { createFileRoute } from '@tanstack/react-router'
import { OnboardingInstallPage } from '../../pages/OnboardingInstallPage'

export const Route = createFileRoute('/onboarding/install' as never)({
  component: OnboardingInstallPage,
})
