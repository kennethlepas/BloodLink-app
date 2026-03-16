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

const TermsAndConditionsScreen: React.FC = () => {
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
          <Text style={styles.headerTitle}>Terms & Conditions</Text>
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
              Please read these Terms and Conditions carefully before using the BloodLink application.
            </Text>

            {/* Section 1 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. ACCEPTANCE OF TERMS</Text>
              <Text style={styles.paragraph}>
                By accessing or using the BloodLink mobile application and related services ("Service"), you agree to be bound by these Terms and Conditions. If you do not agree to these Terms, you may not access or use the Service.
              </Text>
            </View>

            {/* Section 2 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. ABOUT BLOODLINK</Text>
              <Text style={styles.paragraph}>
                BloodLink is a GPS-enabled platform that connects blood donors with individuals seeking blood donations in emergency situations. The Service facilitates real-time communication and coordination between registered users, blood banks, and healthcare facilities but does not directly provide medical services or blood products.
              </Text>
            </View>

            {/* Section 3 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. USER ACCOUNTS</Text>
              
              <Text style={styles.subsectionTitle}>3.1 Registration</Text>
              <Text style={styles.paragraph}>To use the Service, you must:</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• Be at least 18 years of age</Text>
                <Text style={styles.bullet}>• Provide accurate, current, and complete information during registration</Text>
                <Text style={styles.bullet}>• Maintain the security of your account credentials</Text>
                <Text style={styles.bullet}>• Promptly update any changes to your account information</Text>
              </View>

              <Text style={styles.subsectionTitle}>3.2 Account Types</Text>
              <Text style={styles.paragraph}>BloodLink offers two account types:</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• <Text style={styles.bold}>Blood Donor:</Text> Users willing to donate blood and respond to emergency requests</Text>
                <Text style={styles.bullet}>• <Text style={styles.bold}>Blood Requester:</Text> Users seeking blood donations for patients or medical needs</Text>
              </View>

              <Text style={styles.subsectionTitle}>3.3 Account Verification</Text>
              <Text style={styles.paragraph}>
                You agree to provide truthful information during registration. BloodLink reserves the right to verify user information and may suspend or terminate accounts with false or misleading information.
              </Text>
            </View>

            {/* Section 4 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. DONOR ELIGIBILITY</Text>
              
              <Text style={styles.subsectionTitle}>4.1 Medical Requirements</Text>
              <Text style={styles.paragraph}>Blood donors must:</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• Be at least 18 years old</Text>
                <Text style={styles.bullet}>• Weigh at least 50 kilograms (110 pounds)</Text>
                <Text style={styles.bullet}>• Be in good general health</Text>
                <Text style={styles.bullet}>• Meet all medical eligibility requirements for blood donation</Text>
              </View>

              <Text style={styles.subsectionTitle}>4.2 Health Responsibility</Text>
              <Text style={styles.paragraph}>Donors are responsible for:</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• Honestly disclosing their health status</Text>
                <Text style={styles.bullet}>• Following all medical guidelines for blood donation</Text>
                <Text style={styles.bullet}>• Consulting with healthcare professionals before donating</Text>
                <Text style={styles.bullet}>• Informing requesters of any conditions that may affect eligibility</Text>
              </View>
            </View>

            {/* Section 5 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>5. USER RESPONSIBILITIES</Text>
              
              <Text style={styles.subsectionTitle}>5.1 Prohibited Activities</Text>
              <Text style={styles.paragraph}>Users must NOT:</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• Provide false or misleading information</Text>
                <Text style={styles.bullet}>• Impersonate another person or entity</Text>
                <Text style={styles.bullet}>• Engage in harassment, discrimination, or abusive behavior</Text>
                <Text style={styles.bullet}>• Use the Service for unauthorized commercial purposes</Text>
                <Text style={styles.bullet}>• Share login credentials with others</Text>
                <Text style={styles.bullet}>• Interfere with the Service's operation or security</Text>
                <Text style={styles.bullet}>• Post inappropriate, offensive, or illegal content</Text>
              </View>

              <Text style={styles.subsectionTitle}>5.2 Medical Responsibility</Text>
              <Text style={styles.paragraph}>Users acknowledge that:</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• BloodLink is not a medical service provider</Text>
                <Text style={styles.bullet}>• All blood donations must comply with local health regulations</Text>
                <Text style={styles.bullet}>• Users must coordinate with licensed medical facilities</Text>
                <Text style={styles.bullet}>• BloodLink does not verify medical claims or health status</Text>
                <Text style={styles.bullet}>• Proper medical screening and testing are required before donation</Text>
              </View>
            </View>

            {/* Section 6 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. LOCATION SERVICES</Text>
              <Text style={styles.paragraph}>
                BloodLink uses GPS technology to connect users with nearby donors and blood banks. By using the Service, you consent to:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• Location data collection when using the app</Text>
                <Text style={styles.bullet}>• Sharing your approximate location with matched users</Text>
                <Text style={styles.bullet}>• Receiving location-based emergency blood requests</Text>
              </View>
              <Text style={styles.paragraph}>
                You can disable location services in your device settings, but this may limit app functionality.
              </Text>
            </View>

            {/* Section 7 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>7. EMERGENCY REQUESTS</Text>
              <Text style={styles.paragraph}>
                When a blood request is initiated, compatible donors in the surrounding region receive instant notifications. Users understand that:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• Response to requests is voluntary</Text>
                <Text style={styles.bullet}>• No guarantee of donor availability exists</Text>
                <Text style={styles.bullet}>• All donations must occur at licensed medical facilities</Text>
                <Text style={styles.bullet}>• Healthcare facilities must be involved in the donation process</Text>
              </View>
            </View>

            {/* Section 8 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>8. IN-APP COMMUNICATION</Text>
              <Text style={styles.paragraph}>
                BloodLink provides secure chat features for users to coordinate blood donations. Users agree to:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• Use chat only for donation-related coordination</Text>
                <Text style={styles.bullet}>• Maintain respectful communication</Text>
                <Text style={styles.bullet}>• Not share sensitive personal information unnecessarily</Text>
                <Text style={styles.bullet}>• Report any inappropriate messages or behavior</Text>
              </View>
            </View>

            {/* Section 9 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>9. BLOOD BANK INFORMATION</Text>
              <Text style={styles.paragraph}>
                The Blood Availability Search feature provides real-time information about blood bank inventory. BloodLink strives to maintain accurate data but:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• Does not guarantee inventory accuracy</Text>
                <Text style={styles.bullet}>• Is not responsible for blood bank operations</Text>
                <Text style={styles.bullet}>• Recommends confirming availability directly with facilities</Text>
                <Text style={styles.bullet}>• Updates information based on reported data</Text>
              </View>
            </View>

            {/* Section 10 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>10. LIMITATION OF LIABILITY</Text>
              <Text style={styles.paragraph}>
                To the maximum extent permitted by law, BloodLink and its operators shall not be liable for:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• Any medical complications arising from blood donations</Text>
                <Text style={styles.bullet}>• Failure to find suitable donors</Text>
                <Text style={styles.bullet}>• Inaccurate user-provided information</Text>
                <Text style={styles.bullet}>• Technical issues or service interruptions</Text>
                <Text style={styles.bullet}>• Actions or omissions of users or third parties</Text>
                <Text style={styles.bullet}>• Any indirect, incidental, or consequential damages</Text>
              </View>
            </View>

            {/* Section 11 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>11. PRIVACY AND DATA</Text>
              <Text style={styles.paragraph}>
                Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your personal information. By using BloodLink, you consent to our data practices as described in the Privacy Policy.
              </Text>
            </View>

            {/* Section 12 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>12. TERMINATION</Text>
              <Text style={styles.paragraph}>
                BloodLink reserves the right to suspend or terminate your account at any time for:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• Violation of these Terms</Text>
                <Text style={styles.bullet}>• Providing false information</Text>
                <Text style={styles.bullet}>• Engaging in prohibited activities</Text>
                <Text style={styles.bullet}>• Compromising platform security or integrity</Text>
              </View>
            </View>

            {/* Section 13 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>13. CHANGES TO TERMS</Text>
              <Text style={styles.paragraph}>
                BloodLink may modify these Terms at any time. We will notify users of significant changes through the app or email. Continued use of the Service after changes constitutes acceptance of the modified Terms.
              </Text>
            </View>

            {/* Section 14 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>14. CONTACT INFORMATION</Text>
              <Text style={styles.paragraph}>
                For questions about these Terms, please contact us at:
              </Text>
              <View style={styles.contactBox}>
                <Text style={styles.contactText}>Email: support@bloodlink.app</Text>
                <Text style={styles.contactText}>Website: www.bloodlink.app</Text>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                By using BloodLink, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
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

export default TermsAndConditionsScreen;