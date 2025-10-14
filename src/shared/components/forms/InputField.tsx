import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';

interface InputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  containerStyle,
  icon,
  rightIcon,
  style,
  ...textInputProps
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, ...(error ? [styles.inputError] : [])]}>
        {icon && <View style={styles.leftIcon}>{icon}</View>}
        <TextInput
          style={[
            styles.input,
            ...(icon ? [styles.inputWithLeftIcon] : []),
            ...(rightIcon ? [styles.inputWithRightIcon] : []),
            ...(style ? [style] : []),
          ]}
          placeholderTextColor="#6C7278"
          {...textInputProps}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
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
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderWidth: 1,
    borderColor: 'rgba(254, 160, 77, 0.5)',
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
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
    flex: 1,
    fontSize: 14,
    color: '#1A1C1E',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  inputWithLeftIcon: {
    marginLeft: 12,
  },
  inputWithRightIcon: {
    marginRight: 12,
  },
  leftIcon: {
    marginRight: 4,
  },
  rightIcon: {
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
    marginLeft: 4,
  },
});

export default InputField;