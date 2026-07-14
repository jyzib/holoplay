import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../constants/theme';

interface SeasonEpisodePickerProps {
  season: number;
  episode: number;
  maxSeasons?: number;
  maxEpisodes?: number;
  onChange: (season: number, episode: number) => void;
}

export function SeasonEpisodePicker({
  season,
  episode,
  maxSeasons = 10,
  maxEpisodes = 24,
  onChange,
}: SeasonEpisodePickerProps) {
  const [activeTab, setActiveTab] = useState<'season' | 'episode'>('season');
  const seasons = Array.from({ length: maxSeasons }, (_, i) => i + 1);
  const episodes = Array.from({ length: maxEpisodes }, (_, i) => i + 1);

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === 'season' && styles.tabActive]}
          onPress={() => setActiveTab('season')}
        >
          <Text style={[styles.tabText, activeTab === 'season' && styles.tabTextActive]}>
            Season {season}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'episode' && styles.tabActive]}
          onPress={() => setActiveTab('episode')}
        >
          <Text style={[styles.tabText, activeTab === 'episode' && styles.tabTextActive]}>
            Episode {episode}
          </Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {(activeTab === 'season' ? seasons : episodes).map((num) => {
          const selected = activeTab === 'season' ? num === season : num === episode;
          return (
            <Pressable
              key={num}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => {
                if (activeTab === 'season') {
                  onChange(num, episode);
                } else {
                  onChange(season, num);
                }
              }}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {activeTab === 'season' ? `S${num}` : `E${num}`}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
  },
  tabActive: {
    backgroundColor: colors.netflixRed,
  },
  tabText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
  scroll: {
    flexGrow: 0,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    borderColor: colors.primeBlue,
    backgroundColor: 'rgba(0, 168, 225, 0.15)',
  },
  chipText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.primeBlue,
    fontWeight: '700',
  },
});
