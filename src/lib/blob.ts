import { put } from '@vercel/blob';

export async function uploadReceipt(file: File, collaboratorId: string): Promise<string> {
  const filename = `receipts/${collaboratorId}/${Date.now()}-${file.name}`;
  const { url } = await put(filename, file, { access: 'public' });
  return url;
}
