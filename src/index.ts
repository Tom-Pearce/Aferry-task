import { KinesisStreamEvent } from 'aws-lambda';
import { healthCheck } from './utils/external-service';

export const handler = async (event: KinesisStreamEvent) => {
    const serviceStatus = await healthCheck();
    console.log({ serviceStatus });

    if (!serviceStatus) {
        throw new Error('External service is not available');
    }
};
