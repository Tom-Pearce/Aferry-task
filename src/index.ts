import { KinesisStreamEvent, KinesisStreamRecord } from 'aws-lambda';
import { BookingCompletedEvent, EventData } from './types/objects';
import { healthCheck, publishBooking } from './utils/external-service';
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
        // TODO: Log empty event/push to Dead Letter Queue
        return;
    }

    for (const record of event.Records) {
        const result = await processRecord(record);

        // If undefined, then we're not actioning anything and skipping this
        if (typeof result === 'undefined') {
            continue;
        }

        // If result is false, then we were unable to process the record
        if (!result) {
            // TODO: Push to Dead Letter Queue
        }
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

        return await publishBookingToExternalService(bookingEvent);
    } catch (error) {
        return false;
    }
};

export const publishBookingToExternalService = async (
    booking: BookingCompletedEvent
) => {
    const transformedData = transformBookingCompletedEvent(booking);

    return await publishBooking(transformedData);
};
