import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { FooterCredit } from '../../components/FooterCredit';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SearchInput } from '../../components/SearchInput';
import { SearchResultRow } from '../../components/SearchResultRow';
import { colors, spacing, typography } from '../../constants/theme';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { searchImdbTitles } from '../../services/imdbSearch';
import { isValidImdbId, normalizeImdbId } from '../../services/vidapi';
import type { ImdbTitleResult } from '../../types/imdb';

type MediaChoice = 'movie' | 'tv';

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [titleQuery, setTitleQuery] = useState('');
  const debouncedQuery = useDebouncedValue(titleQuery, 350);
  const [results, setResults] = useState<ImdbTitleResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [imdbId, setImdbId] = useState('');
  const [mediaType, setMediaType] = useState<MediaChoice>('movie');
  const [idError, setIdError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const query = debouncedQuery.trim();
      if (query.length < 2) {
        setResults([]);
        setSearching(false);
        setSearchError('');
        return;
      }

      setSearching(true);
      setSearchError('');
      try {
        const next = await searchImdbTitles(query);
        if (!cancelled) setResults(next);
      } catch {
        if (!cancelled) {
          setResults([]);
          setSearchError('Could not search titles. Try again.');
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const openTitle = (item: ImdbTitleResult) => {
    if (item.mediaType === 'movie') {
      router.push(`/movie/${item.imdbId}`);
    } else {
      router.push(`/tv/${item.imdbId}`);
    }
  };

  const handleSearchById = () => {
    const normalized = normalizeImdbId(imdbId);
    if (!isValidImdbId(normalized)) {
      setIdError('Enter a valid IMDB ID (e.g. tt0944947)');
      return;
    }
    setIdError('');
    if (mediaType === 'movie') {
      router.push(`/movie/${normalized}`);
    } else {
      router.push(`/tv/${normalized}`);
    }
  };

  const handlePlayDirect = () => {
    const normalized = normalizeImdbId(imdbId);
    if (!isValidImdbId(normalized)) {
      setIdError('Enter a valid IMDB ID (e.g. tt0944947)');
      return;
    }
    setIdError('');
    router.push({
      pathname: '/player',
      params: {
        type: mediaType,
        imdbId: normalized,
        season: mediaType === 'tv' ? '1' : undefined,
        episode: mediaType === 'tv' ? '1' : undefined,
        title: normalized,
      },
    });
  };

  const showTitleResults = titleQuery.trim().length >= 2;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header title="Search" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.heading}>Search titles</Text>
          <Text style={styles.description}>
            Type a movie or show name — results update as you type.
          </Text>
          <SearchInput
            value={titleQuery}
            onChangeText={setTitleQuery}
            placeholder="Search movies & TV shows"
            autoFocus
          />

          {searching ? (
            <View style={styles.statusRow}>
              <ActivityIndicator color={colors.netflixRed} />
              <Text style={styles.statusText}>Searching...</Text>
            </View>
          ) : null}

          {searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}

          {showTitleResults && !searching && !searchError && results.length === 0 ? (
            <Text style={styles.statusText}>No titles found for “{titleQuery.trim()}”</Text>
          ) : null}

          {results.length > 0 ? (
            <View style={styles.results}>
              {results.map((item) => (
                <SearchResultRow
                  key={item.imdbId}
                  item={item}
                  onPress={() => openTitle(item)}
                />
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.heading}>Find by IMDB ID</Text>
          <Text style={styles.description}>
            Paste any IMDB ID to browse details or start watching instantly.
          </Text>

          <SearchInput
            value={imdbId}
            onChangeText={(text) => {
              setImdbId(text);
              setIdError('');
            }}
            placeholder="Enter IMDB ID (e.g. tt0944947)"
            error={idError}
            hint="Use any IMDB ID starting with tt — movies and TV shows supported"
            showSearchIcon={false}
          />

          <View style={styles.typeRow}>
            <Text style={styles.typeLabel}>Content type</Text>
            <View style={styles.typeButtons}>
              {(['movie', 'tv'] as const).map((type) => (
                <PrimaryButton
                  key={type}
                  label={type === 'movie' ? 'Movie' : 'TV Show'}
                  icon={type === 'movie' ? 'film-outline' : 'tv-outline'}
                  variant={mediaType === type ? 'primary' : 'outline'}
                  onPress={() => setMediaType(type)}
                />
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              label="View Details"
              icon="information-circle-outline"
              variant="secondary"
              onPress={handleSearchById}
            />
            <PrimaryButton
              label="Play Now"
              icon="play"
              onPress={handlePlayDirect}
            />
          </View>

          <View style={styles.examples}>
            <Text style={styles.examplesTitle}>Try these examples</Text>
            {[
              { id: 'tt1517268', label: 'Barbie (Movie)', type: 'movie' as const },
              { id: 'tt0944947', label: 'Game of Thrones (TV)', type: 'tv' as const },
              { id: 'tt1375666', label: 'Inception (Movie)', type: 'movie' as const },
            ].map((example) => (
              <PrimaryButton
                key={example.id}
                label={example.label}
                icon="link-outline"
                variant="outline"
                onPress={() => {
                  setImdbId(example.id);
                  setMediaType(example.type);
                  setIdError('');
                }}
              />
            ))}
          </View>
        </View>
        <FooterCredit />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    gap: spacing.md,
  },
  heading: {
    ...typography.title,
    color: colors.text,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
  },
  results: {
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusText: {
    ...typography.body,
    color: colors.textMuted,
  },
  errorText: {
    ...typography.body,
    color: colors.netflixRed,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  typeRow: {
    gap: spacing.sm,
  },
  typeLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
  },
  examples: {
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  examplesTitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
});
