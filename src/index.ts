import { KinesisStreamEvent } from 'aws-lambda';
import { BookingCompletedEvent, EventData } from './types/objects';
import { healthCheck, publishBooking } from './utils/external-service';
import { transformBookingCompletedEvent } from './utils/transformers';

export const handler = async (event: KinesisStreamEvent) => {
    const serviceStatus = await healthCheck();

    // If the external service is not available, then we can't do anything; loudly fail
    // TODO: Probably want to handle this more gracefully in production, but for now, we'll throw errors
    if (serviceStatus !== 'UP') {
        if (serviceStatus === 'UNKNOWN_URL') {
            throw new Error('External service URL not set');
        }

        if (serviceStatus === 'BAD_CONFIG') {
            throw new Error('Bad config for external service calls');
        }

        throw new Error('External service is not available');
    }

    const records = event.Records;

    if (!records || records.length === 0) {
        // TODO: Log empty event/push to Dead Letter Queue for review
        return null;
    }

    let publishedRecords: string[] = [];

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

        // TODO: Check for idempotency - use event ID or order ID, and check against a persisted store/db to see if we've already processed this event
        /*
            // Function to check an identifier against log of processed events
            const duplicate = await checkIdempotency(bookingData);
            if (duplicate) {
                // Possibly vary this logic based on desired business logic; might want to flag as a duplicate, etc.
                return false; 
            }
        */

        let result: boolean | undefined;
        switch (eventData.type) {
            case 'booking_completed':
                result = await publishBookingCompletedToExternalService(
                    eventData
                );
                break;
            case 'booking_requested':
                break;
            default:
                // Unexpected event type
                break;
        }

        // If undefined, then we're not actioning anything and skipping this record
        if (typeof result === 'undefined') {
            continue;
        }

        // If result is true, then we successfully published the record
        if (result) {
            publishedRecords.push(eventData.id);
            continue;
        }

        // TODO: Push to Dead Letter Queue for review
    }

    return publishedRecords;
};

export const decodeData = (data: string): string | false => {
    try {
        if (
            /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/.test(
                data
            )
        ) {
            return Buffer.from(data, 'base64').toString('utf-8');
        }

        throw new Error('Invalid base64 data');
    } catch {
        console.error('Error decoding data');
        return false;
    }
};

export const parsePayload = (payload: string): EventData | false => {
    try {
        // Assuming here that the data received is what we expect. In real world, we'd want to validate this at run-time
        return JSON.parse(payload) as EventData;
    } catch (error) {
        console.error('Error parsing payload');
        return false;
    }
};

export const publishBookingCompletedToExternalService = async (
    booking: BookingCompletedEvent
): Promise<boolean> => {
    // Map the booking data to the format expected by the external service
    const transformedData = transformBookingCompletedEvent(booking);

    return await publishBooking(transformedData);
};
