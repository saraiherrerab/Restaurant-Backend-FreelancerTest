import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { generateToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/auth';
import { validatePasswordStrength, validatePhoneNumber } from '../utils/validators';
import { sendPasswordResetEmail } from '../services/emailService';


const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'none' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
  path: '/',
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, phone } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, contraseña y nombre completo son requeridos' });
    }

    const pwdCheck = validatePasswordStrength(password);
    if (!pwdCheck.isValid) {
      return res.status(400).json({ error: pwdCheck.message });
    }

    const phoneCheck = validatePhoneNumber(phone);
    if (!phoneCheck.isValid) {
      return res.status(400).json({ error: phoneCheck.message });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        phone,
        role: 'CLIENT',
      },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as 'CLIENT' | 'STAFF' | 'ADMIN',
    });

    res.cookie('gourmet_token', token, COOKIE_OPTIONS);

    return res.status(201).json({
      message: 'Registro exitoso',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isBlocked: user.isBlocked,
        noShowCount: user.noShowCount,
      },
    });
  } catch (error) {
    console.error('Error en register:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as 'CLIENT' | 'STAFF' | 'ADMIN',
    });

    res.cookie('gourmet_token', token, COOKIE_OPTIONS);

    return res.status(200).json({
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isBlocked: user.isBlocked,
        noShowCount: user.noShowCount,
      },
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const logoutUser = async (_req: Request, res: Response) => {
  res.clearCookie('gourmet_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  });
  return res.status(200).json({ message: 'Sesión cerrada exitosamente' });
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        noShowCount: true,
        isBlocked: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error('Error en getMe:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { fullName, phone } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        ...(fullName && { fullName }),
        ...(phone !== undefined && { phone }),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        noShowCount: true,
        isBlocked: true,
        createdAt: true,
      },
    });

    return res.status(200).json({
      message: 'Perfil actualizado exitosamente',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error en updateProfile:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'La contraseña actual y la nueva contraseña son requeridas' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.user.userId },
      data: { password: hashedPassword },
    });

    return res.status(200).json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('Error en changePassword:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'El email es requerido' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Evitar enumeración de usuarios retornando 200 igual
      return res.status(200).json({ message: 'Si el correo existe, se ha enviado un código de recuperación.' });
    }

    // Generar OTP de 6 dígitos
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    await prisma.user.update({
      where: { id: user.id },
      data: { resetCode, resetCodeExpiry }
    });

    await sendPasswordResetEmail(user.email, resetCode);

    return res.status(200).json({ message: 'Si el correo existe, se ha enviado un código de recuperación.' });
  } catch (error) {
    console.error('Error en forgotPassword:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user || user.resetCode !== code || !user.resetCodeExpiry || user.resetCodeExpiry < new Date()) {
      return res.status(400).json({ error: 'Código inválido o expirado' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword,
        resetCode: null,
        resetCodeExpiry: null
      }
    });

    return res.status(200).json({ message: 'Contraseña restablecida exitosamente' });
  } catch (error) {
    console.error('Error en resetPassword:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};
