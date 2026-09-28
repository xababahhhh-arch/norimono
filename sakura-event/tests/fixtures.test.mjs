// 依頼で指定された11種類のイベント形式が fixture として揃っていること
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFixture } from './helpers.mjs';
import { eventType } from '../js/core/schema.js';
import { has } from '../js/core/field.js';

const CASES = [
  ['01_classic_recital', (ev) => eventType(ev) === 'performance' && ev.genre.value === 'クラシック' && ev.performers.items.length === 1],
  ['02_multi_performer', (ev) => ev.performers.items.length >= 2],
  ['03_family_0sai', (ev) => eventType(ev) === 'family_performance' && /0歳/.test(ev.pricing.age_requirement.value) && has(ev.pricing.lap_seating)],
  ['04_workshop', (ev) => eventType(ev) === 'workshop' && has(ev.participation.capacity)],
  ['05_multi_session', (ev) => ev.schedule.dates.items.length >= 2],
  ['06_free_event', (ev) => ev.pricing.prices.items.every((p) => p.amount.value === 0)],
  ['07_recruitment', (ev) => eventType(ev) === 'recruitment'],
  ['08_open_day', (ev) => eventType(ev) === 'multi_event' && ev.sub_events.items.length >= 2],
  ['09_sold_out', (ev) => ev.status.code === 'sold_out'],
  ['10_registration_closed', (ev) => ev.status.code === 'registration_closed' && ev.updates.items.some((u) => u.date === '2026-07-04' && u.text === '定員に達したため電話受付は実施しません')],
  ['11_performer_change', (ev) => ev.updates.items.some((u) => u.type === 'performer_change') && has(ev.organization.co_organizer)],
];

for (const [name, pred] of CASES) {
  test(`fixture ${name}`, () => {
    assert.ok(pred(loadFixture(name)));
  });
}
