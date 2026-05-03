import { LogBox } from 'react-native';

// Suppress specific LogBox warnings
LogBox.ignoreLogs([
    "Call to function 'ExpoAsset.downloadAsync' has been rejected",
    "Unable to download asset from url",
    "Font.loadAsync",
]);

export const setupGlobalErrorHandlers = () => {
    // 1. Handle global ErrorUtils for sync errors
    const ErrorUtilsExt = (global as any).ErrorUtils as any;
    if (typeof ErrorUtilsExt !== 'undefined') {
        const defaultHandler = ErrorUtilsExt.getGlobalHandler();
        ErrorUtilsExt.setGlobalHandler((err: any, isFatal: boolean) => {
            const msg = err?.message || '';
            if (
                msg.includes('ExpoAsset.downloadAsync') ||
                msg.includes('Unable to download asset')
            ) {
                console.warn('Caught ExpoAsset download error in ErrorUtils:', msg);
                return; // Suppress
            }
            if (defaultHandler) {
                defaultHandler(err, isFatal);
            }
        });
    }

    // 2. Handle Hermes unhandled promise rejections
    if (typeof (global as any).promiseRejectionTrackingOptions !== 'undefined') {
        const originalHandler = (global as any).promiseRejectionTrackingOptions.onUnhandled;
        (global as any).promiseRejectionTrackingOptions.onUnhandled = (id: string, rejection: any) => {
            const msg = rejection?.message || '';
            if (
                msg.includes('ExpoAsset.downloadAsync') ||
                msg.includes('Unable to download asset')
            ) {
                console.warn(`Caught ExpoAsset promise rejection (id: ${id}):`, msg);
                return; // Suppress
            }
            if (originalHandler) {
                originalHandler(id, rejection);
            }
        };
    } else {
        // 3. Fallback for non-Hermes unhandled promise rejections
        const isHermes = !!(global as any).HermesInternal;
        if (!isHermes) {
            try {
                require('promise/setimmediate/rejection-tracking').enable({
                    allRejections: true,
                    onUnhandled: (id: any, error: any) => {
                        const msg = error?.message || '';
                        if (
                            msg.includes('ExpoAsset.downloadAsync') ||
                            msg.includes('Unable to download asset')
                        ) {
                            console.warn(`Caught non-Hermes promise rejection (id: ${id}):`, msg);
                            return;
                        }
                        console.warn('Unhandled promise rejection:', id, error);
                    },
                });
            } catch (e) {
                // promise tracking might already be enabled or unavailable
            }
        }
    }

    // 4. Global window/Process error handlers just in case (for web/other environments)
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('unhandledrejection', (event: any) => {
            const msg = event?.reason?.message || '';
            if (
                msg.includes('ExpoAsset.downloadAsync') ||
                msg.includes('Unable to download asset')
            ) {
                console.warn('Caught Web unhandled rejection:', msg);
                event.preventDefault(); // Prevent crash in some environments
            }
        });
    }
};
