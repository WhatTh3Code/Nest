import { createEvent } from 'ics'
import getIcsFileUrl from 'utils/getIcsFileUrl'

describe('getIcsFileUrl', () => {
  const originalCreateObjectURL = globalThis.URL.createObjectURL

  const mockEvent = {
    title: 'Conference',
    description: 'Discuss Q4 goals',
    location: 'Conference Room A',
    startDate: '2025-01-01T00:00:00Z',
    endDate: '2025-01-03T00:00:00Z',
  }

  beforeAll(() => {
    globalThis.URL.createObjectURL = jest.fn(() => 'blob:http://localhost/mock-uuid')
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    globalThis.URL.createObjectURL = originalCreateObjectURL
  })

  it('should generate a blob URL when event creation is successful', async () => {
    ;(createEvent as jest.Mock).mockImplementation((attributes, callback) => {
      callback(null, 'BEGIN:VCALENDAR...')
    })

    const result = await getIcsFileUrl(mockEvent)

    expect(result).toBe('blob:http://localhost/mock-uuid')
    expect(createEvent).toHaveBeenCalledTimes(1)
    expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
  })

  it('should correctly format Unix timestamps into DateArray', async () => {
    ;(createEvent as jest.Mock).mockImplementation((attr, cb) => cb(null, 'val'))

    const eventWithTimestamps = {
      title: 'Multi-day',
      startDate: '2025-01-01T00:00:00Z',
      endDate: '2025-01-03T00:00:00Z',
    }

    await getIcsFileUrl(eventWithTimestamps)

    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        start: [2025, 1, 1],
        end: [2025, 1, 4],
      }),
      expect.any(Function)
    )
  })

  it('should correctly format Unix timestamps into DateArray (UTC conversion)', async () => {
    ;(createEvent as jest.Mock).mockImplementation((attr, cb) => cb(null, 'val'))

    const eventWithTimestamps = {
      title: 'Multi-day UTC',
      startDate: '2025-01-01T00:00:00Z',
      endDate: '2025-01-03T00:00:00Z',
    }

    await getIcsFileUrl(eventWithTimestamps)

    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        start: [2025, 1, 1],
        end: [2025, 1, 4],
      }),
      expect.any(Function)
    )
  })

  it('should automatically increment the end date by 1 day if start and end dates are the same', async () => {
    ;(createEvent as jest.Mock).mockImplementation((attr, cb) => cb(null, 'val'))

    const singleDayEvent = {
      title: 'Single day',
      startDate: '2025-01-01T00:00:00Z',
      endDate: '2025-01-01T00:00:00Z',
    }

    await getIcsFileUrl(singleDayEvent)

    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        start: [2025, 1, 1],
        end: [2025, 1, 2],
      }),
      expect.any(Function)
    )
  })

  it('should use the day after startDate as the end date when endDate is missing', async () => {
    ;(createEvent as jest.Mock).mockImplementation((attr, cb) => cb(null, 'val'))

    await getIcsFileUrl({ title: 'No end date', startDate: '2025-01-01T00:00:00Z' })

    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        start: [2025, 1, 1],
        end: [2025, 1, 2],
      }),
      expect.any(Function)
    )
  })

  it.each([
    {
      name: 'multi-day event (Oct 27-30)',
      startDate: '2026-10-27T00:00:00Z',
      endDate: '2026-10-30T00:00:00Z',
      start: [2026, 10, 27],
      end: [2026, 10, 31],
    },
    {
      name: 'event crossing a month boundary (Oct 30-Nov 2)',
      startDate: '2026-10-30T00:00:00Z',
      endDate: '2026-11-02T00:00:00Z',
      start: [2026, 10, 30],
      end: [2026, 11, 3],
    },
    {
      name: 'event ending on the last day of a month (Nov 29-30)',
      startDate: '2026-11-29T00:00:00Z',
      endDate: '2026-11-30T00:00:00Z',
      start: [2026, 11, 29],
      end: [2026, 12, 1],
    },
    {
      name: 'event crossing a year boundary (Dec 30-Jan 1)',
      startDate: '2026-12-30T00:00:00Z',
      endDate: '2027-01-01T00:00:00Z',
      start: [2026, 12, 30],
      end: [2027, 1, 2],
    },
    {
      name: 'event ending on a leap day (Feb 28-29)',
      startDate: '2028-02-28T00:00:00Z',
      endDate: '2028-02-29T00:00:00Z',
      start: [2028, 2, 28],
      end: [2028, 3, 1],
    },
  ])(
    'should include the last day of a $name by using an exclusive end date',
    async ({ startDate, endDate, start, end }) => {
      ;(createEvent as jest.Mock).mockImplementation((attr, cb) => cb(null, 'val'))

      await getIcsFileUrl({ title: 'Event', startDate, endDate })

      expect(createEvent).toHaveBeenCalledWith(
        expect.objectContaining({ start, end }),
        expect.any(Function)
      )
    }
  )

  it('should reject the promise if createEvent returns an error', async () => {
    const mockError = new Error('ICS generation failed')

    ;(createEvent as jest.Mock).mockImplementation((attr, callback) => {
      callback(mockError, null)
    })

    await expect(getIcsFileUrl(mockEvent)).rejects.toThrow('ICS generation failed')
  })

  it('should pass all event attributes correctly to createEvent', async () => {
    ;(createEvent as jest.Mock).mockImplementation((attr, cb) => cb(null, 'val'))

    await getIcsFileUrl(mockEvent)

    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        start: [2025, 1, 1],
        end: [2025, 1, 4],
        title: mockEvent.title,
        description: mockEvent.description,
        location: mockEvent.location,
        status: 'CONFIRMED',
        busyStatus: 'BUSY',
      }),
      expect.any(Function)
    )
  })
})