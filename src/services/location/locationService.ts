import * as Location from 'expo-location';
import { Location as AppLocation } from '../../types/types';

const DEFAULT_LOCATION: AppLocation = {
    latitude: -1.286389,
    longitude: 36.817223,
    address: 'Nairobi, Kenya',
    city: 'Nairobi',
    region: 'Nairobi'
};

/**
 * Robustly gets the current location with multiple fallbacks.
 * Handles "unsatisfied device settings" error by reducing accuracy.
 * Fallbacks to last known position if current position fails or times out.
 */
export const getCurrentLocation = async (
    accuracy: Location.Accuracy = Location.Accuracy.Balanced,
    timeoutMs: number = 10000
): Promise<AppLocation | null> => {
    try {
        const isEnabled = await Location.hasServicesEnabledAsync();
        if (!isEnabled) {
            console.log('Location services are disabled on device');
            return await getLastKnownFallback();
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            console.log('Location permission not granted');
            return null;
        }

        // Try getting current position with a timeout
        try {
            const position = await Promise.race([
                Location.getCurrentPositionAsync({ accuracy }),
                new Promise<never>((_, rej) =>
                    setTimeout(() => rej(new Error('Location timeout')), timeoutMs)
                )
            ]);

            const { latitude, longitude } = (position as Location.LocationObject).coords;
            return { latitude, longitude };
        } catch (error: any) {
            console.log(`Initial location attempt failed: ${error?.message}`);

            // If accuracy was high/balanced, try lowest accuracy (often works better in restricted environments/settings)
            if (accuracy !== Location.Accuracy.Lowest) {
                try {
                    console.log('Retrying with Lowest accuracy...');
                    const position = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Lowest
                    });
                    const { latitude, longitude } = position.coords;
                    return { latitude, longitude };
                } catch (retryError) {
                    console.log('Lowest accuracy retry also failed');
                }
            }

            // Fallback to last known position
            return await getLastKnownFallback();
        }
    } catch (error) {
        console.error('Fatal error in getCurrentLocation:', error);
        return null;
    }
};

/**
 * Gets the last known position as a fallback.
 */
const getLastKnownFallback = async (): Promise<AppLocation | null> => {
    try {
        console.log('Attempting to fetch last known position...');
        const lastKnown = await Location.getLastKnownPositionAsync({});
        if (lastKnown) {
            console.log('Found last known position');
            return {
                latitude: lastKnown.coords.latitude,
                longitude: lastKnown.coords.longitude
            };
        }
    } catch (error) {
        console.log('Failed to fetch last known position');
    }
    return null;
};

/**
 * Robustly reverse geocodes a location to an address string.
 * Handles offline scenarios by returning coordinates if geocoding fails.
 */
export const getAddressFromCoords = async (
    latitude: number,
    longitude: number
): Promise<Partial<AppLocation>> => {
    try {
        const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (addresses && addresses.length > 0) {
            const addr = addresses[0];
            const formattedAddress = [
                addr.name,
                addr.street,
                addr.city,
                addr.region
            ].filter(Boolean).join(', ');

            return {
                address: formattedAddress,
                city: addr.city || undefined,
                region: addr.region || undefined
            };
        }
    } catch (error) {
        console.log('Reverse geocoding failed (likely offline)');
    }
    return {
        address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
    };
};

export { DEFAULT_LOCATION };
