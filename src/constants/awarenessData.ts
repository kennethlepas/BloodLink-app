export interface AwarenessFact {
    id: string;
    category: 'Blood Compatibility' | 'Donation Rules' | 'Health & Nutrition' | 'Emergency' | 'Did You Know?';
    text: string;
    icon: string; // Ionicons name
}

export const AWARENESS_FACTS: AwarenessFact[] = [
    {
        id: '1',
        category: 'Blood Compatibility',
        text: 'Type O- is the Universal Red Cell Donor. It can be given to patients of any blood type in emergencies.',
        icon: 'water'
    },
    {
        id: '2',
        category: 'Blood Compatibility',
        text: 'Type AB+ is the Universal Recipient. People with AB+ blood can receive red blood cells from any blood type.',
        icon: 'people'
    },
    {
        id: '3',
        category: 'Donation Rules',
        text: 'Whole blood donors must wait at least 56 days (8 weeks) between donations to allow red blood cells to recover.',
        icon: 'calendar'
    },
    {
        id: '4',
        category: 'Health & Nutrition',
        text: 'Eating iron-rich foods like spinach, red meat, and beans helps your body replace hemoglobin after donation.',
        icon: 'nutrition'
    },
    {
        id: '5',
        category: 'Donation Rules',
        text: 'To donate, you must be 18-65 years old, weigh at least 50kg, and be in good general health.',
        icon: 'checkmark-circle'
    },
    {
        id: '6',
        category: 'Emergency',
        text: 'Rh-negative individuals can only receive Rh-negative blood. Rh-positive individuals can receive both Rh+ and Rh-.',
        icon: 'alert-circle'
    },
    {
        id: '7',
        category: 'Health & Nutrition',
        text: 'Hydration is key! Drink at least 500ml of water before donating to prevent dizziness and improve blood flow.',
        icon: 'water-outline'
    },
    {
        id: '8',
        category: 'Did You Know?',
        text: 'Platelets, used for cancer and transplant patients, have a shelf life of only 5-7 days, making constant donations vital.',
        icon: 'hourglass'
    },
    {
        id: '9',
        category: 'Blood Compatibility',
        text: 'Plasma from AB donors is universal and can be given to patients of any blood type.',
        icon: 'flask'
    },
    {
        id: '10',
        category: 'Donation Rules',
        text: 'You cannot donate if you are pregnant, lactating, or have had a recent tattoo or piercing (usually a 6-month wait).',
        icon: 'ban'
    }
];
