/**
 * Comfort Zone in Expo Go: a full-screen WebView of the web app (Vite dev server on port 5173).
 *
 * The PC's address comes from Expo itself (the host Expo Go loaded this bundle from), so the
 * phone always points at the same machine that's running `npm run dev`. Override it with
 * `expo.extra.webUrl` in app.json if you need a fixed URL.
 */
import Constants from 'expo-constants'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { WebView as RNWebView, type WebViewNavigation } from 'react-native-webview'
import type { WebViewErrorEvent, WebViewHttpErrorEvent } from 'react-native-webview/lib/WebViewTypes'

// react-native-webview 14 declares `class WebView<P = undefined>` with props `WebViewProps & P`;
// under TypeScript 6, `& undefined` collapses the props to `never`. Instantiating with P = object fixes it.
const WebView = RNWebView<object>
type WebViewRef = InstanceType<typeof WebView>

const WEB_PORT = 5173
const BG = '#F4F1FA'
const PURPLE = '#450084'

function webAppUrl(): string | null {
  const override = (Constants.expoConfig?.extra as { webUrl?: string } | undefined)?.webUrl
  if (override) return override
  const hostUri = Constants.expoConfig?.hostUri // e.g. "172.30.13.101:8081"
  const host = hostUri?.split(':')[0]
  return host ? `http://${host}:${WEB_PORT}` : null
}

export default function App() {
  const url = webAppUrl()
  const webRef = useRef<WebViewRef>(null)
  const [canGoBack, setCanGoBack] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  // Android hardware back button goes back inside the web app first
  useEffect(() => {
    if (Platform.OS !== 'android') return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack) {
        webRef.current?.goBack()
        return true
      }
      return false
    })
    return () => sub.remove()
  }, [canGoBack])

  const retry = useCallback(() => {
    setError(null)
    setReloadKey((k) => k + 1)
  }, [])

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        {!url || error ? (
          <ErrorScreen url={url} message={error} onRetry={retry} />
        ) : (
          <WebView
            key={reloadKey}
            ref={webRef}
            source={{ uri: url }}
            style={styles.root}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            allowsBackForwardNavigationGestures
            pullToRefreshEnabled
            setSupportMultipleWindows={false}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={PURPLE} />
                <Text style={styles.muted}>Loading Comfort Zone…</Text>
              </View>
            )}
            onNavigationStateChange={(nav: WebViewNavigation) => setCanGoBack(nav.canGoBack)}
            onError={(e: WebViewErrorEvent) => setError(e.nativeEvent.description || 'Could not reach the web app')}
            onHttpError={(e: WebViewHttpErrorEvent) => {
              if (e.nativeEvent.statusCode >= 500) setError(`The web app returned HTTP ${e.nativeEvent.statusCode}`)
            }}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

function ErrorScreen({ url, message, onRetry }: { url: string | null; message: string | null; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Can't reach Comfort Zone</Text>
      <Text style={styles.muted}>{message ?? 'Expo did not report the PC address.'}</Text>
      {url ? <Text style={styles.code}>{url}</Text> : null}
      <View style={styles.tips}>
        <Text style={styles.tip}>• On the PC, run the web app: npm run dev (in urec-app)</Text>
        <Text style={styles.tip}>• Phone and PC on the same Wi-Fi network</Text>
        <Text style={styles.tip}>• Allow Node.js through the Windows firewall (private networks)</Text>
        <Text style={styles.tip}>• Campus Wi-Fi often blocks device-to-device traffic: try a phone hotspot</Text>
      </View>
      <Pressable onPress={onRetry} style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}>
        <Text style={styles.buttonText}>Try again</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10, backgroundColor: BG },
  title: { fontSize: 20, fontWeight: '600', color: '#1B1530' },
  muted: { fontSize: 14, color: '#6B6480', textAlign: 'center' },
  code: { fontSize: 13, color: PURPLE, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
  tips: { alignSelf: 'stretch', gap: 6, marginTop: 8 },
  tip: { fontSize: 13, color: '#3A3350' },
  button: { marginTop: 12, backgroundColor: PURPLE, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})
