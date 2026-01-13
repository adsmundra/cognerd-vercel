"use client";
import dynamic from 'next/dynamic';

const ElapsedTimer = dynamic(() => import('@/components/files/ElapsedTimer'), { ssr: false });
const MarkReady = dynamic(() => import('@/components/files/MarkReady'), { ssr: false });
const BrandIndustryForm = dynamic(() => import('@/components/files/BrandIndustryForm'), { ssr: false });

export default function FilesClient({ waiting, files }: { waiting: boolean; files: { name: string; url: string; size?: number }[] }) {
  return (
    <>
      <BrandIndustryForm />
      <ElapsedTimer active={waiting} />
      {!waiting && <MarkReady />}
      {files.length === 0 ? (
        <p className="text-gray-500">No files available yet. Waiting for callback…</p>
      ) : (
        <ul className="space-y-3">
          {files.map((f) => (
            <li key={f.name} className="flex items-center justify-between border rounded p-3">
              <div>
                <div className="font-medium">{f.name}</div>
                {typeof f.size === 'number' && <div className="text-xs text-gray-500">{f.size} bytes</div>}
              </div>
              <a
                href={f.url}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                download
              >
                Download
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
