import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function Header({ title = 'HOLOPLAY', showBack, onBack, rightAction }: HeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {showBack && onBack ? (
          <Pressable onPress={onBack} style={styles.backButton} hitSlop={12}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </Pressable>
        ) : (
          <Text style={styles.logo}>
            <Text style={styles.logoAccent}>HOLO</Text>PLAY
          </Text>
        )}
      </View>
      {title && showBack ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : null}
      <View style={styles.right}>{rightAction}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'transparent',
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  right: {
    flex: 1,
    alignItems: 'flex-end',
  },
  backButton: {
    marginRight: spacing.sm,
  },
  logo: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 1,
  },
  logoAccent: {
    color: colors.netflixRed,
  },
  title: {
    ...typography.subtitle,
    color: colors.text,
    flex: 2,
    textAlign: 'center',
  },
});
