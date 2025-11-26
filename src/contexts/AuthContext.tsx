import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { AuthService } from '../services/auth';
import { User } from '../types';
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
    isStudent
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};