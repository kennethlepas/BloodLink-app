/**
 * Insights Service (BLL)
 * 
 * Handles business logic for calculating donor eligibility, impact,
 * blood type demand, and nearby insights.
 */

import { BloodType, Donor, Requester, User } from '@/src/types/types';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
    countAvailableCompatibleDonors,
    getDonorHistory,
    getUserBloodRequests
} from '../firebase/database';
import { db } from '../firebase/firebase';

// ============================================================================
// TYPES
// ============================================================================

export interface EligibilityStatus {
    isEligible: boolean;
    daysUntilEligible: number;
    nextEligibleDate?: string;
    message: string;
}

export interface DonorImpact {
    livesSaved: number;
    totalDonations: number;
    totalPoints: number;
    lastDonationDate?: string;
    donationStreak: number;
}

export interface BloodTypeDemand {
    bloodType: BloodType;
    demandLevel: 'low' | 'medium' | 'high' | 'critical';
    activeRequests: number;
    criticalRequests: number;
}

export interface UrgentNeed {
    requestId: string;
    bloodType: BloodType;
    hospitalName: string;
    patientName: string;
    urgencyLevel: string;
    expiresAt: string;
    distance: number; // km
    unitsNeeded: number;
    isCompatible: boolean;
}

export interface NearbyInsights {
    activeRequests: number;
    nearbyDonors: number;
    compatibleDonors: number;
    nearbyRequesters: number;
}

export interface RequestActivity {
    totalRequests: number;
    pendingRequests: number;
    completedRequests: number;
    averageResponseTime: number; // hours
}

export interface DonorInsights {
    eligibility: EligibilityStatus;
    impact: DonorImpact;
    bloodTypeDemand: BloodTypeDemand[];
    urgentNeeds: UrgentNeed[];
    nearby: NearbyInsights;
}

export interface RequesterInsights {
    bloodTypeSupply: {
        availableDonors: number;
        compatibleDonors: number;
        demandLevel: string;
    };
    nearby: NearbyInsights;
    requestActivity: RequestActivity;
}

// ============================================================================
// DONOR INSIGHTS
// ============================================================================

/**
 * Get comprehensive insights for a donor
 */
export const getDonorInsights = async (donor: Donor): Promise<DonorInsights> => {
    const [eligibility, impact, bloodTypeDemand, urgentNeeds, nearby] = await Promise.all([
        calculateEligibility(donor),
        calculateDonorImpact(donor),
        calculateBloodTypeDemand(donor.location),
        getUrgentNeeds(donor),
        getNearbyInsights(donor),
    ]);

    return {
        eligibility,
        impact,
        bloodTypeDemand,
        urgentNeeds,
        nearby,
    };
};

/**
 * Calculate donor eligibility based on last donation date
 * (Standard rule: 56 days between whole blood donations)
 */
const calculateEligibility = async (donor: Donor): Promise<EligibilityStatus> => {
    if (!donor.lastDonationDate) {
        return {
            isEligible: true,
            daysUntilEligible: 0,
            message: "You're ready to save lives!",
        };
    }

    const lastDate = new Date(donor.lastDonationDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const waitPeriod = 56; // 8 weeks

    if (diffDays >= waitPeriod) {
        return {
            isEligible: true,
            daysUntilEligible: 0,
            message: "You're eligible to donate today!",
        };
    }

    const remaining = waitPeriod - diffDays;
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + waitPeriod);

    return {
        isEligible: false,
        daysUntilEligible: remaining,
        nextEligibleDate: nextDate.toISOString(),
        message: `Eligible in ${remaining} day${remaining !== 1 ? 's' : ''}`,
    };
};

/**
 * Calculate donor impact metrics
 */
const calculateDonorImpact = async (donor: Donor): Promise<DonorImpact> => {
    const history = await getDonorHistory(donor.id);

    // Each donation saves approximately 3 lives
    const livesSaved = history.length * 3;

    // Calculate donor streak (consecutive months with at least one donation)
    // This is a simplified version
    let streak = 0;
    if (history.length > 0) {
        streak = 1; // Basic streak if they've donated
    }

    return {
        livesSaved,
        totalDonations: history.length,
        totalPoints: donor.points || 0,
        lastDonationDate: donor.lastDonationDate,
        donationStreak: streak,
    };
};

/**
 * Calculate blood type demand near a location
 */
const calculateBloodTypeDemand = async (location?: any): Promise<BloodTypeDemand[]> => {
    // This would typically query active requests near the location
    // Here we provide mock data with realistic distribution for the demonstration
    const bloodTypes: BloodType[] = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

    return bloodTypes.map(bt => {
        // Random but deterministic-looking demand for UI testing
        const requests = Math.floor(Math.random() * 15);
        const critical = Math.max(0, Math.floor(Math.random() * 4));

        let level: any = 'low';
        if (requests > 10 || critical > 2) level = 'critical';
        else if (requests > 5 || critical > 0) level = 'high';
        else if (requests > 2) level = 'medium';

        return {
            bloodType: bt,
            demandLevel: level,
            activeRequests: requests,
            criticalRequests: critical,
        };
    }).sort((a, b) => b.activeRequests - a.activeRequests);
};

/**
 * Get urgent needs near the donor
 */
const getUrgentNeeds = async (donor: Donor): Promise<UrgentNeed[]> => {
    // In a real app, this would query Firestore for pending requests filtering by proximity and blood type compatibility
    // For now, we return a mock set that looks real
    return [
        {
            requestId: 'req_1',
            bloodType: 'O+',
            hospitalName: 'Nairobi Hospital',
            patientName: 'Jane Doe',
            urgencyLevel: 'critical',
            expiresAt: new Date(Date.now() + 4 * 3600000).toISOString(),
            distance: 5.2,
            unitsNeeded: 3,
            isCompatible: donor.bloodType === 'O+' || donor.bloodType === 'O-',
        },
        {
            requestId: 'req_2',
            bloodType: donor.bloodType || 'A+',
            hospitalName: 'Kenyatta National Hospital',
            patientName: 'John Smith',
            urgencyLevel: 'urgent',
            expiresAt: new Date(Date.now() + 12 * 3600000).toISOString(),
            distance: 12.8,
            unitsNeeded: 2,
            isCompatible: true,
        }
    ];
};

// ============================================================================
// REQUESTER INSIGHTS
// ============================================================================

/**
 * Get comprehensive insights for a requester
 */
export const getRequesterInsights = async (requester: Requester): Promise<RequesterInsights> => {
    const [bloodTypeSupply, nearby, requestActivity] = await Promise.all([
        calculateBloodTypeSupply(requester),
        getNearbyInsights(requester),
        calculateRequestActivity(requester),
    ]);

    return {
        bloodTypeSupply,
        nearby,
        requestActivity,
    };
};

/**
 * Calculate donor supply for a specific blood type
 */
const calculateBloodTypeSupply = async (requester: Requester): Promise<any> => {
    const compatibleDonors = await countAvailableCompatibleDonors(requester.bloodType);

    let demandLevel = 'medium';
    if (compatibleDonors < 5) demandLevel = 'high';
    else if (compatibleDonors > 20) demandLevel = 'low';

    return {
        availableDonors: compatibleDonors * 3, // Total donors in area (approx)
        compatibleDonors,
        demandLevel,
    };
};

/**
 * Calculate requester's activity metrics
 */
const calculateRequestActivity = async (requester: Requester): Promise<RequestActivity> => {
    const requests = await getUserBloodRequests(requester.id);

    const pending = requests.filter(r => r.status === 'pending').length;
    const completed = requests.filter(r => r.status === 'completed').length;

    return {
        totalRequests: requests.length,
        pendingRequests: pending,
        completedRequests: completed,
        averageResponseTime: requests.length > 0 ? 4.5 : 0, // Mock avg
    };
};

// ============================================================================
// SHARED INSIGHTS
// ============================================================================

/**
 * Get real insights about nearby activity from Firestore
 */
const getNearbyInsights = async (user: User): Promise<NearbyInsights> => {
    try {
        // Count all available donors
        const donorsQuery = query(
            collection(db, 'users'),
            where('userType', '==', 'donor'),
            where('isAvailable', '==', true),
            where('isActive', '==', true)
        );
        const donorsSnap = await getDocs(donorsQuery);
        const nearbyDonors = donorsSnap.size;

        // Count compatible donors for the user's blood type
        const compatibleDonors = user.bloodType
            ? await countAvailableCompatibleDonors(user.bloodType)
            : 0;

        // Count active pending blood requests
        const requestsQuery = query(
            collection(db, 'bloodRequests'),
            where('status', '==', 'pending')
        );
        const requestsSnap = await getDocs(requestsQuery);
        const activeRequests = requestsSnap.size;

        // Count active requesters
        const requestersQuery = query(
            collection(db, 'users'),
            where('userType', '==', 'requester'),
            where('isActive', '==', true)
        );
        const requestersSnap = await getDocs(requestersQuery);
        const nearbyRequesters = requestersSnap.size;

        return {
            activeRequests,
            nearbyDonors,
            compatibleDonors,
            nearbyRequesters,
        };
    } catch (error) {
        console.error('Error getting nearby insights:', error);
        return {
            activeRequests: 0,
            nearbyDonors: 0,
            compatibleDonors: 0,
            nearbyRequesters: 0,
        };
    }
};


/**
 * Main entry point to get insights for any user type
 */
export const getUserInsights = async (user: User): Promise<{ type: 'donor' | 'requester'; data: DonorInsights | RequesterInsights }> => {
    if (user.userType === 'donor') {
        const data = await getDonorInsights(user as Donor);
        return { type: 'donor', data };
    } else {
        const data = await getRequesterInsights(user as Requester);
        return { type: 'requester', data };
    }
};
