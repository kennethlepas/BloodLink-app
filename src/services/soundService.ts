import { Audio } from 'expo-av';

class SoundService {
    private static instance: SoundService;
    private notificationSound: Audio.Sound | null = null;
    private isLoaded: boolean = false;

    private constructor() { }

    public static getInstance(): SoundService {
        if (!SoundService.instance) {
            SoundService.instance = new SoundService();
        }
        return SoundService.instance;
    }

    /**
     * Preload the notification sound to ensure immediate playback when needed
     */
    public async loadSound() {
        if (this.isLoaded) return;

        try {
            const { sound } = await Audio.Sound.createAsync(
                require('../../assets/sounds/notification.mp3')
            );
            this.notificationSound = sound;
            this.isLoaded = true;
            console.log('✅ Notification sound loaded');
        } catch (error) {
            console.warn('⚠️ Failed to load notification sound:', error);
        }
    }

    /**
     * Play the notification sound
     */
    public async playNotificationSound() {
        try {
            // If not loaded, try to load it first
            if (!this.isLoaded) {
                await this.loadSound();
            }

            if (this.notificationSound) {
                // Reset playback to start if it was already played
                await this.notificationSound.replayAsync();
            }
        } catch (error) {
            console.warn('⚠️ Could not play notification sound:', error);
        }
    }

    /**
     * Cleanup resource when no longer needed
     */
    public async unloadSound() {
        if (this.notificationSound) {
            try {
                await this.notificationSound.unloadAsync();
                this.notificationSound = null;
                this.isLoaded = false;
            } catch (error) {
                console.error('Error unloading sound:', error);
            }
        }
    }
}

export const soundService = SoundService.getInstance();
