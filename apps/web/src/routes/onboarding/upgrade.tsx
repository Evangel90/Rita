import { createFileRoute } from '@tanstack/react-router'
import { OnboardingUpgradePage } from '../../pages/OnboardingUpgradePage'

export const Route = createFileRoute('/onboarding/upgrade' as never)({
  component: OnboardingUpgradePage,
})
