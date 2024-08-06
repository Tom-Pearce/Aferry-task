import { TransformedBookingEvent } from 'src/types/objects';

const EXTERNAL_SERVICE_URL = process.env.PUBLISH_URL;

export const healthCheck = async () => {
    if (!EXTERNAL_SERVICE_URL) {
        return false;
    }

    try {
        const response = await fetch(EXTERNAL_SERVICE_URL);
        return response.ok;
    } catch {
        // TODO: Log unavailability
        return false;
    }
};

export const publishBooking = async (booking: TransformedBookingEvent) => {
    if (!EXTERNAL_SERVICE_URL) {
        return false;
    }

    try {
        const response = await fetch(EXTERNAL_SERVICE_URL, {
            method: 'POST',
            body: JSON.stringify(booking),
            headers: {
                'Content-Type': 'application/json',
            },
        });
        console.log({ response: response.status });
        return response.ok;
    } catch {
        // TODO: Log failure
        return false;
    }
};
