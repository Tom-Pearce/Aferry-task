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
