"use client";
import { useEffect } from 'react';

export default function MarkReady() {
  useEffect(() => {
    try { localStorage.setItem('files_timer_stopped', '1'); } catch {}
  }, []);
  return null;
}
