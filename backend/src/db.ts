import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(currentDir, '../data')
const databasePath = path.join(dataDir, 'jobs.db')

mkdirSync(dataDir, { recursive: true })

export const db = new DatabaseSync(databasePath)

db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    selection TEXT NOT NULL,
    input_value REAL NOT NULL,
    status TEXT NOT NULL,
    progress INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    result TEXT,
    error_message TEXT
  )
`)
