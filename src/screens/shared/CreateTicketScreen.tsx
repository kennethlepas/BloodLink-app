import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import {
  createTicket,
  getAcceptedRequest,
  getBloodRequest,
} from '@/src/services/firebase/database';
import { notifyAdminsOfNewTicket } from '@/src/services/notification/notificationService';
import {
  CreateTicketFormData,
  DisputeReason,
  TicketPriority,
  TicketType,
} from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const B_SKY = '#2563EB';
const B_LIGHT = '#3B82F6';

const TICKET_TYPES: { value: TicketType; label: string; icon: string; description: string }[] = [
  { value: 'dispute', label: 'Dispute', icon: 'warning', description: 'Issue with a donation or request' },
  { value: 'bug_report', label: 'Bug Report', icon: 'bug', description: 'Technical issue or error' },
  { value: 'feature_request', label: 'Feature Request', icon: 'lightbulb', description: 'Suggestion for improvement' },
  { value: 'general_inquiry', label: 'General Inquiry', icon: 'help-circle', description: 'Question or general support' },
  { value: 'account_issue', label: 'Account Issue', icon: 'person', description: 'Problem with your account' },
  { value: 'verification_issue', label: 'Verification Issue', icon: 'shield-checkmark', description: 'Verification status problem' },
];

const PRIORITIES: { value: TicketPriority; label: string; color: string; description: string }[] = [
  { value: 'low', label: 'Low', color: '#059669', description: 'Not urgent, can wait' },
  { value: 'medium', label: 'Medium', color: '#D97706', description: 'Standard priority' },
  { value: 'high', label: 'High', color: '#EA580C', description: 'Important issue' },
  { value: 'critical', label: 'Critical', color: '#DC2626', description: 'Urgent, needs immediate attention' },
];

const DISPUTE_REASONS: { value: DisputeReason; label: string; description: string }[] = [
  { value: 'donor_no_show', label: "Donor didn't show up", description: 'Donor did not show up as agreed' },
  { value: 'wrong_blood_type', label: 'Wrong blood type', description: 'Donor provided incorrect blood type' },
  { value: 'inappropriate_behavior', label: 'Inappropriate behavior', description: 'Harassment or misconduct' },
  { value: 'payment_request', label: 'Requested payment/money', description: 'Donor asked for money' },
  { value: 'location_change', label: 'Unexpected location change', description: 'Donor changed location unexpectedly' },
  { value: 'delayed_response', label: 'Delayed or no response', description: 'Donor was unresponsive' },
  { value: 'medical_concern', label: 'Medical concern', description: 'Health issue during donation' },
  { value: 'false_information', label: 'Incorrect information', description: 'Request or donor had incorrect details' },
  { value: 'other', label: 'Other issue', description: 'Different issue not listed above' },
];

export default function CreateTicketScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{
    type?: string;
    relatedEntityId?: string;
    relatedEntityType?: string;
  }>();

  const [selectedType, setSelectedType] = useState<TicketType>(
    (params.type as TicketType) || 'general_inquiry'
  );
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority>('medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDisputeReason, setSelectedDisputeReason] = useState<DisputeReason>('other');
  const [disputeDetails, setDisputeDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [relatedEntityId] = useState(params.relatedEntityId);
  const [relatedEntityType] = useState(params.relatedEntityType);
  const [relatedEntityDetails, setRelatedEntityDetails] = useState<string>('');

  // Load related entity details if provided
  React.useEffect(() => {
    if (relatedEntityId && relatedEntityType) {
      const loadEntityDetails = async () => {
        try {
          if (relatedEntityType === 'accepted_request') {
            const request = await getAcceptedRequest(relatedEntityId);
            if (request) {
              setRelatedEntityDetails(`Donation: ${request.patientName} - ${request.bloodType}`);
            }
          } else if (relatedEntityType === 'blood_request') {
            const request = await getBloodRequest(relatedEntityId);
            if (request) {
              setRelatedEntityDetails(`Request: ${request.patientName} - ${request.bloodType}`);
            }
          }
        } catch (error) {
          console.error('Error loading entity details:', error);
        }
      };
      loadEntityDetails();
    }
  }, [relatedEntityId, relatedEntityType]);

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a ticket');
      return;
    }

    // Validation
    if (!subject.trim()) {
      Alert.alert('Missing Information', 'Please enter a subject for your ticket');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Missing Information', 'Please describe your issue');
      return;
    }

    if (selectedType === 'dispute' && !relatedEntityId) {
      Alert.alert('Missing Information', 'Please select the donation or request you are disputing');
      return;
    }

    setLoading(true);

    try {
      const ticketData: CreateTicketFormData = {
        type: selectedType,
        priority: selectedPriority,
        subject: subject.trim(),
        description: description.trim(),
        relatedEntityId,
        relatedEntityType: relatedEntityType as any,
        disputeReason: selectedType === 'dispute' ? selectedDisputeReason : undefined,
        additionalDetails: selectedType === 'dispute' ? disputeDetails.trim() : undefined,
      };

      const ticketId = await createTicket(
        user.id,
        `${user.firstName} ${user.lastName}`,
        user.email,
        user.phoneNumber,
        ticketData
      );

      // Notify admins
      await notifyAdminsOfNewTicket(ticketId, {
        type: selectedType,
        priority: selectedPriority,
        subject: subject.trim(),
        userName: `${user.firstName} ${user.lastName}`,
      });

      Alert.alert(
        'Ticket Created',
        'Your support ticket has been created successfully. We will respond within 24 hours.',
        [
          {
            text: 'View Ticket',
            onPress: () => router.replace(`/(shared)/ticket/${ticketId}`),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating ticket:', error);
      Alert.alert('Error', 'Failed to create ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
      position: 'relative',
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      overflow: 'hidden',
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 20,
    },
    headerCircle1: {
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: 'rgba(255,255,255,0.05)',
      position: 'absolute',
      top: -50,
      right: -40,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    backBtn: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: 'rgba(0,0,0,0.18)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },
    headerSub: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 2,
      fontWeight: '600',
    },

    content: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
    },

    // Related Entity Card
    relatedCard: {
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      padding: 16,
      marginBottom: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    relatedIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: '#FEF3C7',
      justifyContent: 'center',
      alignItems: 'center',
    },
    relatedText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },

    // Section
    section: {
      marginBottom: 24,
    },
    sectionLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
    },

    // Type Grid
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    typeCard: {
      width: '47%',
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.surfaceBorder,
      padding: 14,
      alignItems: 'center',
    },
    typeCardSelected: {
      borderColor: B_SKY,
      backgroundColor: `${B_SKY}08`,
    },
    typeIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: `${B_SKY}15`,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },
    typeLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 4,
    },
    typeDesc: {
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 14,
    },

    // Priority Cards
    priorityContainer: {
      gap: 10,
    },
    priorityCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.surfaceBorder,
      padding: 14,
    },
    priorityCardSelected: {
      borderColor: B_SKY,
      backgroundColor: `${B_SKY}08`,
    },
    priorityRadio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.textMuted,
      marginRight: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    priorityRadioSelected: {
      borderColor: B_SKY,
    },
    priorityRadioDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: B_SKY,
    },
    priorityContent: {
      flex: 1,
    },
    priorityHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    priorityLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    priorityDesc: {
      fontSize: 12,
      color: colors.textSecondary,
    },

    // Dispute Reasons
    reasonContainer: {
      gap: 8,
    },
    reasonCard: {
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      padding: 12,
    },
    reasonCardSelected: {
      borderColor: B_SKY,
      backgroundColor: `${B_SKY}08`,
    },
    reasonLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    reasonDesc: {
      fontSize: 11,
      color: colors.textSecondary,
    },

    // Input
    input: {
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: colors.text,
      minHeight: 50,
    },
    textarea: {
      minHeight: 140,
      textAlignVertical: 'top',
      lineHeight: 22,
    },
    inputCounter: {
      textAlign: 'right',
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 6,
    },

    // Submit Button
    submitBtn: {
      backgroundColor: B_SKY,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    submitBtnDisabled: {
      backgroundColor: colors.textMuted,
    },
    submitBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });

  const isDispute = selectedType === 'dispute';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[B_SKY, B_LIGHT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerCircle1} />
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Create Ticket</Text>
            <Text style={styles.headerSub}>Tell us what's wrong</Text>
          </View>
          <View style={{ width: 42 }} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Related Entity (if pre-selected) */}
          {relatedEntityId && relatedEntityDetails && (
            <View style={styles.relatedCard}>
              <View style={styles.relatedIcon}>
                <Ionicons name="link" size={20} color="#D97706" />
              </View>
              <Text style={styles.relatedText} numberOfLines={2}>
                {relatedEntityDetails}
              </Text>
            </View>
          )}

          {/* Ticket Type */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>What type of issue is this?</Text>
            <View style={styles.typeGrid}>
              {TICKET_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeCard,
                    selectedType === type.value && styles.typeCardSelected,
                  ]}
                  onPress={() => setSelectedType(type.value)}
                  activeOpacity={0.7}
                >
                  <View style={styles.typeIcon}>
                    <Ionicons
                      name={type.icon as any}
                      size={22}
                      color={selectedType === type.value ? B_SKY : colors.textMuted}
                    />
                  </View>
                  <Text style={styles.typeLabel}>{type.label}</Text>
                  <Text style={styles.typeDesc} numberOfLines={2}>
                    {type.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Priority */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Priority Level</Text>
            <View style={styles.priorityContainer}>
              {PRIORITIES.map((priority) => (
                <TouchableOpacity
                  key={priority.value}
                  style={[
                    styles.priorityCard,
                    selectedPriority === priority.value && styles.priorityCardSelected,
                  ]}
                  onPress={() => setSelectedPriority(priority.value)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.priorityRadio,
                      selectedPriority === priority.value && styles.priorityRadioSelected,
                    ]}
                  >
                    {selectedPriority === priority.value && (
                      <View style={styles.priorityRadioDot} />
                    )}
                  </View>
                  <View style={styles.priorityContent}>
                    <View style={styles.priorityHeader}>
                      <Text style={styles.priorityLabel}>{priority.label}</Text>
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: priority.color,
                        }}
                      />
                    </View>
                    <Text style={styles.priorityDesc}>{priority.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Dispute Reason (if dispute type) */}
          {isDispute && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>What's the issue with this donation?</Text>
              <View style={styles.reasonContainer}>
                {DISPUTE_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason.value}
                    style={[
                      styles.reasonCard,
                      selectedDisputeReason === reason.value && styles.reasonCardSelected,
                    ]}
                    onPress={() => setSelectedDisputeReason(reason.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.reasonLabel}>{reason.label}</Text>
                    <Text style={styles.reasonDesc}>{reason.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Subject */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="Brief summary of your issue"
              placeholderTextColor={colors.textMuted}
              value={subject}
              onChangeText={setSubject}
              maxLength={100}
            />
            <Text style={styles.inputCounter}>{subject.length}/100</Text>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Please provide detailed information about your issue..."
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={1000}
            />
            <Text style={styles.inputCounter}>{description.length}/1000</Text>
          </View>

          {/* Additional Details (for disputes) */}
          {isDispute && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Additional Details (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Any additional information that might help..."
                placeholderTextColor={colors.textMuted}
                value={disputeDetails}
                onChangeText={setDisputeDetails}
                multiline
                maxLength={500}
              />
              <Text style={styles.inputCounter}>{disputeDetails.length}/500</Text>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!subject.trim() || !description.trim() || loading) && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!subject.trim() || !description.trim() || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Create Ticket</Text>
            )}
          </TouchableOpacity>

          {/* Info Note */}
          <View
            style={{
              marginTop: 20,
              padding: 14,
              borderRadius: 12,
              backgroundColor: `${B_SKY}08`,
              flexDirection: 'row',
              gap: 10,
            }}
          >
            <Ionicons name="information-circle" size={20} color={B_SKY} />
            <Text
              style={{
                flex: 1,
                fontSize: 12,
                color: colors.textSecondary,
                lineHeight: 18,
              }}
            >
              Our support team typically responds within 24 hours. For urgent medical emergencies,
              please call 999 immediately.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
