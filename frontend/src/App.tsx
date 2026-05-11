import { useEffect, useMemo, useRef, useState } from 'react'

import { createJob, getJob, WS_BASE_URL } from './api'
import type { JobRecord } from './types'
import './App.css'

type Step = 1 | 2 | 3
type TransportMode = 'ws' | 'http'

const OPTIONS = [
  'Lose weight',
  'Build healthier habits',
  'Boost daily energy',
  'Improve sleep routine',
  'Reduce stress',
]

function App() {
  const [step, setStep] = useState<Step>(1)
  const [selectedOption, setSelectedOption] = useState('')
  const [numericValue, setNumericValue] = useState('')
  const [activeJob, setActiveJob] = useState<JobRecord | null>(null)
  const [transportMode, setTransportMode] = useState<TransportMode | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  const socketRef = useRef<WebSocket | null>(null)
  const pollingRef = useRef<number | null>(null)

  const parsedValue = useMemo(() => Number(numericValue), [numericValue])
  const isNumberValid = Number.isFinite(parsedValue) && parsedValue > 0
  const isJobRunning =
    activeJob?.status === 'queued' || activeJob?.status === 'processing' || isStarting
  const hasResult = activeJob?.status === 'done'

  const cleanupLiveUpdates = () => {
    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }

    if (pollingRef.current) {
      window.clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  useEffect(() => cleanupLiveUpdates, [])

  const resetFlow = () => {
    cleanupLiveUpdates()
    setStep(1)
    setSelectedOption('')
    setNumericValue('')
    setActiveJob(null)
    setTransportMode(null)
    setIsStarting(false)
    setFeedbackMessage(null)
  }

  const moveBack = () => {
    if (isJobRunning) {
      return
    }

    setFeedbackMessage(null)
    setStep((previousStep) => {
      if (previousStep === 1) {
        return previousStep
      }

      return (previousStep - 1) as Step
    })
  }

  const handleJobUpdate = (job: JobRecord) => {
    setActiveJob(job)

    if (job.status === 'done') {
      setFeedbackMessage('Processing finished successfully.')
      setIsStarting(false)
      cleanupLiveUpdates()
    }

    if (job.status === 'failed') {
      setFeedbackMessage(job.errorMessage ?? 'The job failed unexpectedly.')
      setIsStarting(false)
      cleanupLiveUpdates()
    }
  }

  const startPolling = (jobId: string) => {
    const refreshStatus = async () => {
      try {
        const response = await getJob(jobId)
        handleJobUpdate(response.job)
      } catch (error) {
        cleanupLiveUpdates()
        setIsStarting(false)
        setFeedbackMessage(error instanceof Error ? error.message : 'Polling failed.')
      }
    }

    void refreshStatus()
    pollingRef.current = window.setInterval(() => {
      void refreshStatus()
    }, 1000)
  }

  const startWebSocket = (jobId: string) => {
    const socket = new WebSocket(`${WS_BASE_URL}/ws?jobId=${jobId}`)
    socketRef.current = socket

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as
        | { type: 'job:update'; job: JobRecord }
        | { type: 'job:not-found'; jobId: string }

      if (payload.type === 'job:update') {
        handleJobUpdate(payload.job)
        return
      }

      setFeedbackMessage(`Job ${payload.jobId} was not found.`)
      setIsStarting(false)
    }

    socket.onerror = () => {
      setFeedbackMessage('WebSocket connection failed.')
      setIsStarting(false)
    }
  }

  const startJob = async (mode: TransportMode) => {
    if (!selectedOption || !isNumberValid) {
      return
    }

    cleanupLiveUpdates()
    setTransportMode(mode)
    setActiveJob(null)
    setFeedbackMessage(null)
    setIsStarting(true)

    try {
      const response = await createJob({
        selection: selectedOption,
        inputValue: parsedValue,
      })

      setActiveJob(response.job)

      if (mode === 'ws') {
        startWebSocket(response.job.id)
      } else {
        startPolling(response.job.id)
      }
    } catch (error) {
      setIsStarting(false)
      setFeedbackMessage(error instanceof Error ? error.message : 'Unable to create job.')
    }
  }

  return (
    <main className="page-shell">
      <section className="onboarding-card">
        <div className="step-progress" aria-hidden="true">
          <span className="step-progress__fill" style={{ width: `${(step / 3) * 100}%` }} />
        </div>

        <div className="toolbar">
          <button
            type="button"
            className="ghost-button"
            onClick={moveBack}
            disabled={step === 1 || isJobRunning}
          >
            Back
          </button>
        </div>

        {step === 1 && (
          <section className="screen">
            <p className="eyebrow">Step 1 of 3</p>
            <h1>What is your main wish?</h1>
            <p className="screen-copy">
              Choose one focus area to personalize the job result.
            </p>

            <div className="option-list">
              {OPTIONS.map((option) => {
                const isSelected = selectedOption === option

                return (
                  <button
                    key={option}
                    type="button"
                    className={`option-card ${isSelected ? 'option-card--selected' : ''}`}
                    onClick={() => setSelectedOption(option)}
                  >
                    <span className="option-card__label">{option}</span>
                    <span className="option-card__check">{isSelected ? 'Selected' : 'Choose'}</span>
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              className="primary-button"
              disabled={!selectedOption}
              onClick={() => setStep(2)}
            >
              Continue
            </button>
          </section>
        )}

        {step === 2 && (
          <section className="screen">
            <p className="eyebrow">Step 2 of 3</p>
            <h1>Enter your goal number</h1>
            <p className="screen-copy">
              Use any positive number. For example, this can be your target weight in kg.
            </p>

            <label className="number-panel">
              <span className="number-panel__label">Goal value</span>
              <input
                type="number"
                min="1"
                step="1"
                value={numericValue}
                onChange={(event) => setNumericValue(event.target.value)}
                placeholder="56"
              />
            </label>

            <p className={`validation-text ${isNumberValid || !numericValue ? '' : 'is-error'}`}>
              {numericValue
                ? isNumberValid
                  ? 'Looks valid, you can continue.'
                  : 'Please enter a number greater than 0.'
                : 'Validation rule: value must be greater than 0.'}
            </p>

            <button
              type="button"
              className="primary-button"
              disabled={!isNumberValid}
              onClick={() => setStep(3)}
            >
              Continue
            </button>
          </section>
        )}

        {step === 3 && (
          <section className="screen">
            <p className="eyebrow">Step 3 of 3</p>
            <h1>Run the job</h1>
            <p className="screen-copy">
              Launch processing with either real-time WebSocket updates or HTTP polling.
            </p>

            <div className="summary-grid">
              <article className="summary-card">
                <span className="summary-card__title">Selected wish</span>
                <strong>{selectedOption}</strong>
              </article>
              <article className="summary-card">
                <span className="summary-card__title">Goal number</span>
                <strong>{parsedValue}</strong>
              </article>
            </div>

            <div className="action-row">
              <button
                type="button"
                className="secondary-button"
                disabled={isJobRunning}
                onClick={() => void startJob('ws')}
              >
                Start with WebSocket
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={isJobRunning}
                onClick={() => void startJob('http')}
              >
                Start with HTTP
              </button>
            </div>

            {(transportMode || activeJob || feedbackMessage) && (
              <section className="status-card">
                <div className="status-card__header">
                  <div>
                    <span className="status-card__title">Job status</span>
                    <h2>{activeJob?.status ?? (isStarting ? 'queued' : 'idle')}</h2>
                  </div>
                  {transportMode && (
                    <span className="mode-badge">
                      {transportMode === 'ws' ? 'WebSocket' : 'HTTP polling'}
                    </span>
                  )}
                </div>

                {transportMode === 'ws' ? (
                  <div className="progress-block">
                    <div className="progress-track" aria-hidden="true">
                      <span
                        className="progress-track__fill"
                        style={{ width: `${activeJob?.progress ?? 0}%` }}
                      />
                    </div>
                    <p className="progress-caption">
                      {activeJob ? `${activeJob.progress}% completed` : 'Waiting for updates...'}
                    </p>
                  </div>
                ) : (
                  <div className="progress-block">
                    <div className="progress-track progress-track--indeterminate" aria-hidden="true">
                      <span className="progress-track__moving-fill" />
                    </div>
                    <p className="progress-caption">
                      {hasResult
                        ? 'Polling completed and the result is ready.'
                        : 'Polling the backend until the job is done...'}
                    </p>
                  </div>
                )}

                {activeJob?.id && <p className="job-meta">Job ID: {activeJob.id}</p>}

                {feedbackMessage && (
                  <p className={`feedback ${activeJob?.status === 'failed' ? 'feedback--error' : ''}`}>
                    {feedbackMessage}
                  </p>
                )}

                {activeJob?.result && (
                  <article className="result-card">
                    <h3>{activeJob.result.title}</h3>
                    <p>{activeJob.result.summary}</p>
                    <p>{activeJob.result.recommendation}</p>
                    <strong>Confidence: {activeJob.result.confidence}%</strong>
                  </article>
                )}

                <button type="button" className="primary-button" onClick={resetFlow}>
                  Reset
                </button>
              </section>
            )}
          </section>
        )}
      </section>
    </main>
  )
}

export default App
