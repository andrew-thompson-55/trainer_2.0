import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@infra/theme';
import { useAuth } from '@infra/auth/auth-provider';
import { authFetch } from '@infra/fetch/auth-fetch';
import type { HeightUnit } from '@domain/types';
import * as userApi from '@domain/api/user';
import { pkg } from '@infra/package';

const { strings } = pkg;

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [heightValue, setHeightValue] = useState('');
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('in');
  const [saving, setSaving] = useState(false);

  // Original values for dirty check
  const [original, setOriginal] = useState({
    firstName: '', lastName: '', dateOfBirth: '', gender: '',
    heightValue: '', heightUnit: 'in' as HeightUnit,
  });

  useEffect(() => {
    // Split name
    const name = user?.name || '';
    const parts = name.split(' ');
    const first = parts[0] || '';
    const last = parts.slice(1).join(' ') || '';
    setFirstName(first);
    setLastName(last);

    // Load settings
    userApi.getUserSettings(authFetch).then(s => {
      const dob = s.date_of_birth ?? '';
      const g = s.gender ?? '';
      const hv = s.height_value ? String(s.height_value) : '';
      const hu = s.height_unit ?? 'in';
      setDateOfBirth(dob);
      setGender(g);
      setHeightValue(hv);
      setHeightUnit(hu);
      setOriginal({ firstName: first, lastName: last, dateOfBirth: dob, gender: g, heightValue: hv, heightUnit: hu });
    }).catch(() => {
      setOriginal({ firstName: first, lastName: last, dateOfBirth: '', gender: '', heightValue: '', heightUnit: 'in' });
    });
  }, []);

  const isDirty = useMemo(() => (
    firstName !== original.firstName ||
    lastName !== original.lastName ||
    dateOfBirth !== original.dateOfBirth ||
    gender !== original.gender ||
    heightValue !== original.heightValue ||
    heightUnit !== original.heightUnit
  ), [firstName, lastName, dateOfBirth, gender, heightValue, heightUnit, original]);

  const getInitials = () => {
    if (firstName && lastName) return (firstName[0] + lastName[0]).toUpperCase();
    return (user?.name || 'U').slice(0, 2).toUpperCase();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update name if changed
      const newName = [firstName, lastName].filter(Boolean).join(' ');
      if (newName !== user?.name) {
        await userApi.updateProfile(authFetch, { name: newName });
      }

      // Update settings fields
      const settingsUpdate: Record<string, any> = {};
      if (dateOfBirth !== original.dateOfBirth) settingsUpdate.date_of_birth = dateOfBirth || null;
      if (gender !== original.gender) settingsUpdate.gender = gender || null;
      if (heightValue !== original.heightValue) settingsUpdate.height_value = heightValue ? parseFloat(heightValue) : null;
      if (heightUnit !== original.heightUnit) settingsUpdate.height_unit = heightUnit;

      if (Object.keys(settingsUpdate).length > 0) {
        await userApi.updateUserSettings(authFetch, settingsUpdate);
      }

      router.back();
    } catch (e) {
      console.error('Failed to save profile:', e);
      Alert.alert('Error', 'Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{strings['editProfile.title']}</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>

          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
          </View>

          {/* First Name */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{strings['editProfile.firstName']}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
            placeholderTextColor={colors.textSecondary}
          />

          {/* Last Name */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{strings['editProfile.lastName']}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last name"
            placeholderTextColor={colors.textSecondary}
          />

          {/* Email (read-only) */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{strings['editProfile.email']}</Text>
          <View style={[styles.input, styles.readonlyInput, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[{ fontSize: 16, color: colors.textSecondary }]}>{user?.email || ''}</Text>
          </View>
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>{strings['editProfile.emailHelper']}</Text>

          {/* Date of Birth */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 12 }]}>{strings['editProfile.dateOfBirth']}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textSecondary}
            maxLength={10}
          />

          {/* Gender */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{strings['editProfile.gender']}</Text>
          <View style={styles.pillContainer}>
            {GENDER_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.pill,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  gender === opt.value && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setGender(opt.value)}
              >
                <Text style={[
                  styles.pillText,
                  { color: colors.textPrimary },
                  gender === opt.value && styles.pillTextActive,
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Height */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>{strings['editProfile.height']}</Text>
          <View style={styles.heightRow}>
            <TextInput
              style={[styles.input, styles.heightInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
              value={heightValue}
              onChangeText={setHeightValue}
              placeholder={heightUnit === 'in' ? 'e.g. 70' : 'e.g. 178'}
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              maxLength={5}
            />
            <View style={styles.pillContainer}>
              {(['in', 'cm'] as HeightUnit[]).map(unit => (
                <TouchableOpacity
                  key={unit}
                  style={[
                    styles.pill,
                    { backgroundColor: colors.background, borderColor: colors.border },
                    heightUnit === unit && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setHeightUnit(unit)}
                >
                  <Text style={[
                    styles.pillText,
                    { color: colors.textPrimary },
                    heightUnit === unit && styles.pillTextActive,
                  ]}>
                    {unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: isDirty ? colors.primary : colors.border },
            ]}
            onPress={handleSave}
            disabled={!isDirty || saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : strings['editProfile.saveChanges']}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: { width: 36 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  content: { padding: 20 },

  avatarContainer: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 28, fontWeight: '700' },

  fieldLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 6, marginLeft: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  readonlyInput: {
    justifyContent: 'center',
    marginBottom: 4,
  },
  helperText: { fontSize: 12, marginLeft: 4, marginBottom: 8 },

  heightRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  heightInput: { flex: 1, marginBottom: 0 },

  pillContainer: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  pillText: { fontWeight: '500', fontSize: 14 },
  pillTextActive: { color: '#FFF' },

  saveButton: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: { color: '#FFF', fontSize: 17, fontWeight: '600' },
});
