'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Error occurred - redirecting:', error)
    
    // Immediate redirect with full page refresh
    window.location.replace('/')
    
  }, [error])

  // Return null to render nothing
  return null
}
