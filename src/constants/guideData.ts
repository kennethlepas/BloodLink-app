export interface GuideSection {
    id: string;
    title: string;
    content: {
        subtitle?: string;
        points: string[];
    }[];
}

export const DONOR_GUIDE: GuideSection[] = [
    {
        id: 'eligibility',
        title: 'Who Can Donate?',
        content: [
            {
                subtitle: 'Basic Requirements',
                points: [
                    'Age: 18 - 65 years old.',
                    'Weight: Minimum 50 kg.',
                    'Hemoglobin: Women ?12.5 g/dl, Men ?13.0 g/dl.',
                    'Blood Pressure: 100-140 / 60-90 mmHg.'
                ]
            },
            {
                subtitle: 'You Cannot Donate If:',
                points: [
                    'You are pregnant or breastfeeding.',
                    'You have a fever or current illness.',
                    'You have had a tattoo or piercing in the last 6 months.',
                    'You are on certain medications (e.g., blood thinners, antibiotics).'
                ]
            }
        ]
    },
    {
        id: 'process',
        title: 'The Donation Process',
        content: [
            {
                subtitle: 'Before Donation',
                points: [
                    'Hydrate: Drink at least 500ml of water.',
                    'Eat: Have a healthy, low-fat meal 2-3 hours prior.',
                    'Sleep: Get a full night\'s rest.',
                    'Avoid Alcohol: No alcohol for 24 hours before.'
                ]
            },
            {
                subtitle: 'After Donation',
                points: [
                    'Rest: Sit for 15 minutes before leaving.',
                    'Snack: Eat the provided juice and cookies to stabilize blood sugar.',
                    'Hydrate: Drink extra fluids for 48 hours.',
                    'Avoid: Heavy lifting or strenuous exercise for the rest of the day.'
                ]
            }
        ]
    },
    {
        id: 'nutrition',
        title: 'Nutrition Guide',
        content: [
            {
                subtitle: 'Iron-Rich Foods (Build Hemoglobin)',
                points: [
                    'Red meat, liver, organ meats.',
                    'Spinach, leafy greens, pumpkin seeds.',
                    'Beans, lentils, fortified cereals.'
                ]
            },
            {
                subtitle: 'Vitamin C (Aids Iron Absorption)',
                points: [
                    'Oranges, citrus fruits, mangoes.',
                    'Tomatoes, bell peppers.'
                ]
            }
        ]
    }
];

export const RECIPIENT_GUIDE: GuideSection[] = [
    {
        id: 'safety',
        title: 'Recipient Safety',
        content: [
            {
                subtitle: 'Before Transfusion',
                points: [
                    'Verify your Name, Blood Group, and Hospital ID.',
                    'Ensure the blood bag has a valid "Tested & Safe" label.',
                    'Confirm with your doctor why the transfusion is necessary.'
                ]
            },
            {
                subtitle: 'During Transfusion',
                points: [
                    'Report immediately if you feel chills, fever, back pain, or itching.',
                    'Transfusions typically take 1-4 hours.'
                ]
            }
        ]
    },
    {
        id: 'recovery',
        title: 'After Care',
        content: [
            {
                subtitle: 'Recovery Tips',
                points: [
                    'Rest well and stay hydrated.',
                    'Monitor for delayed reactions (fever, dark urine) for 48 hours.',
                    'Keep a record of your transfusion history.'
                ]
            },
            {
                subtitle: 'Nutrition for Recovery',
                points: [
                    'Protein (Fish, Beans, Eggs) for tissue rebuilding.',
                    'Iron & Vitamin C for hemoglobin replenishment.',
                    'Fluids to maintain blood volume.'
                ]
            }
        ]
    }
];

export const COMPATIBILITY_CHART = [
    { type: 'O-', give: ['All Types'], receive: ['O-'] },
    { type: 'O+', give: ['O+', 'A+', 'B+', 'AB+'], receive: ['O+', 'O-'] },
    { type: 'A-', give: ['A-', 'A+', 'AB-', 'AB+'], receive: ['A-', 'O-'] },
    { type: 'A+', give: ['A+', 'AB+'], receive: ['A+', 'A-', 'O+', 'O-'] },
    { type: 'B-', give: ['B-', 'B+', 'AB-', 'AB+'], receive: ['B-', 'O-'] },
    { type: 'B+', give: ['B+', 'AB+'], receive: ['B+', 'B-', 'O+', 'O-'] },
    { type: 'AB-', give: ['AB-', 'AB+'], receive: ['AB-', 'A-', 'B-', 'O-'] },
    { type: 'AB+', give: ['AB+'], receive: ['All Types'] },
];
