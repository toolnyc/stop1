import { Resend } from 'resend';

const apiKey = import.meta.env.RESEND_API_KEY;

export const resend = apiKey ? new Resend(apiKey) : null;
