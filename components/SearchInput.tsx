import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography } from '../constants/theme';

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  autoFocus?: boolean;
  showSearchIcon?: boolean;
}

export function SearchInput({
  value,
  onChangeText,
  placeholder = 'Search titles...',
  error,
  hint,
  autoFocus,
  showSearchIcon = true,
}: SearchInputProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.inputWrap, error ? styles.inputError : null]}>
        {showSearchIcon ? (
          <Ionicons name="search" size={20} color={colors.textMuted} />
        ) : null}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 16,
    // @ts-expect-error web-only: remove browser focus ring
    outlineStyle: 'none',
  },
  inputError: {
    borderColor: colors.netflixRed,
  },
  error: {
    ...typography.caption,
    color: colors.netflixRed,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
