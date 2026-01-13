"use client";
import { useEffect, useState } from "react";

type Props = {
  onSubmitted?: (ok: boolean) => void;
};

export default function BrandIndustryForm({ onSubmitted }: Props) {
  const [brand, setBrand] = useState("");
  const [industry, setIndustry] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // hydrate from localStorage for persistence across tabs
    try {
      const b = localStorage.getItem("files_brand") || "";
      const i = localStorage.getItem("files_industry") || "";
      setBrand(b);
      setIndustry(i);
    } catch {}
  }, []);

  function persistLocal() {
    try {
      localStorage.setItem("files_brand", brand);
      localStorage.setItem("files_industry", industry);
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    persistLocal();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/files/brand-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, category: industry }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMessage("Saved successfully.");
      onSubmitted?.(true);
    } catch (e: any) {
      setMessage(e?.message || "Failed to save.");
      onSubmitted?.(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">Brand name</label>
        <input
          type="text"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className="w-full border rounded px-3 py-2"
          placeholder="e.g., Welzin"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Industry</label>
        <input
          type="text"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="w-full border rounded px-3 py-2"
          placeholder="e.g., SaaS, Healthcare, Retail"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {message && <span className="text-sm text-gray-600">{message}</span>}
      </div>
    </form>
  );
}
