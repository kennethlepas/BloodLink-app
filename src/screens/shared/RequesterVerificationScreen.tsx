import { KENYA_COUNTIES, getSubCountiesByCounty } from '@/src/constants/kenyaLocations';
import { useAppTheme } from '@/src/contexts/ThemeContext';
import { useUser } from '@/src/contexts/UserContext';
import { useCachedData } from '@/src/hooks/useCachedData';
import { uploadImageToCloudinary } from '@/src/services/cloudinary/upload.service';
import { getBloodBanks, submitVerificationRequest } from '@/src/services/firebase/database';
import { BloodBank } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// DPA Consent Text
const CONSENT_TEXT =
    'I confirm that the information above is accurate and that I or the patient/guardian have ' +
    'given informed consent for this blood transfusion request, as required under the Kenya ' +
    'National Blood Transfusion Service Act and the Data Protection Act (2019). I understand ' +
    'that providing false medical information is a serious offence.';

const BLOOD_COMPONENTS = [
    'Whole Blood',
    'Packed Red Cells (PRBC)',
    'Platelets',
    'Fresh Frozen Plasma (FFP)',
    'Cryoprecipitate',
];

const URGENCY_OPTIONS = [
    { label: 'Emergency (< 1 hr)', value: 'critical', color: '#EF4444' },
    { label: 'Urgent (< 4 hrs)', value: 'urgent', color: '#F59E0B' },
    { label: 'Routine', value: 'moderate', color: '#10B981' },
];

const pickImage = async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert('Permission Required', 'Allow access to your photo library to upload documents.');
        return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.5,
    });
    if (result.canceled || !result.assets?.length) return null;
    return result.assets[0].uri;
};

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: 16, paddingBottom: 20 },
    hTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    hTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
    hSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    scroll: { flex: 1 },
    section: { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, padding: 16 },
    sTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 4 },
    sSub: { fontSize: 12, color: colors.textSecondary, marginBottom: 14, lineHeight: 18 },
    // Search
    searchWrap: { height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.bg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 12 },
    searchInput: { flex: 1, fontSize: 14, color: colors.text, marginLeft: 8 },
    // Hospital item
    hospItem: { borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder, flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    hospName: { fontSize: 14, fontWeight: '700', color: colors.text },
    hospCity: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
    // Input
    label: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    input: { borderRadius: 12, borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.bg, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.text, marginBottom: 14 },
    // Chip row
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    chip: { borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 8 },
    chipText: { fontSize: 13, fontWeight: '700' },
    // Upload card
    uploadCard: { borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', padding: 20, marginBottom: 12 },
    uploadLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 8 },
    uploadSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    uploadImg: { width: '100%', height: 140, borderRadius: 10, marginTop: 8, resizeMode: 'cover' },
    consentBox: { borderRadius: 12, backgroundColor: colors.surfaceBorder, padding: 16, marginBottom: 16 },
    consentText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
    consentRow: { flexDirection: 'row', alignItems: 'center' },
    consentLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text, marginLeft: 10 },
    // Buttons
    btnRow: { flexDirection: 'row', gap: 12, margin: 16, marginTop: 4 },
    btn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
    btnGrad: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 14 },
    btnText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
    btnSecondary: { flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
    btnSecText: { fontSize: 15, fontWeight: '700', color: colors.primary },
    progressLabel: { fontSize: 10, fontWeight: '700', marginTop: 4, textAlign: 'center' },
    progressStep: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
});

export default function RequesterVerificationScreen() {
    const router = useRouter();
    const { user, updateUserData } = useUser();
    const { colors, isDark } = useAppTheme();
    const s = getStyles(colors, isDark);

    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);

    // Step 1 — hospital selection
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCounty, setSelectedCounty] = useState('');
    const [selectedSubCounty, setSelectedSubCounty] = useState('');
    const [isCountyExpanded, setIsCountyExpanded] = useState(false);
    const [isSubCountyExpanded, setIsSubCountyExpanded] = useState(false);
    const [selectedHospital, setSelectedHospital] = useState<BloodBank | null>(null);

    // 1. Fetch hospitals with SWR hook
    const {
        data: hospitalsData,
        loading: loadingHospitals,
        refresh: refreshHospitals
    } = useCachedData(
        'blood_banks',
        () => getBloodBanks()
    );

    const hospitals = hospitalsData || [];

    // Step 2 — patient details
    const [patientName, setPatientName] = useState('');
    const [patientMrn, setPatientMrn] = useState('');
    const [wardBed, setWardBed] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    const [selectedUrgency, setSelectedUrgency] = useState('urgent');
    const [selectedComponent, setSelectedComponent] = useState('Packed Red Cells (PRBC)');
    const [doctorName, setDoctorName] = useState('');

    // Step 3 — document & consent
    const [formUri, setFormUri] = useState<string | null>(null);
    const [consentAccepted, setConsentAccepted] = useState(false);

    const onRefresh = useCallback(async () => {
        await refreshHospitals();
    }, [refreshHospitals]);

    const filteredHospitals = useMemo(() => {
        let filtered = hospitals.filter(h =>
            h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (h.location?.city || '').toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (selectedCounty) {
            filtered = filtered.filter(h => h.county === selectedCounty);
        }
        if (selectedSubCounty) {
            filtered = filtered.filter(h => h.subCounty === selectedSubCounty);
        }

        return filtered;
    }, [hospitals, searchQuery, selectedCounty, selectedSubCounty]);

    const step2Valid =
        patientName.trim().length > 0 &&
        wardBed.trim().length > 0 &&
        diagnosis.trim().length > 0 &&
        doctorName.trim().length > 0;

    const handleSubmit = async () => {
        if (!user || !selectedHospital || !formUri) return;
        if (!consentAccepted) {
            Alert.alert('Consent Required', 'Please accept the consent statement.');
            return;
        }
        try {
            setSubmitting(true);
            const folder = `bloodlink/verification/requesters/${user.id}`;
            const formRes = await uploadImageToCloudinary(formUri, folder, 'verification');

            await submitVerificationRequest(user.id, {
                userId: user.id,
                userType: 'requester',
                selectedHospitalMflCode: selectedHospital.id,
                selectedHospitalName: selectedHospital.name,
                patientName: patientName.trim(),
                patientMrnNumber: patientMrn.trim(),
                wardBedNumber: wardBed.trim(),
                diagnosis: diagnosis.trim(),
                bloodComponentNeeded: selectedComponent,
                urgencyLevel: selectedUrgency,
                doctorName: doctorName.trim(),
                hospitalRequisitionFormUrl: formRes.secure_url,
                informedConsentAccepted: true,
                status: 'pending',
                submittedAt: new Date().toISOString(),
            });

            await updateUserData({ verificationStatus: 'pending', isVerified: false });
            Alert.alert(
                'Submitted! 🎉',
                'Your verification request has been submitted. Our team will review it within 24–48 hours.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (err) {
            console.log('[RequesterVerification] submit error:', err);
            Alert.alert('Error', 'Failed to submit. Please check your connection and try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const stepLabels = ['Hospital', 'Patient', 'Documents'];

    const renderProgressBar = () => (
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
                                    : <Text style={{ fontSize: 13, fontWeight: '800', color: active ? colors.primary : 'rgba(255,255,255,0.7)' }}>{num}</Text>}
                            </View>
                            {idx < 2 && <View style={{ flex: 1, height: 2, backgroundColor: done ? '#FFF' : 'rgba(255,255,255,0.3)' }} />}
                        </View>
                        <Text style={[s.progressLabel, { color: active ? '#FFF' : 'rgba(255,255,255,0.6)' }]}>{label}</Text>
                    </View>
                );
            })}
        </View>
    );

    // Step 1 Hospital
    const renderStep1 = () => (
        <View style={{ flex: 1 }}>
            <View style={[s.section, { flex: 1 }]}>
                <Text style={s.sTitle}>Select Hospital</Text>
                <Text style={s.sSub}>Choose the verified Level 4–6 facility from the Kenya Master Health Facility List where the patient is admitted.</Text>
                <View style={s.searchWrap}>
                    <Ionicons name="search" size={16} color={colors.textSecondary} />
                    <TextInput
                        style={s.searchInput}
                        placeholder="Search by hospital name or city..."
                        placeholderTextColor={colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* County and Sub-County Dropdowns */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                    <TouchableOpacity
                        style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: colors.bg,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            height: 46,
                            borderWidth: 1,
                            borderColor: isCountyExpanded ? colors.primary : colors.surfaceBorder
                        }}
                        onPress={() => {
                            setIsCountyExpanded(!isCountyExpanded);
                            setIsSubCountyExpanded(false);
                        }}
                    >
                        <Text style={{ color: selectedCounty ? colors.text : colors.textSecondary, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                            {selectedCounty || 'All Counties'}
                        </Text>
                        <Ionicons name={isCountyExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: colors.bg,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            height: 46,
                            borderWidth: 1,
                            borderColor: isSubCountyExpanded ? colors.primary : colors.surfaceBorder
                        }}
                        onPress={() => {
                            if (!selectedCounty) {
                                Alert.alert('Notice', 'Please select a county first');
                                return;
                            }
                            setIsSubCountyExpanded(!isSubCountyExpanded);
                            setIsCountyExpanded(false);
                        }}
                    >
                        <Text style={{ color: selectedSubCounty ? colors.text : colors.textSecondary, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                            {selectedSubCounty || 'All Sub-Counties'}
                        </Text>
                        <Ionicons name={isSubCountyExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {isCountyExpanded && (
                    <View style={{ backgroundColor: colors.bg, borderRadius: 12, marginBottom: 16, maxHeight: 150, overflow: 'hidden', borderWidth: 1, borderColor: colors.surfaceBorder }}>
                        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                            <TouchableOpacity
                                style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder }}
                                onPress={() => { setSelectedCounty(''); setSelectedSubCounty(''); setIsCountyExpanded(false); }}
                            >
                                <Text style={{ color: colors.text, fontWeight: '700' }}>All Counties</Text>
                            </TouchableOpacity>
                            {KENYA_COUNTIES.map(c => (
                                <TouchableOpacity
                                    key={c}
                                    style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder, backgroundColor: selectedCounty === c ? colors.surfaceAlt : colors.bg }}
                                    onPress={() => { setSelectedCounty(c); setSelectedSubCounty(''); setIsCountyExpanded(false); }}
                                >
                                    <Text style={{ color: selectedCounty === c ? colors.primary : colors.text }}>{c}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {isSubCountyExpanded && (
                    <View style={{ backgroundColor: colors.bg, borderRadius: 12, marginBottom: 16, maxHeight: 150, overflow: 'hidden', borderWidth: 1, borderColor: colors.surfaceBorder }}>
                        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                            <TouchableOpacity
                                style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder }}
                                onPress={() => { setSelectedSubCounty(''); setIsSubCountyExpanded(false); }}
                            >
                                <Text style={{ color: colors.text, fontWeight: '700' }}>All Sub-Counties</Text>
                            </TouchableOpacity>
                            {getSubCountiesByCounty(selectedCounty).map(sc => (
                                <TouchableOpacity
                                    key={sc}
                                    style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder, backgroundColor: selectedSubCounty === sc ? colors.surfaceAlt : colors.bg }}
                                    onPress={() => { setSelectedSubCounty(sc); setIsSubCountyExpanded(false); }}
                                >
                                    <Text style={{ color: selectedSubCounty === sc ? colors.primary : colors.text }}>{sc}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
                {loadingHospitals ? (
                    <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={{ color: colors.textSecondary, marginTop: 8, fontSize: 13 }}>Loading hospitals…</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredHospitals}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={s.hospItem} onPress={() => setSelectedHospital(item)}>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.hospName}>{item.name}</Text>
                                    <Text style={s.hospCity}>{item.location?.city || item.address}</Text>
                                </View>
                                {selectedHospital?.id === item.id && (
                                    <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                                )}
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 20 }}>No hospitals found</Text>
                        }
                        style={{ maxHeight: 340 }}
                    />
                )}
            </View>
            <View style={s.btnRow}>
                <TouchableOpacity style={s.btnSecondary} onPress={() => router.back()}>
                    <Text style={s.btnSecText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[s.btn, { opacity: selectedHospital ? 1 : 0.5 }]}
                    onPress={() => { if (selectedHospital) setStep(2); }}
                    disabled={!selectedHospital}
                >
                    <LinearGradient colors={[colors.primary, '#60A5FA']} style={s.btnGrad}>
                        <Text style={s.btnText}>Next</Text>
                        <Ionicons name="arrow-forward" size={18} color="#FFF" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );

    // Step 2 Patient Details
    const renderStep2 = () => (
        <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 100 }}>
            <View style={s.section}>
                <Text style={s.sTitle}>Patient & Request Details</Text>
                <Text style={s.sSub}>Provide details as they appear on the hospital blood requisition form.</Text>

                <Text style={s.label}>Patient Full Name</Text>
                <TextInput style={s.input} value={patientName} onChangeText={setPatientName} placeholder="As listed on the hospital form" placeholderTextColor={colors.textSecondary} />

                <Text style={s.label}>Hospital Medical Record No. (MRN) — Optional</Text>
                <TextInput style={s.input} value={patientMrn} onChangeText={setPatientMrn} placeholder="e.g. KNH-2024-001234" placeholderTextColor={colors.textSecondary} />

                <Text style={s.label}>Ward / Bed Number</Text>
                <TextInput style={s.input} value={wardBed} onChangeText={setWardBed} placeholder="e.g. Ward 4B, Bed 12" placeholderTextColor={colors.textSecondary} />

                <Text style={s.label}>Clinical Diagnosis</Text>
                <TextInput style={s.input} value={diagnosis} onChangeText={setDiagnosis} placeholder="e.g. Post-op acute blood loss, Anaemia" placeholderTextColor={colors.textSecondary} />

                <Text style={s.label}>Urgency Level</Text>
                <View style={s.chipRow}>
                    {URGENCY_OPTIONS.map(opt => (
                        <TouchableOpacity
                            key={opt.value}
                            style={[s.chip, { borderColor: selectedUrgency === opt.value ? opt.color : colors.surfaceBorder, backgroundColor: selectedUrgency === opt.value ? opt.color + '18' : 'transparent' }]}
                            onPress={() => setSelectedUrgency(opt.value)}
                        >
                            <Text style={[s.chipText, { color: selectedUrgency === opt.value ? opt.color : colors.textSecondary }]}>{opt.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={s.label}>Blood Component Needed</Text>
                <View style={s.chipRow}>
                    {BLOOD_COMPONENTS.map(comp => (
                        <TouchableOpacity
                            key={comp}
                            style={[s.chip, { borderColor: selectedComponent === comp ? colors.primary : colors.surfaceBorder, backgroundColor: selectedComponent === comp ? colors.primary + '18' : 'transparent' }]}
                            onPress={() => setSelectedComponent(comp)}
                        >
                            <Text style={[s.chipText, { color: selectedComponent === comp ? colors.primary : colors.textSecondary }]}>{comp}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={s.label}>Authorising Doctor's Name</Text>
                <TextInput style={s.input} value={doctorName} onChangeText={setDoctorName} placeholder="Full name as on the requisition form" placeholderTextColor={colors.textSecondary} />
            </View>

            <View style={s.btnRow}>
                <TouchableOpacity style={s.btnSecondary} onPress={() => setStep(1)}>
                    <Text style={s.btnSecText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[s.btn, { opacity: step2Valid ? 1 : 0.5 }]}
                    onPress={() => { if (step2Valid) setStep(3); }}
                    disabled={!step2Valid}
                >
                    <LinearGradient colors={[colors.primary, '#60A5FA']} style={s.btnGrad}>
                        <Text style={s.btnText}>Next</Text>
                        <Ionicons name="arrow-forward" size={18} color="#FFF" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    // Step 3 Documents & Consent
    const renderStep3 = () => (
        <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 100 }}>
            <View style={s.section}>
                <Text style={s.sTitle}>Requisition Form & Consent</Text>
                <Text style={s.sSub}>Upload a clear photo of the blood requisition form issued by the hospital (must show doctor's stamp and signature).</Text>

                <TouchableOpacity
                    style={[s.uploadCard, { borderColor: formUri ? '#10B981' : colors.danger }]}
                    onPress={async () => { const uri = await pickImage(); if (uri) setFormUri(uri); }}
                >
                    <Ionicons name={formUri ? 'checkmark-circle' : 'document-attach-outline'} size={36} color={formUri ? '#10B981' : colors.danger} />
                    <Text style={[s.uploadLabel, { color: formUri ? '#10B981' : colors.text }]}>Blood Requisition Form</Text>
                    <Text style={s.uploadSub}>{formUri ? 'Tap to change' : 'Required — hospital-stamped form'}</Text>
                    {formUri && <Image source={{ uri: formUri }} style={s.uploadImg} />}
                </TouchableOpacity>

                <View style={s.consentBox}>
                    <Text style={s.consentText}>{CONSENT_TEXT}</Text>
                </View>
                <TouchableOpacity style={s.consentRow} onPress={() => setConsentAccepted(v => !v)} activeOpacity={0.7}>
                    <Ionicons name={consentAccepted ? 'checkbox' : 'square-outline'} size={26} color={consentAccepted ? colors.primary : '#9CA3AF'} />
                    <Text style={s.consentLabel}>I confirm the above consent on behalf of the patient / guardian</Text>
                </TouchableOpacity>
            </View>

            <View style={s.btnRow}>
                <TouchableOpacity style={s.btnSecondary} onPress={() => setStep(2)}>
                    <Text style={s.btnSecText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[s.btn, { opacity: (formUri && consentAccepted && !submitting) ? 1 : 0.5 }]}
                    onPress={handleSubmit}
                    disabled={!formUri || !consentAccepted || submitting}
                >
                    <LinearGradient colors={['#10B981', '#059669']} style={s.btnGrad}>
                        {submitting
                            ? <ActivityIndicator size="small" color="#FFF" />
                            : <><Text style={s.btnText}>Submit</Text><Ionicons name="checkmark-circle" size={18} color="#FFF" /></>}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            <LinearGradient colors={[colors.primary, '#60A5FA']} style={s.header}>
                <View style={s.hTop}>
                    <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color="#FFF" />
                    </TouchableOpacity>
                    <View>
                        <Text style={s.hTitle}>Requester Verification</Text>
                        <Text style={s.hSub}>Step {step} of 3 · {stepLabels[step - 1]}</Text>
                    </View>
                </View>
                {renderProgressBar()}
            </LinearGradient>

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
        </SafeAreaView>
    );
}
