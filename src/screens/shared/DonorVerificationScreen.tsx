import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import { uploadImageToCloudinary } from '@/src/services/cloudinary/upload.service';
import { submitVerificationRequest } from '@/src/services/firebase/database';
import { DonorQuestionnaire } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// DPA 2019 Consent Text
const CONSENT_TEXT =
    'I hereby consent to the collection and processing of my health data (including blood group ' +
    'and medical history) by BloodLink. I understand this data is stored securely and used solely ' +
    'for blood donation coordination in accordance with the Kenya Data Protection Act (2019) and ' +
    'KNBTS safety standards. I certify that the information provided is true and I am aware that ' +
    'providing false medical information is a risk to public health.';

const QUESTIONNAIRE_ITEMS: { key: keyof DonorQuestionnaire; label: string }[] = [
    { key: 'ageConfirmed', label: 'I am between 16 and 64 years old' },
    { key: 'noFeverOrInfection', label: 'I have no fever, cough, or active infection today' },
    { key: 'noCurrentMedication', label: 'I am not currently taking antibiotics or prescription medication' },
    { key: 'noChronicDisease', label: 'I do not have hypertension, diabetes, or heart disease' },
    { key: 'noRecentTattoo', label: 'I have not had a tattoo or piercing in the last 6 months' },
    { key: 'noRecentSurgery', label: 'I have not had surgery in the last 6 months' },
    { key: 'noRecentVaccination', label: 'I have not received a vaccination in the last 1 month' },
    { key: 'noHIVHepatitis', label: 'I do not have a history of HIV, Hepatitis B, or Hepatitis C' },
    { key: 'noRecentMalaria', label: 'I have not had Malaria in the last 3 months' },
    { key: 'hasInfectiousDiseases', label: 'I confirm that I have no major infectious diseases' },
];

// Image Picker 
const pickImage = async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert('Permission Required', 'Allow access to your photo library to upload documents.');
        return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return null;
    return result.assets[0].uri;
};

// Component
export default function DonorVerificationScreen() {
    const router = useRouter();
    const { user, updateUserData } = useUser();
    const { colors } = useAppTheme();

    const [step, setStep] = useState(1);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Step 1 — documents
    const [nationalIdUri, setNationalIdUri] = useState<string | null>(null);
    const [selfieUri, setSelfieUri] = useState<string | null>(null);
    const [donorCardUri, setDonorCardUri] = useState<string | null>(null);
    const [bloodTestUri, setBloodTestUri] = useState<string | null>(null);

    const [weight, setWeight] = useState('');
    const [lastDonationDate, setLastDonationDate] = useState('');

    // Step 2 — questionnaire 
    const [questionnaire, setQuestionnaire] = useState<DonorQuestionnaire>({
        ageConfirmed: false,
        noFeverOrInfection: false,
        noCurrentMedication: false,
        noChronicDisease: false,
        noRecentTattoo: false,
        noRecentSurgery: false,
        noRecentVaccination: false,
        noHIVHepatitis: false,
        noRecentMalaria: false,
        hasInfectiousDiseases: false,
        lastDonationDate: '',
        consentText: CONSENT_TEXT,
    });

    // Step 3 — consent
    const [consentAccepted, setConsentAccepted] = useState(false);


    const pickAndSet = async (setter: (uri: string) => void) => {
        const uri = await pickImage();
        if (uri) setter(uri);
    };

    const toggleQuestion = (key: keyof DonorQuestionnaire) => {
        if (key === 'consentText') return;
        setQuestionnaire(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const allQuestionsAnswered = QUESTIONNAIRE_ITEMS.every(item => questionnaire[item.key] === true);

    const handleSubmit = async () => {
        if (!user) return;
        if (!consentAccepted) {
            Alert.alert('Consent Required', 'You must accept the consent statement to proceed.');
            return;
        }
        if (!weight || isNaN(Number(weight)) || Number(weight) < 50) {
            Alert.alert('Weight Required', 'Please enter a valid weight (minimum 50kg).');
            return;
        }
        try {
            setSubmitting(true);
            const folder = `bloodlink/verification/donors/${user.id}`;

            setUploading(true);
            const [natIdRes, selfieRes] = await Promise.all([
                uploadImageToCloudinary(nationalIdUri!, folder),
                uploadImageToCloudinary(selfieUri!, folder),
            ]);
            const donorCardRes = donorCardUri
                ? await uploadImageToCloudinary(donorCardUri, folder)
                : null;
            const bloodTestRes = bloodTestUri
                ? await uploadImageToCloudinary(bloodTestUri, folder)
                : null;
            setUploading(false);

            await submitVerificationRequest(user.id, {
                userId: user.id,
                userType: 'donor',
                nationalIdPhotoUrl: natIdRes.secure_url,
                selfiePhotoUrl: selfieRes.secure_url,
                donorCardPhotoUrl: donorCardRes?.secure_url,
                bloodTestReportUrl: bloodTestRes?.secure_url,
                medicalDeclarationAccepted: true,
                donorQuestionnaire: {
                    ...questionnaire,
                    weightValue: Number(weight),
                    lastDonationDate: lastDonationDate || undefined,
                },
                informedConsentAccepted: consentAccepted,
                status: 'pending',
                submittedAt: new Date().toISOString(),
            });

            await updateUserData({
                verificationStatus: 'pending',
                isVerified: false,
                lastDonationDate: lastDonationDate || user.lastDonationDate,
                weight: Number(weight)
            } as any);
            Alert.alert(
                'Submitted! 🎉',
                'Your verification request has been submitted. Our team will review it and notify you within 24–48 hours.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (err) {
            console.log('[DonorVerification] submit error:', err);
            Alert.alert('Error', 'Failed to submit. Please check your connection and try again.');
        } finally {
            setSubmitting(false);
            setUploading(false);
        }
    };


    const s = StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.bg },
        header: { paddingHorizontal: 16, paddingBottom: 20 },
        hTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
        backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
        hTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
        hSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

        progressRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 24, marginTop: 4 },
        progressStep: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
        progressLine: { flex: 1, height: 2, marginHorizontal: 4 },
        progressLabel: { fontSize: 10, fontWeight: '700', marginTop: 4, textAlign: 'center' },

        scroll: { flex: 1 },
        section: { marginHorizontal: 16, marginBottom: 20, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.surfaceBorder },
        sTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 4 },
        sSub: { fontSize: 12, color: colors.textSecondary, marginBottom: 16, lineHeight: 18 },

        uploadCard: { borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', padding: 20, marginBottom: 12 },
        uploadLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 8 },
        uploadSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
        uploadImg: { width: '100%', height: 140, borderRadius: 10, marginTop: 8, resizeMode: 'cover' },
        optBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#F59E0B20', marginLeft: 6 },
        optText: { fontSize: 10, fontWeight: '700', color: '#D97706' },

        qRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder },
        qText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 18, marginRight: 12 },

        consentBox: { backgroundColor: colors.surfaceBorder, borderRadius: 12, padding: 16, marginBottom: 16 },
        consentText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
        consentRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
        consentLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text, marginLeft: 10 },

        btnRow: { flexDirection: 'row', gap: 12, margin: 16, marginTop: 4 },
        btn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
        btnGrad: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
        btnText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
        btnSecondary: { flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
        btnSecText: { fontSize: 15, fontWeight: '700', color: colors.primary },

        inputGroup: { marginBottom: 16 },
        inputLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 },
        input: {
            backgroundColor: colors.surfaceBorder,
            borderRadius: 12,
            padding: 14,
            fontSize: 15,
            color: colors.text,
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.1)',
        },
    });

    const stepLabels = ['Identity', 'Health Check', 'Consent'];
    const BLUE = '#2563EB';
    const BLUE2 = '#3B82F6';


    const renderStep1 = () => (
        <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={s.section}>
                <Text style={s.sTitle}>Identity Documents</Text>
                <Text style={s.sSub}>Upload clear photos of your identification. These are stored securely and viewed only by our verification team.</Text>

                {/* National ID */}
                <TouchableOpacity
                    style={[s.uploadCard, { borderColor: nationalIdUri ? '#10B981' : BLUE }]}
                    onPress={() => pickAndSet(setNationalIdUri)}
                >
                    <Ionicons name={nationalIdUri ? 'checkmark-circle' : 'id-card-outline'} size={32} color={nationalIdUri ? '#10B981' : BLUE} />
                    <Text style={[s.uploadLabel, { color: nationalIdUri ? '#10B981' : colors.text }]}>National ID / Passport</Text>
                    <Text style={s.uploadSub}>{nationalIdUri ? 'Tap to change' : 'Required — tap to upload'}</Text>
                    {nationalIdUri && <Image source={{ uri: nationalIdUri }} style={s.uploadImg} />}
                </TouchableOpacity>

                {/* Selfie */}
                <TouchableOpacity
                    style={[s.uploadCard, { borderColor: selfieUri ? '#10B981' : BLUE }]}
                    onPress={() => pickAndSet(setSelfieUri)}
                >
                    <Ionicons name={selfieUri ? 'checkmark-circle' : 'camera-outline'} size={32} color={selfieUri ? '#10B981' : BLUE} />
                    <Text style={[s.uploadLabel, { color: selfieUri ? '#10B981' : colors.text }]}>Selfie Photo</Text>
                    <Text style={s.uploadSub}>{selfieUri ? 'Tap to change' : 'Required — must match your ID'}</Text>
                    {selfieUri && <Image source={{ uri: selfieUri }} style={s.uploadImg} />}
                </TouchableOpacity>

                {/* Donor Card — optional */}
                <TouchableOpacity
                    style={[s.uploadCard, { borderColor: donorCardUri ? '#10B981' : '#D1D5DB' }]}
                    onPress={() => pickAndSet(setDonorCardUri)}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name={donorCardUri ? 'checkmark-circle' : 'card-outline'} size={32} color={donorCardUri ? '#10B981' : '#9CA3AF'} />
                        <View style={s.optBadge}><Text style={s.optText}>OPTIONAL</Text></View>
                    </View>
                    <Text style={[s.uploadLabel, { color: donorCardUri ? '#10B981' : colors.textSecondary }]}>Previous Donor Card</Text>
                    <Text style={s.uploadSub}>{donorCardUri ? 'Tap to change' : 'If you have donated at KNBTS before'}</Text>
                    {donorCardUri && <Image source={{ uri: donorCardUri }} style={s.uploadImg} />}
                </TouchableOpacity>

                {/* Blood Test Report — optional */}
                <TouchableOpacity
                    style={[s.uploadCard, { borderColor: bloodTestUri ? '#10B981' : '#D1D5DB' }]}
                    onPress={() => pickAndSet(setBloodTestUri)}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name={bloodTestUri ? 'checkmark-circle' : 'document-text-outline'} size={32} color={bloodTestUri ? '#10B981' : '#9CA3AF'} />
                        <View style={s.optBadge}><Text style={s.optText}>OPTIONAL</Text></View>
                    </View>
                    <Text style={[s.uploadLabel, { color: bloodTestUri ? '#10B981' : colors.textSecondary }]}>Blood Test Report</Text>
                    <Text style={s.uploadSub}>{bloodTestUri ? 'Tap to change' : 'Recent health check or blood group report'}</Text>
                    {bloodTestUri && <Image source={{ uri: bloodTestUri }} style={s.uploadImg} />}
                </TouchableOpacity>
            </View>

            <View style={s.btnRow}>
                <TouchableOpacity style={s.btnSecondary} onPress={() => router.back()}>
                    <Text style={s.btnSecText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[s.btn, { opacity: nationalIdUri && selfieUri ? 1 : 0.5 }]}
                    onPress={() => { if (nationalIdUri && selfieUri) setStep(2); }}
                    disabled={!nationalIdUri || !selfieUri}
                >
                    <LinearGradient colors={[BLUE, BLUE2]} style={s.btnGrad}>
                        <Text style={s.btnText}>Next</Text>
                        <Ionicons name="arrow-forward" size={18} color="#FFF" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </ScrollView >
    );

    // Step 2: Health Questionnaire 
    const renderStep2 = () => (
        <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={s.section}>
                <Text style={s.sTitle}>Health Suitability Check</Text>
                <Text style={s.sSub}>
                    Please confirm each statement honestly. This is the KNBTS standard questionnaire to ensure donor and recipient safety.
                    All statements must be confirmed true.
                </Text>

                <View style={s.inputGroup}>
                    <Text style={s.inputLabel}>Current Weight (kg) *</Text>
                    <TextInput
                        style={s.input}
                        value={weight}
                        onChangeText={setWeight}
                        placeholder="Enter your weight (min 50kg)"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="numeric"
                    />
                </View>

                <View style={s.inputGroup}>
                    <Text style={s.inputLabel}>Last Donation Date (if any)</Text>
                    <TextInput
                        style={s.input}
                        value={lastDonationDate}
                        onChangeText={setLastDonationDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>

                <Text style={[s.sTitle, { marginTop: 8, fontSize: 13 }]}>Health Declarations</Text>
                {QUESTIONNAIRE_ITEMS.map(item => (
                    <View key={item.key} style={s.qRow}>
                        <Text style={s.qText}>{item.label}</Text>
                        <Switch
                            value={questionnaire[item.key] as boolean}
                            onValueChange={() => toggleQuestion(item.key)}
                            trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                            thumbColor="#FFF"
                        />
                    </View>
                ))}
            </View>

            <View style={s.btnRow}>
                <TouchableOpacity style={s.btnSecondary} onPress={() => setStep(1)}>
                    <Text style={s.btnSecText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[s.btn, { opacity: allQuestionsAnswered ? 1 : 0.5 }]}
                    onPress={() => { if (allQuestionsAnswered) setStep(3); }}
                    disabled={!allQuestionsAnswered}
                >
                    <LinearGradient colors={[BLUE, BLUE2]} style={s.btnGrad}>
                        <Text style={s.btnText}>Next</Text>
                        <Ionicons name="arrow-forward" size={18} color="#FFF" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    // Step 3: Consent & Submit
    const renderStep3 = () => (
        <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={s.section}>
                <Text style={s.sTitle}>Data Protection Consent</Text>
                <Text style={s.sSub}>Kenya Data Protection Act (2019) — please read carefully before accepting.</Text>
                <View style={s.consentBox}>
                    <Text style={s.consentText}>{CONSENT_TEXT}</Text>
                </View>
                <TouchableOpacity style={s.consentRow} onPress={() => setConsentAccepted(v => !v)} activeOpacity={0.7}>
                    <Ionicons
                        name={consentAccepted ? 'checkbox' : 'square-outline'}
                        size={26}
                        color={consentAccepted ? BLUE : '#9CA3AF'}
                    />
                    <Text style={s.consentLabel}>I have read and accept the consent statement above</Text>
                </TouchableOpacity>
            </View>

            <View style={s.btnRow}>
                <TouchableOpacity style={s.btnSecondary} onPress={() => setStep(2)}>
                    <Text style={s.btnSecText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[s.btn, { opacity: consentAccepted && !submitting ? 1 : 0.5 }]}
                    onPress={handleSubmit}
                    disabled={!consentAccepted || submitting}
                >
                    <LinearGradient colors={['#10B981', '#059669']} style={s.btnGrad}>
                        {submitting
                            ? <ActivityIndicator size="small" color="#FFF" />
                            : <><Text style={s.btnText}>{uploading ? 'Uploading...' : 'Submit'}</Text><Ionicons name="checkmark-circle" size={18} color="#FFF" /></>}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            <LinearGradient colors={[BLUE, BLUE2]} style={s.header}>
                <View style={s.hTop}>
                    <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color="#FFF" />
                    </TouchableOpacity>
                    <View>
                        <Text style={s.hTitle}>Donor Verification</Text>
                        <Text style={s.hSub}>Step {step} of 3 · {stepLabels[step - 1]}</Text>
                    </View>
                </View>

                {/* Progress indicator */}
                <View style={{ flexDirection: 'row', paddingHorizontal: 8 }}>
                    {stepLabels.map((label, idx) => {
                        const num = idx + 1;
                        const active = step === num;
                        const done = step > num;
                        return (
                            <View key={label} style={{ flex: 1, alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                                    {idx > 0 && <View style={{ flex: 1, height: 2, backgroundColor: done ? '#FFF' : 'rgba(255,255,255,0.3)' }} />}
                                    <View style={[s.progressStep, { backgroundColor: done ? '#10B981' : active ? '#FFF' : 'rgba(255,255,255,0.3)' }]}>
                                        {done
                                            ? <Ionicons name="checkmark" size={16} color="#FFF" />
                                            : <Text style={{ fontSize: 13, fontWeight: '800', color: active ? BLUE : 'rgba(255,255,255,0.7)' }}>{num}</Text>}
                                    </View>
                                    {idx < 2 && <View style={{ flex: 1, height: 2, backgroundColor: done ? '#FFF' : 'rgba(255,255,255,0.3)' }} />}
                                </View>
                                <Text style={[s.progressLabel, { color: active ? '#FFF' : 'rgba(255,255,255,0.6)' }]}>{label}</Text>
                            </View>
                        );
                    })}
                </View>
            </LinearGradient>

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
        </SafeAreaView>
    );
}
