import { StyleSheet, Text } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';

interface FooterCreditProps {
  compact?: boolean;
}

export function FooterCredit({ compact }: FooterCreditProps) {
  return (
    <Text style={[styles.credit, compact && styles.compact]}>
      Built with ❤️ by Jazib Zaidi
    </Text>
  );
}

const styles = StyleSheet.create({
  credit: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  compact: {
    paddingVertical: spacing.md,
  },
});
