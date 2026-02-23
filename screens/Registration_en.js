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
    const [progress, setProgress] = useState(0);
    const [touched, setTouched] = useState({});

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

            // Validate shop name
            if (name === 'shopName') {
                if (value.trim()) {
                    if (value.length < 3) {
                        newErrors.shopName = 'Shop name must be at least 3 characters';
                    } else if (value.length > 50) {
                        newErrors.shopName = 'Shop name must be less than 50 characters';
                    } else {
                        delete newErrors.shopName;
                    }
                }
            }

            // Validate name
            if (name === 'name') {
                if (value.trim()) {
                    if (value.length < 2) {
                        newErrors.name = 'Name must be at least 2 characters';
                    } else if (value.length > 50) {
                        newErrors.name = 'Name must be less than 50 characters';
                    } else if (!/^[a-zA-Z\s]+$/.test(value)) {
                        newErrors.name = 'Name can only contain letters and spaces';
                    } else {
                        delete newErrors.name;
                    }
                }
            }

            // Validate phone number for Bangladesh (01X XX XX XX XX format only)
            if (name === 'phone') {
                if (value) {
                    const digitsOnly = value.replace(/\D/g, '');

                    // Must be exactly 11 digits (when spaces removed)
                    if (digitsOnly.length !== 11) {
                        if (digitsOnly.length < 11) {
                            newErrors.phone = 'Phone number must be 11 digits';
                        } else {
                            newErrors.phone = 'Phone number can only be 11 digits';
                        }
                    }
                    // Must start with 01
                    else if (!digitsOnly.startsWith('01')) {
                        newErrors.phone = 'Phone number must start with 01';
                    }
                    // Third digit must be 3-9 (valid Bangladesh mobile operators)
                    else if (!/^01[3-9]/.test(digitsOnly)) {
                        newErrors.phone = 'Please enter a valid Bangladesh mobile number (01[3-9]XXXXXXXX)';
                    }
                    // Full validation
                    else if (!/^01[3-9]\d{8}$/.test(digitsOnly)) {
                        newErrors.phone = 'Please enter a valid Bangladesh mobile number';
                    } else {
                        delete newErrors.phone;
                    }
                }
            }

            // Validate password
            if (name === 'password') {
                if (value) {
                    const passwordErrors = [];

                    if (value.length < 6) {
                        passwordErrors.push('at least 6 characters');
                    }

                    if (passwordErrors.length > 0) {
                        newErrors.password = `Must contain: ${passwordErrors.join(', ')}`;
                    } else {
                        delete newErrors.password;
                    }

                    // Validate confirm password if exists
                    if (allValues.confirmPassword) {
                        if (value !== allValues.confirmPassword) {
                            newErrors.confirmPassword = 'Passwords do not match';
                        } else {
                            delete newErrors.confirmPassword;
                        }
                    }
                }
            }

            // Validate confirm password
            if (name === 'confirmPassword') {
                if (value) {
                    if (value !== allValues.password) {
                        newErrors.confirmPassword = 'Passwords do not match';
                    } else {
                        delete newErrors.confirmPassword;
                    }
                }
            }

            // Calculate progress
            const totalFields = 5;
            let completedFields = 0;

            if (allValues.shopName.trim() && !newErrors.shopName) completedFields++;
            if (allValues.name.trim() && !newErrors.name) completedFields++;

            // Check phone validation for Bangladesh (01X XX XX XX XX format only)
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

        // Trigger validation for this field
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

        // Required field validation
        if (!formData.shopName.trim()) newErrors.shopName = 'Shop name is required';
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
        if (!formData.password) newErrors.password = 'Password is required';
        if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';

        // Only run detailed validation if no required field errors
        if (Object.keys(newErrors).length === 0) {
            // Shop name validation
            if (formData.shopName.length < 3) {
                newErrors.shopName = 'Shop name must be at least 3 characters';
            }

            // Name validation
            if (formData.name.length < 2) {
                newErrors.name = 'Name must be at least 2 characters';
            } else if (!/^[a-zA-Z\s]+$/.test(formData.name)) {
                newErrors.name = 'Name can only contain letters and spaces';
            }

            // Phone number validation for Bangladesh (01X XX XX XX XX format only)
            const digitsOnly = formData.phone.replace(/\D/g, '');

            // Must be exactly 11 digits (when spaces removed)
            if (digitsOnly.length !== 11) {
                if (digitsOnly.length < 11) {
                    newErrors.phone = 'Phone number must be 11 digits';
                } else {
                    newErrors.phone = 'Phone number can only be 11 digits';
                }
            }
            // Must start with 01
            else if (!digitsOnly.startsWith('01')) {
                newErrors.phone = 'Phone number must start with 01';
            }
            // Third digit must be 3-9 (valid Bangladesh mobile operators)
            else if (!/^01[3-9]/.test(digitsOnly)) {
                newErrors.phone = 'Please enter a valid Bangladesh mobile number (must start with 013, 014, 015, 016, 017, 018, or 019)';
            }
            // Full validation
            else if (!/^01[3-9]\d{8}$/.test(digitsOnly)) {
                newErrors.phone = 'Please enter a valid Bangladesh mobile number';
            }

            // Password validation
            const passwordErrors = [];
            if (formData.password.length < 6) {
                passwordErrors.push('at least 6 characters');
            }

            if (passwordErrors.length > 0) {
                newErrors.password = `Must contain: ${passwordErrors.join(', ')}`;
            }

            // Confirm password validation
            if (formData.password !== formData.confirmPassword) {
                newErrors.confirmPassword = 'Passwords do not match';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validateForm()) {
            // Prepare data for submission (remove spaces from phone)
            const submissionData = {
                ...formData,
                phone: formData.phone.replace(/\D/g, '')
            };

            console.log('Registration successful:', submissionData);
            setSnackbarVisible(true);

            // Reset form
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
        }
    };

    const PasswordStrengthIndicator = ({ password }) => {
        if (!password) return null;

        let strength = 0;
        let color = colors.error;
        let label = 'Weak';
        let widthPercentage = '25%';

        // Length check
        if (password.length >= 6) strength++;
        // Uppercase check
        if (/(?=.*[A-Z])/.test(password)) strength++;
        // Number check
        if (/(?=.*[0-9])/.test(password)) strength++;
        // Special character check
        if (/(?=.*[!@#$%^&*])/.test(password)) strength++;

        if (strength === 4) {
            color = colors.success;
            label = 'Strong';
            widthPercentage = '100%';
        } else if (strength === 3) {
            color = '#17a2b8';
            label = 'Good';
            widthPercentage = '75%';
        } else if (strength === 2) {
            color = colors.warning;
            label = 'Medium';
            widthPercentage = '50%';
        }

        return (
            <View style={styles.strengthContainer}>
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

                        <Text style={styles.headerTitle}>Shop Registration</Text>
                        <Text style={styles.headerSubtitle}>Join our network</Text>
                    </View>

                    <Card style={styles.card}>
                        <Card.Content style={styles.cardContent}>
                            {/* Progress Indicator */}
                            <View style={styles.progressContainer}>
                                <Text style={styles.progressText}>Profile Completeness</Text>
                                <ProgressBar
                                    progress={progress}
                                    color={colors.primary}
                                    style={styles.progressBar}
                                />
                                <Text style={styles.progressPercentage}>{Math.round(progress * 100)}%</Text>
                            </View>

                            {/* Form Fields */}
                            <View style={styles.formContainer}>
                                {/* Shop Name */}
                                <View style={styles.fieldContainer}>
                                    <TextInput
                                        label="Shop Name *"
                                        value={formData.shopName}
                                        onChangeText={(value) => handleInputChange('shopName', value)}
                                        mode="outlined"
                                        style={styles.input}
                                        outlineColor={errors.shopName ? colors.error : colors.primaryLight}
                                        activeOutlineColor={errors.shopName ? colors.error : colors.primary}
                                        left={<TextInput.Icon icon="storefront" color={colors.primary} />}
                                        error={!!errors.shopName && touched.shopName}
                                        placeholder="Enter your shop name"
                                        returnKeyType="next"
                                        autoCapitalize="words"
                                    />
                                    {errors.shopName && touched.shopName && (
                                        <HelperText type="error" visible={!!errors.shopName}>
                                            {errors.shopName}
                                        </HelperText>
                                    )}
                                </View>

                                {/* Name */}
                                <View style={styles.fieldContainer}>
                                    <TextInput
                                        label="Your Name *"
                                        value={formData.name}
                                        onChangeText={(value) => handleInputChange('name', value)}
                                        mode="outlined"
                                        style={styles.input}
                                        outlineColor={errors.name ? colors.error : colors.primaryLight}
                                        activeOutlineColor={errors.name ? colors.error : colors.primary}
                                        left={<TextInput.Icon icon="account" color={colors.primary} />}
                                        error={!!errors.name && touched.name}
                                        placeholder="Enter your full name"
                                        returnKeyType="next"
                                        autoCapitalize="words"
                                    />
                                    {errors.name && touched.name && (
                                        <HelperText type="error" visible={!!errors.name}>
                                            {errors.name}
                                        </HelperText>
                                    )}
                                </View>

                                {/* Phone Number */}
                                <View style={styles.fieldContainer}>
                                    <TextInput
                                        label="Phone Number *"
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
                                    {/* <HelperText type="info" visible={true}>
                    {formData.phone.length < 15 ?
                      `${formData.phone.length} of 14 characters (11 digits)` :
                      'Complete: 11 digits formatted as 01X XX XX XX XX'}
                  </HelperText> */}
                                    {errors.phone && touched.phone && (
                                        <HelperText type="error" visible={!!errors.phone}>
                                            {errors.phone}
                                        </HelperText>
                                    )}
                                </View>

                                {/* Password */}
                                <View style={styles.fieldContainer}>
                                    <TextInput
                                        label="Password *"
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
                                        placeholder="Create a password"
                                        returnKeyType="next"
                                    />
                                    <PasswordStrengthIndicator password={formData.password} />
                                    {errors.password && touched.password && (
                                        <HelperText type="error" visible={!!errors.password}>
                                            {errors.password}
                                        </HelperText>
                                    )}
                                </View>

                                {/* Confirm Password */}
                                <View style={styles.fieldContainer}>
                                    <TextInput
                                        label="Confirm Password *"
                                        value={formData.confirmPassword}
                                        onChangeText={(value) => handleInputChange('confirmPassword', value)}
                                        mode="outlined"
                                        secureTextEntry={!showPassword}
                                        style={styles.input}
                                        outlineColor={errors.confirmPassword ? colors.error : colors.primaryLight}
                                        activeOutlineColor={errors.confirmPassword ? colors.error : colors.primary}
                                        left={<TextInput.Icon icon="lock-check" color={colors.primary} />}
                                        error={!!errors.confirmPassword && touched.confirmPassword}
                                        placeholder="Re-enter your password"
                                        returnKeyType="done"
                                        onSubmitEditing={handleSubmit}
                                    />
                                    {errors.confirmPassword && touched.confirmPassword && (
                                        <HelperText type="error" visible={!!errors.confirmPassword}>
                                            {errors.confirmPassword}
                                        </HelperText>
                                    )}
                                </View>

                                {/* Password Requirements */}
                                {/* <View style={styles.requirementsCard}>
                  <Text style={styles.requirementsTitle}>Password Requirements:</Text>
                  <View style={styles.requirementItem}>
                    <Text style={[
                      styles.requirementText,
                      { color: formData.password.length >= 6 ? colors.success : colors.error }
                    ]}>
                      {formData.password.length >= 6 ? '✓' : '•'} At least 6 characters
                    </Text>
                  </View>
                  <View style={styles.requirementItem}>
                    <Text style={[
                      styles.requirementText,
                      { color: formData.password.length >= 8 ? colors.success : colors.primary }
                    ]}>
                      {formData.password.length >= 8 ? '✓' : '•'} 8+ characters for better security
                    </Text>
                  </View>
                </View> */}

                                {/* Submit Button */}
                                <Button
                                    mode="contained"
                                    onPress={handleSubmit}
                                    style={[styles.button, { backgroundColor: colors.primary }]}
                                    contentStyle={styles.buttonContent}
                                    labelStyle={styles.buttonLabel}
                                    icon="check-circle"
                                    disabled={progress < 1}
                                >
                                    Complete Registration
                                </Button>

                                {/* Divider */}
                                <View style={styles.dividerContainer}>
                                    <View style={styles.divider} />
                                    <Text style={styles.dividerText}>OR</Text>
                                    <View style={styles.divider} />
                                </View>

                                {/* Sign Up Link */}
                                <View style={styles.signUpContainer}>
                                    <Text style={styles.signUpText}>Don't have an account? </Text>
                                    <Button
                                        mode="text"
                                        onPress={handleLogin}
                                        compact
                                        labelStyle={styles.signUpButtonText}
                                        disabled={progress == 5}
                                    >
                                        Sign In
                                    </Button>
                                </View>

                                {/* Terms and Conditions */}
                                <View style={styles.termsContainer}>
                                    <Text style={styles.termsText}>
                                        By registering, you agree to our{' '}
                                        <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                                        <Text style={styles.termsLink}>Privacy Policy</Text>
                                    </Text>
                                </View>
                            </View>
                        </Card.Content>
                    </Card>
                </ScrollView>

                <Snackbar
                    visible={snackbarVisible}
                    onDismiss={() => setSnackbarVisible(false)}
                    duration={3000}
                    style={[styles.snackbar, { backgroundColor: colors.success }]}
                    action={{
                        label: 'OK',
                        textColor: '#fff',
                        onPress: () => setSnackbarVisible(false),
                    }}
                >
                    <Text style={{ color: '#fff' }}>✅ Registration successful! Welcome {formData.name}!</Text>
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
        marginBottom: 20,
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
    requirementsCard: {
        backgroundColor: '#E6F7F7',
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#80D9D9',
        marginTop: 16,
        marginBottom: 8,
    },
    requirementsTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#006666',
        marginBottom: 10,
    },
    requirementItem: {
        marginBottom: 5,
    },
    requirementText: {
        fontSize: 12,
        fontWeight: '500',
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
        marginBottom: 16,
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