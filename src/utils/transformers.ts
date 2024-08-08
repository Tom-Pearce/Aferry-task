import {
    BookingCompletedEvent,
    TransformedBookingEvent,
} from 'src/types/objects';

export const transformBookingCompletedEvent = (
    booking: BookingCompletedEvent
): TransformedBookingEvent => {
    const date = new Date(booking.booking_completed.timestamp);

    return {
        product_order_id_buyer: booking.booking_completed.orderId,
        timestamp: date.toISOString(),
        product_provider_buyer: booking.booking_completed.product_provider,
    };
};
