"use client"

// Salon POS - Services with products (admins/managers only)
// This is a POS for selling services
// Admins and managers can also sell products here
// Other employees can only sell services

import POSPage from '../pos/page'

export default function SalonPage() {
  // This page is a wrapper that restricts the POS to services mode
  // Products will be available only for admins/managers
  return <POSPage mode="services" />
}

