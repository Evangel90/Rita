/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute()({
  component: Index,
})

function Index() {
  return (
    <div className="p-8">
      <h1>Legacy file-route entrypoint</h1>
    </div>
  )
}