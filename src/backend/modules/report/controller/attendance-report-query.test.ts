import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ValidationError } from '../../../shared/errors/app-error.ts'
import { parseAttendanceReportQuery } from './attendance-report-query.ts'

const TODAY = '2026-11-06'
const parse = (query: Record<string, unknown>) => parseAttendanceReportQuery(query, TODAY)

test('defaults to today when no date is given', () => {
  assert.deepEqual(parse({}), { startDate: TODAY, endDate: TODAY })
})

test('date selects a single day', () => {
  assert.deepEqual(parse({ date: '2026-11-03' }), { startDate: '2026-11-03', endDate: '2026-11-03' })
})

test('startDate and endDate select a range, status is kept', () => {
  assert.deepEqual(parse({ startDate: '2026-11-02', endDate: '2026-11-08', status: 'late' }), {
    startDate: '2026-11-02',
    endDate: '2026-11-08',
    status: 'late',
  })
})

test('an empty or blank parameter counts as missing', () => {
  assert.deepEqual(parse({ status: '', date: '  ' }), { startDate: TODAY, endDate: TODAY })
})

test('surrounding spaces are trimmed and unknown parameters are ignored', () => {
  assert.deepEqual(parse({ date: ' 2026-11-03 ', page: '2' }), {
    startDate: '2026-11-03',
    endDate: '2026-11-03',
  })
})

test('a range of exactly 366 days is allowed', () => {
  assert.doesNotThrow(() => parse({ startDate: '2024-01-01', endDate: '2024-12-31' }))
})

for (const [name, query] of [
  ['a date that does not exist', { date: '2026-02-30' }],
  ['a malformed date', { date: '11/03/2026' }],
  ['a repeated parameter', { date: ['2026-11-03', '2026-11-04'] }],
  ['startDate after endDate', { startDate: '2026-11-08', endDate: '2026-11-02' }],
  ['only startDate', { startDate: '2026-11-02' }],
  ['only endDate', { endDate: '2026-11-02' }],
  ['date mixed with a range', { date: '2026-11-03', startDate: '2026-11-02', endDate: '2026-11-04' }],
  ['an unknown status', { status: 'foo' }],
  ['a range of 367 days', { startDate: '2026-01-01', endDate: '2027-01-02' }],
] as const) {
  test(`rejects ${name} with a ValidationError`, () => {
    assert.throws(() => parse(query), ValidationError)
  })
}
