// Global error suppression for wallet extension errors
export const setupGlobalErrorSuppression = () => {
  if (typeof window === 'undefined') return

  // Store original console methods
  const originalConsoleError = console.error
  const originalConsoleWarn = console.warn
  const originalConsoleLog = console.log

  // Function to check if an error should be suppressed
  const shouldSuppressError = (message: any): boolean => {
    if (typeof message === 'string') {
      return message.includes('inpage.js') || 
             message.includes('postMessage') ||
             message.includes('handleMessage') ||
             message.includes('unstable_scheduleCallback') ||
             message.includes('setImmedia') ||
             message.includes('extension') ||
             message.includes('VM') ||
             message.includes('Uncaught')
    }
    return false
  }

  // Override console.error to filter out wallet extension errors
  console.error = (...args: any[]) => {
    if (!shouldSuppressError(args[0])) {
      originalConsoleError.apply(console, args)
    }
  }

  // Override console.warn to filter out wallet extension errors
  console.warn = (...args: any[]) => {
    if (!shouldSuppressError(args[0])) {
      originalConsoleWarn.apply(console, args)
    }
  }

  // Override console.log to filter out wallet extension errors
  console.log = (...args: any[]) => {
    if (!shouldSuppressError(args[0])) {
      originalConsoleLog.apply(console, args)
    }
  }

  // Suppress uncaught errors from wallet extensions
  window.addEventListener('error', (event) => {
    const errorMessage = event.message || ''
    const fileName = event.filename || ''
    
    const isWalletExtensionError = 
      fileName.includes('inpage.js') ||
      fileName.includes('extension') ||
      fileName.includes('content_script') ||
      errorMessage.includes('postMessage') ||
      errorMessage.includes('handleMessage') ||
      errorMessage.includes('unstable_scheduleCallback') ||
      errorMessage.includes('setImmedia') ||
      errorMessage.includes('VM') ||
      errorMessage.includes('Uncaught')

    if (isWalletExtensionError) {
      event.preventDefault()
      event.stopPropagation()
      return false
    }
  }, true)

  // Suppress unhandled promise rejections from wallet extensions
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const errorMessage = reason instanceof Error ? reason.message : String(reason)
    
    const isWalletExtensionError = 
      errorMessage.includes('inpage.js') ||
      errorMessage.includes('postMessage') ||
      errorMessage.includes('handleMessage') ||
      errorMessage.includes('unstable_scheduleCallback') ||
      errorMessage.includes('setImmedia') ||
      errorMessage.includes('extension') ||
      errorMessage.includes('VM') ||
      errorMessage.includes('Uncaught')

    if (isWalletExtensionError) {
      event.preventDefault()
      return false
    }
  })

  // Suppress specific error patterns that are common with wallet extensions
  const originalOnError = window.onerror
  window.onerror = (message, source, lineno, colno, error) => {
    const errorMessage = String(message)
    const fileName = String(source || '')
    
    const isWalletExtensionError = 
      fileName.includes('inpage.js') ||
      fileName.includes('extension') ||
      fileName.includes('content_script') ||
      errorMessage.includes('postMessage') ||
      errorMessage.includes('handleMessage') ||
      errorMessage.includes('unstable_scheduleCallback') ||
      errorMessage.includes('setImmedia') ||
      errorMessage.includes('VM') ||
      errorMessage.includes('Uncaught')

    if (isWalletExtensionError) {
      return true // Suppress the error
    }

    // Call original error handler if it exists
    if (originalOnError) {
      return originalOnError(message, source, lineno, colno, error)
    }

    return false
  }
}

// Initialize error suppression immediately
if (typeof window !== 'undefined') {
  setupGlobalErrorSuppression()
}
