import assert from 'node:assert/strict'
import { test } from 'node:test'
import { classifyAttendance, workingHours } from './attendance-report.ts'

const LATE_AFTER = '09:00:00'

test('classifyAttendance: no activity is absent', () => {
  assert.equal(classifyAttendance(null, null, LATE_AFTER), 'absent')
})

test('classifyAttendance: a missing check-in or check-out is incomplete', () => {
  assert.equal(classifyAttendance('08:55:00', null, LATE_AFTER), 'incomplete')
  assert.equal(classifyAttendance(null, '17:00:00', LATE_AFTER), 'incomplete')
})

test('classifyAttendance: incomplete wins over late', () => {
  assert.equal(classifyAttendance('09:30:00', null, LATE_AFTER), 'incomplete')
})

test('classifyAttendance: a check-out before the check-in is incomplete', () => {
  assert.equal(classifyAttendance('17:00:00', '09:00:00', LATE_AFTER), 'incomplete')
})

test('classifyAttendance: exactly at the cutoff is present, one second later is late', () => {
  assert.equal(classifyAttendance('09:00:00', '17:00:00', LATE_AFTER), 'present')
  assert.equal(classifyAttendance('09:00:01', '17:00:00', LATE_AFTER), 'late')
})

test('workingHours: decimal hours rounded to 2 places', () => {
  assert.equal(workingHours('08:55:00', '17:30:00'), 8.58)
  assert.equal(workingHours('09:30:00', '17:00:00'), 7.5)
})

test('workingHours: null when an end is missing or check-out precedes check-in', () => {
  assert.equal(workingHours('08:55:00', null), null)
  assert.equal(workingHours(null, '17:00:00'), null)
  assert.equal(workingHours('17:00:00', '09:00:00'), null)
})
