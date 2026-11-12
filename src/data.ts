import type { ChatMessage, FileNode, Room, User } from './types'

export const currentUser: User = {
  id: 'u-01',
  name: 'Alex Morgan',
  email: 'alex@codesync.dev',
  initials: 'AM',
  color: '#8b7cff',
  provider: 'github',
}

export const collaborators: User[] = [
  currentUser,
  { id: 'u-02', name: 'Maya Chen', email: 'maya@codesync.dev', initials: 'MC', color: '#5eead4' },
  { id: 'u-03', name: 'Theo Brooks', email: 'theo@codesync.dev', initials: 'TB', color: '#f7b267' },
  { id: 'u-04', name: 'Nia Wilson', email: 'nia@codesync.dev', initials: 'NW', color: '#ff7c98' },
]

export const rooms: Room[] = [
  {
    id: 'room-x72k',
    name: 'orbital-console',
    description: 'Mission control UI for the telemetry console.',
    branch: 'feat/command-center',
    language: 'typescript',
    files: 18,
    members: 4,
    updatedAt: '2 min ago',
    accent: '#8b7cff',
  },
  {
    id: 'room-p91m',
    name: 'signal-lab',
    description: 'Streaming primitives and event replay experiments.',
    branch: 'main',
    language: 'python',
    files: 9,
    members: 2,
    updatedAt: '1 hour ago',
    accent: '#5eead4',
  },
  {
    id: 'room-j44q',
    name: 'tiny-router',
    description: 'A zero-dependency router with typed params.',
    branch: 'refactor/matchers',
    language: 'rust',
    files: 12,
    members: 3,
    updatedAt: 'Yesterday',
    accent: '#f7b267',
  },
]

export const initialFiles: FileNode[] = [
  { id: 'folder-src', name: 'src', kind: 'folder' },
  { id: 'folder-components', name: 'components', kind: 'folder', parentId: 'folder-src' },
  {
    id: 'file-command',
    name: 'CommandCenter.tsx',
    kind: 'file',
    parentId: 'folder-components',
    language: 'typescript',
    modified: true,
    content: `import { useMemo, useState } from 'react'\nimport { Activity, Radio, ShieldCheck } from 'lucide-react'\n\nconst stations = ['Odyssey', 'Calypso', 'Pioneer']\n\nexport function CommandCenter() {\n  const [activeStation, setActiveStation] = useState(stations[0])\n  const telemetry = useMemo(() => getTelemetry(activeStation), [activeStation])\n\n  return (\n    <section className="command-center">\n      <header className="command-center__header">\n        <div>\n          <span className="eyebrow">Mission control</span>\n          <h1>Telemetry / {activeStation}</h1>\n        </div>\n        <span className="status-pill"><Radio size={14} /> Live sync</span>\n      </header>\n      <div className="station-tabs">\n        {stations.map((station) => (\n          <button key={station} onClick={() => setActiveStation(station)}>\n            {station}\n          </button>\n        ))}\n      </div>\n      <div className="telemetry-grid">\n        {telemetry.map((reading) => (\n          <TelemetryCard key={reading.label} reading={reading} />\n        ))}\n      </div>\n    </section>\n  )\n}\n\nfunction getTelemetry(station: string) {\n  return [\n    { label: 'Signal integrity', value: '99.94%', icon: ShieldCheck },\n    { label: 'Packets / sec', value: station === 'Pioneer' ? '1,842' : '2,406', icon: Activity },\n  ]\n}`,
  },
  { id: 'file-types', name: 'types.ts', kind: 'file', parentId: 'folder-src', language: 'typescript', content: `export type TelemetryReading = {\n  label: string\n  value: string\n  trend: 'up' | 'down' | 'steady'\n}\n\nexport type Station = {\n  id: string\n  name: string\n  orbit: string\n  readings: TelemetryReading[]\n}` },
  { id: 'file-api', name: 'api.ts', kind: 'file', parentId: 'folder-src', language: 'typescript', content: `const API_BASE = '/api'\n\nexport async function fetchTelemetry(stationId: string) {\n  const response = await fetch(\`\${API_BASE}/stations/\${stationId}/telemetry\`)\n  if (!response.ok) throw new Error('Telemetry request failed')\n  return response.json()\n}` },
  { id: 'folder-tests', name: 'tests', kind: 'folder' },
  { id: 'file-readme', name: 'README.md', kind: 'file', language: 'json', content: `# orbital-console\n\nShared mission control UI for the Codesync demo room.` },
  { id: 'file-env', name: '.env.example', kind: 'file', language: 'json', content: `DATABASE_URL=postgresql://codesync:codesync@localhost:5432/codesync\nJUDGE0_URL=http://localhost:2350\nGITHUB_CLIENT_ID=your-client-id` },
]

export const chatMessages: ChatMessage[] = [
  { id: 'm-1', author: 'System', initials: '◎', time: '09:41', text: 'Maya joined the room', color: '#8b7cff', system: true },
  { id: 'm-2', author: 'Maya Chen', initials: 'MC', time: '09:42', text: 'I pushed the telemetry card cleanup. The empty state reads much better now.', color: '#5eead4' },
  { id: 'm-3', author: 'Theo Brooks', initials: 'TB', time: '09:44', text: 'Nice. I am in api.ts wiring the station filter to the stream endpoint.', color: '#f7b267' },
  { id: 'm-4', author: 'Alex Morgan', initials: 'AM', time: '09:47', text: 'Perfect — I will run the typecheck and send the workspace to GitHub after this pass.', color: '#8b7cff' },
]

export const recentActivity = [
  { icon: 'file', text: 'Maya edited CommandCenter.tsx', time: '2m', color: '#5eead4' },
  { icon: 'branch', text: 'Alex created feat/command-center', time: '18m', color: '#8b7cff' },
  { icon: 'join', text: 'Theo joined the room', time: '31m', color: '#f7b267' },
  { icon: 'run', text: 'Execution completed in 0.42s', time: '1h', color: '#9ca3af' },
]
