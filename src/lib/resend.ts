import { Resend } from 'resend';

const apiKey = import.meta.env.RESEND_API_KEY;

export const resend = apiKey ? new Resend(apiKey) : null;

export const RESEND_AUDIENCE_ID = '884b793e-8031-49b0-92c2-01a21732841a';
