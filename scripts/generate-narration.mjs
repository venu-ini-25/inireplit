import { writeFileSync } from 'fs';

const BASE_URL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const API_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

if (!BASE_URL || !API_KEY) {
  console.error('Missing AI_INTEGRATIONS_OPENAI_BASE_URL or AI_INTEGRATIONS_OPENAI_API_KEY');
  process.exit(1);
}

// Only generate the NEW segments not already created
const segments = [
  {
    id: 'expenses',
    text: `The Expenses view breaks down every cost by category and vendor — so you can see exactly where money is going, spot anomalies, and track spending trends over time.`,
  },
  {
    id: 'operations',
    text: `Operations gives you a live view of business health — key performance indicators across delivery, efficiency, and quality, all tracked in real time against your targets.`,
  },
  {
    id: 'product',
    text: `The Product dashboard surfaces your most important metrics — feature adoption, active usage, and release velocity — all in one clear view for your engineering and product teams.`,
  },
  {
    id: 'marketing',
    text: `Marketing shows your full acquisition funnel — from lead generation and campaign performance, all the way down to cost per acquisition and conversion rates by channel.`,
  },
  {
    id: 'sales',
    text: `Sales gives you a real-time view of your pipeline, win rates, average deal size, and exactly where your revenue is coming from — broken down by rep and by stage.`,
  },
  {
    id: 'people',
    text: `People tracks your headcount by department, hiring velocity, and team growth — so leadership always has a clear picture of where the team stands and where it's heading.`,
  },
  {
    id: 'services',
    text: `Professional Services tracks active client engagements, project milestones, and revenue per engagement — keeping delivery on track and clients in the loop.`,
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
              'You are a professional narrator for a product demo video. Speak warmly, clearly, and confidently at a natural pace. Speak exactly the text the user provides — no extra words, no commentary.',
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
      if (data.error) console.log('  error:', JSON.stringify(data.error));
    }
  } catch (err) {
    console.error(`error: ${err.message}`);
  }
}
console.log('\nDone!');
