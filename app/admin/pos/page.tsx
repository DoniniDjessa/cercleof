"use client"

import POSPageComponent from './pos-component'

interface POSPageProps {
  mode?: 'products' | 'services' | 'all'
}

export default function POSPage({ mode = 'products' }: POSPageProps = {}) {
  return <POSPageComponent mode={mode} />
}
