import { Bookmark, CalendarClock, Compass, Home, Map, Users } from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/map', label: 'Map', icon: Map, end: false },
  { to: '/explore', label: 'Explore', icon: Compass, end: false },
  { to: '/plan', label: 'Plan', icon: CalendarClock, end: false },
  { to: '/saved', label: 'Saved', icon: Bookmark, end: false },
  { to: '/friends', label: 'Friends', icon: Users, end: false },
] as const
