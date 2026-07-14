import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';

interface HomeSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function HomeSearchBar({
  value,
  onChangeText,
  placeholder = 'Search movies & TV shows',
  autoFocus,
}: HomeSearchBarProps) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="search" size={20} color={colors.textMuted} />
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
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10}>
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: '#2A2A2A',
    borderRadius: radius.sm,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    padding: 0,
    // @ts-expect-error web-only: remove browser focus ring
    outlineStyle: 'none',
  },
});
