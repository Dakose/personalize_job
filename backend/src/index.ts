import { createServer } from 'node:http'

import cors from 'cors'
import express from 'express'
import { WebSocketServer } from 'ws'

import { JobBroadcaster } from './jobs/jobBroadcaster.js'
import { JobRepository } from './jobs/jobRepository.js'
import { JobService } from './jobs/jobService.js'

const port = Number(process.env.PORT ?? 3001)
const allowedOrigins = process.env.CORS_ORIGIN?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

const repository = new JobRepository()
const broadcaster = new JobBroadcaster()
const jobService = new JobService(repository, broadcaster)

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || !allowedOrigins || allowedOrigins.length === 0) {
        callback(null, true)
        return
      }

      callback(
        allowedOrigins.includes(origin)
          ? null
          : new Error(`Origin ${origin} is not allowed by CORS`),
        allowedOrigins.includes(origin),
      )
    },
  }),
)
app.use(express.json())

app.get('/health', (_request, response) => {
  response.json({ ok: true, service: 'backend' })
})

app.post('/jobs', (request, response) => {
  const selection =
    typeof request.body?.selection === 'string' ? request.body.selection.trim() : ''
  const inputValue = Number(request.body?.inputValue)

  if (!selection) {
    response.status(400).json({ error: 'selection is required' })
    return
  }

  if (!Number.isFinite(inputValue) || inputValue <= 0) {
    response.status(400).json({ error: 'inputValue must be a number greater than 0' })
    return
  }

  const job = jobService.createJob({
    selection,
    inputValue,
  })

  response.status(201).json({ job })
})

app.get('/jobs/:id', (request, response) => {
  const job = jobService.getJob(request.params.id)

  if (!job) {
    response.status(404).json({ error: 'Job not found' })
    return
  }

  response.json({ job })
})

wss.on('connection', (socket, request) => {
  const url = new URL(request.url ?? '', `http://${request.headers.host ?? 'localhost'}`)
  const jobId = url.searchParams.get('jobId')

  if (!jobId) {
    socket.close(1008, 'jobId query parameter is required')
    return
  }

  broadcaster.subscribe(jobId, socket)

  const job = jobService.getJob(jobId)

  if (!job) {
    socket.send(JSON.stringify({ type: 'job:not-found', jobId }))
    return
  }

  socket.send(
    JSON.stringify({
      type: 'job:update',
      job,
    }),
  )
})

server.listen(port, () => {
  console.log(`Backend server is listening on http://localhost:${port}`)
})
