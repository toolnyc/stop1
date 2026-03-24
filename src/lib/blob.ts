import { put } from '@vercel/blob';

export async function uploadReceipt(file: File, collaboratorId: string): Promise<string> {
  const filename = `receipts/${collaboratorId}/${Date.now()}-${file.name}`;
  const { url } = await put(filename, file, { access: 'public' });
  return url;
}

export async function uploadFlyer(file: File, eventSlug: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `flyers/${eventSlug}/${Date.now()}.${ext}`;
  const { url } = await put(filename, file, { access: 'public' });
  return url;
}
