import { randomUUID } from 'node:crypto'

import { db } from '../db.js'
import type { CreateJobInput, JobRecord, JobResult, JobStatus } from '../types.js'

type JobRow = {
  id: string
  selection: string
  input_value: number
  status: JobStatus
  progress: number
  created_at: string
  result: string | null
  error_message: string | null
}

type JobUpdate = Partial<Pick<JobRecord, 'status' | 'progress' | 'result' | 'errorMessage'>>

const insertJobStatement = db.prepare(`
  INSERT INTO jobs (id, selection, input_value, status, progress, created_at, result, error_message)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`)

const selectJobStatement = db.prepare(`
  SELECT id, selection, input_value, status, progress, created_at, result, error_message
  FROM jobs
  WHERE id = ?
`)

export class JobRepository {
  create(input: CreateJobInput): JobRecord {
    const id = randomUUID()
    const createdAt = new Date().toISOString()

    insertJobStatement.run(
      id,
      input.selection,
      input.inputValue,
      'queued',
      0,
      createdAt,
      null,
      null,
    )

    const job = this.findById(id)

    if (!job) {
      throw new Error('Failed to read created job')
    }

    return job
  }

  findById(id: string): JobRecord | null {
    const row = selectJobStatement.get(id) as JobRow | undefined

    if (!row) {
      return null
    }

    return mapRowToJob(row)
  }

  update(id: string, updates: JobUpdate): JobRecord | null {
    const fields: string[] = []
    const values: Array<JobStatus | number | string | null> = []

    if (updates.status) {
      fields.push('status = ?')
      values.push(updates.status)
    }

    if (typeof updates.progress === 'number') {
      fields.push('progress = ?')
      values.push(updates.progress)
    }

    if (updates.result !== undefined) {
      fields.push('result = ?')
      values.push(updates.result ? JSON.stringify(updates.result) : null)
    }

    if (updates.errorMessage !== undefined) {
      fields.push('error_message = ?')
      values.push(updates.errorMessage)
    }

    if (fields.length === 0) {
      return this.findById(id)
    }

    const statement = db.prepare(`UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`)
    statement.run(...values, id)

    return this.findById(id)
  }
}

function mapRowToJob(row: JobRow): JobRecord {
  return {
    id: row.id,
    selection: row.selection,
    inputValue: row.input_value,
    status: row.status,
    progress: row.progress,
    createdAt: row.created_at,
    result: row.result ? (JSON.parse(row.result) as JobResult) : null,
    errorMessage: row.error_message,
  }
}
