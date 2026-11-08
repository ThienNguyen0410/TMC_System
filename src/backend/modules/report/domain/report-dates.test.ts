import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  daysBetween,
  eachDate,
  isValidTimeZone,
  isWeekend,
  todayIn,
} from './report-dates.ts'

test('daysBetween and eachDate treat both ends as inclusive', () => {
  const range = { startDate: '2026-11-02', endDate: '2026-11-08' }
  assert.equal(daysBetween(range), 6)
  const dates = eachDate(range)
  assert.equal(dates.length, 7)
  assert.equal(dates[0], '2026-11-02')
  assert.equal(dates[6], '2026-11-08')
})

test('eachDate crosses month and year boundaries', () => {
  assert.deepEqual(eachDate({ startDate: '2026-12-31', endDate: '2027-01-01' }), [
    '2026-12-31',
    '2027-01-01',
  ])
})

test('isWeekend: Saturday and Sunday only', () => {
  assert.equal(isWeekend('2026-11-07'), true)
  assert.equal(isWeekend('2026-11-08'), true)
  assert.equal(isWeekend('2026-11-06'), false)
})

test('todayIn uses the given time zone, not UTC', () => {
  assert.equal(todayIn('Asia/Ho_Chi_Minh', new Date('2026-11-04T16:30:00Z')), '2026-11-04')
  assert.equal(todayIn('Asia/Ho_Chi_Minh', new Date('2026-11-04T17:00:00Z')), '2026-11-05')
})

test('isValidTimeZone accepts named zones and rejects numeric offsets', () => {
  assert.equal(isValidTimeZone('Asia/Ho_Chi_Minh'), true)
  assert.equal(isValidTimeZone('Etc/GMT-7'), true)
  assert.equal(isValidTimeZone('UTC'), true)
  assert.equal(isValidTimeZone('+07:00'), false)
  assert.equal(isValidTimeZone('-05:00'), false)
  assert.equal(isValidTimeZone('07:00'), false)
  assert.equal(isValidTimeZone('Nowhere/City'), false)
})
