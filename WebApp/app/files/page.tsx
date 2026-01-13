export const dynamic = 'force-dynamic';

async function fetchFiles() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/files/list`, { cache: 'no-store' });
  if (!res.ok) return { files: [] } as { files: { name: string; url: string; size?: number }[] };
  return res.json();
}

import FilesClient from '@/components/files/FilesClient';

export default async function FilesPage() {
  const { files } = await fetchFiles();
  const waiting = files.length === 0;
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Files</h1>
      <FilesClient waiting={waiting} files={files} />
    </div>
  );
}
