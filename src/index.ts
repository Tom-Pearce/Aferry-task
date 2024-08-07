import { KinesisStreamEvent } from 'aws-lambda';
import { BookingCompletedEvent, EventData } from './types/objects';
import { healthCheck, publishBooking } from './utils/external-service';
import { transformBookingCompletedEvent } from './utils/transformers';

const TARGET_EVENT = 'booking_completed';

export const handler = async (
    event: KinesisStreamEvent
): Promise<number | false | null | undefined> => {
    const serviceStatus = await healthCheck();

    if (!serviceStatus) {
        return undefined;
    }

    const records = event.Records;

    if (!records || records.length === 0) {
        // TODO: Log empty event/push to Dead Letter Queue for review
        return null;
    }

    let publishedRecords: number = 0;

    for (const record of event.Records) {
        // Decode the data from the Kinesis record
        const payload = decodeData(record.kinesis.data);

        // If false, then it failed to decode
        if (!payload) {
            // TODO: Push to Dead Letter Queue for review
            continue;
        }

        // Parse the payload into an object
        const eventData = parsePayload(payload);

        // If false, then it failed to parse, meaning not the object we're expecting
        if (!eventData) {
            // TODO: Push to Dead Letter Queue for review
            continue;
        }

        // Validate if we want to process this event
        const shouldProcess = isProcessingRequired(eventData);

        // If false, then we don't want to process this event, so skip
        if (!shouldProcess) {
            continue;
        }

        console.log('Processing record:', eventData);
        const result = await processRecord(eventData);

        // If undefined, then we're not actioning anything and skipping this record
        if (typeof result === 'undefined') {
            continue;
        }

        // If result is true, then we successfully published the record
        if (result) {
            publishedRecords++;
            continue;
        }

        // TODO: Push to Dead Letter Queue for review
    }

    return publishedRecords;
};

export const decodeData = (data: string): string | false => {
    try {
        return Buffer.from(data, 'base64').toString('utf-8');
    } catch {
        console.error('Error decoding data');
        return false;
    }
};

export const parsePayload = (payload: string): EventData | false => {
    try {
        return JSON.parse(payload) as EventData;
    } catch (error) {
        console.error('Error parsing payload:', error);
        return false;
    }
};

export const isProcessingRequired = (data: EventData): boolean => {
    if (data.type !== TARGET_EVENT) {
        return false;
    }

    // TODO: Check for idempotency - use event ID or order ID, and check against a persisted store/db to see if we've already processed this event
    /*
        // Function to check an identifier against log of processed events
        const duplicate = await checkIdempotency(bookingData);
        if (duplicate) {
            // Possibly vary this logic based on desired business logic; might want to flag as a duplicate, etc.
            return false; 
        }
    */

    return true;
};

export const processRecord = async (
    data: EventData
): Promise<boolean | undefined> => {
    try {
        const bookingEvent = data as BookingCompletedEvent;

        return await publishBookingToExternalService(bookingEvent);
    } catch (error) {
        return false;
    }
};

export const publishBookingToExternalService = async (
    booking: BookingCompletedEvent
): Promise<boolean> => {
    const transformedData = transformBookingCompletedEvent(booking);

    return await publishBooking(transformedData);
};
