"use client";
import { useEffect, useMemo, useRef, useState } from "react";

interface Props { open: boolean; onClose: () => void; }

export default function GenerateFilesModal({ open, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [competitorInput, setCompetitorInput] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const stopPollingRef = useRef(false);

  useEffect(() => {
    if (!open) {
      cleanupTimer();
      resetForm();
    }
  }, [open]);

  function cleanupTimer() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function resetForm() {
    setEmail(""); setUrl(""); setPrompt(""); setCompetitorInput(""); setCompetitors([]);
    setSending(false); setError(null); setStartedAt(null); setElapsed(0); setWaiting(false); setSuccessMessage(null);
    stopPollingRef.current = false;
  }

  useEffect(() => {
    if (startedAt && waiting) {
      timerRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt) / 1000));
      }, 1000);
      return () => cleanupTimer();
    }
  }, [startedAt, waiting]);

  const elapsedFmt = useMemo(() => {
    const s = elapsed % 60;
    const m = Math.floor(elapsed / 60) % 60;
    const h = Math.floor(elapsed / 3600);
    const pad = (n:number) => n.toString().padStart(2,'0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }, [elapsed]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !url) {
      setError("Email and URL are required");
      return;
    }

    try {
      setSending(true);
      const body = { email, url, competitors, prompts: prompt };
      const res = await fetch('/api/generate-files-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Failed to send email');
      }

      // Start waiting/polling up to 60 minutes
      setSending(false);
      setWaiting(true);
      setStartedAt(Date.now());
      setSuccessMessage(null);
      await pollStatus(url);
    } catch (err:any) {
      setError(err.message || 'Unexpected error');
      setSending(false);
    }
  }

  async function pollStatus(targetUrl: string) {
    const start = Date.now();
    const maxMs = 60 * 60 * 1000; // 60 minutes
    const intervalMs = 15000; // 15s between polls

    while (!stopPollingRef.current && Date.now() - start < maxMs) {
      try {
        const res = await fetch('/api/generate-files-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: targetUrl }) });
        if (res.ok) {
          const data = await res.json();
          if ((data?.available || data?.success) && (data?.message === 'files are available' || data?.message === 'delivered' || data?.success) && data?.url === targetUrl) {
            // Stop timer and notify user
            setWaiting(false);
            cleanupTimer();
            setSuccessMessage('Files have been delivered to your inbox.');
            return;
          }
        }
      } catch (err) {
        // ignore transient errors
      }

      await new Promise(r => setTimeout(r, intervalMs));
    }

    setWaiting(false);
    cleanupTimer();
    if (!stopPollingRef.current) {
      alert('Stopped waiting. If you receive the email later, please check your inbox.');
    }
  }

  function addCompetitor() {
    const trimmed = competitorInput.trim();
    if (!trimmed) return;
    setCompetitors(prev => Array.from(new Set([...prev, trimmed])));
    setCompetitorInput("");
  }

  function removeCompetitor(c: string) {
    setCompetitors(prev => prev.filter(x => x !== c));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Generate Files</h2>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>✕</button>
        </div>

        {successMessage && (
          <div className="mb-4 rounded border border-green-300 bg-green-50 text-green-800 px-4 py-2">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 text-red-800 px-4 py-2">
            {error}
          </div>
        )}

        {!waiting ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" placeholder="you@example.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">URL</label>
              <input type="url" value={url} onChange={e=>setUrl(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" placeholder="https://example.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Competitors</label>
              <div className="flex gap-2">
                <input value={competitorInput} onChange={e=>setCompetitorInput(e.target.value)} className="flex-1 border rounded px-3 py-2" placeholder="https://competitor.com" />
                <button type="button" onClick={addCompetitor} className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200">Add</button>
              </div>
              {!!competitors.length && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {competitors.map(c=> (
                    <span key={c} className="inline-flex items-center gap-1 text-sm bg-gray-100 px-2 py-1 rounded">
                      {c}
                      <button type="button" onClick={()=>removeCompetitor(c)} className="text-gray-500 hover:text-gray-700">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Prompts</label>
              <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" rows={4} placeholder="Describe what files you want generated..." />
            </div>

            <div className="flex items-center justify-between">
              <button type="submit" disabled={sending} className="btn-firecrawl-default">{sending ? 'Sending…' : 'Send Request'}</button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between border rounded px-4 py-3 bg-gray-50">
            <div className="text-sm text-gray-900 font-semibold">Email sent. Generating files…</div>
            <div className="text-sm text-gray-900 font-bold">Elapsed <span className="font-mono">{elapsedFmt}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
