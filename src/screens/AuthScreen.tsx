/**
 * AuthScreen (RF-01).
 *
 * Dos caminos:
 *  - Administrador: inicio de sesión con email/contraseña (permite escritura).
 *  - Espectador: entrada como invitado (solo lectura).
 *
 * En esta demo el backend de autenticación se simula localmente; el login
 * valida únicamente que el email sea no vacío. Con Supabase, sustituir por
 * `supabase.auth.signInWithPassword`.
 */

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { Screen } from '../components/ui/Screen';
import { TextField } from '../components/ui/TextField';
import { signIn, signUp } from '../services/auth';
import { isSupabaseConfigured } from '../services/supabase';
import { useFutAppStore } from '../store/useFutAppStore';
import { colors, fontSizes } from '../theme/colors';

export function AuthScreen() {
  const enterAsGuest = useFutAppStore((state) => state.enterAsGuest);
  const loadDemoData = useFutAppStore((state) => state.loadDemoData);
  const loadLigaMxDemo = useFutAppStore((state) => state.loadLigaMxDemo);
  const setPublicReadonly = useFutAppStore((state) => state.setPublicReadonly);
  const authStatus = useFutAppStore((state) => state.authStatus);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = (): string | null => {
    if (!email.trim()) return 'Ingresa un email válido.';
    if (password.length === 0) return 'Ingresa tu contraseña.';
    return null;
  };

  const loadDemos = () => {
    loadDemoData();
    loadLigaMxDemo();
  };

  const handleSignIn = async () => {
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (result.ok) {
      setPublicReadonly(false);
      loadDemos();
    } else {
      setError(result.error ?? 'No se pudo iniciar sesión.');
    }
  };

  const handleSignUp = async () => {
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setLoading(true);
    const result = await signUp(email, password);
    setLoading(false);
    if (result.ok) {
      setPublicReadonly(false);
      loadDemos();
    } else {
      setError(result.error ?? 'No se pudo crear la cuenta.');
    }
  };

  const handleGuest = () => {
    setError(null);
    setPublicReadonly(false);
    loadDemos();
    enterAsGuest();
  };

  return (
    <Screen>
      <LinearGradient
        colors={[colors.ink, '#1D4ED8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}>
        <View style={styles.heroCourtLine} />
        <Text style={styles.heroTag}>FÚTBOL</Text>
        <Text style={styles.title}>FUTAPP</Text>
        <Text style={styles.subtitle}>
          Gestión de torneos de fútbol · iOS y Android
        </Text>
        <View style={styles.banner}>
          <Chip label="ADMIN = ESCRITURA" tone="gold" />
          <Chip label="INVITADO = LECTURA" tone="dark" />
        </View>
      </LinearGradient>

      <View style={styles.form}>
      <Text style={styles.section}>Acceso del organizador</Text>
      <View style={styles.fieldGap}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="organizador@liga.app"
        />
      </View>
      <View style={styles.fieldGap}>
        <TextField
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {authStatus ? (
        <Text style={styles.authStatus}>{authStatus}</Text>
      ) : null}
      <Chip
        label={isSupabaseConfigured ? 'BACKEND: SUPABASE ACTIVO' : 'MODO DEMO (SIN SUPABASE)'}
        tone={isSupabaseConfigured ? 'gold' : 'dark'}
      />

      <View style={styles.actions}>
        <Button
          title={loading ? 'Procesando…' : 'Iniciar sesión'}
          onPress={handleSignIn}
        />
      </View>
      <View style={styles.actions}>
        <Button
          title="Crear cuenta"
          variant="ghost"
          onPress={handleSignUp}
        />
      </View>

      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>o</Text>
        <View style={styles.divider} />
      </View>

      <Button title="Entrar como invitado (solo lectura)" variant="ghost" onPress={handleGuest} />

      <Text style={styles.hint}>
        {isSupabaseConfigured
          ? 'Login con Supabase: usa tu email y contraseña reales. Cualquier ' +
            'cuenta nueva es espectador hasta que su rol sea owner/mod/admin.'
          : 'Demo sin backend: cualquier email/contraseña funciona y carga un ' +
            'torneo de ejemplo como admin.'}
      </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  heroCourtLine: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 14,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroTag: {
    color: colors.gold,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 4,
    marginBottom: 6,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSizes.subtitle,
    color: '#C7D2E6',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  banner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  form: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 440,
  },
  section: {
    fontSize: fontSizes.tableValue,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  fieldGap: {
    marginBottom: 12,
  },
  error: {
    color: '#B71C1C',
    marginBottom: 8,
    fontWeight: '700',
  },
  authStatus: {
    color: '#B71C1C',
    marginBottom: 8,
    fontSize: fontSizes.tableCell,
    lineHeight: 18,
  },
  actions: {
    marginTop: 4,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  hint: {
    marginTop: 20,
    color: colors.textSecondary,
    fontSize: fontSizes.tableCell,
    textAlign: 'center',
  },
});