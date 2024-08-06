export type EventData = {
    id: string;
    partitionKey: string;
    timestamp: number;
    type: string;
    booking_requested?: BookingObject;
    booking_completed?: BookingObject;
};

export type BookingCompletedEvent = {
    id: string;
    partitionKey: string;
    timestamp: number;
    type: string;
    booking_completed: BookingObject;
};

export type BookingObject = {
    timestamp: number;
    orderId: number;
    product_provider: string;
};

