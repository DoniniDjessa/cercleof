"use client"

import { useEffect } from "react"

export function UnregisterSW() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Unregister all service workers
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().then((success) => {
            if (success) {
              console.log("Service Worker unregistered successfully")
            }
          })
        })
      })

      // Also clear all caches
      if ("caches" in window) {
        caches.keys().then((cacheNames) => {
          cacheNames.forEach((cacheName) => {
            caches.delete(cacheName)
          })
        })
      }
    }
  }, [])

  return null
}

