export type AssistantAction =
  | { type: 'open_url'; url: string }
  | { type: 'sms_compose'; to: string; body?: string }
  | { type: 'open_app'; app: string }
  | { type: 'none' };

export type AssistantCommandResult = {
  response: string;
  action: AssistantAction;
};

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[“”"']/g, '')
    .replace(/[^a-z0-9\s:+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSearchUrl(query: string) {
  const q = encodeURIComponent(query.trim());
  return `https://www.google.com/search?q=${q}`;
}

function buildSmsUrl(to: string, body?: string) {
  const cleaned = to.replace(/[^\d+]/g, '');
  const params = body ? `?body=${encodeURIComponent(body)}` : '';
  return `sms:${cleaned}${params}`;
}

const urlAliases: Record<string, string> = {
  youtube: 'https://www.youtube.com/',
  google: 'https://www.google.com/',
  gmail: 'https://mail.google.com/',
  whatsapp: 'https://web.whatsapp.com/',
  facebook: 'https://www.facebook.com/',
  instagram: 'https://www.instagram.com/',
  twitter: 'https://x.com/',
  x: 'https://x.com/',
  maps: 'https://www.google.com/maps',
};

const appAliases: Record<string, string> = {
  notepad: 'notepad',
  notes: 'notepad',
  calculator: 'calculator',
  calc: 'calculator',
};

export function routeAssistantCommand(raw: string): AssistantCommandResult | null {
  const text = normalize(raw);
  if (!text) return null;

  if (text === 'help' || text === 'commands') {
    return {
      response:
        'You can say: open YouTube, open WhatsApp, search <query>, or sms <number> <message>.',
      action: { type: 'none' },
    };
  }

  if (text.startsWith('open ')) {
    const target = text.slice('open '.length).trim();
    const url = urlAliases[target] ?? (target.startsWith('http') ? target : '');
    const app = appAliases[target];
    if (app) {
      return {
        response: `Confirm on screen to open ${target}.`,
        action: { type: 'open_app', app },
      };
    }
    if (!url) {
      return {
        response: `I can open websites like YouTube, WhatsApp, Gmail. I don't know "${target}".`,
        action: { type: 'none' },
      };
    }
    return { response: `Opening ${target}.`, action: { type: 'open_url', url } };
  }

  if (text.startsWith('search ')) {
    const query = text.slice('search '.length).trim();
    if (!query) return { response: 'Tell me what to search for.', action: { type: 'none' } };
    return { response: `Searching for ${query}.`, action: { type: 'open_url', url: buildSearchUrl(query) } };
  }

  if (text.startsWith('sms ')) {
    const rest = text.slice('sms '.length).trim();
    const [to, ...bodyParts] = rest.split(' ');
    const body = bodyParts.join(' ').trim();
    if (!to) return { response: 'Tell me a phone number for SMS.', action: { type: 'none' } };
    return {
      response: body ? `Preparing SMS to ${to}.` : `Opening SMS composer for ${to}.`,
      action: { type: 'sms_compose', to, body: body || undefined },
    };
  }

  if (text.includes('status')) {
    return { response: 'All systems nominal. Voice and interface online.', action: { type: 'none' } };
  }

  return null;
}

export function performAssistantAction(action: AssistantAction) {
  if (typeof window === 'undefined') return;
  if (action.type === 'open_url') {
    window.open(action.url, '_blank', 'noopener,noreferrer');
    return;
  }
  if (action.type === 'sms_compose') {
    window.location.href = buildSmsUrl(action.to, action.body);
    return;
  }
  if (action.type === 'open_app') {
    const confirmed = window.confirm(`Allow Jarvis to open "${action.app}" on this computer?`);
    if (!confirmed) return;
    void fetch('/api/desktop/open-app', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ app: action.app, confirmed: true }),
    }).catch(() => {});
  }
}
