
export const getHangingTabStyle = (colors: any, isDark: boolean) => ({
    backgroundColor: colors.surface,
    borderTopWidth: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: isDark ? 0.35 : 0.15,
    shadowRadius: 12,
    height: 72,
    position: 'absolute' as const,
    bottom: 22,
    left: 18,
    right: 18,
    borderRadius: 28,
    paddingBottom: 10,
});
