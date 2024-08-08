import { KinesisStreamEvent, KinesisStreamRecord } from 'aws-lambda';
import { mock } from 'vitest-mock-extended';
import { handler } from '../src/index';
import type {
    BookingCompletedEvent,
    BookingRequestedEvent,
} from '../src/types/objects';
import * as externalService from '../src/utils/external-service';

// For most scenarios assume the external service is up and works fine
beforeEach(() => {
    vi.mock('../src/utils/external-service', async () => {
        return {
            healthCheck: vi.fn(() => 'UP'),
            publishBooking: vi.fn(() => true),
        };
    });
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('handle empty event stream', async () => {
    it('should pass', async () => {
        const mockEvent = mock<KinesisStreamEvent>();
        mockEvent.Records = [];

        expect(await handler(mockEvent)).toBeNull();
    });
});

describe('handle missing env var', async () => {
    it('external service is down', async () => {
        // Mock the service to be down
        // @ts-ignore
        externalService.healthCheck.mockResolvedValueOnce('DOWN');

        const mockEvent = mock<KinesisStreamEvent>();

        await expect(
            (async () => {
                await handler(mockEvent);
            })()
        ).rejects.toThrowError();
    });
    it('external service is missing service url', async () => {
        // Mock the service to be missing the service URL
        // @ts-ignore
        externalService.healthCheck.mockResolvedValueOnce('UNKNOWN_URL');

        const mockEvent = mock<KinesisStreamEvent>();

        await expect(
            (async () => {
                await handler(mockEvent);
            })()
        ).rejects.toThrowError();
    });

    it('external service has a bad config', async () => {
        // Mock a bad config in the fetch request
        // @ts-ignore
        externalService.healthCheck.mockResolvedValueOnce('BAD_CONFIG');

        const mockEvent = mock<KinesisStreamEvent>();

        await expect(
            (async () => {
                await handler(mockEvent);
            })()
        ).rejects.toThrowError();
    });
});

describe('handle valid event stream', async () => {
    let mockEventStream: KinesisStreamEvent = { Records: [] };

    beforeEach(() => {
        mockEventStream.Records = [];
        for (let i = 0; i < 3; i++) {
            const mockData = mock<BookingCompletedEvent>(
                {},
                {
                    fallbackMockImplementation: () => {
                        return {
                            id: 'test',
                            partitionKey: 'testKey',
                            timestamp: new Date().getTime(),
                            type: 'booking_completed',
                            booking_completed: {
                                timestamp: new Date().getTime(),
                                orderId: Math.random()
                                    .toString(36)
                                    .substring(7),
                                product_provider: 'Ferry Provider',
                            },
                        };
                    },
                }
            );

            let mockRecord = mock<KinesisStreamRecord>();
            mockRecord.kinesis.data = Buffer.from(
                JSON.stringify(mockData)
            ).toString('base64');
            mockEventStream.Records.push(mockRecord);
        }
    });

    test('test 3 valid events', async () => {
        const publishSpy = vi.spyOn(externalService, 'publishBooking');
        const result = await handler(mockEventStream);

        // Should have called the external service 3 times
        expect(publishSpy).toHaveBeenCalledTimes(3);

        // @ts-ignore
        expectTypeOf(result).toEqualTypeOf<string[]>();
    });
});

describe('handle valid event stream with ignored event types', async () => {
    let mockEventStream: KinesisStreamEvent = { Records: [] };

    beforeEach(() => {
        mockEventStream.Records = [];
        for (let i = 0; i < 3; i++) {
            const mockData = mock<BookingRequestedEvent>(
                {},
                {
                    fallbackMockImplementation: () => {
                        return {
                            id: 'test',
                            partitionKey: 'testKey',
                            timestamp: new Date().getTime(),
                            type: 'booking_requested',
                            booking_requested: {
                                timestamp: new Date().getTime(),
                                orderId: Math.random()
                                    .toString(36)
                                    .substring(7),
                                product_provider: 'Ferry Provider',
                            },
                        };
                    },
                }
            );

            let mockRecord = mock<KinesisStreamRecord>();
            mockRecord.kinesis.data = Buffer.from(
                JSON.stringify(mockData)
            ).toString('base64');
            mockEventStream.Records.push(mockRecord);
        }
    });

    test('test 3 valid events', async () => {
        const publishSpy = vi.spyOn(externalService, 'publishBooking');
        const result = await handler(mockEventStream);

        // Service should not have been called as not a event we want to process
        expect(publishSpy).toHaveBeenCalledTimes(0);

        // @ts-ignore
        expectTypeOf(result).toEqualTypeOf<string[]>();
    });
});

describe('handle valid event stream with unknown event types', async () => {
    let mockEventStream: KinesisStreamEvent = { Records: [] };

    beforeEach(() => {
        mockEventStream.Records = [];
        for (let i = 0; i < 3; i++) {
            const mockData = mock<BookingRequestedEvent>(
                {},
                {
                    fallbackMockImplementation: () => {
                        return {
                            id: 'test',
                            partitionKey: 'testKey',
                            timestamp: new Date().getTime(),
                            type: 'unknown_type',
                            booking_requested: {
                                timestamp: new Date().getTime(),
                                orderId: Math.random()
                                    .toString(36)
                                    .substring(7),
                                product_provider: 'Ferry Provider',
                            },
                        };
                    },
                }
            );

            let mockRecord = mock<KinesisStreamRecord>();
            mockRecord.kinesis.data = Buffer.from(
                JSON.stringify(mockData)
            ).toString('base64');
            mockEventStream.Records.push(mockRecord);
        }
    });

    test('test 3 valid events', async () => {
        const publishSpy = vi.spyOn(externalService, 'publishBooking');
        const result = await handler(mockEventStream);

        // Should not have been called as unknown event type
        expect(publishSpy).toHaveBeenCalledTimes(0);

        // @ts-ignore
        expectTypeOf(result).toEqualTypeOf<string[]>();
    });
});

describe('handle invalid data in event stream', async () => {
    let mockEventStream: KinesisStreamEvent = { Records: [] };

    beforeEach(() => {
        mockEventStream.Records = [];
        for (let i = 0; i < 3; i++) {
            let mockRecord = mock<KinesisStreamRecord>();
            mockRecord.kinesis.data = 'invalid data';
            mockEventStream.Records.push(mockRecord);
        }
    });

    test('test failed decode', async () => {
        const result = await handler(mockEventStream);
        expect(result).toStrictEqual([]);
    });
});

describe('handle valid event stream with malformed JSON', async () => {
    let mockEventStream: KinesisStreamEvent = { Records: [] };

    beforeEach(() => {
        mockEventStream.Records = [];
        for (let i = 0; i < 3; i++) {
            const mockData = mock<BookingRequestedEvent>(
                {},
                {
                    fallbackMockImplementation: () => {
                        return {
                            id: 'test',
                            partitionKey: 'testKey',
                            timestamp: new Date().getTime(),
                            type: 'booking_requested',
                            booking_requested: {
                                timestamp: new Date().getTime(),
                                orderId: Math.random()
                                    .toString(36)
                                    .substring(7),
                            },
                        };
                    },
                }
            );

            let mockRecord = mock<KinesisStreamRecord>();
            mockRecord.kinesis.data = Buffer.from(
                JSON.stringify(mockData) + 'malformed'
            ).toString('base64');

            mockEventStream.Records.push(mockRecord);
        }
    });

    test('test 3 valid events', async () => {
        const publishSpy = vi.spyOn(externalService, 'publishBooking');
        const result = await handler(mockEventStream);

        // Shuoldnt be called as malformed JSON
        expect(publishSpy).toHaveBeenCalledTimes(0);

        // @ts-ignore
        expectTypeOf(result).toEqualTypeOf<string[]>();
    });
});

describe('handle valid event stream, but fails to publish once', async () => {
    let mockEventStream: KinesisStreamEvent = { Records: [] };

    beforeEach(() => {
        mockEventStream.Records = [];
        for (let i = 0; i < 3; i++) {
            const mockData = mock<BookingCompletedEvent>(
                {},
                {
                    fallbackMockImplementation: () => {
                        return {
                            id: 'test',
                            partitionKey: 'testKey',
                            timestamp: new Date().getTime(),
                            type: 'booking_completed',
                            booking_completed: {
                                timestamp: new Date().getTime(),
                                orderId: Math.random()
                                    .toString(36)
                                    .substring(7),
                                product_provider: 'Ferry Provider',
                            },
                        };
                    },
                }
            );

            let mockRecord = mock<KinesisStreamRecord>();
            mockRecord.kinesis.data = Buffer.from(
                JSON.stringify(mockData)
            ).toString('base64');
            mockEventStream.Records.push(mockRecord);
        }
    });

    test('test 3 valid events', async () => {
        // @ts-ignore
        externalService.publishBooking.mockResolvedValueOnce(false);
        const publishSpy = vi.spyOn(externalService, 'publishBooking');
        const result = await handler(mockEventStream);

        // Should have called the external service 3 times, all valid events
        expect(publishSpy).toHaveBeenCalledTimes(3);

        // Should only have 2 published records, as one failed
        // @ts-ignore
        expect(result.length).toBe(2);
    });
});
