import { useUser } from '@/src/contexts/UserContext';
import { updateUser } from '@/src/services/firebase/database';
import { Donor } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, RefreshControl, ScrollView,
  StatusBar, StyleSheet, Switch, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Colors ──────────────────────────────────────────────────────────────────
const TEAL='#0D9488',TEAL_MID='#14B8A6',TEAL_PALE='#CCFBF1',GREEN='#10B981',GREEN_PALE='#D1FAE5',
WARN='#F59E0B',WARN_PALE='#FEF3C7',DANGER='#EF4444',BLUE='#3B82F6',BLUE_PALE='#DBEAFE',
PURPLE='#8B5CF6',SURFACE='#FFFFFF',BG='#F8FAFC',TEXT_DARK='#0F172A',TEXT_MID='#475569',
TEXT_SOFT='#94A3B8',BORDER='#E2E8F0';

const shadow=(c='#000',o=0.08,r=10,e=3)=>Platform.select({
  web:{boxShadow:`0 2px ${r}px rgba(0,0,0,${o})`}as any,
  default:{shadowColor:c,shadowOffset:{width:0,height:2},shadowOpacity:o,shadowRadius:r,elevation:e}
});

const AvailabilityScreen: React.FC = () => {
  const router = useRouter();
  const { user, updateUserData } = useUser();
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [eligibility, setEligibility] = useState<{daysSince:number;daysUntil:number;nextDate:string|null}>({daysSince:0,daysUntil:0,nextDate:null});

  const isDonor = (u: any): u is Donor => u?.userType === 'donor';

  useEffect(() => {
    if (user) {
      setIsAvailable(user.isAvailable || false);
      calculateEligibility();
    }
  }, [user]);

  const calculateEligibility = () => {
    if (!user || !isDonor(user) || !user.lastDonationDate) {
      setEligibility({daysSince:0,daysUntil:0,nextDate:null});
      return;
    }
    const lastDonation = new Date(user.lastDonationDate);
    const today = new Date();
    const daysSince = Math.floor((today.getTime() - lastDonation.getTime()) / 86400000);
    const daysUntil = 56 - daysSince;
    const eligibleDate = new Date(lastDonation);
    eligibleDate.setDate(eligibleDate.getDate() + 56);
    setEligibility({
      daysSince,
      daysUntil: daysUntil > 0 ? daysUntil : 0,
      nextDate: daysUntil > 0 ? eligibleDate.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}) : null
    });
  };

  const handleToggle = async (value: boolean) => {
    if (!user?.id) return;
    if (value && eligibility.daysUntil > 0) {
      Alert.alert('Not Yet Eligible',`You need to wait until ${eligibility.nextDate} before donating again.`,[{text:'OK'}]);
      return;
    }
    try {
      setLoading(true);
      setIsAvailable(value);
      await updateUser(user.id, { isAvailable: value });
      await updateUserData({ isAvailable: value });
      Alert.alert('Success',`You are now ${value ? 'available' : 'unavailable'} for donations.`);
    } catch (error) {
      console.error('Error updating availability:', error);
      setIsAvailable(!value);
      Alert.alert('Error', 'Failed to update availability.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    calculateEligibility();
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (!user || !isDonor(user)) {
    return (
      <SafeAreaView style={st.container}>
        <View style={st.loadingWrap}>
          <ActivityIndicator size="large" color={TEAL} />
        </View>
      </SafeAreaView>
    );
  }

  const totalDonations = user.totalDonations || 0;
  const points = user.points || 0;

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={TEAL} />
      {/* Header */}
      <LinearGradient colors={[TEAL, TEAL_MID]} style={st.header}>
        <View style={st.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Donation Availability</Text>
          <View style={{width:38}} />
        </View>
        {/* Stats */}
        <View style={st.statsRow}>
          <View style={st.statCard}>
            <Ionicons name={isAvailable?"checkmark-circle":"close-circle"} size={20} color="#FFFFFF" />
            <Text style={st.statValue}>{isAvailable?'Available':'Unavailable'}</Text>
            <Text style={st.statLabel}>Status</Text>
          </View>
          <View style={st.statCard}>
            <Ionicons name="trophy" size={20} color="#FFFFFF" />
            <Text style={st.statValue}>{totalDonations}</Text>
            <Text style={st.statLabel}>Donations</Text>
          </View>
          <View style={st.statCard}>
            <Ionicons name="star" size={20} color="#FFFFFF" />
            <Text style={st.statValue}>{points}</Text>
            <Text style={st.statLabel}>Points</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={st.scrollView} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TEAL]} tintColor={TEAL} />}>
        {/* Status Card */}
        <View style={st.statusCard}>
          <View style={st.statusIconWrap}>
            <LinearGradient colors={isAvailable?[GREEN,'#059669']:[TEXT_SOFT,'#64748B']} style={st.statusIconGrad}>
              <Ionicons name={isAvailable?"checkmark-circle":"close-circle"} size={50} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <Text style={st.statusTitle}>{isAvailable?"You're Available":"You're Unavailable"}</Text>
          <Text style={st.statusSub}>{isAvailable?'Requesters can see your availability':'You will not appear in donor searches'}</Text>
          <View style={st.toggleWrap}>
            <View style={st.toggleInfo}>
              <Text style={st.toggleLabel}>Donation Availability</Text>
              <Text style={st.toggleSub}>{isAvailable?'Tap to go unavailable':'Tap to go available'}</Text>
            </View>
            <Switch value={isAvailable} onValueChange={handleToggle} trackColor={{false:BORDER,true:GREEN_PALE}} thumbColor={isAvailable?GREEN:TEXT_SOFT} ios_backgroundColor={BORDER} disabled={loading} />
          </View>
        </View>

        {/* Eligibility Card */}
        {user.lastDonationDate && (
          <View style={st.eligCard}>
            <View style={st.eligHeader}>
              <View style={[st.eligIcon,{backgroundColor:eligibility.nextDate?WARN_PALE:GREEN_PALE}]}>
                <Ionicons name="calendar-outline" size={20} color={eligibility.nextDate?WARN:GREEN} />
              </View>
              <Text style={st.eligTitle}>Donation Eligibility</Text>
            </View>
            <View style={st.eligRow}>
              <Text style={st.eligLabel}>Last Donation</Text>
              <Text style={st.eligValue}>{new Date(user.lastDonationDate).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'})}</Text>
            </View>
            <View style={st.eligRow}>
              <Text style={st.eligLabel}>Days Since</Text>
              <Text style={st.eligValue}>{eligibility.daysSince} days</Text>
            </View>
            {eligibility.nextDate ? (
              <View style={st.warnBox}>
                <Ionicons name="alert-circle" size={18} color={WARN} />
                <View style={{flex:1}}>
                  <Text style={st.warnTitle}>Not Yet Eligible</Text>
                  <Text style={st.warnText}>You can donate again on {eligibility.nextDate}</Text>
                </View>
              </View>
            ) : (
              <View style={st.successBox}>
                <Ionicons name="checkmark-circle" size={18} color={GREEN} />
                <View style={{flex:1}}>
                  <Text style={st.successTitle}>You're Eligible!</Text>
                  <Text style={st.successText}>You can donate blood at any time</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Info Cards */}
        <View style={st.infoSection}>
          <Text style={st.sectionTitle}>Important Information</Text>
          {[
            {icon:'time-outline',color:BLUE,title:'Donation Frequency',text:'Wait at least 8 weeks (56 days) between donations.'},
            {icon:'fitness-outline',color:GREEN,title:'Health Requirements',text:'Be in good health, weigh 50kg+, well-rested and hydrated.'},
            {icon:'shield-checkmark-outline',color:PURPLE,title:'Safety First',text:'Blood donation is safe with strict hygiene protocols.'}
          ].map((item,i) => (
            <View key={i} style={st.infoCard}>
              <View style={st.infoHeader}>
                <View style={[st.infoIcon,{backgroundColor:item.color+'20'}]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={st.infoTitle}>{item.title}</Text>
              </View>
              <Text style={st.infoText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={st.actionsSection}>
          {[
            {icon:'list-outline',color:TEAL,text:'View Donation History',route:'/(donor)/donation-history'},
            {icon:'notifications-outline',color:WARN,text:'View Blood Requests',route:'/(donor)/requests'}
          ].map((item,i) => (
            <TouchableOpacity key={i} style={st.actionBtn} onPress={()=>router.push(item.route as any)} activeOpacity={0.7}>
              <View style={[st.actionIcon,{backgroundColor:item.color+'20'}]}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>
              <Text style={st.actionText}>{item.text}</Text>
              <Ionicons name="chevron-forward" size={18} color={TEXT_SOFT} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{height:40}} />
      </ScrollView>
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  container:{flex:1,backgroundColor:BG},
  loadingWrap:{flex:1,justifyContent:'center',alignItems:'center'},
  header:{paddingHorizontal:16,paddingTop:12,paddingBottom:24},
  headerRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:20},
  backBtn:{width:38,height:38,borderRadius:12,backgroundColor:'rgba(255,255,255,0.2)',justifyContent:'center',alignItems:'center'},
  headerTitle:{flex:1,textAlign:'center',fontSize:20,fontWeight:'900',color:'#FFFFFF'},
  statsRow:{flexDirection:'row',gap:12},
  statCard:{flex:1,backgroundColor:'rgba(255,255,255,0.2)',borderRadius:12,padding:12,alignItems:'center',borderWidth:1,borderColor:'rgba(255,255,255,0.15)'},
  statValue:{fontSize:13,fontWeight:'800',color:'#FFFFFF',marginTop:6,textAlign:'center'},
  statLabel:{fontSize:11,color:'rgba(255,255,255,0.85)',marginTop:2},
  scrollView:{flex:1},
  statusCard:{backgroundColor:SURFACE,marginHorizontal:20,marginTop:-10,borderRadius:18,padding:20,borderWidth:1,borderColor:BORDER,...shadow('#000',0.1,16,5)},
  statusIconWrap:{marginBottom:12,alignSelf:'center'},
  statusIconGrad:{width:90,height:90,borderRadius:45,justifyContent:'center',alignItems:'center'},
  statusTitle:{fontSize:19,fontWeight:'800',color:TEXT_DARK,marginBottom:6,textAlign:'center'},
  statusSub:{fontSize:12,color:TEXT_SOFT,textAlign:'center',marginBottom:16,paddingHorizontal:12},
  toggleWrap:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:12,paddingHorizontal:14,backgroundColor:BG,borderRadius:12,borderWidth:1,borderColor:BORDER},
  toggleInfo:{flex:1,marginRight:12},
  toggleLabel:{fontSize:14,fontWeight:'700',color:TEXT_DARK,marginBottom:2},
  toggleSub:{fontSize:11,color:TEXT_SOFT},
  eligCard:{backgroundColor:SURFACE,marginHorizontal:20,marginTop:16,borderRadius:16,padding:16,borderWidth:1,borderColor:BORDER,...shadow('#000',0.06,8,3)},
  eligHeader:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:14},
  eligIcon:{width:40,height:40,borderRadius:20,justifyContent:'center',alignItems:'center'},
  eligTitle:{fontSize:16,fontWeight:'800',color:TEXT_DARK},
  eligRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10},
  eligLabel:{fontSize:13,color:TEXT_SOFT,fontWeight:'600'},
  eligValue:{fontSize:13,fontWeight:'700',color:TEXT_DARK},
  warnBox:{flexDirection:'row',backgroundColor:WARN_PALE,padding:12,borderRadius:10,gap:10,marginTop:8,borderLeftWidth:3,borderLeftColor:WARN},
  warnTitle:{fontSize:13,fontWeight:'700',color:'#92400E',marginBottom:3},
  warnText:{fontSize:12,color:'#92400E'},
  successBox:{flexDirection:'row',backgroundColor:GREEN_PALE,padding:12,borderRadius:10,gap:10,marginTop:8,borderLeftWidth:3,borderLeftColor:GREEN},
  successTitle:{fontSize:13,fontWeight:'700',color:'#065F46',marginBottom:3},
  successText:{fontSize:12,color:'#065F46'},
  infoSection:{marginHorizontal:20,marginTop:24},
  sectionTitle:{fontSize:18,fontWeight:'800',color:TEXT_DARK,marginBottom:12},
  infoCard:{backgroundColor:SURFACE,borderRadius:14,padding:16,marginBottom:12,borderWidth:1,borderColor:BORDER,...shadow('#000',0.05,6,2)},
  infoHeader:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:10},
  infoIcon:{width:36,height:36,borderRadius:18,justifyContent:'center',alignItems:'center'},
  infoTitle:{fontSize:15,fontWeight:'700',color:TEXT_DARK},
  infoText:{fontSize:13,color:TEXT_MID,lineHeight:19},
  actionsSection:{marginHorizontal:20,marginTop:24,gap:10},
  actionBtn:{flexDirection:'row',alignItems:'center',backgroundColor:SURFACE,borderRadius:14,padding:14,gap:12,borderWidth:1,borderColor:BORDER,...shadow('#000',0.05,6,2)},
  actionIcon:{width:36,height:36,borderRadius:18,justifyContent:'center',alignItems:'center'},
  actionText:{flex:1,fontSize:14,fontWeight:'600',color:TEXT_DARK},
});

export default AvailabilityScreen;