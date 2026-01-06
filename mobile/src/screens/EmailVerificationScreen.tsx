import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export const EmailVerificationScreen: React.FC = () => {
  const { user, resendVerificationEmail, refreshUser, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleResend = async () => {
    setLoading(true);
    try {
      await resendVerificationEmail();
      Alert.alert('Email Sent', 'Verification email sent! Check your inbox.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send verification email');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
    } catch (error) {
      // Ignore refresh errors
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      // Ignore sign out errors
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-outline" size={48} color="#f59e0b" />
        </View>

        <Text style={styles.title}>Verify your email</Text>

        <Text style={styles.description}>
          We sent a verification link to{' '}
          <Text style={styles.email}>{user?.email}</Text>.
          {'\n\n'}
          Please check your inbox and click the link to verify your account.
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, refreshing && styles.buttonDisabled]}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>I've verified my email</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, loading && styles.buttonDisabled]}
            onPress={handleResend}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#94a3b8" />
            ) : (
              <>
                <Ionicons name="mail-outline" size={20} color="#94a3b8" />
                <Text style={styles.secondaryButtonText}>Resend verification email</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color="#64748b" />
          <Text style={styles.signOutText}>Sign out and use a different account</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.helpText}>
        Didn't receive the email? Check your spam folder or try resending.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  email: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  secondaryButtonText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  signOutText: {
    color: '#64748b',
    fontSize: 14,
  },
  helpText: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    textAlign: 'center',
    color: '#475569',
    fontSize: 12,
  },
});
