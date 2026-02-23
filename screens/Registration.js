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
  ProgressBar,
  Chip,
} from 'react-native-paper';
import debounce from 'lodash.debounce';
import { CheckInternetConnection } from '../Helpers/Internet/CheckInternetConnection';
import { BASE_URL } from '../env';
import axios from 'axios';

const { width } = Dimensions.get('window');

const Registration = ({ navigation }) => {
  const [formData, setFormData] = useState({
    shopName: '',
    name: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success');
  const [progress, setProgress] = useState(0);
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false); // Add loading state

  // Color scheme matching the "माॅटर वॉक्स" logo
  const colors = {
    primary: '#00A8A8',
    primaryLight: '#4DC9C9',
    primaryLighter: '#80D9D9',
    primaryLightest: '#E6F7F7',
    primaryDark: '#008787',
    primaryDarker: '#006666',
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545',
    background: '#f8f9fa',
    surface: '#ffffff',
    textPrimary: '#1A535C',
    info: '#17a2b8',
  };

  // Format phone number as user types for Bangladesh (01X XX XX XX XX format)
  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    const limited = cleaned.slice(0, 11);

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

      if (!value && newErrors[name]) {
        delete newErrors[name];
      }

      if (name === 'shopName') {
        if (value.trim()) {
          if (value.length < 3) {
            newErrors.shopName = 'দোকানের নাম কমপক্ষে ৩ অক্ষর হতে হবে';
          } else if (value.length > 50) {
            newErrors.shopName = 'দোকানের নাম ৫০ অক্ষরের কম হতে হবে';
          } else {
            delete newErrors.shopName;
          }
        }
      }

      if (name === 'name') {
        if (value.trim()) {
          if (value.length < 2) {
            newErrors.name = 'নাম কমপক্ষে ২ অক্ষর হতে হবে';
          } else if (value.length > 50) {
            newErrors.name = 'নাম ৫০ অক্ষরের কম হতে হবে';
          } else {
            delete newErrors.name;
          }
        }
      }

      if (name === 'phone') {
        if (value) {
          const digitsOnly = value.replace(/\D/g, '');

          if (digitsOnly.length !== 11) {
            if (digitsOnly.length < 11) {
              newErrors.phone = 'ফোন নম্বর ১১ ডিজিট হতে হবে';
            } else {
              newErrors.phone = 'ফোন নম্বর শুধুমাত্র ১১ ডিজিট হতে পারে';
            }
          }
          else if (!digitsOnly.startsWith('01')) {
            newErrors.phone = 'ফোন নম্বর ০১ দিয়ে শুরু হতে হবে';
          }
          else if (!/^01[3-9]/.test(digitsOnly)) {
            newErrors.phone = 'বৈধ বাংলাদেশ মোবাইল নম্বর দিন (01[3-9]XXXXXXXX)';
          }
          else if (!/^01[3-9]\d{8}$/.test(digitsOnly)) {
            newErrors.phone = 'বৈধ বাংলাদেশ মোবাইল নম্বর দিন';
          } else {
            delete newErrors.phone;
          }
        }
      }

      if (name === 'password') {
        if (value) {
          const passwordErrors = [];

          if (value.length < 6) {
            passwordErrors.push('কমপক্ষে ৬ অক্ষর');
          }

          if (passwordErrors.length > 0) {
            newErrors.password = `অবশ্যই থাকতে হবে: ${passwordErrors.join(', ')}`;
          } else {
            delete newErrors.password;
          }

          if (allValues.confirmPassword) {
            if (value !== allValues.confirmPassword) {
              newErrors.confirmPassword = 'পাসওয়ার্ড মিলছে না';
            } else {
              delete newErrors.confirmPassword;
            }
          }
        }
      }

      if (name === 'confirmPassword') {
        if (value) {
          if (value !== allValues.password) {
            newErrors.confirmPassword = 'পাসওয়ার্ড মিলছে না';
          } else {
            delete newErrors.confirmPassword;
          }
        }
      }

      const totalFields = 5;
      let completedFields = 0;

      if (allValues.shopName.trim() && !newErrors.shopName) completedFields++;
      if (allValues.name.trim() && !newErrors.name) completedFields++;

      const phoneDigits = allValues.phone.replace(/\D/g, '');
      const isPhoneValid = phoneDigits.length === 11 &&
        /^01[3-9]\d{8}$/.test(phoneDigits) &&
        !newErrors.phone;

      if (isPhoneValid) completedFields++;
      if (allValues.password && !newErrors.password) completedFields++;
      if (allValues.confirmPassword && !newErrors.confirmPassword) completedFields++;

      setProgress(completedFields / totalFields);
      setErrors(newErrors);
    }, 300),
    []
  );

  // Handle input change with validation
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, value, { ...formData, [field]: value });
  };

  // Validate entire form on submit
  const validateForm = () => {
    const newErrors = {};
    const allTouched = {
      shopName: true,
      name: true,
      phone: true,
      password: true,
      confirmPassword: true
    };

    setTouched(allTouched);

    if (!formData.shopName.trim()) newErrors.shopName = 'দোকানের নাম প্রয়োজন';
    if (!formData.name.trim()) newErrors.name = 'নাম প্রয়োজন';
    if (!formData.phone.trim()) newErrors.phone = 'ফোন নম্বর প্রয়োজন';
    if (!formData.password) newErrors.password = 'পাসওয়ার্ড প্রয়োজন';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'দয়া করে পাসওয়ার্ড নিশ্চিত করুন';

    if (Object.keys(newErrors).length === 0) {
      if (formData.shopName.length < 3) {
        newErrors.shopName = 'দোকানের নাম কমপক্ষে ৩ অক্ষর হতে হবে';
      }

      if (formData.name.length < 2) {
        newErrors.name = 'নাম কমপক্ষে ২ অক্ষর হতে হবে';
      }

      const digitsOnly = formData.phone.replace(/\D/g, '');

      if (digitsOnly.length !== 11) {
        if (digitsOnly.length < 11) {
          newErrors.phone = 'ফোন নম্বর ১১ ডিজিট হতে হবে';
        } else {
          newErrors.phone = 'ফোন নম্বর শুধুমাত্র ১১ ডিজিট হতে পারে';
        }
      }
      else if (!digitsOnly.startsWith('01')) {
        newErrors.phone = 'ফোন নম্বর ০১ দিয়ে শুরু হতে হবে';
      }
      else if (!/^01[3-9]/.test(digitsOnly)) {
        newErrors.phone = 'বৈধ বাংলাদেশ মোবাইল নম্বর দিন (013, 014, 015, 016, 017, 018, বা 019 দিয়ে শুরু হতে হবে)';
      }
      else if (!/^01[3-9]\d{8}$/.test(digitsOnly)) {
        newErrors.phone = 'বৈধ বাংলাদেশ মোবাইল নম্বর দিন';
      }

      const passwordErrors = [];
      if (formData.password.length < 6) {
        passwordErrors.push('কমপক্ষে ৬ অক্ষর');
      }

      if (passwordErrors.length > 0) {
        newErrors.password = `অবশ্যই থাকতে হবে: ${passwordErrors.join(', ')}`;
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'পাসওয়ার্ড মিলছে না';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      Keyboard.dismiss();
      setIsSubmitting(true); // Disable button

      const checkNetConnection = await CheckInternetConnection();

      if (checkNetConnection.isConnected && checkNetConnection.isInternetReachable) {
        const submissionData = {
          title: formData.shopName,
          name: formData.name,
          cell_phone: formData.phone.replace(/\D/g, ''),
          password: formData.password,
        };

        console.log('Registration data:', submissionData);

        axios
          .post(BASE_URL + '/register', submissionData)
          .then(response => {
            console.log('API Response:', response.data);

            if (response.data && response.data.success === true) {
              if (response.data.code === 201) {
                setSnackbarMessage(`✅ ${'নিবন্ধন সফল! স্বাগতম!'}`);
                setSnackbarType('success');
                setSnackbarVisible(true);

                setTimeout(() => {
                  setFormData({
                    shopName: '',
                    name: '',
                    phone: '',
                    password: '',
                    confirmPassword: ''
                  });
                  setErrors({});
                  setTouched({});
                  setProgress(0);
                  setIsSubmitting(false); // Re-enable button on success
                }, 1500);
                setTimeout(() => {
                  navigation.navigate('Login')
                }, 2500)
              } else {
                setSnackbarMessage(`✅ ${response.data.message || 'অপারেশন সফল!'}`);
                setSnackbarType('success');
                setSnackbarVisible(true);
                setIsSubmitting(false); // Re-enable button
              }
            } else {
              setSnackbarMessage('❌ সার্ভার থেকে অপ্রত্যাশিত প্রতিক্রিয়া');
              setSnackbarType('error');
              setSnackbarVisible(true);
              setIsSubmitting(false); // Re-enable button on error
            }
          })
          .catch(error => {
            console.log('API Error:', error);
            console.log('Error Response:', error.response?.data);

            if (error.response && error.response.status === 422) {
              const errorData = error.response.data;

              if (errorData.data && errorData.data.error && errorData.data.error.cell_phone) {
                setSnackbarMessage('❌ এই ফোন নম্বরটি পূর্বে নিবন্ধিত হয়েছে। দয়া করে লগইন করুন।');
              }
              else if (errorData.data && errorData.data.error && errorData.data.error.password) {
                setSnackbarMessage(`❌ ${errorData.data.error.password[0]}`);
              }
              else if (errorData.data && errorData.data.error && errorData.data.error.name) {
                setSnackbarMessage(`❌ ${errorData.data.error.name[0]}`);
              }
              else if (errorData.data && errorData.data.error && errorData.data.error.title) {
                setSnackbarMessage(`❌ ${errorData.data.error.title[0]}`);
              }
              else if (errorData.message) {
                setSnackbarMessage(`❌ ${errorData.message}`);
              }
              else {
                setSnackbarMessage('❌ ভুল তথ্য দেয়া হয়েছে। দয়া করে চেক করুন');
              }
            }
            else if (error.response) {
              const status = error.response.status;
              const errorData = error.response.data;

              if (status === 400) {
                setSnackbarMessage('❌ ভুল অনুরোধ। দয়া তথ্য চেক করুন');
              }
              else if (status === 409) {
                if (errorData.message) {
                  setSnackbarMessage(`❌ ${errorData.message}`);
                } else {
                  setSnackbarMessage('❌ এই ফোন নম্বর ইতিমধ্যে নিবন্ধিত হয়েছে');
                }
              }
              else if (status === 500) {
                if (errorData && errorData.message === 'Registration Failed') {
                  setSnackbarMessage('❌ নিবন্ধন ব্যর্থ হয়েছে। পরে আবার চেষ্টা করুন');
                } else {
                  setSnackbarMessage('❌ সার্ভার ত্রুটি। পরে আবার চেষ্টা করুন');
                }
              }
              else if (errorData && errorData.data && errorData.data.error) {
                const errors = errorData.data.error;
                if (typeof errors === 'object') {
                  const firstErrorKey = Object.keys(errors)[0];
                  const firstErrorMessage = errors[firstErrorKey][0];
                  setSnackbarMessage(`❌ ${firstErrorMessage}`);
                } else {
                  setSnackbarMessage(`❌ ${errors}`);
                }
              }
              else if (errorData && errorData.message) {
                setSnackbarMessage(`❌ ${errorData.message}`);
              }
              else {
                setSnackbarMessage(`❌ ত্রুটি কোড: ${status}`);
              }
            }
            else if (error.request) {
              setSnackbarMessage('❌ সার্ভার থেকে কোনো প্রতিক্রিয়া নেই। নেটওয়ার্ক চেক করুন');
            }
            else {
              setSnackbarMessage('❌ একটি ত্রুটি ঘটেছে। আবার চেষ্টা করুন');
            }

            setSnackbarType('error');
            setSnackbarVisible(true);
            setIsSubmitting(false); // Re-enable button on error
          });
      } else {
        setSnackbarMessage('❌ ইন্টারনেট সংযোগ নেই! দয়া করে আপনার ইন্টারনেট সংযোগ চেক করুন।');
        setSnackbarType('error');
        setSnackbarVisible(true);
        setIsSubmitting(false); // Re-enable button
      }
    } else {
      setIsSubmitting(false); // Re-enable button if form validation fails
    }
  };

  const PasswordStrengthIndicator = ({ password }) => {
    if (!password) return null;

    let strength = 0;
    let color = colors.error;
    let label = 'দুর্বল';
    let widthPercentage = '25%';

    if (password.length >= 6) strength++;
    if (/(?=.*[A-Z])/.test(password)) strength++;
    if (/(?=.*[0-9])/.test(password)) strength++;
    if (/(?=.*[!@#$%^&*])/.test(password)) strength++;

    if (strength === 4) {
      color = colors.success;
      label = 'শক্তিশালী';
      widthPercentage = '100%';
    } else if (strength === 3) {
      color = '#17a2b8';
      label = 'ভাল';
      widthPercentage = '75%';
    } else if (strength === 2) {
      color = colors.warning;
      label = 'মধ্যম';
      widthPercentage = '50%';
    }

    return (
      <View style={styles.strengthContainer}>
        <Text style={[styles.strengthText, { color }]}>{label}</Text>
        <View style={styles.strengthBarContainer}>
          <View style={[styles.strengthBar, { width: widthPercentage, backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  const handleLogin = () => {
    console.log('Navigate to login screen');
    navigation.navigate('Login');
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Image
              source={require('../assets/logo/lendenboi-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />

            <Text style={styles.headerTitle}>দোকান নিবন্ধন</Text>
          </View>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>প্রোফাইল সম্পূর্ণতা</Text>
                <ProgressBar
                  progress={progress}
                  color={colors.primary}
                  style={styles.progressBar}
                />
                <Text style={styles.progressPercentage}>{Math.round(progress * 100)}%</Text>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.fieldContainer}>
                  <TextInput
                    label="দোকানের নাম *"
                    value={formData.shopName}
                    onChangeText={(value) => handleInputChange('shopName', value)}
                    mode="outlined"
                    style={styles.input}
                    outlineColor={errors.shopName ? colors.error : colors.primaryLight}
                    activeOutlineColor={errors.shopName ? colors.error : colors.primary}
                    left={<TextInput.Icon icon="storefront" color={colors.primary} />}
                    error={!!errors.shopName && touched.shopName}
                    placeholder="আপনার দোকানের নাম লিখুন"
                    returnKeyType="next"
                    autoCapitalize="words"
                  />
                  {errors.shopName && touched.shopName && (
                    <HelperText type="error" visible={!!errors.shopName}>
                      {errors.shopName}
                    </HelperText>
                  )}
                </View>

                <View style={styles.fieldContainer}>
                  <TextInput
                    label="আপনার নাম *"
                    value={formData.name}
                    onChangeText={(value) => handleInputChange('name', value)}
                    mode="outlined"
                    style={styles.input}
                    outlineColor={errors.name ? colors.error : colors.primaryLight}
                    activeOutlineColor={errors.name ? colors.error : colors.primary}
                    left={<TextInput.Icon icon="account" color={colors.primary} />}
                    error={!!errors.name && touched.name}
                    placeholder="আপনার সম্পূর্ণ নাম লিখুন"
                    returnKeyType="next"
                    autoCapitalize="words"
                  />
                  {errors.name && touched.name && (
                    <HelperText type="error" visible={!!errors.name}>
                      {errors.name}
                    </HelperText>
                  )}
                </View>

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
                    maxLength={15}
                  />
                  {errors.phone && touched.phone && (
                    <HelperText type="error" visible={!!errors.phone}>
                      {errors.phone}
                    </HelperText>
                  )}
                </View>

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
                    placeholder="পাসওয়ার্ড তৈরি করুন"
                    returnKeyType="next"
                    autoCorrect={false}
                    autoCapitalize="none"
                    spellCheck={false}
                    textContentType="none"
                    keyboardType="default"
                    autoComplete="off"
                    importantForAutofill="no"
                    contextMenuHidden={true}
                    inputMode="text"
                  />
                  <PasswordStrengthIndicator password={formData.password} />
                  {errors.password && touched.password && (
                    <HelperText type="error" visible={!!errors.password}>
                      {errors.password}
                    </HelperText>
                  )}
                </View>

                <View style={styles.fieldContainer}>
                  <TextInput
                    label="পাসওয়ার্ড নিশ্চিত করুন *"
                    value={formData.confirmPassword}
                    onChangeText={(value) => handleInputChange('confirmPassword', value)}
                    mode="outlined"
                    secureTextEntry={!showPassword}
                    style={styles.input}
                    outlineColor={errors.confirmPassword ? colors.error : colors.primaryLight}
                    activeOutlineColor={errors.confirmPassword ? colors.error : colors.primary}
                    left={<TextInput.Icon icon="lock-check" color={colors.primary} />}
                    error={!!errors.confirmPassword && touched.confirmPassword}
                    placeholder="পুনরায় পাসওয়ার্ড লিখুন"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                  {errors.confirmPassword && touched.confirmPassword && (
                    <HelperText type="error" visible={!!errors.confirmPassword}>
                      {errors.confirmPassword}
                    </HelperText>
                  )}
                </View>

                {/* Submit Button with loading state */}
                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  style={[styles.button, {
                    backgroundColor: isSubmitting ? colors.primaryLight : colors.primary
                  }]}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                  icon={isSubmitting ? "loading" : "check-circle"}
                  disabled={progress < 1 || isSubmitting}
                  loading={isSubmitting}
                >
                  {isSubmitting ? 'নিবন্ধন হচ্ছে...' : 'নিবন্ধন সম্পূর্ণ করুন'}
                </Button>

                <View style={styles.dividerContainer}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>অথবা</Text>
                  <View style={styles.divider} />
                </View>

                <View style={styles.signUpContainer}>
                  <Text style={styles.signUpText}>একাউন্ট আছে? </Text>
                  <Button
                    mode="text"
                    onPress={handleLogin}
                    compact
                    labelStyle={styles.signUpButtonText}
                    disabled={isSubmitting}
                  >
                    সাইন ইন করুন
                  </Button>
                </View>

                <View style={styles.termsContainer}>
                  <Text style={styles.termsText}>
                    নিবন্ধন করে, আপনি আমাদের{' '}
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
    padding: 16,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    paddingTop: 5,
  },
  logoImage: {
    width: 160,
    height: 160,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#006666',
    marginTop: 8,
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
  progressContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    width: width - 80,
    marginBottom: 6,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00A8A8',
  },
  formContainer: {
    marginBottom: 10,
  },
  fieldContainer: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#ffffff',
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  strengthBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginRight: 12,
    overflow: 'hidden',
  },
  strengthBar: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 11,
    fontWeight: '600',
    marginRight: 8,
  },
  button: {
    marginTop: 16,
    marginBottom: 10,
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
  termsContainer: {
    marginTop: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  termsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: {
    color: '#00A8A8',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  snackbar: {
    borderRadius: 6,
    marginHorizontal: 16,
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
});

export default Registration;