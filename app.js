import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';

const app = express();
const port = process.env.PORT || 3000;
const token = process.env.SLACK_TOKEN;
const fromChannel = process.env.SLACK_FROM_CHANNEL;
const toChannel = process.env.SLACK_TO_CHANNEL;
const pattern = process.env.SLACK_PATTERN;
const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': `Bearer ${token}`,
};

app.use(bodyParser.json());

const auth = await fetch('https://slack.com/api/auth.test', { headers }).then((r) => r.json());

app.get('/ping', async (req, res) => res.send('pong'));

app.post('/webhook', async (req, res) => {
  if (req.body.challenge) {
    res.send(JSON.stringify({ challenge: req.body.challenge }));
    return;
  }

  const { channels } = await fetch(
    'https://slack.com/api/users.conversations?types=public_channel,private_channel', {
      headers,
    },
  ).then((r) => r.json());

  console.log(JSON.stringify(req.body));

  if (req.body.event.user === auth.user_id) return;

  const text = (req.body.event.text || '') + (req.body.event.attachments || [])
    .map((a) => a.blocks)
    .flat()
    .map((b) => b.text?.text || b.text || '')
    .join('\n');

  if (req.body.event.channel === channels.find((c) => c.name === fromChannel).id && text.includes(pattern)) {
    const channel = channels.find((c) => c.name === toChannel).id;
    const originalChannel = channels.find((c) => c.name === fromChannel).id;
    await fetch(
      'https://slack.com/api/chat.postMessage',
      {
        method: 'post',
        body: JSON.stringify({
          channel,
          text: `${auth.url}archives/${originalChannel}/p${req.body.event.ts.replace('.','')}`,
        }),
        headers,
      },
    );
  }
  res.status(200).end();
});

app.listen(port);