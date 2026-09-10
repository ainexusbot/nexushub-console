import { useEffect, useState } from 'react'
import { api } from './api'

export const METRICS = {
  companies: 'Companies',
  people: 'People',
  emails: 'Emails & content',
  company_analyses: 'Company analyses',
  person_analyses: 'Person analyses',
  batch_analyses: 'List analyses',
  company_batches: 'Company lists',
  templates: 'Templates',
}
export const ANALYSES = ['company_analyses', 'person_analyses', 'batch_analyses']
export const PAGE_SIZE = 25
export const inputClass =
  'w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50'
export const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed'
export const primaryClass = `${buttonClass} bg-primary text-primary-foreground border-primary hover:bg-primary/90`
export function number(value) {
  if (value === null || value === undefined) return '—'
  try {
    return BigInt(value).toLocaleString('en-US')
  } catch {
    return '—'
  }
}
export function date(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-GB', {
        timeZone: 'UTC',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}
export function periodLabel(period) {
  return `${date(period.startsAt)} → ${date(period.endsAt)} UTC`
}
export function queryString(params) {
  return new URLSearchParams(
    Object.entries(params).filter(
      ([, value]) => value !== '' && value !== undefined && value !== null,
    ),
  ).toString()
}
export async function readResponse(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`)
    error.code = data.code
    error.status = response.status
    throw error
  }
  return data
}
export function useResource(endpoint, refresh = 0) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  useEffect(() => {
    let active = true
    if (!endpoint) {
      setState({ data: null, error: null, loading: false })
      return
    }
    setState({ data: null, error: null, loading: true })
    api
      .get(endpoint)
      .then(readResponse)
      .then((data) => {
        if (active) setState({ data, error: null, loading: false })
      })
      .catch((error) => {
        if (active) setState({ data: null, error, loading: false })
      })
    return () => {
      active = false
    }
  }, [endpoint, refresh])
  return state
}
