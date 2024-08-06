import { KinesisStreamEvent, KinesisStreamRecord } from 'aws-lambda';
import { BookingCompletedEvent, EventData } from './types/objects';
import { healthCheck } from './utils/external-service';
import { transformBookingCompletedEvent } from './utils/transformers';

const TARGET_EVENT = 'booking_completed';

export const handler = async (event: KinesisStreamEvent) => {
    const serviceStatus = await healthCheck();
    console.log({ serviceStatus });

    if (!serviceStatus) {
        throw new Error('External service is not available');
    }

    const records = event.Records;

    if (!records || records.length === 0) {
        // TODO: Log empty event/push to DLQ
        return;
    }

    for (const record of event.Records) {
        await processRecord(record);
    }
};

export const processRecord = async (record: KinesisStreamRecord) => {
    const payload = Buffer.from(record.kinesis.data, 'base64').toString(
        'utf-8'
    );

    const bookingData: EventData = JSON.parse(payload);

    if (bookingData.type !== TARGET_EVENT) {
        return;
    }

    try {
        const bookingEvent = bookingData as BookingCompletedEvent;

        await publishBooking(bookingEvent);
    } catch (error) {
        return false;
    }
};

export const publishBooking = async (booking: BookingCompletedEvent) => {
    const transformedData = transformBookingCompletedEvent(booking);

    const;
};
