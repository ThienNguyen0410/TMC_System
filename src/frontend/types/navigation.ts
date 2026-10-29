import type { ReactNode } from 'react'

export interface AppNavItem {
  key: string
  label: string
  path: string
  icon: ReactNode
}

export interface RouteMeta {
  section: string
  title: string
}
