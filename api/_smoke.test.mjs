// Smoke test for the persona endpoint with the network stubbed out.
// Verifies: system-prompt assembly, cache_control placement, schema wiring,
// message/image construction, panel fan-out, and source resolution.

// Patch at the SDK's Messages class so the stub survives client construction
// (the client assigns `messages` as an own property in its constructor).
import { Messages } from '@anthropic-ai/sdk/resources/messages/messages.mjs';

const captured = [];
const stub = {
  create: async (params) => {
    captured.push(params);
    return {
      stop_reason: 'end_turn',
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            answer: 'Who owns the error if that summary is wrong? That lands on me.',
            confidence: 'B',
            confidence_reason: 'Documented behaviour of this population, not this exact question.',
            what_would_raise_it: "DISCO's win/loss interviews with junior partners.",
            sources: ['E3', 'D2', 'BOGUS-ID'],
            am_i_the_user: 'partly',
            objection: 'Verification is the one thing I cannot delegate.',
            what_would_change_it: 'Show the source document beside every generated line.',
            would_let_team_adopt: 'not-my-call',
          }),
        },
      ],
      usage: {
        input_tokens: 4200,
        output_tokens: 180,
        cache_read_input_tokens: 3900,
        cache_creation_input_tokens: 0,
      },
    };
  },
};
Messages.prototype.create = stub.create;

process.env.ANTHROPIC_API_KEY = 'test-key-not-used';
const { default: handler } = await import('./persona.js');

function mockRes() {
  return {
    _status: 0,
    _json: null,
    status(s) { this._status = s; return this; },
    json(j) { this._json = j; return this; },
  };
}

let failures = 0;
const check = (label, cond, detail = '') => {
  console.log(`${cond ? '  PASS' : '  FAIL'}  ${label}${cond ? '' : ` — ${detail}`}`);
  if (!cond) failures++;
};

// ---- 1. plain chat -------------------------------------------------------
console.log('\n1. chat, single persona');
captured.length = 0;
let res = mockRes();
await handler(
  { method: 'POST', body: { persona: 'steven', mode: 'chat', messages: [{ role: 'user', content: 'Where does your week go?' }] } },
  res,
);
check('200', res._status === 200, JSON.stringify(res._json).slice(0, 300));
const p = captured[0];
check('model is claude-opus-5', p.model === 'claude-opus-5', p.model);
check('max_tokens 16000', p.max_tokens === 16000, p.max_tokens);
check('effort medium for chat', p.output_config.effort === 'medium', p.output_config.effort);
check('json_schema format set', p.output_config.format?.type === 'json_schema');
check('schema has additionalProperties:false', p.output_config.format.schema.additionalProperties === false);
check('every property is required',
  Object.keys(p.output_config.format.schema.properties).length === p.output_config.format.schema.required.length);
check('cache_control on system block', p.system[0].cache_control?.type === 'ephemeral');
check('system carries the dossier', p.system[0].text.includes('I make Jose look good'));
check('system carries evidence with IDs', p.system[0].text.includes('[E3]'));
check('unverified figures are flagged', p.system[0].text.includes('UNVERIFIED FIGURE'));
check('no rubric leaked into chat mode', !JSON.stringify(p.messages).includes('rubric'));
const a = res._json.answers[0];
check('bogus source ID dropped', a.sources.length === 2, JSON.stringify(a.sources.map((s) => s.id)));
check('sources resolved to provenance', a.sources[0].source.length > 10 && 'tier' in a.sources[0]);
check('usage surfaced', a.usage.cache_read === 3900);
check('name attached', a.name === 'Steven');

// ---- 2. review mode with an image ---------------------------------------
console.log('\n2. design review with image');
captured.length = 0;
res = mockRes();
await handler(
  {
    method: 'POST',
    body: {
      persona: 'steven',
      mode: 'review',
      messages: [{ role: 'user', content: 'Reaction to this?' }],
      image: { media_type: 'image/png', data: 'aGVsbG8=' },
    },
  },
  res,
);
check('200', res._status === 200);
const rp = captured[0];
check('effort high for review', rp.output_config.effort === 'high', rp.output_config.effort);
const blocks = rp.messages.at(-1).content;
check('image block first', blocks[0].type === 'image' && blocks[0].source.media_type === 'image/png');
check('rubric injected in user turn', blocks.some((b) => b.type === 'text' && b.text.includes('Is this persona even the user')));
check('user question preserved', blocks.at(-1).text === 'Reaction to this?');
check('rubric NOT in system prompt', !rp.system[0].text.includes('Is this persona even the user'));

// ---- 3. panel mode ------------------------------------------------------
console.log('\n3. panel mode');
captured.length = 0;
res = mockRes();
await handler(
  { method: 'POST', body: { persona: 'panel', messages: [{ role: 'user', content: 'AI-drafted client update. Reaction?' }] } },
  res,
);
check('three answers', res._json.answers.length === 3, res._json.answers?.length);
check('three separate API calls', captured.length === 3, captured.length);
const names = res._json.answers.map((x) => x.name);
check('Steven, Jose, Bill', JSON.stringify(names) === '["Steven","Jose","Bill"]', JSON.stringify(names));
check('each got its own dossier',
  captured[1].system[0].text.includes('walk into that client meeting') &&
  captured[2].system[0].text.includes('Security, compliance, integration'));
check('system prompts differ per persona', new Set(captured.map((c) => c.system[0].text)).size === 3);

// ---- 4. multi-turn history ----------------------------------------------
console.log('\n4. multi-turn');
captured.length = 0;
res = mockRes();
await handler(
  {
    method: 'POST',
    body: {
      persona: 'steven',
      messages: [
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'prior answer' },
        { role: 'user', content: 'follow up' },
      ],
    },
  },
  res,
);
check('history passed through', captured[0].messages.length === 3);
check('prior assistant turn intact', captured[0].messages[1].content === 'prior answer');
check('only last user turn gets blocks', typeof captured[0].messages[0].content === 'string');

// ---- 5. error paths -----------------------------------------------------
console.log('\n5. error handling');
res = mockRes();
await handler({ method: 'GET' }, res);
check('GET rejected 405', res._status === 405);

res = mockRes();
await handler({ method: 'POST', body: { persona: 'nobody', messages: [{ role: 'user', content: 'x' }] } }, res);
check('unknown persona 400', res._status === 400, JSON.stringify(res._json));

res = mockRes();
await handler({ method: 'POST', body: { persona: 'steven', messages: [{ role: 'assistant', content: 'x' }] } }, res);
check('history not ending in user 400', res._status === 400, JSON.stringify(res._json));

res = mockRes();
await handler({ method: 'POST', body: JSON.stringify({ persona: 'steven', messages: [{ role: 'user', content: 'string body' }] }) }, res);
check('string body parsed', res._status === 200, JSON.stringify(res._json));

// refusal path
const realCreate = Messages.prototype.create;
Messages.prototype.create = async () => ({ stop_reason: 'refusal', content: [], usage: {} });
res = mockRes();
await handler({ method: 'POST', body: { persona: 'steven', messages: [{ role: 'user', content: 'x' }] } }, res);
check('refusal surfaced as 422', res._status === 422, JSON.stringify(res._json));
Messages.prototype.create = realCreate;

console.log(failures ? `\n${failures} FAILURE(S)\n` : '\nAll checks passed.\n');
process.exit(failures ? 1 : 0);
