import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  Platform,
} from 'react-native';

interface NumberInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onSkipAndProceed?: () => void; // Called when skipping - handles both setting skip value and navigation
  label?: string;
  helpText?: string;
  error?: string;
  minValue?: number;
  maxValue?: number;
  allowSkip?: boolean;
  containerStyle?: ViewStyle;
}

const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChangeText,
  onSubmit,
  onSkipAndProceed,
  label,
  helpText,
  error,
  minValue,
  maxValue,
  allowSkip = false,
  containerStyle,
  placeholder,
  keyboardType,
  ...textInputProps
}) => {
  const defaultKeyboardType =
    keyboardType ??
    (Platform.select({
      ios: 'decimal-pad',
      android: 'decimal-pad',
      default: 'numeric',
    }) as TextInputProps['keyboardType']);

  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    if (minValue !== undefined && maxValue !== undefined) {
      return `Enter value (${minValue}-${maxValue})`;
    }
    return 'Enter value';
  };

  const canSubmit = value.trim().length > 0;
  const canSkip = allowSkip && !canSubmit;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={[styles.inputWrapper, error && styles.inputError]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={getPlaceholder()}
          placeholderTextColor="#6C7278"
          keyboardType={defaultKeyboardType}
          inputMode="decimal"
          returnKeyType={canSubmit ? 'done' : 'default'}
          onSubmitEditing={canSubmit ? onSubmit : undefined}
          {...textInputProps}
        />
      </View>

      {helpText && <Text style={styles.helpText}>{helpText}</Text>}
      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.buttonContainer}>
        {canSubmit ? (
          <TouchableOpacity style={styles.submitButton} onPress={onSubmit}>
            <Text style={styles.submitButtonText}>Submit</Text>
          </TouchableOpacity>
        ) : canSkip ? (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => {
              // Only call onSkipAndProceed - it handles both setting skip value and navigation
              onSkipAndProceed?.();
            }}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6C7278',
    marginBottom: 8,
    letterSpacing: -0.02,
    fontFamily: 'Roboto',
  },
  inputWrapper: {
    height: 46,
    borderWidth: 1,
    borderColor: '#EDF1F3',
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    shadowColor: '#E4E5E7',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.24,
    shadowRadius: 2,
    elevation: 2,
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  input: {
    fontSize: 14,
    color: '#1A1C1E',
    fontFamily: 'Roboto',
    fontWeight: '500',
  },
  helpText: {
    fontSize: 12,
    color: '#6C7278',
    marginTop: 4,
    fontFamily: 'Roboto',
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
    fontFamily: 'Roboto',
  },
  buttonContainer: {
    marginTop: 16,
  },
  submitButton: {
    height: 40,
    backgroundColor: '#FE9F4D',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Roboto',
  },
  skipButton: {
    height: 40,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6C7278',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#6C7278',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
});

export default NumberInput;
