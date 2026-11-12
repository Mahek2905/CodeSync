import type { Language } from '../types'

export const languageMeta: Record<
  Language,
  { label: string; color: string; extension: string }
> = {
  markdown: { label: 'Markdown', color: '#ffffff', extension: 'MD' },
  typescript: { label: 'TypeScript', color: '#6ea8fe', extension: 'TS' },
  javascript: { label: 'JavaScript', color: '#f7d154', extension: 'JS' },
  python: { label: 'Python', color: '#63c5da', extension: 'PY' },
  rust: { label: 'Rust', color: '#f7b267', extension: 'RS' },
  json: { label: 'JSON', color: '#b7a4ff', extension: '{}' },
  html: { label: 'HTML', color: '#e34c26', extension: 'HTML' },
  css: { label: 'CSS', color: '#563d7c', extension: 'CSS' },
  sql: { label: 'SQL', color: '#336791', extension: 'SQL' },
  java: { label: 'Java', color: '#f89820', extension: 'JAVA' },
  cpp: { label: 'C++', color: '#00599c', extension: 'CPP' },
  c: { label: 'C', color: '#555555', extension: 'C' },
  go: { label: 'Go', color: '#00add8', extension: 'GO' },
}