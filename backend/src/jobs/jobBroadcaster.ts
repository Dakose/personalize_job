import type { WebSocket } from 'ws'

import type { JobRecord } from '../types.js'

export class JobBroadcaster {
  private readonly socketsByJobId = new Map<string, Set<WebSocket>>()

  subscribe(jobId: string, socket: WebSocket) {
    const subscribers = this.socketsByJobId.get(jobId) ?? new Set<WebSocket>()
    subscribers.add(socket)
    this.socketsByJobId.set(jobId, subscribers)

    socket.on('close', () => {
      this.unsubscribe(jobId, socket)
    })
  }

  publish(job: JobRecord) {
    const subscribers = this.socketsByJobId.get(job.id)

    if (!subscribers) {
      return
    }

    const payload = JSON.stringify({
      type: 'job:update',
      job,
    })

    for (const socket of subscribers) {
      if (socket.readyState === socket.OPEN) {
        socket.send(payload)
      }
    }
  }

  private unsubscribe(jobId: string, socket: WebSocket) {
    const subscribers = this.socketsByJobId.get(jobId)

    if (!subscribers) {
      return
    }

    subscribers.delete(socket)

    if (subscribers.size === 0) {
      this.socketsByJobId.delete(jobId)
    }
  }
}
