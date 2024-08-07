export interface BaseEvent {
    id: string;
    partitionKey: string;
    timestamp: number;
    type: string;
}

export interface BookingCompletedEvent extends BaseEvent {
    type: 'booking_completed';
    booking_completed: BookingObject;
}
export interface BookingRequestedEvent extends BaseEvent {
    type: 'booking_requested';
    booking_requested: BookingObject;
}
export type EventData = BookingCompletedEvent | BookingRequestedEvent;

export type BookingObject = {
    timestamp: number;
    orderId: number;
    product_provider: string;
};

export type TransformedBookingEvent = {
    product_order_id_buyer: number;
    timestamp: string;
    product_provider_buyer: string;
};

const test = (event: EventData) => {
    if (event.type === 'booking_completed') {
        console.log(event.booking_completed.orderId);
    }
};
