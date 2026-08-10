export const validatePasswordStrength = (
  password: string
): { isValid: boolean; message?: string } => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'La contraseña es requerida.' };
  }

  if (password.length < 8) {
    return { isValid: false, message: 'La contraseña debe tener al menos 8 caracteres.' };
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'La contraseña debe incluir al menos una letra mayúscula.' };
  }

  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'La contraseña debe incluir al menos una letra minúscula.' };
  }

  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'La contraseña debe incluir al menos un número.' };
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    return {
      isValid: false,
      message: 'La contraseña debe incluir al menos un carácter especial (ej. ., @, $, !).',
    };
  }

  return { isValid: true };
};

export const validatePhoneNumber = (
  phone?: string | null
): { isValid: boolean; message?: string } => {
  if (!phone || phone.trim() === '') {
    return { isValid: true };
  }

  const phoneRegex = /^\+?[0-9\s\-().]{7,20}$/;
  if (!phoneRegex.test(phone.trim())) {
    return {
      isValid: false,
      message:
        'El número de teléfono solo puede contener números, espacios y símbolos (+, -, ., paréntesis).',
    };
  }

  return { isValid: true };
};
