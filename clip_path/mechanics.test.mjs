import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('./clip_path.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
function terminal({ reduced = false } = {}) {
  const tasks = new Map();
  let nextId = 0;
  const element = () => ({
    children: [], style: {}, dataset: {}, attrs: {}, listeners: {}, scrollTop: 0, scrollHeight: 0, clientHeight: 100,
    classList: { toggle() {} }, textContent: '',
    set innerHTML(value) { this.markup = value; this.children = []; },
    get innerHTML() { return this.markup || ''; },
    appendChild(child) { this.children.push(child); this.scrollHeight = this.children.length * 30; },
    replaceChildren() { this.children = []; this.markup = ''; this.scrollHeight = 0; },
    addEventListener(name, fn) { this.listeners[name] = fn; },
    setAttribute(name, value) { this.attrs[name] = value; }
  });
  const ids = Object.fromEntries(['log-container', 'terminal-status', 'motion', 'sound', 'purge', 'assimilate', 'reset'].map(id => [id, element()]));
  const doc = { body: element(), hidden: false, listeners: {}, getElementById: id => ids[id], createElement: element, addEventListener(name, fn) { this.listeners[name] = fn; } };
  const win = { addEventListener() {} };
  const context = vm.createContext({ document: doc, window: win, matchMedia: () => ({ matches: reduced, addEventListener() {} }),
    setTimeout(fn) { const id = ++nextId; tasks.set(id, fn); return id; }, clearTimeout(id) { tasks.delete(id); }, Math });
  vm.runInContext(script, context);
  const run = count => { for (let i = 0; i < count && tasks.size; i++) { const [id, fn] = tasks.entries().next().value; tasks.delete(id); fn(); } };
  return { ids, tasks, doc, context, run, click: id => ids[id].listeners.click() };
}

test('startup renders the original eight audit entries and terminates its clock', () => {
  const t = terminal(); t.run(20);
  assert.equal(t.ids['log-container'].children.length, 8);
  assert.equal(t.tasks.size, 0);
  assert.match(t.ids['terminal-status'].textContent, /Audit ready/);
});

test('restart during purge cancels the prior purge and pending automatic restart', () => {
  const t = terminal(); t.click('purge'); t.run(3); t.click('reset'); t.run(30);
  assert.equal(t.ids['log-container'].children.length, 8);
  assert.equal(t.tasks.size, 0);
  assert.ok(t.ids['log-container'].children.every(child => child.innerHTML.includes('log-prefix')));
});

test('assimilation interrupts purge and repeated actions leave one completion only', () => {
  const t = terminal(); t.click('purge'); t.run(2); t.click('assimilate'); t.click('assimilate'); t.run(30);
  assert.match(t.ids['log-container'].innerHTML, /ASSIMILATION COMPLETE/);
  assert.doesNotMatch(t.ids['log-container'].innerHTML, /SYSTEM HALTED/);
  assert.equal(t.doc.body.style.backgroundColor, '');
  assert.equal(t.tasks.size, 0);
});

test('reduced motion immediately exposes the entire log without animation clock', () => {
  const t = terminal({ reduced: true });
  assert.equal(t.ids['log-container'].children.length, 8);
  assert.equal(t.tasks.size, 0);
  assert.equal(t.ids.motion.attrs['aria-pressed'], 'false');
  assert.equal(t.ids.motion.disabled, true);
});

test('purge appends eleven original kill lines, halts, then resets', () => {
  const t = terminal(); t.click('purge'); t.run(10);
  assert.equal(t.ids['log-container'].children.length, 12);
  assert.equal(t.ids['log-container'].children[11].textContent, 'SYSTEM HALTED');
  assert.equal(t.tasks.size, 1);
  t.run(20);
  assert.equal(t.ids['log-container'].children.length, 8);
  assert.equal(t.tasks.size, 0);
});
