import {
    BookingCompletedEvent,
    TransformedBookingEvent,
} from 'src/types/objects';
import { transformBookingCompletedEvent } from 'src/utils/transformers';
import { mock } from 'vitest-mock-extended';

describe('transform booking completed', () => {
    it('should pass', async () => {
        let mockBooking = mock<BookingCompletedEvent>();
        mockBooking.booking_completed.timestamp = new Date().getTime();

        expectTypeOf(
            transformBookingCompletedEvent(mockBooking)
        ).toEqualTypeOf<TransformedBookingEvent>();
    });
});
