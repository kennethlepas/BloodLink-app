import SignupScreen from '@/src/screens/auth/SignupScreen';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

const SignupRoute: React.FC = () => {
  const { userType } = useLocalSearchParams<{ userType: 'donor' | 'requester' }>();
  
  // Provide a default value or redirect if userType is missing
  const validUserType = (userType === 'donor' || userType === 'requester') ? userType : 'donor';
  
  return <SignupScreen userType={validUserType} />;
};

export default SignupRoute;