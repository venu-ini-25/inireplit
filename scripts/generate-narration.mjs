import { writeFileSync } from 'fs';

const BASE_URL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const API_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

if (!BASE_URL || !API_KEY) {
  console.error('Missing AI_INTEGRATIONS_OPENAI_BASE_URL or AI_INTEGRATIONS_OPENAI_API_KEY');
  process.exit(1);
}

const segments = [
  {
    id: 'welcome',
    text: `Welcome to iNi — your command center for finance, operations, portfolio, and M&A. Everything you see here updates automatically from your connected data sources, giving you a live picture of your entire business in one place.`,
  },
  {
    id: 'pl',
    text: `The Profit and Loss view breaks down your revenue and costs by quarter — so you can see exactly where money is coming in, where it's going, and how your margins are trending over time.`,
  },
  {
    id: 'cashflow',
    text: `Cash Flow gives you a complete picture of your liquidity. Monthly inflows and outflows are visualized side by side, with a waterfall breakdown showing where cash is being generated and spent across every part of the business.`,
  },
  {
    id: 'portfolio',
    text: `The Portfolio view shows every company you're invested in. Fund-level performance metrics sit at the top, with individual company cards below showing each one's growth trajectory, valuation multiple, and current health status.`,
  },
  {
    id: 'ma',
    text: `The M&A pipeline tracks every active deal from initial sourcing all the way through to close. Your whole team always knows what's moving, what's stalled, and what needs attention — no spreadsheets required.`,
  },
  {
    id: 'reports',
    text: `Reports and Analytics lets you benchmark your portfolio against industry peers. See how you compare on growth, margins, and efficiency — and generate investor-ready reports with a single click.`,
  },
  {
    id: 'outro',
    text: `That's iNi. One platform for every financial insight, every portfolio signal, and every deal in motion — built for modern venture and private equity teams.`,
  },
];

const outputDir = 'artifacts/ini-demo-video/public/audio';

for (const seg of segments) {
  process.stdout.write(`Generating: ${seg.id}... `);
  try {
    const resp = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-audio',
        modalities: ['text', 'audio'],
        audio: { voice: 'alloy', format: 'mp3' },
        messages: [
          {
            role: 'system',
            content:
              'You are a professional narrator for a product demo video. Speak warmly, clearly, and confidently at a natural pace. Speak exactly the text the user provides — no extra words or commentary.',
          },
          { role: 'user', content: seg.text },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`HTTP ${resp.status}: ${errText.substring(0, 300)}`);
      continue;
    }

    const data = await resp.json();
    const audioData = data.choices?.[0]?.message?.audio?.data;

    if (audioData) {
      const buffer = Buffer.from(audioData, 'base64');
      writeFileSync(`${outputDir}/${seg.id}.mp3`, buffer);
      console.log(`✓ ${buffer.length} bytes`);
    } else {
      console.log(`✗ no audio data`);
      console.log('  msg keys:', Object.keys(data.choices?.[0]?.message || {}));
      if (data.error) console.log('  error:', JSON.stringify(data.error));
    }
  } catch (err) {
    console.error(`error: ${err.message}`);
  }
}
console.log('\nDone!');
