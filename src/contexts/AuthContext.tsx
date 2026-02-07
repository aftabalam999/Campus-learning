import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { AuthService } from '../services/auth';
import { User } from '../types';
import { UserService } from '../services/firestore';
import { LoginTrackingService } from '../services/loginTrackingService';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  setUserData: React.Dispatch<React.SetStateAction<User | null>>;
  loading: boolean;
  loadingError: string | null;
  signInWithGoogle: () => Promise<FirebaseUser>;
  signOut: () => Promise<void>;
  isAdmin: () => boolean;
  isSuperMentor: () => boolean;
  isAcademicAssociate: () => boolean;
  isMentor: () => boolean;
  isStudent: () => boolean;
  impersonateUser?: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Initialize auth state - simple listener only
  useEffect(() => {
    console.log('🚀 Initializing auth listener...');

    const unsubscribe = AuthService.onAuthStateChanged(async (user) => {
      console.log('👤 Auth state changed:', user ? user.email : 'no user');
      setCurrentUser(user);
      setLoadingError(null);

      if (user) {
        // Set a timeout for fetching user data (10 seconds)
        const timeoutId = setTimeout(() => {
          console.warn('⚠️ Loading user data is taking too long...');
          setLoadingError('User data is taking too long to load. Please login again.');
          setLoading(false);
        }, 10000);

        // Load user data from Firestore
        try {
          console.log('📥 Loading user data...');
          const data = await AuthService.getCurrentUserData();
          clearTimeout(timeoutId);

          if (!data) {
            // User not found in database
            console.warn('⚠️ User not found in database');
            setLoadingError('Your profile is not found. Please contact support or login again.');
            setUserData(null);
            setLoading(false);
            return;
          }

          console.log('✅ User data loaded:', data?.name);
          setUserData(data);
          setLoadingError(null);

          // Track login (non-blocking, only once per day)
          if (data) {
            LoginTrackingService.trackLogin(data).catch(err => {
              console.error('Login tracking error (non-blocking):', err);
            });
          }
        } catch (error) {
          clearTimeout(timeoutId);
          console.error('❌ Error loading user data:', error);
          setLoadingError('Failed to load user data. Please login again.');
          setUserData(null);
        }
      } else {
        setUserData(null);
        setLoadingError(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Sign in with Google function
  const signInWithGoogle = async (): Promise<FirebaseUser> => {
    const user = await AuthService.signInWithGoogle();
    return user;
  };

  // Sign out function
  const signOut = async (): Promise<void> => {
    await AuthService.signOut();
    // Explicitly clear state to support signing out of impersonated sessions
    setCurrentUser(null);
    setUserData(null);
  };

  // Check if user is admin
  const isAdmin = (): boolean => {
    return userData?.isAdmin || false;
  };

  // Check if user is super mentor
  const isSuperMentor = (): boolean => {
    return userData?.isSuperMentor || userData?.role === 'super_mentor' || false;
  };

  // Check if user is academic associate
  const isAcademicAssociate = (): boolean => {
    return userData?.role === 'academic_associate' || false;
  };

  // Check if user is mentor (regular or super)
  // Can mentor others - works with hierarchy (can be student + mentor)
  const isMentor = (): boolean => {
    return userData?.isMentor ||
      userData?.isSuperMentor ||
      userData?.role === 'mentor' ||
      userData?.role === 'super_mentor' ||
      false;
  };

  // Check if user is student (has a mentor OR no elevated role prevents it)
  // Students can ALSO be admins, mentors, etc. (hierarchy system)
  const isStudent = (): boolean => {
    // Primary check: Do they have a mentor? If yes, they ARE a student
    // This works even if they're also admin/mentor (hierarchy)
    if (userData?.mentor_id) {
      return true;
    }

    // Secondary check: If no mentor_id, check if they're a professional role
    // Professional roles (without mentor_id) are NOT students
    const isProfessionalRole =
      userData?.role === 'admin' ||
      userData?.role === 'academic_associate' ||
      userData?.role === 'super_mentor' ||
      userData?.role === 'mentor';

    // If they have no mentor AND they're a professional role, not a student
    // Otherwise, assume they're a student (default)
    return !isProfessionalRole;
  };

  // Dev helper to impersonate user (only for localhost)
  const impersonateUser = async (email: string): Promise<void> => {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      console.error('Impersonation only allowed in development');
      return;
    }

    try {
      setLoading(true);
      let data = await UserService.getUserByEmail(email);

      // If user doesn't exist, create them on the fly (Dev convenience)
      if (!data) {
        console.log('👤 Demo user not found, creating...', email);
        const name = email.split('@')[0].replace('.', ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase());

        let role = 'student';
        let isAdmin = false;
        let isMentor = false;
        let isSuperMentor = false;

        if (email.includes('admin')) {
          role = 'admin';
          isAdmin = true;
        } else if (email.includes('mentor')) {
          role = 'mentor';
          isMentor = true;
        }

        const newUser: any = {
          name: name,
          email: email,
          role: role,
          campus: 'Dharamshala', // Default for demo
          house: 'Bageshree', // Default
          isAdmin,
          isMentor,
          isSuperMentor
        };

        // Create the user
        const newId = await UserService.createUser(newUser);
        data = await UserService.getUserById(newId);

        if (!data) throw new Error('Failed to create demo user');
      }

      if (!data) throw new Error('User data is null');

      // Mock Firebase User
      const mockUser = {
        uid: data.id,
        email: data.email,
        displayName: data.name,
        emailVerified: true,
        isAnonymous: false,
        metadata: {},
        providerData: [],
        refreshToken: '',
        tenantId: null,
        delete: async () => { },
        getIdToken: async () => 'mock-token',
        getIdTokenResult: async () => ({
          token: 'mock-token',
          signInProvider: 'custom',
          claims: {},
          authTime: Date.now(),
          issuedAtTime: Date.now(),
          expirationTime: Date.now() + 3600,
        }),
        reload: async () => { },
        toJSON: () => ({}),
        phoneNumber: null,
        photoURL: null,
      } as unknown as FirebaseUser;

      setCurrentUser(mockUser);
      setUserData(data);
      setLoading(false);
      console.log('🥸 Impersonating user:', email);
    } catch (error) {
      console.error('Impersonation failed:', error);
      setLoadingError('Failed to impersonate user');
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    currentUser,
    userData,
    setUserData,
    loading,
    loadingError,
    signInWithGoogle,
    signOut,
    isAdmin,
    isSuperMentor,
    isAcademicAssociate,
    isMentor,
    isStudent,
    impersonateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};