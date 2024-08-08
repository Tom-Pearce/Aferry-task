import { env } from 'src/types/environment';
import { TransformedBookingEvent } from 'src/types/objects';

const EXTERNAL_SERVICE_URL = env.PUBLISH_URL;

export const healthCheck = async (): Promise<
    'UP' | 'DOWN' | 'UNKNOWN_URL' | 'BAD_CONFIG'
> => {
    if (!EXTERNAL_SERVICE_URL) {
        console.error('External service URL not set');
        return 'UNKNOWN_URL';
    }

    try {
        const response = await fetch(EXTERNAL_SERVICE_URL);

        return response.ok ? 'UP' : 'DOWN';
    } catch {
        console.error('External service is not available');
        return 'BAD_CONFIG';
    }
};

export const publishBooking = async (
    booking: TransformedBookingEvent
): Promise<boolean> => {
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

        return response.ok;
    } catch {
        console.error('Failed to publish booking to external service');
        return false;
    }
};
