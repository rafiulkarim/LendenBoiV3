import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  Keyboard
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  HelperText,
  Snackbar,
} from 'react-native-paper';
import debounce from 'lodash.debounce';

const { width } = Dimensions.get('window');
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CheckInternetConnection } from '../Helpers/Internet/CheckInternetConnection';
import axios from 'axios';
import { BASE_URL } from '../env';

const Login = ({ navigation }) => {
  const { singIn } = React.useContext(AuthContext);
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [touched, setTouched] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [snackbarType, setSnackbarType] = useState('success');
  const [isSubmitting, setIsSubmitting] = useState(false); // Add loading state
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Color scheme matching the "माॅटर वॉक्स" logo
  const colors = {
    primary: '#00A8A8',       // Teal/Blue-green - from logo
    primaryLight: '#4DC9C9',  // Lighter teal
    primaryLighter: '#80D9D9', // Even lighter
    primaryLightest: '#E6F7F7', // Very light background
    primaryDark: '#008787',    // Darker teal
    primaryDarker: '#006666',  // Even darker
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545',
    background: '#f8f9fa',
    surface: '#ffffff',
    textPrimary: '#1A535C',   // Dark teal for text
    info: '#17a2b8',
  };

  // Format phone number as user types for Bangladesh (01X XX XX XX XX format)
  const formatPhoneNumber = (value) => {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');

    // Limit to 11 digits for Bangladeshi phone numbers
    const limited = cleaned.slice(0, 11);

    // Format as: 01X XX XX XX XX
    if (limited.length <= 3) {
      return limited;
    } else if (limited.length <= 5) {
      return `${limited.slice(0, 3)} ${limited.slice(3, 5)}`;
    } else if (limited.length <= 7) {
      return `${limited.slice(0, 3)} ${limited.slice(3, 5)} ${limited.slice(5, 7)}`;
    } else if (limited.length <= 9) {
      return `${limited.slice(0, 3)} ${limited.slice(3, 5)} ${limited.slice(5, 7)} ${limited.slice(7, 9)}`;
    } else {
      return `${limited.slice(0, 3)} ${limited.slice(3, 5)} ${limited.slice(5, 7)} ${limited.slice(7, 9)} ${limited.slice(9, 11)}`;
    }
  };

  // Handle phone number input
  const handlePhoneChange = (value) => {
    const formatted = formatPhoneNumber(value);
    handleInputChange('phone', formatted);
  };

  // Debounced validation function
  const validateField = useCallback(
    debounce((name, value, allValues) => {
      const newErrors = { ...errors };

      // Clear error when field is cleared
      if (!value && newErrors[name]) {
        delete newErrors[name];
      }

      // Validate phone number for Bangladesh (01X XX XX XX XX format only)
      if (name === 'phone') {
        if (value) {
          const digitsOnly = value.replace(/\D/g, '');

          // Must be exactly 11 digits (when spaces removed)
          if (digitsOnly.length !== 11) {
            if (digitsOnly.length < 11) {
              newErrors.phone = 'ফোন নম্বর ১১ ডিজিট হতে হবে';
            } else {
              newErrors.phone = 'ফোন নম্বর শুধুমাত্র ১১ ডিজিট হতে পারে';
            }
          }
          // Must start with 01
          else if (!digitsOnly.startsWith('01')) {
            newErrors.phone = 'ফোন নম্বর ০১ দিয়ে শুরু হতে হবে';
          }
          // Third digit must be 3-9 (valid Bangladesh mobile operators)
          else if (!/^01[3-9]/.test(digitsOnly)) {
            newErrors.phone = 'বৈধ বাংলাদেশ মোবাইল নম্বর দিন (01[3-9]XXXXXXXX)';
          }
          // Full validation
          else if (!/^01[3-9]\d{8}$/.test(digitsOnly)) {
            newErrors.phone = 'বৈধ বাংলাদেশ মোবাইল নম্বর দিন';
          } else {
            delete newErrors.phone;
          }
        }
      }

      // Validate password
      if (name === 'password') {
        if (value) {
          if (value.length < 6) {
            newErrors.password = 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে';
          } else {
            delete newErrors.password;
          }
        }
      }

      setErrors(newErrors);
    }, 300),
    []
  );

  // Handle input change with validation
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));

    // Trigger validation for this field
    validateField(field, value, { ...formData, [field]: value });
  };

  // Validate entire form on submit
  const validateForm = () => {
    const newErrors = {};
    const allTouched = {
      phone: true,
      password: true,
    };

    setTouched(allTouched);

    // Required field validation
    if (!formData.phone.trim()) newErrors.phone = 'ফোন নম্বর প্রয়োজন';
    if (!formData.password) newErrors.password = 'পাসওয়ার্ড প্রয়োজন';

    // Only run detailed validation if no required field errors
    if (Object.keys(newErrors).length === 0) {
      // Phone number validation for Bangladesh (01X XX XX XX XX format only)
      const digitsOnly = formData.phone.replace(/\D/g, '');

      // Must be exactly 11 digits (when spaces removed)
      if (digitsOnly.length !== 11) {
        if (digitsOnly.length < 11) {
          newErrors.phone = 'ফোন নম্বর ১১ ডিজিট হতে হবে';
        } else {
          newErrors.phone = 'ফোন নম্বর শুধুমাত্র ১১ ডিজিট হতে পারে';
        }
      }
      // Must start with 01
      else if (!digitsOnly.startsWith('01')) {
        newErrors.phone = 'ফোন নম্বর ০১ দিয়ে শুরু হতে হবে';
      }
      // Third digit must be 3-9 (valid Bangladesh mobile operators)
      else if (!/^01[3-9]/.test(digitsOnly)) {
        newErrors.phone = 'বৈধ বাংলাদেশ মোবাইল নম্বর দিন (013, 014, 015, 016, 017, 018, বা 019 দিয়ে শুরু হতে হবে)';
      }
      // Full validation
      else if (!/^01[3-9]\d{8}$/.test(digitsOnly)) {
        newErrors.phone = 'বৈধ বাংলাদেশ মোবাইল নম্বর দিন';
      }

      // Password validation
      if (formData.password.length < 6) {
        newErrors.password = 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (validateForm()) {
      setIsLoading(true);

      const cleanPhone = formData.phone.replace(/\D/g, '');

      const checkNetConnection = await CheckInternetConnection()
      console.log(checkNetConnection)
      if (checkNetConnection.isConnected && checkNetConnection.isInternetReachable) {
        console.log('comes')
        console.log('Sending request to:', BASE_URL + '/login');
        console.log('Request payload:', {
          cell_phone: cleanPhone,
          password: formData.password,
        });
        axios
          .post(BASE_URL + '/login', {
            cell_phone: cleanPhone,
            password: formData.password,
          })
          .then(response => {
            if (response.data.success == true) {
              if (response.data.data.user.web_access == 1) {
                setSnackbarMessage('✅ Login successful');
                setSnackbarType('success');
                setSnackbarVisible(true);

                AsyncStorage.setItem(
                  'user_info',
                  JSON.stringify(response.data.data),
                  err => {
                    if (err) {
                      console.log('an error');
                      throw err;
                    }
                    console.log('success');
                  },
                );
                singIn(response.data.data.token, response.data.data.user);
                navigation.replace('Welcome');
                setIsLoading(false);
              }
            } else {
              setSnackbarMessage('❌ ভুল ফোন নম্বর বা পাসওয়ার্ড। দয়া করে আবার চেষ্টা করুন।');
              setSnackbarType('error');
              setSnackbarVisible(true);
              setIsLoading(false)
            }
          })
          .catch(function (error) {
            setSnackbarMessage('❌ ভুল ফোন নম্বর বা পাসওয়ার্ড। দয়া করে আবার চেষ্টা করুন।');
            setSnackbarType('error');
            setSnackbarVisible(true);
            setIsLoading(false)
          })
        // setIsLoading(false)
      } else {
        setSnackbarMessage('❌ ইন্টারনেট সংযোগ নেই! দয়া করে আপনার ইন্টারনেট সংযোগ চেক করুন।');
        setSnackbarType('error');
        setSnackbarVisible(true);
        setIsLoading(false)
      }
    }
  };

  const handleForgotPassword = () => {
    console.log('Navigate to forgot password screen');
    // navigation.navigate('ForgotPassword');
  };

  const handleSignUp = () => {
    console.log('Navigate to sign up screen');
    navigation.navigate('Registration');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Image
              source={require('../assets/logo/lendenboi-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />

            <Text style={styles.headerTitle}>আপনাকে আবারও স্বাগতম</Text>
            <Text style={styles.headerSubtitle}>আপনার একাউন্টে সাইন ইন করুন</Text>
          </View>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              {/* Form Fields */}
              <View style={styles.formContainer}>
                {/* Error Message */}
                {errors.general && (
                  <View style={styles.errorContainer}>
                    <HelperText type="error" visible={!!errors.general} style={styles.generalError}>
                      {errors.general}
                    </HelperText>
                  </View>
                )}

                {/* Phone Number */}
                <View style={styles.fieldContainer}>
                  <TextInput
                    label="ফোন নম্বর *"
                    value={formData.phone}
                    onChangeText={handlePhoneChange}
                    mode="outlined"
                    style={styles.input}
                    outlineColor={errors.phone ? colors.error : colors.primaryLight}
                    activeOutlineColor={errors.phone ? colors.error : colors.primary}
                    left={<TextInput.Icon icon="phone" color={colors.primary} />}
                    error={!!errors.phone && touched.phone}
                    placeholder="01X XX XX XX XX"
                    keyboardType="phone-pad"
                    returnKeyType="next"
                    maxLength={15} // 01X XX XX XX XX = 14 characters (3+2+2+2+2+3 spaces)
                  />
                  {errors.phone && touched.phone && (
                    <HelperText type="error" visible={!!errors.phone}>
                      {errors.phone}
                    </HelperText>
                  )}
                </View>

                {/* Password */}
                <View style={styles.fieldContainer}>
                  <TextInput
                    label="পাসওয়ার্ড *"
                    value={formData.password}
                    onChangeText={(value) => handleInputChange('password', value)}
                    mode="outlined"
                    secureTextEntry={!showPassword}
                    style={styles.input}
                    outlineColor={errors.password ? colors.error : colors.primaryLight}
                    activeOutlineColor={errors.password ? colors.error : colors.primary}
                    left={<TextInput.Icon icon="lock" color={colors.primary} />}
                    right={
                      <TextInput.Icon
                        icon={showPassword ? 'eye-off' : 'eye'}
                        onPress={() => setShowPassword(!showPassword)}
                        color={colors.primary}
                      />
                    }
                    error={!!errors.password && touched.password}
                    placeholder="আপনার পাসওয়ার্ড লিখুন"
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    autoCapitalize="none"
                    disabled={isLoading}
                  />
                  {errors.password && touched.password && (
                    <HelperText type="error" visible={!!errors.password}>
                      {errors.password}
                    </HelperText>
                  )}
                </View>

                {/* Forgot Password Link */}
                <View style={styles.forgotPasswordContainer}>
                  <Button
                    mode="text"
                    onPress={handleForgotPassword}
                    compact
                    labelStyle={styles.forgotPasswordText}
                    disabled={isLoading}
                  >
                    পাসওয়ার্ড ভুলে গেছেন?
                  </Button>
                </View>

                {/* Login Button */}
                <Button
                  mode="contained"
                  onPress={handleLogin}
                  style={[styles.button, { backgroundColor: colors.primary }]}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                  icon={isLoading ? null : "login"}
                  loading={isLoading}
                  disabled={isLoading}
                >
                  {isLoading ? 'সাইন ইন হচ্ছে...' : 'সাইন ইন করুন'}
                </Button>

                {/* Divider */}
                <View style={styles.dividerContainer}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>অথবা</Text>
                  <View style={styles.divider} />
                </View>

                {/* Sign Up Link */}
                <View style={styles.signUpContainer}>
                  <Text style={styles.signUpText}>একাউন্ট নেই? </Text>
                  <Button
                    mode="text"
                    onPress={handleSignUp}
                    compact
                    labelStyle={styles.signUpButtonText}
                    disabled={isLoading}
                  >
                    নিবন্ধন করুন
                  </Button>
                </View>

                {/* Terms and Conditions */}
                <View style={styles.termsContainer}>
                  <Text style={styles.termsText}>
                    সাইন ইন করে, আপনি আমাদের{' '}
                    <Text style={styles.termsLink}>সেবার শর্তাবলী</Text> এবং{' '}
                    <Text style={styles.termsLink}>গোপনীয়তা নীতি</Text> মেনে নিচ্ছেন
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>

        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={4000}
          style={[
            styles.snackbar,
            {
              backgroundColor:
                snackbarType === 'success' ? colors.success :
                  snackbarType === 'error' ? colors.error :
                    snackbarType === 'info' ? colors.info :
                      colors.primary,
              marginBottom: Platform.OS === 'ios' ? 80 : 16,
            }
          ]}
          action={{
            label: 'ওকে',
            textColor: '#fff',
            onPress: () => setSnackbarVisible(false),
          }}
        >
          <Text style={{ color: '#fff', fontSize: 14 }}>
            {snackbarMessage}
          </Text>
        </Snackbar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 30,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 10,
  },
  logoImage: {
    width: 180,
    height: 180,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#006666',
    marginBottom: 6,
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#00A8A8',
    textAlign: 'center',
  },
  card: {
    borderRadius: 12,
    backgroundColor: '#ffffff',
    elevation: 3,
    shadowColor: '#00A8A8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cardContent: {
    paddingHorizontal: 4,
  },
  formContainer: {
    marginBottom: 10,
  },
  errorContainer: {
    marginBottom: 16,
  },
  generalError: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#ffffff',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
    marginTop: -8,
  },
  forgotPasswordText: {
    color: '#00A8A8',
    fontSize: 13,
    fontWeight: '500',
  },
  button: {
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  signUpText: {
    fontSize: 13,
    color: '#666',
  },
  signUpButtonText: {
    color: '#00A8A8',
    fontSize: 13,
    fontWeight: '600',
  },
  termsContainer: {
    marginTop: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  termsText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: {
    color: '#00A8A8',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  snackbar: {
    borderRadius: 6,
    marginBottom: 16,
  },
});

export default Login;