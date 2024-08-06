import { KinesisStreamEvent, KinesisStreamRecord } from 'aws-lambda';
import { BookingCompletedEvent, EventData } from './types/objects';
import { healthCheck } from './utils/external-service';

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
        return;
    }

    try {
        const bookingEvent = bookingData as BookingCompletedEvent;

    } catch (error) {
        return false;
    }
};

};
