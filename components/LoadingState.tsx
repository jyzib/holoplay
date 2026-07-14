import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../constants/theme';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.netflixRed} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 16,
  },
  text: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
