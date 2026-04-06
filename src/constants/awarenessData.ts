export interface AwarenessFact {
    id: string;
    category: 'Blood Compatibility' | 'Donation Rules' | 'Health & Nutrition' | 'Emergency' | 'Did You Know?' | 'Lifesaving Impact';
    text: string;
    icon: string; // Ionicons name
    targetRole?: 'donor' | 'requester' | 'both';
}

export const AWARENESS_FACTS: AwarenessFact[] = [
    {
        id: '1',
        category: 'Blood Compatibility',
        text: 'Type O- is the Universal Red Cell Donor. It can be given to patients of any blood type in emergencies.',
        icon: 'water',
        targetRole: 'both'
    },
    {
        id: '2',
        category: 'Blood Compatibility',
        text: 'Type AB+ is the Universal Recipient. People with AB+ blood can receive red blood cells from any blood type.',
        icon: 'people',
        targetRole: 'both'
    },
    {
        id: '3',
        category: 'Donation Rules',
        text: 'Whole blood donors must wait at least 56 days (8 weeks) between donations to allow red blood cells to recover.',
        icon: 'calendar',
        targetRole: 'donor'
    },
    {
        id: '4',
        category: 'Health & Nutrition',
        text: 'Eating iron-rich foods like spinach, red meat, and beans helps your body replace hemoglobin after donation.',
        icon: 'nutrition',
        targetRole: 'donor'
    },
    {
        id: '5',
        category: 'Donation Rules',
        text: 'To donate, you must be 18-65 years old, weigh at least 50kg, and be in good general health.',
        icon: 'checkmark-circle',
        targetRole: 'donor'
    },
    {
        id: '6',
        category: 'Emergency',
        text: 'Rh-negative individuals can only receive Rh-negative blood. Rh-positive individuals can receive both Rh+ and Rh-.',
        icon: 'alert-circle',
        targetRole: 'both'
    },
    {
        id: '7',
        category: 'Health & Nutrition',
        text: 'Hydration is key! Drink at least 500ml of water before donating to prevent dizziness and improve blood flow.',
        icon: 'water-outline',
        targetRole: 'donor'
    },
    {
        id: '8',
        category: 'Did You Know?',
        text: 'Platelets, used for cancer and transplant patients, have a shelf life of only 5-7 days, making constant donations vital.',
        icon: 'hourglass',
        targetRole: 'requester'
    },
    {
        id: '9',
        category: 'Blood Compatibility',
        text: 'Plasma from AB donors is universal and can be given to patients of any blood type.',
        icon: 'flask',
        targetRole: 'both'
    },
    {
        id: '10',
        category: 'Donation Rules',
        text: 'You cannot donate if you are pregnant, lactating, or have had a recent tattoo or piercing (usually a 6-month wait).',
        icon: 'ban',
        targetRole: 'donor'
    },
    {
        id: '11',
        category: 'Lifesaving Impact',
        text: 'Malaria-associated anaemia is the leading reason for childhood blood transfusions in paediatric wards in Kenya.',
        icon: 'medkit',
        targetRole: 'requester'
    },
    {
        id: '12',
        category: 'Lifesaving Impact',
        text: 'Severe acute malnutrition often leads to life-threatening anaemia in children that requires urgent transfusion.',
        icon: 'nutrition',
        targetRole: 'requester'
    },
    {
        id: '13',
        category: 'Lifesaving Impact',
        text: 'Sickle cell disease patients need regular, periodic transfusions to manage their condition and stay healthy.',
        icon: 'heart-half',
        targetRole: 'requester'
    },
    {
        id: '14',
        category: 'Lifesaving Impact',
        text: 'Maternal health is critical: Massive blood loss during or after delivery is a major cause of maternal mortality.',
        icon: 'woman',
        targetRole: 'requester'
    },
    {
        id: '15',
        category: 'Lifesaving Impact',
        text: 'Conditions such as placenta previa or severe preeclampsia can necessitate urgent transfusions for both mother and newborn.',
        icon: 'medical',
        targetRole: 'requester'
    },
    {
        id: '16',
        category: 'Emergency',
        text: 'A single road traffic accident victim can require as many as 100 units of blood to survive.',
        icon: 'car',
        targetRole: 'requester'
    },
    {
        id: '17',
        category: 'Lifesaving Impact',
        text: 'Chemotherapy and radiation can harm bone marrow, leading to low blood counts that require transfusions for cancer patients.',
        icon: 'fitness',
        targetRole: 'requester'
    },
    {
        id: '18',
        category: 'Lifesaving Impact',
        text: 'Individuals with chronic kidney disorders often develop severe anaemia and depend on blood products.',
        icon: 'pulse',
        targetRole: 'requester'
    },
    {
        id: '19',
        category: 'Lifesaving Impact',
        text: 'Major heart surgeries, organ transplants, and complex operations require blood to replace what is lost during procedures.',
        icon: 'medkit',
        targetRole: 'requester'
    },
    {
        id: '20',
        category: 'Did You Know?',
        text: 'Kenya currently faces a significant shortfall, collecting only 16% to 50% of the 500,000 to 1,000,000 units needed annually.',
        icon: 'trending-down',
        targetRole: 'both'
    }
];
