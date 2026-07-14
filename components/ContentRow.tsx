import { FlatList, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';
import { PosterCard } from './PosterCard';

export interface ContentRowItem {
  id: string;
  title: string;
  posterUrl?: string;
  subtitle?: string;
  progress?: number;
  duration?: number;
}

interface ContentRowProps {
  title: string;
  items: ContentRowItem[];
  onItemPress: (item: ContentRowItem) => void;
}

export function ContentRow({ title, items, onItemPress }: ContentRowProps) {
  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        data={items}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PosterCard
            title={item.title}
            posterUrl={item.posterUrl}
            subtitle={item.subtitle}
            progress={item.progress}
            duration={item.duration}
            onPress={() => onItemPress(item)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.md,
  },
});
