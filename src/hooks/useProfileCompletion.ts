import { useState, useEffect } from 'react';
import { User } from '../types';

export interface ProfileCompletionStatus {
  isProfileIncomplete: boolean;
  missingFields: string[];
  shouldShowModal: boolean;
  completionPercentage: number;
}

export function useProfileCompletion(user: User | null, hasShownThisSession: boolean = false) {
  const [shouldShowModal, setShouldShowModal] = useState(false);
  
  // Check if profile is incomplete
  const checkProfileCompletion = (userData: User): ProfileCompletionStatus => {
    const missingFields: string[] = [];
    
    // Check required fields based on actual User interface
    if (!userData.name?.trim()) {
      missingFields.push('name');
    }
    
    if (!userData.campus) {
      missingFields.push('campus');
    }
    
    if (!userData.house) {
      missingFields.push('house');
    }
    
    // Skills are optional - don't add to missing fields
    // if (!userData.skills || userData.skills.length === 0) {
    //   missingFields.push('skills');
    // }
    
    const isProfileIncomplete = missingFields.length > 0;
    const totalFields = 3; // name, campus, house (skills are optional)
    const completedFields = totalFields - missingFields.length;
    const completionPercentage = Math.round((completedFields / totalFields) * 100);
    
    return {
      isProfileIncomplete,
      missingFields,
      shouldShowModal: isProfileIncomplete && !hasShownThisSession,
      completionPercentage
    };
  };

  // Effect to determine if modal should be shown
  useEffect(() => {
    if (user && !hasShownThisSession) {
      const status = checkProfileCompletion(user);
      setShouldShowModal(status.shouldShowModal);
    } else {
      setShouldShowModal(false);
    }
    // checkProfileCompletion is defined inside the component, so we include it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, hasShownThisSession]);

  // Functions to control modal visibility
  const showModal = () => setShouldShowModal(true);
  const hideModal = () => setShouldShowModal(false);
  
  // Get current profile status
  const getProfileStatus = (): ProfileCompletionStatus => {
    if (!user) {
      return {
        isProfileIncomplete: false,
        missingFields: [],
        shouldShowModal: false,
        completionPercentage: 0
      };
    }
    
    return checkProfileCompletion(user);
  };

  // Get friendly field names for display
  const getFriendlyFieldName = (field: string): string => {
    const fieldMap = {
      name: 'Full Name',
      campus: 'Campus',
      house: 'House'
      // skills removed as it's optional
    };
    return fieldMap[field as keyof typeof fieldMap] || field;
  };

  // Get missing fields with friendly names
  const getMissingFieldsDisplay = (): string[] => {
    const status = getProfileStatus();
    return status.missingFields.map(getFriendlyFieldName);
  };

  return {
    shouldShowModal,
    showModal,
    hideModal,
    getProfileStatus,
    getMissingFieldsDisplay,
    getFriendlyFieldName,
    // Convenience getters
    get isProfileIncomplete() {
      return getProfileStatus().isProfileIncomplete;
    },
    get missingFields() {
      return getProfileStatus().missingFields;
    },
    get completionPercentage() {
      return getProfileStatus().completionPercentage;
    }
  };
}

export default useProfileCompletion;