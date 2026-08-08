import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { PlayerEvent } from '../types/vidapi';
import { saveProgressFromEvent } from '../services/watchProgress';
import { colors, spacing, typography } from '../constants/theme';

interface PlayerWebViewProps {
  embedUrl: string;
  onCompleted?: (event: PlayerEvent) => void;
  onPlayerEvent?: (event: PlayerEvent) => void;
}

const MESSAGE_BRIDGE = `
  (function() {
    window.addEventListener('message', function(e) {
      try {
        window.ReactNativeWebView.postMessage(
          typeof e.data === 'string' ? e.data : JSON.stringify(e.data)
        );
      } catch(err) {}
    });
    true;
  })();
`;

async function handlePlayerPayload(
  payload: unknown,
  onCompleted?: (event: PlayerEvent) => void,
  onPlayerEvent?: (event: PlayerEvent) => void
) {
  try {
    const data =
      typeof payload === 'string' ? (JSON.parse(payload) as PlayerEvent) : (payload as PlayerEvent);
    if (data?.type !== 'PLAYER_EVENT') return;

    await saveProgressFromEvent(data);
    onPlayerEvent?.(data);

    if (data.data.player_status === 'completed') {
      onCompleted?.(data);
    }
  } catch {
    // Ignore non-JSON / non-player messages
  }
}

function WebPlayerIframe({ embedUrl, onCompleted, onPlayerEvent }: PlayerWebViewProps) {
  const onCompletedRef = useRef(onCompleted);
  onCompletedRef.current = onCompleted;
  const onPlayerEventRef = useRef(onPlayerEvent);
  onPlayerEventRef.current = onPlayerEvent;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      void handlePlayerPayload(
        event.data,
        onCompletedRef.current,
        onPlayerEventRef.current
      );
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (failed) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>Player blocked in browser</Text>
        <Text style={styles.fallbackText}>
          VidAPI often blocks embedded playback on localhost. Open the player in a
          new tab, or use Expo Go on your phone.
        </Text>
        <Pressable
          style={styles.fallbackButton}
          onPress={() => void Linking.openURL(embedUrl)}
        >
          <Text style={styles.fallbackButtonText}>Open Player</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {createElement('iframe', {
        src: embedUrl,
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          backgroundColor: '#000',
        },
        allow:
          'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen',
        allowFullScreen: true,
        referrerPolicy: 'origin',
        title: 'Holoplay Player',
        onError: () => setFailed(true),
      })}
      <Pressable
        style={styles.openExternal}
        onPress={() => void Linking.openURL(embedUrl)}
      >
        <Text style={styles.openExternalText}>Open in new tab</Text>
      </Pressable>
    </View>
  );
}

export function PlayerWebView({
  embedUrl,
  onCompleted,
  onPlayerEvent,
}: PlayerWebViewProps) {
  const handleMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      await handlePlayerPayload(
        event.nativeEvent.data,
        onCompleted,
        onPlayerEvent
      );
    },
    [onCompleted, onPlayerEvent]
  );

  if (Platform.OS === 'web') {
    return (
      <WebPlayerIframe
        embedUrl={embedUrl}
        onCompleted={onCompleted}
        onPlayerEvent={onPlayerEvent}
      />
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: embedUrl }}
        style={styles.webview}
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        originWhitelist={['*']}
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        injectedJavaScript={MESSAGE_BRIDGE}
        onMessage={handleMessage}
        startInLoadingState
        renderLoading={() => <View style={styles.loading} />}
        onShouldStartLoadWithRequest={() => true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  openExternal: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  openExternalText: {
    ...typography.caption,
    color: colors.text,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: '#000',
    gap: spacing.md,
  },
  fallbackTitle: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  fallbackText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  fallbackButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.netflixRed,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  fallbackButtonText: {
    ...typography.subtitle,
    color: colors.text,
  },
});
