import { memo, useCallback } from 'react';
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

export const ContentRow = memo(function ContentRow({
  title,
  items,
  onItemPress,
}: ContentRowProps) {
  const renderItem = useCallback(
    ({ item }: { item: ContentRowItem }) => (
      <PosterCard
        title={item.title}
        posterUrl={item.posterUrl}
        subtitle={item.subtitle}
        progress={item.progress}
        duration={item.duration}
        onPress={() => onItemPress(item)}
      />
    ),
    [onItemPress]
  );

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
        renderItem={renderItem}
        initialNumToRender={5}
        maxToRenderPerBatch={4}
        windowSize={3}
        updateCellsBatchingPeriod={50}
        getItemLayout={(_, index) => ({
          length: 130,
          offset: 130 * index,
          index,
        })}
      />
    </View>
  );
});

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
