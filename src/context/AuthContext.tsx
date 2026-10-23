/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, Student } from '../types/index.ts';
import { apiRequest, setStoredToken, getStoredToken } from '../api/client.ts';

interface AuthContextType {
  user: UserProfile | null;
  studentData: Student | null;
  isLoading: boolean;
  error: string | null;
  loginTeacher: (email: string, pass: string) => Promise<void>;
  registerTeacher: (email: string, pass: string, name: string, schoolName: string) => Promise<void>;
  loginStudent: (studentCode: string, pinCode: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  quickLoginTeacherDemo: () => Promise<void>;
  quickLoginStudentDemo: (code?: string, pin?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentUser = async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setStudentData(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await apiRequest<{ user: UserProfile; studentData?: Student }>('/auth/me');
      setUser(data.user);
      if (data.studentData) setStudentData(data.studentData);
    } catch (err: any) {
      console.warn('Session expired or invalid token:', err.message);
      setStoredToken(null);
      setUser(null);
      setStudentData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const loginTeacher = async (email: string, pass: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await apiRequest<{ token: string; user: UserProfile }>('/auth/teacher-login', {
        method: 'POST',
        body: JSON.stringify({ email, password: pass }),
      });
      setStoredToken(res.token);
      setUser(res.user);
      setStudentData(null);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const registerTeacher = async (email: string, pass: string, name: string, schoolName: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await apiRequest<{ token: string; user: UserProfile }>('/auth/teacher-register', {
        method: 'POST',
        body: JSON.stringify({ email, password: pass, name, schoolName }),
      });
      setStoredToken(res.token);
      setUser(res.user);
      setStudentData(null);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginStudent = async (studentCode: string, pinCode: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await apiRequest<{ token: string; user: UserProfile; studentData: Student }>('/auth/student-login', {
        method: 'POST',
        body: JSON.stringify({ studentCode, pinCode }),
      });
      setStoredToken(res.token);
      setUser(res.user);
      setStudentData(res.studentData);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
    setStudentData(null);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  // Quick Demo Access Helpers
  const quickLoginTeacherDemo = async () => {
    await loginTeacher('alshehriosama9009@gmail.com', 'password123');
  };

  const quickLoginStudentDemo = async (code = 'S101', pin = '1111') => {
    await loginStudent(code, pin);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        studentData,
        isLoading,
        error,
        loginTeacher,
        registerTeacher,
        loginStudent,
        logout,
        refreshUser,
        quickLoginTeacherDemo,
        quickLoginStudentDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
