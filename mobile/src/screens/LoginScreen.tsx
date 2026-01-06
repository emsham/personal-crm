import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { signInWithGoogle } from '../services/authService';

// Password requirements checker
const PasswordRequirements: React.FC<{ password: string }> = ({ password }) => {
  const requirements = useMemo(() => [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
    { label: 'Special character', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ], [password]);

  const allMet = requirements.every(r => r.met);

  return (
    <View style={[
      styles.requirementsContainer,
      allMet && styles.requirementsContainerMet
    ]}>
      {requirements.map((req, i) => (
        <View key={i} style={styles.requirementRow}>
          <Ionicons
            name={req.met ? 'checkmark-circle' : 'close-circle'}
            size={16}
            color={req.met ? '#10b981' : '#475569'}
          />
          <Text style={[
            styles.requirementText,
            req.met && styles.requirementTextMet
          ]}>
            {req.label}
          </Text>
        </View>
      ))}
    </View>
  );
};

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();

  const isPasswordValid = useMemo(() => {
    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    );
  }, [password]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    if (isSignUp && !isPasswordValid) {
      Alert.alert('Error', 'Please meet all password requirements');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      Alert.alert(
        'Email Sent',
        'Check your inbox for a password reset link.',
        [{ text: 'OK', onPress: () => setIsForgotPassword(false) }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Nexus CRM</Text>
        <Text style={styles.subtitle}>
          {isForgotPassword ? 'Reset your password' : 'Personal Relationship Manager'}
        </Text>

        <View style={styles.form}>
          {isForgotPassword ? (
            // Forgot Password Form
            <>
              <Text style={styles.forgotDescription}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleForgotPassword}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setIsForgotPassword(false)}>
                <Text style={styles.switchText}>Back to Sign In</Text>
              </TouchableOpacity>
            </>
          ) : (
            // Sign In / Sign Up Form
            <>
              <TouchableOpacity
                style={[styles.googleButton, loading && styles.buttonDisabled]}
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              {isSignUp && <PasswordRequirements password={password} />}

              {!isSignUp && (
                <TouchableOpacity onPress={() => setIsForgotPassword(true)}>
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, (loading || (isSignUp && !isPasswordValid)) && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading || (isSignUp && !isPasswordValid)}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
                <Text style={styles.switchText}>
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 48,
  },
  form: {},
  googleButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  googleButtonText: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  dividerText: {
    color: '#64748b',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchText: {
    color: '#3b82f6',
    textAlign: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 8,
  },
  forgotDescription: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  requirementsContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  requirementsContainerMet: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  requirementText: {
    color: '#64748b',
    fontSize: 13,
  },
  requirementTextMet: {
    color: '#10b981',
  },
});
