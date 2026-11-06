'use client';

import { useState, useEffect } from 'react';

interface Job {
  id: string;
  message: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | string;
  result: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function Home() {
  const [message, setMessage] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<'checking' | 'healthy' | 'unhealthy'>('checking');

  // Check health endpoint
  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        setHealthStatus('healthy');
      } else {
        setHealthStatus('unhealthy');
      }
    } catch {
      setHealthStatus('unhealthy');
    }
  };

  // Fetch recent jobs from GET /api/jobs
  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      if (res.ok) {
        const data: Job[] = await res.json();
        setJobs(data);
        setError(null);
      } else {
        setError(`Failed to fetch jobs (HTTP ${res.status})`);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
      setError('Cannot connect to backend API. Please make sure backend is running on port 3001.');
    }
  };

  // Poll every 2 seconds per Task 4 specification
  useEffect(() => {
    checkHealth();
    fetchJobs();
    const interval = setInterval(() => {
      checkHealth();
      fetchJobs();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Submit job to POST /api/jobs
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Server returned ${res.status}: ${errText || res.statusText}`);
      }

      setMessage('');
      await fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      <header className="header">
        <div className="title-group">
          <h1>VEGAH Job Processor</h1>
          <p>Next.js + NestJS + PostgreSQL + Redis + BullMQ</p>
        </div>
        <div className="health-indicator">
          <span
            className={`dot ${
              healthStatus === 'healthy'
                ? 'dot-healthy'
                : healthStatus === 'unhealthy'
                ? 'dot-unhealthy'
                : 'dot-checking'
            }`}
          />
          <span>
            {healthStatus === 'healthy'
              ? 'Services Online'
              : healthStatus === 'unhealthy'
              ? 'Backend Offline'
              : 'Connecting...'}
          </span>
        </div>
      </header>

      {/* Job Submission Card */}
      <section className="card">
        <div className="card-header">
          <h2>Submit a New Background Task</h2>
        </div>
        <form onSubmit={handleSubmit} className="form-row">
          <input
            type="text"
            placeholder="Enter message (e.g. testing background queue)..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !message.trim()}
          >
            {loading ? 'Submitting...' : 'Submit Job'}
          </button>
        </form>
        {error && <div className="alert-error">{error}</div>}
      </section>

      {/* Jobs History Card */}
      <section className="card">
        <div className="card-header">
          <h2>
            Recent Jobs{' '}
            <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
              ({jobs.length})
            </span>
          </h2>
          <div className="polling-badge">
            <span className="dot dot-healthy" style={{ width: 6, height: 6 }} />
            Live auto-refresh (2s)
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No jobs submitted yet</p>
            <p style={{ fontSize: '0.9rem' }}>Type a message above and click "Submit Job" to test the pipeline.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Status</th>
                <th>Message</th>
                <th>Computed Result</th>
                <th>Job ID</th>
                <th style={{ width: '100px' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <span className={`status-badge status-${job.status}`}>
                      {job.status}
                    </span>
                  </td>
                  <td>{job.message}</td>
                  <td className={`mono ${job.result ? 'result-cell' : ''}`}>
                    {job.result || <span style={{ color: '#64748b' }}>Waiting in queue...</span>}
                  </td>
                  <td className="mono" style={{ color: '#94a3b8' }} title={job.id}>
                    {job.id.slice(0, 8)}...
                  </td>
                  <td style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    {new Date(job.createdAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
