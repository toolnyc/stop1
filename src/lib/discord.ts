const DISCORD_WEBHOOK_URL = import.meta.env.DISCORD_WEBHOOK_URL;

interface AlertField {
  name: string;
  value: string;
  inline?: boolean;
}

interface AlertOptions {
  title: string;
  message: string;
  fields?: AlertField[];
  level?: 'error' | 'warn';
}

export async function sendDiscordAlert(opts: AlertOptions): Promise<void> {
  if (!DISCORD_WEBHOOK_URL) return;

  const color = opts.level === 'warn' ? 0xffa500 : 0xff0000;

  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: opts.title,
            description: opts.message,
            color,
            fields: opts.fields?.map((f) => ({
              name: f.name,
              value: f.value,
              inline: f.inline ?? true,
            })),
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch {
    // Swallow — alerting must never break the main flow
  }
}
