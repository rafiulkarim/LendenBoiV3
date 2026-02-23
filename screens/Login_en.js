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
} from 'react-native-paper';
import debounce from 'lodash.debounce';

const { width } = Dimensions.get('window');

const Login = ({ navigation }) => {
    const [formData, setFormData] = useState({
        phone: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [touched, setTouched] = useState({});
    const [isLoading, setIsLoading] = useState(false);

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
                    if (value.length < 6) {
                        newErrors.password = 'Password must be at least 6 characters';
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
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
        if (!formData.password) newErrors.password = 'Password is required';

        // Only run detailed validation if no required field errors
        if (Object.keys(newErrors).length === 0) {
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
            if (formData.password.length < 6) {
                newErrors.password = 'Password must be at least 6 characters';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLogin = async () => {
        if (validateForm()) {
            setIsLoading(true);

            try {
                // Prepare data for submission (remove spaces from phone)
                const loginData = {
                    phone: formData.phone.replace(/\D/g, ''),
                    password: formData.password
                };

                console.log('Login attempt:', loginData);

                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 1500));

                // In real app, you would make an API call here:
                // const response = await axios.post('/api/login', loginData);

                setSnackbarVisible(true);
                console.log('Login successful');

                // Reset form
                setFormData({
                    phone: '',
                    password: '',
                });
                setErrors({});
                setTouched({});

                // In real app, you would navigate to dashboard here:
                // navigation.navigate('Dashboard');

            } catch (error) {
                console.error('Login error:', error);
                setErrors({
                    general: 'Invalid phone number or password. Please try again.'
                });
            } finally {
                setIsLoading(false);
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

                        <Text style={styles.headerTitle}>Welcome Back</Text>
                        <Text style={styles.headerSubtitle}>Sign in to your account</Text>
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
                                        placeholder="Enter your password"
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
                                        Forgot Password?
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
                                    {isLoading ? 'Signing In...' : 'Sign In'}
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
                                        onPress={handleSignUp}
                                        compact
                                        labelStyle={styles.signUpButtonText}
                                        disabled={isLoading}
                                    >
                                        Sign Up
                                    </Button>
                                </View>

                                {/* Terms and Conditions */}
                                <View style={styles.termsContainer}>
                                    <Text style={styles.termsText}>
                                        By signing in, you agree to our{' '}
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
                    ✅ Login successful! Redirecting...
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