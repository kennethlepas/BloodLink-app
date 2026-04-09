import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions used during design (iPhone 14 / standard 390x844)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

/**
 * Scales a dimension based on screen width.
 * Best for images, padding, and layout dimensions.
 */
export const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;

/**
 * Moderate scaling for font sizes and smaller paddings.
 * factor = 0.5 (default) provides a balanced resize.
 */
export const moderateScale = (size: number, factor = 0.5) =>
    size + (scale(size) - size) * factor;

/**
 * Scales a dimension based on screen height.
 * Best for vertical spacers and heights.
 */
export const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;

/**
 * Provides a pixel-density adjusted value.
 */
export const pixelScale = (size: number) => PixelRatio.roundToNearestPixel(scale(size));

export const SCREEN_DIMENSIONS = {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    isSmallDevice: SCREEN_WIDTH < 375,
};
