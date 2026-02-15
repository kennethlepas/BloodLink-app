import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Dimensions,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const PrivacyPolicyScreen: React.FC = () => {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0A2647" />
      <LinearGradient
        colors={['#0A2647', '#144272', '#2C74B3']}
        style={styles.gradient}
        locations={[0, 0.5, 1]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentCard}>
            <Text style={styles.lastUpdated}>Last Updated: February 15, 2026</Text>
            
            <Text style={styles.intro}>
              BloodLink is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information.
            </Text>

            {/* Section 1 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. INFORMATION WE COLLECT</Text>
              
              <Text style={styles.subsectionTitle}>1.1 Personal Information</Text>
              <Text style={styles.paragraph}>When you register, we collect:</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• Full name</Text>
                <Text style={styles.bullet}>• Email address</Text>
                <Text style={styles.bullet}>• Phone number</Text>
                <Text style={styles.bullet}>• Blood type</Text>
                <Text style={styles.bullet}>• Date of birth (for age verification)</Text>
                <Text style={styles.bullet}>• Weight (for donors)</Text>
                <Text style={styles.bullet}>• Profile picture (optional)</Text>
              </View>

              <Text style={styles.subsectionTitle}>1.2 Location Data</Text>
              <Text style={styles.paragraph}>
                We collect real-time GPS location data when you use the app to:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• Match you with nearby donors or blood banks</Text>
                <Text style={styles.bullet}>• Send location-based emergency alerts</Text>
                <Text style={styles.bullet}>• Display relevant search results</Text>
                <Text style={styles.bullet}>• Show your approximate location to matched users</Text>
              </View>

              <Text style={styles.subsectionTitle}>1.3 Usage Information</Text>
              <Text style={styles.paragraph}>We automatically collect:</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• Device information (model, OS version)</Text>
                <Text style={styles.bullet}>• App usage patterns and features accessed</Text>
                <Text style={styles.bullet}>• Donation history and requests</Text>
                <Text style={styles.bullet}>• Chat messages within the app</Text>
                <Text style={styles.bullet}>• Error logs and crash reports</Text>
              </View>
            </View>

            {/* Section 2 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. HOW WE USE YOUR INFORMATION</Text>
              <Text style={styles.paragraph}>Your information is used to:</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• Create and manage your account</Text>
                <Text style={styles.bullet}>• Match donors with blood requests based on blood type and location</Text>
                <Text style={styles.bullet}>• Send emergency blood request notifications</Text>
                <Text style={styles.bullet}>• Display nearby blood banks with real-time inventory</Text>
                <Text style={styles.bullet}>• Facilitate secure in-app communication</Text>
                <Text style={styles.bullet}>• Track donation history and points</Text>
                <Text style={styles.bullet}>• Improve app functionality and user experience</Text>
                <Text style={styles.bullet}>• Ensure platform safety and prevent fraud</Text>
                <Text style={styles.bullet}>• Comply with legal obligations</Text>
              </View>
            </View>

            {/* Section 3 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. INFORMATION SHARING</Text>
              
              <Text style={styles.subsectionTitle}>3.1 With Other Users</Text>
              <Text style={styles.paragraph}>When you accept or create a blood request, we share:</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• Your first name and profile picture</Text>
                <Text style={styles.bullet}>• Your blood type</Text>
                <Text style={styles.bullet}>• Your approximate location (city/region)</Text>
                <Text style={styles.bullet}>• Your contact information (after mutual consent)</Text>
              </View>

              <Text style={styles.subsectionTitle}>3.2 With Healthcare Facilities</Text>
              <Text style={styles.paragraph}>
                When coordinating donations, relevant information may be shared with licensed medical facilities to ensure proper documentation and safety protocols.
              </Text>

              <Text style={styles.subsectionTitle}>3.3 With Blood Banks</Text>
              <Text style={styles.paragraph}>
                We share aggregated, non-personal data with blood banks to help them manage inventory and respond to community needs.
              </Text>

              <Text style={styles.subsectionTitle}>3.4 With Service Providers</Text>
              <Text style={styles.paragraph}>
                We work with third-party service providers for:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• Cloud storage (Firebase)</Text>
                <Text style={styles.bullet}>• Push notifications</Text>
                <Text style={styles.bullet}>• Maps and location services (Google Maps)</Text>
                <Text style={styles.bullet}>• Analytics and crash reporting</Text>
              </View>

              <Text style={styles.subsectionTitle}>3.5 Legal Requirements</Text>
              <Text style={styles.paragraph}>
                We may disclose your information if required by law, court order, or to:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• Protect our legal rights</Text>
                <Text style={styles.bullet}>• Prevent fraud or abuse</Text>
                <Text style={styles.bullet}>• Respond to government requests</Text>
                <Text style={styles.bullet}>• Protect user safety</Text>
              </View>
            </View>

            {/* Section 4 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. DATA SECURITY</Text>
              <Text style={styles.paragraph}>
                We implement security measures to protect your information:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• Encrypted data transmission (SSL/TLS)</Text>
                <Text style={styles.bullet}>• Secure Firebase authentication</Text>
                <Text style={styles.bullet}>• Regular security audits</Text>
                <Text style={styles.bullet}>• Limited employee access to personal data</Text>
                <Text style={styles.bullet}>• Secure server infrastructure</Text>
              </View>
              <Text style={styles.paragraph}>
                However, no system is completely secure. We cannot guarantee absolute security of your data.
              </Text>
            </View>

            {/* Section 5 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>5. YOUR PRIVACY RIGHTS</Text>
              <Text style={styles.paragraph}>You have the right to:</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• <Text style={styles.bold}>Access:</Text> Request a copy of your personal data</Text>
                <Text style={styles.bullet}>• <Text style={styles.bold}>Correction:</Text> Update inaccurate information</Text>
                <Text style={styles.bullet}>• <Text style={styles.bold}>Deletion:</Text> Request account and data deletion</Text>
                <Text style={styles.bullet}>• <Text style={styles.bold}>Restriction:</Text> Limit how we use your data</Text>
                <Text style={styles.bullet}>• <Text style={styles.bold}>Portability:</Text> Export your data</Text>
                <Text style={styles.bullet}>• <Text style={styles.bold}>Opt-out:</Text> Unsubscribe from notifications</Text>
              </View>
              <Text style={styles.paragraph}>
                To exercise these rights, contact us at privacy@bloodlink.app
              </Text>
            </View>

            {/* Section 6 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. LOCATION SERVICES</Text>
              <Text style={styles.paragraph}>
                You can control location access through your device settings. Disabling location services may limit:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• Emergency blood request matching</Text>
                <Text style={styles.bullet}>• Nearby blood bank searches</Text>
                <Text style={styles.bullet}>• Real-time donor availability</Text>
                <Text style={styles.bullet}>• Distance-based notifications</Text>
              </View>
            </View>

            {/* Section 7 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>7. DATA RETENTION</Text>
              <Text style={styles.paragraph}>
                We retain your information:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• While your account is active</Text>
                <Text style={styles.bullet}>• For 90 days after account deletion (for recovery)</Text>
                <Text style={styles.bullet}>• Longer if required by law</Text>
                <Text style={styles.bullet}>• Anonymized data may be retained indefinitely for analytics</Text>
              </View>
            </View>

            {/* Section 8 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>8. CHILDREN'S PRIVACY</Text>
              <Text style={styles.paragraph}>
                BloodLink is not intended for users under 18 years of age. We do not knowingly collect information from children. If you believe a child has provided us with personal information, please contact us immediately.
              </Text>
            </View>

            {/* Section 9 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>9. INTERNATIONAL DATA TRANSFERS</Text>
              <Text style={styles.paragraph}>
                Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.
              </Text>
            </View>

            {/* Section 10 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>10. CHANGES TO PRIVACY POLICY</Text>
              <Text style={styles.paragraph}>
                We may update this Privacy Policy periodically. We will notify you of significant changes through:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• In-app notifications</Text>
                <Text style={styles.bullet}>• Email alerts</Text>
                <Text style={styles.bullet}>• Updated "Last Updated" date</Text>
              </View>
            </View>

            {/* Section 11 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>11. CONTACT US</Text>
              <Text style={styles.paragraph}>
                For privacy-related questions or concerns:
              </Text>
              <View style={styles.contactBox}>
                <Text style={styles.contactText}>Email: privacy@bloodlink.app</Text>
                <Text style={styles.contactText}>Support: support@bloodlink.app</Text>
                <Text style={styles.contactText}>Website: www.bloodlink.app</Text>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                By using BloodLink, you acknowledge that you have read and understood this Privacy Policy and consent to the collection and use of your information as described.
              </Text>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A2647',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(24),
  },
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: scale(20),
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 12px rgba(0,0,0,0.1)' } as any
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 5,
        }),
  },
  lastUpdated: {
    fontSize: moderateScale(12),
    color: '#64748B',
    fontWeight: '600',
    marginBottom: verticalScale(16),
    textAlign: 'center',
  },
  intro: {
    fontSize: moderateScale(14),
    color: '#1E293B',
    lineHeight: moderateScale(20),
    marginBottom: verticalScale(20),
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    marginBottom: verticalScale(24),
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#0A2647',
    marginBottom: verticalScale(12),
    letterSpacing: 0.3,
  },
  subsectionTitle: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: '#1E293B',
    marginTop: verticalScale(12),
    marginBottom: verticalScale(8),
  },
  paragraph: {
    fontSize: moderateScale(13),
    color: '#334155',
    lineHeight: moderateScale(20),
    marginBottom: verticalScale(8),
  },
  bulletList: {
    marginLeft: scale(8),
    marginBottom: verticalScale(8),
  },
  bullet: {
    fontSize: moderateScale(13),
    color: '#334155',
    lineHeight: moderateScale(20),
    marginBottom: verticalScale(6),
  },
  bold: {
    fontWeight: '700',
  },
  contactBox: {
    backgroundColor: '#F1F5F9',
    padding: scale(12),
    borderRadius: 8,
    marginTop: verticalScale(8),
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  contactText: {
    fontSize: moderateScale(13),
    color: '#1E293B',
    fontWeight: '500',
    marginBottom: 4,
  },
  footer: {
    backgroundColor: '#EFF6FF',
    padding: scale(16),
    borderRadius: 12,
    marginTop: verticalScale(12),
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  footerText: {
    fontSize: moderateScale(13),
    color: '#1E40AF',
    lineHeight: moderateScale(19),
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default PrivacyPolicyScreen;