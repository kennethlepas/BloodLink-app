import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';

export default function ModalScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">This is a modal</ThemedText>
      <Link href="/" dismissTo style={styles.link}>
        <ThemedText type="link">Go to home screen</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    paddingVertical: 15,
    marginTop: 15,
  },
});
